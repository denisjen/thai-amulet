import { Suspense } from "react";
import { prisma } from "@/lib/db";
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
  // A4 直式：210×297mm，margin 10mm → 可用 190×277mm，2列（每頁2張）
  // A5 橫式：210×148mm，margin 10mm → 可用 190×128mm，1欄
  const pageSize = isA4 ? "A4 portrait" : "A5 landscape";
  // A4直式每頁2張：(277 - 8mm gap) / 2 = 134.5mm；A5橫式1張：128mm
  const badgeH   = isA4 ? "134mm" : "128mm";
  const photoW   = isA4 ? "38mm" : "38mm";
  const photoH   = isA4 ? "48mm" : "48mm";

  return `
    @page { size: ${pageSize}; margin: 10mm; }
    @media print {
      /* 隱藏所有元素，只顯示 .print-area 及其子元素 */
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

export default async function CeremonyBadgesPrintPage({
  searchParams,
}: {
  searchParams: { productId?: string; date?: string; size?: string; includeCancelled?: string };
}) {
  await checkPermission("ceremonies");
  const isA4 = searchParams.size === "a4";
  let ceremonies: any[] = [];
  let filterLabel = "全部法事";
  let productMeta: { name: string; ceremonyDate?: Date | null; ceremonyLocation?: string | null } | null = null;

  const where: any = {};
  const includeCancelled = searchParams.includeCancelled === "1";
  const orderConditions: any = includeCancelled ? {} : { status: { not: "CANCELLED" } };

  if (searchParams.productId) {
    orderConditions.items = { some: { productId: searchParams.productId } };
  } else if (searchParams.date) {
    const date = new Date(searchParams.date);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    orderConditions.createdAt = { gte: date, lt: next };
    filterLabel = `訂單日期：${new Date(searchParams.date).toLocaleDateString("zh-TW")}`;
  }
  where.order = orderConditions;

  let ceremonyProductIds = new Set<string>();

  try {
    const cps = await prisma.product.findMany({
      where: { isCeremony: true },
      select: { id: true },
    });
    ceremonyProductIds = new Set(cps.map((p: any) => p.id));

    if (searchParams.productId) {
      productMeta = await prisma.product.findUnique({
        where: { id: searchParams.productId },
        select: { name: true, ceremonyDate: true, ceremonyLocation: true },
      });
      if (productMeta) filterLabel = productMeta.name;
    }

    ceremonies = await prisma.ceremonyInfo.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            items: {
              select: { name: true, productId: true, quantity: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 篩選特定法事商品時，依 participantIndex 精確過濾
    if (searchParams.productId) {
      const targetProductId = searchParams.productId;
      ceremonies = ceremonies.filter((c: any) => {
        const ceremonyOrderItems = c.order.items.filter(
          (item: any) => ceremonyProductIds.has(item.productId)
        );
        let remaining = c.participantIndex ?? 0;
        for (const item of ceremonyOrderItems) {
          const qty = item.quantity ?? 1;
          if (remaining < qty) return item.productId === targetProductId;
          remaining -= qty;
        }
        return ceremonyOrderItems[0]?.productId === targetProductId;
      });
    }
  } catch {}

  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });
  const backQs = new URLSearchParams();
  if (searchParams.productId) backQs.set("productId", searchParams.productId);
  if (searchParams.date)      backQs.set("date",      searchParams.date);
  const backUrl = `/admin/ceremonies${backQs.toString() ? `?${backQs}` : ""}`;

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
        <Suspense fallback={null}><BadgePrintActions backUrl={backUrl} /></Suspense>
        <span className="text-sm text-gray-500">
          {filterLabel}　共 {ceremonies.length} 張名牌　列印時間：{printTime}
          　<span className="text-xs text-amber-700 font-medium">
            {isA4 ? "【A4 直式 × 2張/頁】" : "【A5 橫式 × 1張/頁】"}
          </span>
        </span>
      </div>

      {/* 名牌格網 */}
      <div className="print-area badge-grid">
        {ceremonies.map((c, i) => {
          const ceremonyName = (() => {
            const ceremonyItems = c.order.items.filter(
              (item: any) => ceremonyProductIds.has(item.productId)
            );
            let remaining = c.participantIndex ?? 0;
            for (const item of ceremonyItems) {
              const qty = item.quantity ?? 1;
              if (remaining < qty) return item.name;
              remaining -= qty;
            }
            return ceremonyItems[0]?.name || filterLabel;
          })();
          const photoSrc = c.photoPath ? photoMap[c.photoPath] : null;
          return (
            <div key={c.id} className="badge">
              {/* 頂部：法事名稱 + 序號 */}
              <div className="flex justify-between items-start mb-3">
                <span className="badge-header">🙏 {ceremonyName}</span>
                <span className="badge-seq">#{String(i + 1).padStart(3, "0")}</span>
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
              <p className="badge-order">{c.order.orderNumber}</p>
            </div>
          );
        })}

        {ceremonies.length === 0 && (
          <div className="no-print col-span-2 text-center py-16 text-gray-400">
            此篩選條件下無法事資料
          </div>
        )}
      </div>
    </>
  );
}
