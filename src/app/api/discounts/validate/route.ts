import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json();

    const discount = await prisma.discount.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });

    if (!discount) {
      return NextResponse.json({ error: "折扣碼無效或已過期" }, { status: 404 });
    }

    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return NextResponse.json({ error: "折扣碼已達使用上限" }, { status: 400 });
    }

    if (discount.minAmount && subtotal < Number(discount.minAmount)) {
      return NextResponse.json(
        {
          error: `最低消費 NT$${Number(discount.minAmount).toLocaleString()} 才可使用此折扣碼`,
        },
        { status: 400 }
      );
    }

    const discountAmount =
      discount.type === "PERCENTAGE"
        ? (subtotal * Number(discount.value)) / 100
        : Number(discount.value);

    return NextResponse.json({
      discount: {
        code: discount.code,
        type: discount.type,
        value: Number(discount.value),
        description: discount.description,
      },
      discountAmount: Math.min(discountAmount, subtotal),
    });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
