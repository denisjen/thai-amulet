import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAlipayPagePayUrl } from "@/lib/alipay";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id! },
    });

    if (!order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json({ error: "此訂單已付款" }, { status: 400 });
    }

    if (!process.env.ALIPAY_APP_ID || !process.env.ALIPAY_PRIVATE_KEY) {
      return NextResponse.json({ error: "支付寶尚未設定，請聯絡管理員" }, { status: 503 });
    }

    const baseUrl     = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const totalAmount = Math.round(Number(order.totalAmount));

    const paymentUrl = buildAlipayPagePayUrl({
      outTradeNo:  order.orderNumber,
      totalAmount: String(totalAmount),
      subject:     `訂單 ${order.orderNumber}`,
      notifyUrl:   `${baseUrl}/api/payment/alipay/notify`,
      returnUrl:   `${baseUrl}/api/payment/alipay/return?orderId=${order.id}`,
    });

    return NextResponse.json({ paymentUrl });
  } catch (err: any) {
    console.error("[Alipay request]", err);
    return NextResponse.json({ error: err?.message ?? "發生錯誤" }, { status: 500 });
  }
}
