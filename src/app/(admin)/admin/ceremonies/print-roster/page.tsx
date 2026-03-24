import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import RosterPrintActions from "./RosterPrintActions";
import { checkPermission } from "@/lib/check-permission";

export default async function CeremonyRosterPrintPage({
  searchParams,
}: {
  searchParams: { productId?: string; date?: string; layout?: string; includeCancelled?: string };
}) {
  await checkPermission("ceremonies");
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

  // 取得所有法事商品 ID（用於 participantIndex 精確過濾）
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
            paymentStatus: true,
            user: { select: { name: true, phone: true } },
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

  const isLandscape = searchParams.layout === "landscape";
  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });
  const backQs = new URLSearchParams();
  if (searchParams.productId) backQs.set("productId", searchParams.productId);
  if (searchParams.date)      backQs.set("date",      searchParams.date);
  const backUrl = `/admin/ceremonies${backQs.toString() ? `?${backQs}` : ""}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 ${isLandscape ? "landscape" : "portrait"}; margin: 12mm; }
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            padding: 0 !important; margin: 0 !important;
            border: none !important; border-radius: 0 !important;
            background: white !important;
          }
          body { margin: 0; font-family: "Microsoft JhengHei", "NotoSansTC", sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ccc; padding: 5px 7px; font-size: ${isLandscape ? "10pt" : "10.5pt"}; }
          thead tr { background: #f5f5f5; }
          tr { page-break-inside: avoid; }
        }
        body { font-family: "Microsoft JhengHei", "NotoSansTC", sans-serif; }
      ` }} />

      {/* 操作列 */}
      <div className="no-print flex items-center gap-3 mb-5 p-4 bg-white border rounded-xl">
        <Suspense fallback={null}><RosterPrintActions backUrl={backUrl} /></Suspense>
        <span className="text-sm text-gray-500">
          {filterLabel}　共 {ceremonies.length} 位　列印時間：{printTime}
          　<span className="text-xs text-amber-700 font-medium">
            {isLandscape ? "【橫式 A4】" : "【直式 A4】"}
          </span>
        </span>
      </div>

      {/* 文件主體 */}
      <div className="print-area bg-white rounded-xl border p-6">
        {/* 標頭（列印時隱藏） */}
        <div className="no-print text-center mb-5 border-b pb-4">
          <h1 className="text-xl font-bold">法事參與者名單</h1>
          <p className="text-base text-gray-700 mt-1 font-medium">{filterLabel}</p>
          {productMeta?.ceremonyDate && (
            <p className="text-sm text-gray-500 mt-0.5">
              法事日期：{new Date(productMeta.ceremonyDate).toLocaleDateString("zh-TW")}
              {productMeta.ceremonyLocation && `　｜　地點：${productMeta.ceremonyLocation}`}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">共 {ceremonies.length} 位　列印時間：{printTime}</p>
        </div>

        {/* 名單表格 */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border px-3 py-2 text-center w-8">序</th>
              <th className="border px-3 py-2 whitespace-nowrap">姓名</th>
              <th className="border px-3 py-2 whitespace-nowrap">聯絡電話</th>
              <th className="border px-3 py-2 whitespace-nowrap">國曆生日</th>
              <th className="border px-3 py-2 whitespace-nowrap">出生時間</th>
              <th className="border px-3 py-2 whitespace-nowrap">農曆生辰</th>
              {!searchParams.productId && (
                <th className="border px-3 py-2 whitespace-nowrap">法事項目</th>
              )}
              <th className="border px-3 py-2 whitespace-nowrap">訂單編號</th>
              <th className="border px-3 py-2">備注</th>
            </tr>
          </thead>
          <tbody>
            {ceremonies.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border px-3 py-2 text-center text-gray-400 text-xs">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="border px-3 py-2 font-medium">{c.name}</td>
                <td className="border px-3 py-2 text-gray-600">{c.phone || "—"}</td>
                <td className="border px-3 py-2 whitespace-nowrap">{formatDate(c.birthDate)}</td>
                <td className="border px-3 py-2 text-gray-600 whitespace-nowrap">{c.birthTime || "—"}</td>
                <td className="border px-3 py-2 text-gray-600">{c.lunarBirth || "—"}</td>
                {!searchParams.productId && (
                  <td className="border px-3 py-2 text-xs text-gray-600">
                    {(() => {
                      const ceremonyItems = c.order.items.filter(
                        (item: any) => ceremonyProductIds.has(item.productId)
                      );
                      let remaining = c.participantIndex ?? 0;
                      for (const item of ceremonyItems) {
                        const qty = item.quantity ?? 1;
                        if (remaining < qty) return item.name;
                        remaining -= qty;
                      }
                      return ceremonyItems[0]?.name || "—";
                    })()}
                  </td>
                )}
                <td className="border px-3 py-2 text-xs text-gray-600">{c.order.orderNumber}</td>
                <td className="border px-3 py-2 text-xs text-gray-600">{c.notes || ""}</td>
              </tr>
            ))}
            {ceremonies.length === 0 && (
              <tr>
                <td colSpan={!searchParams.productId ? 9 : 8} className="border px-3 py-10 text-center text-gray-400">
                  此篩選條件下無法事資料
                </td>
              </tr>
            )}
          </tbody>
          {ceremonies.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={!searchParams.productId ? 9 : 8} className="border px-3 py-2 text-right text-sm text-gray-500">
                  共 {ceremonies.length} 位參與者
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* 簽核欄 */}
        <div className="mt-10 grid grid-cols-3 gap-8 text-sm text-center text-gray-600">
          <div><div className="border-t border-gray-400 pt-2 mt-8">主持師父簽名</div></div>
          <div><div className="border-t border-gray-400 pt-2 mt-8">核對人員</div></div>
          <div><div className="border-t border-gray-400 pt-2 mt-8">日期</div></div>
        </div>
      </div>
    </>
  );
}
