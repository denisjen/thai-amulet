import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 模擬付款確認 — 直接將訂單標記為已付款（跳過實際金流）
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "缺少訂單編號" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id! },
    });

    if (!order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    if (order.paymentStatus === "PAID") {
      return NextResponse.json({ error: "此訂單已付款" }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "PAID",
        paidAt: new Date(),
        status: "CONFIRMED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[POST /api/payment/confirm]", e);
    return NextResponse.json({ error: "確認付款失敗" }, { status: 500 });
  }
}
