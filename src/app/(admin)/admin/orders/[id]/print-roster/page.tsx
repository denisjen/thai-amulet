import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime } from "@/lib/utils";
import RosterPrintActions from "./RosterPrintActions";
import { checkPermission } from "@/lib/check-permission";

export default async function OrderRosterPrintPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { layout?: string };
}) {
  await checkPermission("orders");
  let order: any = null;
  try {
    order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        orderNumber: true,
        createdAt: true,
        user: { select: { name: true, phone: true } },
        ceremonies: {
          select: {
            id: true,
            name: true,
            phone: true,
            birthDate: true,
            birthTime: true,
            lunarBirth: true,
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

  const isLandscape = searchParams.layout === "landscape";
  const ceremonies: any[] = order.ceremonies;
  const ceremonyName = order.items[0]?.name || "法事";
  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });

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
          th, td { border: 1px solid #ccc; padding: 5px 8px; font-size: ${isLandscape ? "10pt" : "11pt"}; }
          thead tr { background: #f5f5f5; }
          tr { page-break-inside: avoid; }
        }
        body { font-family: "Microsoft JhengHei", "NotoSansTC", sans-serif; }
      ` }} />

      {/* 操作列 */}
      <div className="no-print flex items-center gap-3 mb-5 p-4 bg-white border rounded-xl">
        <Suspense fallback={null}><RosterPrintActions backUrl={`/admin/orders/${params.id}`} /></Suspense>
        <span className="text-sm text-gray-500">
          {ceremonyName}　共 {ceremonies.length} 位　列印時間：{printTime}
          　<span className="text-xs text-amber-700 font-medium">
            {isLandscape ? "【橫式 A4】" : "【直式 A4】"}
          </span>
        </span>
      </div>

      {/* 文件主體 */}
      <div className="print-area bg-white rounded-xl border p-6">
        {/* 標頭（列印時隱藏） */}
        <div className="no-print text-center mb-5 border-b pb-4">
          <h1 className="text-xl font-bold">法事參與名單</h1>
          <p className="text-sm text-gray-600 mt-1">{ceremonyName}</p>
          <div className="flex justify-center gap-6 text-xs text-gray-500 mt-2">
            <span>訂單編號：{order.orderNumber}</span>
            <span>訂購人：{order.user?.name || "—"}{order.user?.phone ? `（${order.user.phone}）` : ""}</span>
            <span>下單時間：{formatDateTime(order.createdAt)}</span>
          </div>
        </div>

        {/* 名單表格 */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="border px-3 py-2 text-center w-8">#</th>
              <th className="border px-3 py-2 whitespace-nowrap">姓名</th>
              <th className="border px-3 py-2 whitespace-nowrap">聯絡電話</th>
              <th className="border px-3 py-2 whitespace-nowrap">國曆生日</th>
              <th className="border px-3 py-2 whitespace-nowrap">出生時間</th>
              <th className="border px-3 py-2 whitespace-nowrap">農曆生辰</th>
              <th className="border px-3 py-2">備注</th>
            </tr>
          </thead>
          <tbody>
            {ceremonies.map((c, i) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2 text-center text-gray-400 text-xs">
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="border px-3 py-2 font-medium">{c.name}</td>
                <td className="border px-3 py-2 text-gray-600">{c.phone || "—"}</td>
                <td className="border px-3 py-2 whitespace-nowrap">{formatDate(c.birthDate)}</td>
                <td className="border px-3 py-2 whitespace-nowrap text-gray-600">
                  {c.birthTime || "—"}
                </td>
                <td className="border px-3 py-2 text-gray-600">{c.lunarBirth || "—"}</td>
                <td className="border px-3 py-2 text-gray-600 text-xs">{c.notes || ""}</td>
              </tr>
            ))}
            {ceremonies.length === 0 && (
              <tr>
                <td colSpan={7} className="border px-3 py-10 text-center text-gray-400">
                  此訂單沒有法事個人資料
                </td>
              </tr>
            )}
          </tbody>
          {ceremonies.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50">
                <td colSpan={7} className="border px-3 py-2 text-right text-sm text-gray-500">
                  共 {ceremonies.length} 位參與者
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
