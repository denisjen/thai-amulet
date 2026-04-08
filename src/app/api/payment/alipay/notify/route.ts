import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAlipayNotify } from "@/lib/alipay";

export const dynamic = "force-dynamic";

/**
 * Alipay 非同步通知（POST application/x-www-form-urlencoded）
 * 必須回傳純文字 "success" 表示接收成功
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((v, k) => { params[k] = String(v); });

    // 驗簽
    if (!verifyAlipayNotify(params)) {
      console.warn("[Alipay notify] 驗簽失敗", params);
      return new NextResponse("fail", { status: 400 });
    }

    const tradeStatus = params.trade_status;
    const outTradeNo  = params.out_trade_no;   // 我們的 orderNumber
    const tradeNo     = params.trade_no;        // Alipay 交易號

    // 只處理付款成功狀態
    if (tradeStatus === "TRADE_SUCCESS" || tradeStatus === "TRADE_FINISHED") {
      const order = await prisma.order.findFirst({
        where: { orderNumber: outTradeNo },
      });

      if (order && order.paymentStatus !== "PAID") {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: "PAID",
            paidAt:        new Date(),
            status:        "CONFIRMED",
            notes:         order.notes
              ? `${order.notes}\nAlipay交易號:${tradeNo}`
              : `Alipay交易號:${tradeNo}`,
          },
        });
      }
    }

    return new NextResponse("success", { status: 200 });
  } catch (err) {
    console.error("[Alipay notify]", err);
    return new NextResponse("fail", { status: 500 });
  }
}
