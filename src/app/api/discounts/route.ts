import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const discountSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase(),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
  minAmount: z.number().optional(),
  maxUses: z.number().int().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ discounts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = discountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { expiresAt, ...rest } = parsed.data;
    const discount = await prisma.discount.create({
      data: {
        ...rest,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    return NextResponse.json({ discount }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "折扣碼已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
