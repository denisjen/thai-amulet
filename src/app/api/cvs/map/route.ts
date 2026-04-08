import { NextRequest, NextResponse } from "next/server";
import {

export const dynamic = "force-dynamic";
  hasLogisticsCredentials,
  buildCvsMapFields,
  LOGISTICS_MAP_URL,
} from "@/lib/ecpay-logistics";

// GET /api/cvs/map?subtype=UNIMART
// Returns an HTML page that either auto-submits to ECPay logistics map (real mode)
// or shows a mock store selector (dev mode when credentials are not set).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subtype = (searchParams.get("subtype") || "UNIMART") as "UNIMART" | "FAMI" | "HILIFE" | "OKMART";
  const baseUrl  = process.env.NEXTAUTH_URL || "http://localhost:3001";
  const callbackUrl = `${baseUrl}/api/cvs/callback`;

  if (!hasLogisticsCredentials()) {
    // ── 開發模式：顯示模擬門市選擇器 ──────────────────────────
    const mockStores = [
      { id: "131386", name: "全家南港軟體門市",  address: "台北市南港區軟體園區11F" },
      { id: "981482", name: "7-11 信義旗艦店",  address: "台北市信義區市府路45號" },
      { id: "590123", name: "7-11 士林文林門市", address: "台北市士林區文林路123號" },
      { id: "321456", name: "7-11 新竹竹北門市", address: "新竹縣竹北市光明一路200號" },
      { id: "445678", name: "7-11 台中逢甲門市", address: "台中市西屯區逢甲路199號" },
    ];

    const rows = mockStores
      .map(
        (s) => `
        <div class="store-row" onclick="selectStore('${s.id}','${s.name}','${s.address}','','0')">
          <div class="store-name">${s.name}</div>
          <div class="store-addr">${s.address}</div>
        </div>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>選擇7-11門市（測試模式）</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Microsoft JhengHei",sans-serif;background:#f8f8f8}
  .header{background:#e31837;color:#fff;padding:12px 16px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px}
  .notice{background:#fff3cd;border:1px solid #ffc107;margin:12px;padding:10px 14px;border-radius:8px;font-size:13px;color:#856404}
  .list{margin:12px;display:flex;flex-direction:column;gap:8px}
  .store-row{background:#fff;border:1px solid #ddd;border-radius:8px;padding:14px 16px;cursor:pointer;transition:border-color .2s,background .2s}
  .store-row:hover{border-color:#e31837;background:#fff5f5}
  .store-name{font-weight:600;font-size:15px;color:#333}
  .store-addr{font-size:13px;color:#666;margin-top:4px}
</style>
</head>
<body>
<div class="header">🏪 選擇7-11取貨門市</div>
<div class="notice">⚠️ 測試模式（ECPay物流憑證尚未設定），以下為示範門市資料。</div>
<div class="list">${rows}</div>
<script>
function selectStore(id, name, address, telephone, outside) {
  if (window.opener) {
    window.opener.postMessage({
      type: 'CVS_STORE_SELECTED',
      CVSStoreID:   id,
      CVSStoreName: name,
      CVSAddress:   address,
      CVSTelephone: telephone,
      CVSOutSide:   outside,
    }, '*');
    window.close();
  }
}
</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── 正式模式：自動送出表單至綠界物流地圖 ────────────────────
  const tradeNo = `CVS${Date.now()}`.substring(0, 20);
  const fields  = buildCvsMapFields({
    merchantTradeNo: tradeNo,
    serverReplyURL:  callbackUrl,
    logisticsSubType: subtype,
    isCollection:    "N",
    device:          "0",
  });

  const inputsHtml = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${v.replace(/"/g, "&quot;")}">`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<title>門市選擇中…</title>
</head>
<body>
<form id="f" method="POST" action="${LOGISTICS_MAP_URL}">
${inputsHtml}
</form>
<script>document.getElementById('f').submit();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
