import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { UPLOAD_DIR } from "@/lib/upload";
import path from "path";
import fs from "fs";
import BadgePrintActions from "./BadgePrintActions";
import { checkPermission } from "@/lib/check-permission";

function fmtWesternDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function readPhotoAsBase64(fileName: string): string | null {
  if (!fileName) return null;
  try {
    const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
    if (!fs.existsSync(filePath)) return null;
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function buildCss(isA4: boolean): string {
  const pageSize = isA4 ? "A4 portrait" : "A5 landscape";
  const badgeH   = isA4 ? "134mm" : "128mm";
  const photoW   = "38mm";
  const photoH   = "48mm";

  return `
    @page { size: ${pageSize}; margin: 10mm; }
    @media print {
      body * { visibility: hidden !important; }
      .print-area, .print-area * { visibility: visible !important; }
      .print-area {
        position: fixed !important;
        top: 0 !important; left: 0 !important;
        width: 100% !important;
        padding: 0 !important; margin: 0 !important;
        border: none !important; background: transparent !important;
      }
      body { margin: 0; background: white !important;
             font-family: "Microsoft JhengHei", "NotoSansTC", sans-serif; }
      ${isA4 ? `.badge-grid { display: grid !important; grid-template-columns: 1fr; gap: 8mm; }
                .badge:nth-child(2n) { page-break-after: always; break-after: page; }
                .badge:last-child    { page-break-after: auto;   break-after: auto; }`
             : `.badge-grid { display: block !important; }
                .badge { page-break-after: always; break-after: page; }
                .badge:last-child { page-break-after: auto; break-after: auto; }`}
    }
    body { font-family: "Microsoft JhengHei", "NotoSansTC", sans-serif; }
    .badge-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: ${isA4 ? "8mm" : "0"};
    }
    .badge {
      border: 2px solid #92400e;
      border-radius: 8px;
      padding: 6mm 9mm;
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      height: ${badgeH};
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      overflow: hidden;
    }
    .badge-photo {
      width: ${photoW};
      height: ${photoH};
      object-fit: cover;
      border-radius: 4px;
      border: 1.5px solid #d97706;
      flex-shrink: 0;
    }
    .badge-photo-placeholder {
      width: ${photoW};
      height: ${photoH};
      border-radius: 4px;
      border: 2px dashed #d97706;
      background: #fef9c3;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 10pt;
      color: #b45309;
    }
    .badge-name     { font-size: 48px; font-weight: 800; color: #78350f; letter-spacing: 0.12em; line-height: 1.1; text-align: center; }
    .badge-en-name  { font-size: 48px; font-weight: 700; color: #92400e; letter-spacing: 0.08em; text-align: center; text-transform: uppercase; }
    .badge-birthday { font-size: 48px; font-weight: 700; color: #374151; text-align: center; }
    .badge-lunar    { font-size: 14px; color: #9ca3af; text-align: center; margin-top: 2px; }
    .badge-notes    { font-size: 48px; color: #6b7280; border-top: 1px solid #fde68a; padding-top: 6px; margin-top: 6px; }
    .badge-order    { font-size: 18px; color: #d1d5db; text-align: right; margin-top: auto; padding-top: 4px; }
    .badge-header   { font-size: 11px; font-weight: 700; color: #78350f; }
    .badge-seq      { font-size: 11px; color: #9ca3af; }
  `;
}

export default async function OrderBadgePrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { size?: string };
}) {
  await checkPermission("orders");
  const isA4 = searchParams.size === "a4";
  let order: any = null;
  try {
    order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        orderNumber: true,
        ceremonies: {
          select: {
            id: true,
            name: true,
            englishName: true,
            phone: true,
            birthDate: true,
            birthTime: true,
            lunarBirth: true,
            photoPath: true,
            notes: true,
          },
          orderBy: { createdAt: "asc" },
        },
        items: {
          where: { product: { isCeremony: true } },
          select: { name: true },
          take: 1,
        },
      },
    });
  } catch {}

  if (!order) notFound();

  const ceremonies: any[] = order.ceremonies;
  const ceremonyName = order.items[0]?.name || "法事";
  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });

  const photoMap: Record<string, string | null> = {};
  for (const c of ceremonies) {
    if (c.photoPath && !(c.photoPath in photoMap)) {
      photoMap[c.photoPath] = readPhotoAsBase64(c.photoPath);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: buildCss(isA4) }} />

      {/* 操作列 */}
      <div className="no-print flex items-center gap-3 mb-5 p-4 bg-white border rounded-xl flex-wrap">
        <Suspense fallback={null}><BadgePrintActions backUrl={`/admin/orders/${params.id}`} /></Suspense>
        <span className="text-sm text-gray-500">
          {ceremonyName}　共 {ceremonies.length} 張名牌　列印時間：{printTime}
          　<span className="text-xs text-amber-700 font-medium">
            {isA4 ? "【A4 直式 × 2張/頁】" : "【A5 橫式 × 1張/頁】"}
          </span>
        </span>
      </div>

      {/* 文件標頭 */}
      <div className="text-center mb-4 no-print">
        <h1 className="text-lg font-bold">{ceremonyName} — 名牌列印</h1>
        <p className="text-xs text-gray-500 mt-0.5">訂單：{order.orderNumber}</p>
      </div>

      {/* 名牌格網 */}
      <div className="print-area badge-grid">
        {ceremonies.map((c, i) => {
          const photoSrc = c.photoPath ? photoMap[c.photoPath] : null;
          return (
            <div key={c.id} className="badge">
              {/* 頂部：法事名稱 + 序號 */}
              <div className="flex justify-between items-start mb-3">
                <span className="badge-header">🙏 {ceremonyName}</span>
                <span className="badge-seq">#{String(i + 1).padStart(2, "0")}</span>
              </div>

              {/* 主體：照片 + 資料 */}
              <div className="flex gap-5 flex-1 items-center">
                {/* 照片 */}
                {photoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoSrc} alt={c.name} className="badge-photo" />
                ) : (
                  <div className="badge-photo-placeholder">無照片</div>
                )}

                {/* 文字區 */}
                <div className="flex-1 flex flex-col justify-center gap-2">
                  <p className="badge-name">{c.name}</p>
                  {c.englishName && (
                    <p className="badge-en-name">{c.englishName}</p>
                  )}
                  <p className="badge-birthday">
                    {fmtWesternDate(c.birthDate)}
                    {c.birthTime && (
                      <span style={{ fontSize: "40px", marginLeft: "8px", color: "#6b7280" }}>
                        {c.birthTime}
                      </span>
                    )}
                  </p>
                  {c.lunarBirth && <p className="badge-lunar">{c.lunarBirth}</p>}
                </div>
              </div>

              {/* 備注 */}
              {c.notes && (
                <p className="badge-notes">
                  <span style={{ color: "#9ca3af" }}>備注：</span>{c.notes}
                </p>
              )}

              {/* 訂單號 */}
              <p className="badge-order">{order.orderNumber}</p>
            </div>
          );
        })}

        {ceremonies.length === 0 && (
          <div className="no-print col-span-2 text-center py-16 text-gray-400">
            此訂單沒有法事個人資料
          </div>
        )}
      </div>
    </>
  );
}
