import crypto from "crypto";

const APP_ID          = process.env.ALIPAY_APP_ID          || "";
const PRIVATE_KEY_RAW = process.env.ALIPAY_PRIVATE_KEY     || "";
const PUBLIC_KEY_RAW  = process.env.ALIPAY_PUBLIC_KEY      || "";
const IS_SANDBOX      = process.env.ALIPAY_SANDBOX !== "false";

export const ALIPAY_GATEWAY = IS_SANDBOX
  ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
  : "https://openapi.alipay.com/gateway.do";

/** 補上 PEM 標頭（若金鑰已有標頭則直接回傳） */
function wrapPem(key: string, type: "PRIVATE" | "PUBLIC"): string {
  const clean = key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const label = type === "PRIVATE" ? "RSA PRIVATE KEY" : "PUBLIC KEY";
  const body  = clean.match(/.{1,64}/g)?.join("\n") ?? clean;
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

/** 對參數排序後組成簽名原文 */
function buildSignStr(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => k !== "sign" && params[k] !== "" && params[k] != null)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

/** RSA2 簽名 */
function sign(signStr: string): string {
  if (!PRIVATE_KEY_RAW) throw new Error("ALIPAY_PRIVATE_KEY 未設定");
  const s = crypto.createSign("RSA-SHA256");
  s.update(signStr, "utf8");
  return s.sign(wrapPem(PRIVATE_KEY_RAW, "PRIVATE"), "base64");
}

/** RSA2 驗簽（驗證 Alipay 非同步通知） */
export function verifyAlipayNotify(params: Record<string, string>): boolean {
  const { sign: sig, sign_type } = params;
  if (!sig || sign_type !== "RSA2") return false;
  try {
    const v = crypto.createVerify("RSA-SHA256");
    v.update(buildSignStr(params), "utf8");
    return v.verify(wrapPem(PUBLIC_KEY_RAW, "PUBLIC"), sig, "base64");
  } catch {
    return false;
  }
}

/**
 * 建立 alipay.trade.page.pay 的跳轉 URL
 * 前端只需 window.location.href = 此 URL
 */
export function buildAlipayPagePayUrl(opts: {
  outTradeNo: string;
  totalAmount: string;   // "100.00" 格式（TWD 整數也可直接傳 "2600"）
  subject: string;
  notifyUrl: string;
  returnUrl: string;
}): string {
  const bizContent = JSON.stringify({
    out_trade_no: opts.outTradeNo,
    total_amount: opts.totalAmount,
    subject:      opts.subject,
    product_code: "FAST_INSTANT_TRADE_PAY",
  });

  const params: Record<string, string> = {
    app_id:     APP_ID,
    method:     "alipay.trade.page.pay",
    format:     "JSON",
    charset:    "utf-8",
    sign_type:  "RSA2",
    timestamp:  new Date().toISOString().replace("T", " ").slice(0, 19),
    version:    "1.0",
    notify_url: opts.notifyUrl,
    return_url: opts.returnUrl,
    biz_content: bizContent,
  };

  const signStr  = buildSignStr(params);
  params.sign    = sign(signStr);

  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");

  return `${ALIPAY_GATEWAY}?${query}`;
}
