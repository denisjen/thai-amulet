import crypto from "crypto";

const MERCHANT_ID = process.env.ECPAY_MERCHANT_ID || "";
const HASH_KEY = process.env.ECPAY_HASH_KEY || "";
const HASH_IV = process.env.ECPAY_HASH_IV || "";
const API_URL =
  process.env.ECPAY_API_URL ||
  "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";

function generateCheckMacValue(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

  const str =
    `HashKey=${HASH_KEY}&` +
    Object.entries(sorted)
      .map(([k, v]) => `${k}=${v}`)
      .join("&") +
    `&HashIV=${HASH_IV}`;

  const encoded = encodeURIComponent(str).toLowerCase();
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export interface ECPayOrderParams {
  orderId: string;
  totalAmount: number;
  tradeDesc: string;
  itemName: string;
  returnURL: string;
  clientBackURL: string;
  choosePayment?: "Credit" | "ATM" | "CVS" | "ALL";
}

export function buildECPayForm(params: ECPayOrderParams): {
  actionUrl: string;
  fields: Record<string, string>;
} {
  const now = new Date();
  const tradeDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

  const fields: Record<string, string> = {
    MerchantID: MERCHANT_ID,
    MerchantTradeNo: params.orderId.replace(/-/g, "").substring(0, 20),
    MerchantTradeDate: tradeDate,
    PaymentType: "aio",
    TotalAmount: String(params.totalAmount),
    TradeDesc: params.tradeDesc,
    ItemName: params.itemName,
    ReturnURL: params.returnURL,
    ChoosePayment: params.choosePayment || "ALL",
    ClientBackURL: params.clientBackURL,
    EncryptType: "1",
  };

  fields.CheckMacValue = generateCheckMacValue(fields);

  return { actionUrl: API_URL, fields };
}

export function verifyCheckMacValue(
  params: Record<string, string>
): boolean {
  const { CheckMacValue, ...rest } = params;
  const expected = generateCheckMacValue(rest);
  return expected === CheckMacValue;
}
