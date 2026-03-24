import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { linePayConfirm } from "@/lib/linepay";

/**
 * LINE Pay 付款成功後會以 GET redirect 至此，帶有：
 *   ?transactionId=xxx&orderId=yyy
 *
 * 此路由：
 * 1. 呼叫 LINE Pay Confirm API
 * 2. 更新資料庫訂單狀態
 * 3. 導向訂單詳情頁（帶 payment=success 或 payment=failed）
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const transactionId = searchParams.get("transactionId");
  const orderId       = searchParams.get("orderId");
  const baseUrl       = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (!transactionId || !orderId) {
    return NextResponse.redirect(`${baseUrl}/products`);
  }

  try {
    // 用 orderId 查訂單（LINE Pay 回傳的 orderId 即我們的 order.id）
    const order = await prisma.order.findFirst({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.redirect(`${baseUrl}/products`);
    }

    // 若已付款，直接導向成功頁（防止重複 confirm）
    if (order.paymentStatus === "PAID") {
      return NextResponse.redirect(`${baseUrl}/orders/${order.id}?payment=success`);
    }

    const amount = Math.round(Number(order.totalAmount));
    const result = await linePayConfirm(transactionId, { amount, currency: "TWD" });

    if (result.returnCode === "0000") {
      await prisma.order.update({
        where: { id: order.id },
        data:  {
          paymentStatus:       "PAID",
          linePayTransactionId: transactionId,
          paidAt:              new Date(),
          status:              "CONFIRMED",
        },
      });
      return NextResponse.redirect(`${baseUrl}/orders/${order.id}?payment=success`);
    } else {
      console.error("[LINE Pay confirm]", result);
      return NextResponse.redirect(
        `${baseUrl}/orders/${order.id}?payment=failed&msg=${encodeURIComponent(result.returnMessage)}`
      );
    }
  } catch (err: any) {
    console.error("[LINE Pay confirm API]", err);
    return NextResponse.redirect(`${baseUrl}/products?error=linepay`);
  }
}
