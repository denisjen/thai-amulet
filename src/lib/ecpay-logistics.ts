import crypto from "crypto";

const LOGISTICS_MERCHANT_ID = process.env.ECPAY_LOGISTICS_MERCHANT_ID || "";
const LOGISTICS_HASH_KEY    = process.env.ECPAY_LOGISTICS_HASH_KEY    || "";
const LOGISTICS_HASH_IV     = process.env.ECPAY_LOGISTICS_HASH_IV     || "";
const IS_SANDBOX = process.env.ECPAY_LOGISTICS_SANDBOX !== "false";

export const LOGISTICS_MAP_URL = IS_SANDBOX
  ? "https://logistics-stage.ecpay.com.tw/Express/map"
  : "https://logistics.ecpay.com.tw/Express/map";

export function hasLogisticsCredentials(): boolean {
  return !!(LOGISTICS_MERCHANT_ID && LOGISTICS_HASH_KEY && LOGISTICS_HASH_IV);
}

function generateLogisticsCheckMac(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .reduce((acc, key) => { acc[key] = params[key]; return acc; }, {} as Record<string, string>);

  const str =
    `HashKey=${LOGISTICS_HASH_KEY}&` +
    Object.entries(sorted).map(([k, v]) => `${k}=${v}`).join("&") +
    `&HashIV=${LOGISTICS_HASH_IV}`;

  const encoded = encodeURIComponent(str)
    .replace(/%20/g, "+")
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .toLowerCase();

  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export interface CvsMapParams {
  merchantTradeNo: string;
  serverReplyURL: string;
  logisticsSubType?: "UNIMART" | "FAMI" | "HILIFE" | "OKMART";
  isCollection?: "N" | "Y";
  extraData?: string;
  device?: "0" | "1";
}

export function buildCvsMapFields(params: CvsMapParams): Record<string, string> {
  const fields: Record<string, string> = {
    MerchantID:        LOGISTICS_MERCHANT_ID,
    MerchantTradeNo:   params.merchantTradeNo,
    LogisticsType:     "CVS",
    LogisticsSubType:  params.logisticsSubType || "UNIMART",
    IsCollection:      params.isCollection || "N",
    ServerReplyURL:    params.serverReplyURL,
    ExtraData:         params.extraData || "",
    Device:            params.device || "0",
  };

  fields.CheckMacValue = generateLogisticsCheckMac(fields);
  return fields;
}
