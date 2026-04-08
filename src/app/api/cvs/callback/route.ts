import { NextRequest, NextResponse } from "next/server";

// POST /api/cvs/callback
// ECPay logistics server posts the selected store info here.
// We return HTML that posts the store data to the opener window, then closes.
export async function POST(req: NextRequest) {
  const body: Record<string, string> = {};

  try {
    const text = await req.text();
    for (const pair of text.split("&")) {
      const [k, v] = pair.split("=");
      if (k) body[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const storeID    = body.CVSStoreID    || "";
  const storeName  = body.CVSStoreName  || "";
  const address    = body.CVSAddress    || "";
  const telephone  = body.CVSTelephone  || "";
  const outside    = body.CVSOutSide    || "0";

  function safe(s: string) {
    return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="UTF-8"><title>門市已選擇</title></head>
<body>
<script>
(function() {
  var data = {
    type:         'CVS_STORE_SELECTED',
    CVSStoreID:   '${safe(storeID)}',
    CVSStoreName: '${safe(storeName)}',
    CVSAddress:   '${safe(address)}',
    CVSTelephone: '${safe(telephone)}',
    CVSOutSide:   '${safe(outside)}'
  };
  if (window.opener) {
    window.opener.postMessage(data, '*');
    window.close();
  } else {
    document.body.innerText = '門市已選擇：${safe(storeName)}，請關閉此視窗。';
  }
})();
</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
