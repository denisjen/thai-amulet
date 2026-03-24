import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { linePayRequest } from "@/lib/linepay";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const { orderId } = await req.json();

    const order = await prisma.order.findFirst({
      where:   { id: orderId, userId: session.user.id! },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "訂單不存在" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json({ error: "此訂單已付款" }, { status: 400 });
    }

    const baseUrl      = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const totalAmount  = Math.round(Number(order.totalAmount));
    const shippingFee  = Math.round(Number((order as any).shippingFee ?? 0));
    const discountAmt  = Math.round(Number((order as any).discountAmount ?? 0));

    // LINE Pay 要求 package.amount === Σ(price×quantity)
    // 為避免浮點誤差，固定使用單一商品行
    const finalProducts = [{ name: `訂單 ${order.orderNumber}`, quantity: 1, price: totalAmount }];
    const finalAmount   = totalAmount;

    const result = await linePayRequest({
      amount:   finalAmount,
      currency: "TWD",
      orderId:  order.id,
      packages: [
        {
          id:       order.orderNumber,
          amount:   finalAmount,
          name:     `訂單 ${order.orderNumber}`,
          products: finalProducts,
        },
      ],
      redirectUrls: {
        confirmUrl: `${baseUrl}/api/payment/linepay/confirm`,
        cancelUrl:  `${baseUrl}/orders/${order.id}?payment=cancelled`,
      },
    });

    if (result.returnCode !== "0000" || !result.info) {
      console.error("[LINE Pay request]", result);
      return NextResponse.json(
        { error: `LINE Pay 錯誤：${result.returnMessage}` },
        { status: 400 }
      );
    }

    // 將 transactionId 存入訂單，方便 confirm 時查詢
    await prisma.order.update({
      where: { id: order.id },
      data:  { linePayTransactionId: String(result.info.transactionId) },
    });

    return NextResponse.json({ paymentUrl: result.info.paymentUrl.web });
  } catch (err: any) {
    console.error("[LINE Pay request API]", err);
    return NextResponse.json({ error: err?.message ?? "發生錯誤" }, { status: 500 });
  }
}
