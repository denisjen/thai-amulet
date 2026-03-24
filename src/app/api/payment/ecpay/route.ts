import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildECPayForm } from "@/lib/ecpay";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const { orderId, choosePayment } = await req.json();

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id! },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json({ error: "此訂單已付款" }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const { actionUrl, fields } = buildECPayForm({
      orderId: order.id,
      totalAmount: Math.round(Number(order.totalAmount)),
      tradeDesc: `泰國佛牌訂單 ${order.orderNumber}`,
      itemName: order.items.map((i) => `${i.name} x${i.quantity}`).join("#"),
      returnURL: `${baseUrl}/api/payment/ecpay/callback`,
      clientBackURL: `${baseUrl}/orders/${order.id}`,
      choosePayment,
    });

    return NextResponse.json({ actionUrl, fields });
  } catch {
    return NextResponse.json({ error: "建立支付失敗" }, { status: 500 });
  }
}
