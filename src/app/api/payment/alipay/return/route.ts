import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAlipayNotify } from "@/lib/alipay";

/**
 * Alipay 同步跳轉（GET，帶簽名參數）
 * 驗簽成功後導向訂單詳情頁
 */
export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  try {
    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get("orderId");

    // 收集 Alipay 回傳的簽名參數（排除我們自己加的 orderId）
    const params: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      if (k !== "orderId") params[k] = v;
    });

    // 驗簽（非同步通知已更新狀態，這裡僅做驗簽確認）
    const valid = verifyAlipayNotify(params);

    if (!orderId) {
      return NextResponse.redirect(`${baseUrl}/orders?payment=failed`);
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.redirect(`${baseUrl}/orders?payment=failed`);
    }

    // 若非同步通知已更新為 PAID，直接顯示成功
    if (order.paymentStatus === "PAID") {
      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=success`);
    }

    // 同步跳轉時 Alipay 可能尚未發送非同步通知，仍顯示等待確認
    if (valid) {
      return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=pending`);
    }

    return NextResponse.redirect(`${baseUrl}/orders/${orderId}?payment=failed`);
  } catch (err) {
    console.error("[Alipay return]", err);
    return NextResponse.redirect(`${baseUrl}/orders?error=alipay`);
  }
}
