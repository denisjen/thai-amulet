import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyCheckMacValue } from "@/lib/ecpay";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    if (!verifyCheckMacValue(params)) {
      return new NextResponse("0|Error", { status: 200 });
    }

    const merchantTradeNo = params.MerchantTradeNo;
    const rtnCode = params.RtnCode;
    const tradeNo = params.TradeNo;

    const orderId = merchantTradeNo.substring(0, 25);

    if (rtnCode === "1") {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          ecpayTradeNo: tradeNo,
          paidAt: new Date(),
          status: "CONFIRMED",
        },
      });
    }

    return new NextResponse("1|OK", { status: 200 });
  } catch {
    return new NextResponse("0|Error", { status: 200 });
  }
}
