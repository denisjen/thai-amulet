import crypto from "crypto";

const CHANNEL_ID     = process.env.LINEPAY_CHANNEL_ID     || "";
const CHANNEL_SECRET = process.env.LINEPAY_CHANNEL_SECRET || "";
const IS_SANDBOX     = process.env.LINEPAY_SANDBOX !== "false";

export const LINEPAY_BASE_URL = IS_SANDBOX
  ? "https://sandbox-api-pay.line.me"
  : "https://api-pay.line.me";

/** 產生每次請求所需的 HMAC-SHA256 簽名 */
function generateSignature(
  uri: string,
  body: string,
  nonce: string
): string {
  const message = CHANNEL_SECRET + uri + body + nonce;
  return crypto
    .createHmac("sha256", CHANNEL_SECRET)
    .update(message)
    .digest("base64");
}

/** 共用 request headers */
export function linePayHeaders(uri: string, body: string) {
  const nonce = crypto.randomUUID();
  return {
    "Content-Type": "application/json",
    "X-LINE-ChannelId": CHANNEL_ID,
    "X-LINE-Authorization-Nonce": nonce,
    "X-LINE-Authorization": generateSignature(uri, body, nonce),
  };
}

/* ─────────────────────────────────────────────────
   Request API  (建立付款請求)
───────────────────────────────────────────────── */
export interface LinePayRequestBody {
  amount: number;
  currency: "TWD";
  orderId: string;
  packages: Array<{
    id: string;
    amount: number;
    name: string;
    products: Array<{ name: string; quantity: number; price: number }>;
  }>;
  redirectUrls: { confirmUrl: string; cancelUrl: string };
}

export interface LinePayRequestResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    paymentUrl: { web: string; app: string };
    transactionId: number;
    paymentAccessToken: string;
  };
}

export async function linePayRequest(
  body: LinePayRequestBody
): Promise<LinePayRequestResponse> {
  const uri  = "/v3/payments/request";
  const json = JSON.stringify(body);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${LINEPAY_BASE_URL}${uri}`, {
      method:  "POST",
      headers: linePayHeaders(uri, json),
      body:    json,
      signal:  ctrl.signal,
    });
    return res.json();
  } catch (err: any) {
    if (err?.name === "AbortError") throw new Error("LINE Pay 連線逾時，請稍後再試");
    throw new Error(`LINE Pay 連線失敗：${err?.message ?? "網路錯誤"}`);
  } finally {
    clearTimeout(timer);
  }
}

/* ─────────────────────────────────────────────────
   Confirm API  (確認付款)
───────────────────────────────────────────────── */
export interface LinePayConfirmBody {
  amount: number;
  currency: "TWD";
}

export interface LinePayConfirmResponse {
  returnCode: string;
  returnMessage: string;
  info?: {
    orderId: string;
    transactionId: number;
    payInfo: Array<{ method: string; amount: number }>;
  };
}

export async function linePayConfirm(
  transactionId: string | number,
  body: LinePayConfirmBody
): Promise<LinePayConfirmResponse> {
  const uri  = `/v3/payments/${transactionId}/confirm`;
  const json = JSON.stringify(body);
  const res  = await fetch(`${LINEPAY_BASE_URL}${uri}`, {
    method:  "POST",
    headers: linePayHeaders(uri, json),
    body:    json,
  });
  return res.json();
}
