import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const addressSchema = z.object({
  name: z.string().min(1, "收件人姓名不得為空"),
  phone: z.string().min(1, "聯絡電話不得為空"),
  postalCode: z.string().optional().default(""),
  city: z.string().optional().default(""),
  address: z.string().min(1, "收件地址不得為空"),
  isDefault: z.boolean().optional(),
});

// PUT /api/account/address/[id] — update specific address
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    // Verify ownership
    const existing = await prisma.address.findFirst({
      where: { id: params.id, userId: session.user.id! },
    });
    if (!existing) return NextResponse.json({ error: "找不到地址" }, { status: 404 });

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, postalCode, city, address, isDefault } = parsed.data;

    // If setting as default, unset others first
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id!, id: { not: params.id } },
        data: { isDefault: false },
      });
    }

    const result = await prisma.address.update({
      where: { id: params.id },
      data: { name, phone, postalCode, city, address, ...(isDefault !== undefined ? { isDefault } : {}) },
    });

    return NextResponse.json({ address: result });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}

// DELETE /api/account/address/[id] — delete address
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    const existing = await prisma.address.findFirst({
      where: { id: params.id, userId: session.user.id! },
    });
    if (!existing) return NextResponse.json({ error: "找不到地址" }, { status: 404 });

    await prisma.address.delete({ where: { id: params.id } });

    // If deleted address was default, promote the next one
    if (existing.isDefault) {
      const next = await prisma.address.findFirst({ where: { userId: session.user.id! } });
      if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}

// PATCH /api/account/address/[id] — set as default
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    const existing = await prisma.address.findFirst({
      where: { id: params.id, userId: session.user.id! },
    });
    if (!existing) return NextResponse.json({ error: "找不到地址" }, { status: 404 });

    await prisma.address.updateMany({
      where: { userId: session.user.id! },
      data: { isDefault: false },
    });
    const result = await prisma.address.update({
      where: { id: params.id },
      data: { isDefault: true },
    });

    return NextResponse.json({ address: result });
  } catch {
    return NextResponse.json({ error: "設定失敗" }, { status: 500 });
  }
}
