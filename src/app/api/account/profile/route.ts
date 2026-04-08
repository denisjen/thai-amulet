import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { id: true, phone: true, name: true, email: true, lineId: true, birthDate: true, birthTime: true, avatarUrl: true },
  });

  return NextResponse.json({ user });
}

const updateSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  lineId: z.string().optional(),
  birthDate: z.string().nullable().optional(),
  birthTime: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email, birthDate, birthTime, phone, ...rest } = parsed.data;

    // Only allow setting phone if user doesn't have one yet (Google users)
    const phoneUpdate: { phone?: string } = {};
    if (phone !== undefined) {
      const current = await prisma.user.findUnique({
        where: { id: session.user.id! },
        select: { phone: true },
      });
      if (!current?.phone && phone) {
        phoneUpdate.phone = phone;
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id! },
      data: {
        ...rest,
        ...phoneUpdate,
        email: email || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        birthTime: birthTime ?? null,
      },
        select: { id: true, phone: true, name: true, email: true, lineId: true, birthDate: true, birthTime: true, avatarUrl: true },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
