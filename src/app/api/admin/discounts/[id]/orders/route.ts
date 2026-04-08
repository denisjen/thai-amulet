import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const discount = await prisma.discount.findUnique({
      where: { id: params.id },
      select: { code: true },
    });
    if (!discount) return NextResponse.json({ error: "找不到折扣碼" }, { status: 404 });

    const orders = await prisma.order.findMany({
      where: { couponCode: discount.code },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        totalAmount: true,
        discountAmount: true,
        status: true,
        paymentStatus: true,
        user: { select: { name: true } },
        items: { select: { name: true, quantity: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        discountAmount: Number(o.discountAmount),
        createdAt: o.createdAt.toISOString(),
      }))
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
