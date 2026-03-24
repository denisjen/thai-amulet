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
  isDefault: z.boolean().optional().default(false),
});

// GET /api/account/address — list ALL addresses
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id! },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
  });

  return NextResponse.json({ addresses });
}

// POST /api/account/address — create new address
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, postalCode, city, address, isDefault } = parsed.data;

    // If setting as default, unset all other defaults first
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id! },
        data: { isDefault: false },
      });
    }

    // If this is the first address, make it default automatically
    const count = await prisma.address.count({ where: { userId: session.user.id! } });
    const shouldBeDefault = isDefault || count === 0;

    const result = await prisma.address.create({
      data: { userId: session.user.id!, name, phone, postalCode, city, address, isDefault: shouldBeDefault },
    });

    return NextResponse.json({ address: result });
  } catch {
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }
}

// PUT /api/account/address — kept for backward compatibility (updates default address)
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, phone, postalCode, city, address } = parsed.data;

    const existing = await prisma.address.findFirst({
      where: { userId: session.user.id!, isDefault: true },
    });

    let result;
    if (existing) {
      result = await prisma.address.update({
        where: { id: existing.id },
        data: { name, phone, postalCode, city, address },
      });
    } else {
      result = await prisma.address.create({
        data: { userId: session.user.id!, name, phone, postalCode, city, address, isDefault: true },
      });
    }

    return NextResponse.json({ address: result });
  } catch {
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }
}
