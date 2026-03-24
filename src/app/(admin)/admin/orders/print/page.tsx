import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import PrintActions from "./PrintActions";
import PrintOptions from "./PrintOptions";
import OrderQRCode from "./OrderQRCode";
import { checkPermission } from "@/lib/check-permission";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "待確認", color: "text-yellow-700" },
  CONFIRMED:  { label: "已確認", color: "text-blue-700" },
  PROCESSING: { label: "處理中", color: "text-purple-700" },
  SHIPPED:    { label: "已出貨", color: "text-indigo-700" },
  DELIVERED:  { label: "已送達", color: "text-green-700" },
  CANCELLED:  { label: "已取消", color: "text-red-700" },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING:  "待付款",
  PAID:     "已付款",
  FAILED:   "付款失敗",
  REFUNDED: "已退款",
};

export default async function OrdersPrintPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    categoryId?: string;
    productName?: string;
    paymentStatus?: string;
  };
}) {
  await checkPermission("orders");
  const todayStr = new Date().toISOString().split("T")[0];
  const dateFrom = searchParams.dateFrom !== undefined ? searchParams.dateFrom : todayStr;
  const dateTo   = searchParams.dateTo   !== undefined ? searchParams.dateTo   : todayStr;

  const where: any = {};
  if (searchParams.status)        where.status        = searchParams.status;
  if (searchParams.paymentStatus) where.paymentStatus = searchParams.paymentStatus;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom + "T00:00:00");
    if (dateTo)   where.createdAt.lte = new Date(dateTo   + "T23:59:59");
  }
  if (searchParams.keyword) {
    const kw = searchParams.keyword.trim();
    where.OR = [
      { orderNumber: { contains: kw } },
      { user: { phone: { contains: kw } } },
      { user: { name:  { contains: kw } } },
    ];
  }
  if (searchParams.categoryId || searchParams.productName) {
    const itemFilter: any = {};
    if (searchParams.productName) itemFilter.name    = { contains: searchParams.productName };
    if (searchParams.categoryId)  itemFilter.product = { categoryId: searchParams.categoryId };
    where.items = { some: itemFilter };
  }

  let orders: any[] = [];
  let categories: any[] = [];
  try {
    [orders, categories] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user:  { select: { name: true, phone: true } },
          items: {
            select: {
              name: true,
              quantity: true,
              price: true,
              product: { select: { isCeremony: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.category.findMany({
        select: { id: true, name: true },
      }),
    ]);
  } catch {
    // DB unavailable
  }

  // 排除純法事訂單（所有品項都是法事）
  const printOrders = orders.filter((o) =>
    o.items.some((item: any) => !item.product?.isCeremony)
  );

  const totalAmount = printOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const activeCategoryName = categories.find((c) => c.id === searchParams.categoryId)?.name;
  const activeStatusLabel  = searchParams.status ? STATUS_LABELS[searchParams.status]?.label : undefined;
  const activePaymentLabel = searchParams.paymentStatus ? PAYMENT_STATUS_LABELS[searchParams.paymentStatus] : undefined;

  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });

  return (
    <>
      {/* 列印樣式 */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 12px; }
          .print-area { padding: 0 !important; border: none !important; border-radius: 0 !important; }
          table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          td, th { border: 1px solid #ccc !important; }
        }
      `}</style>

      {/* 操作列（列印時隱藏） */}
      <div className="no-print flex items-center flex-wrap gap-3 mb-5 p-4 bg-white border rounded-xl">
        <PrintActions
          backUrl={`/admin/orders?${buildQs(searchParams)}`}
          labelsUrl={`/admin/orders/print/labels?${buildQs(searchParams)}`}
        />
        <PrintOptions />
      </div>

      {/* 文件主體 */}
      <div className="print-area bg-white rounded-xl border p-6">
        {/* 標頭（列印時隱藏） */}
        <div className="no-print text-center mb-5 border-b pb-4">
          <h1 className="text-xl font-bold">訂單明細列印</h1>
          <p className="text-sm text-gray-500 mt-1">列印時間：{printTime}</p>
        </div>

        {/* 篩選條件摘要（列印時隱藏） */}
        <div className="no-print flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg px-4 py-2.5">
          <span><b>日期：</b>{dateFrom} ～ {dateTo}</span>
          {activeStatusLabel  && <span><b>訂單狀態：</b>{activeStatusLabel}</span>}
          {activePaymentLabel && <span><b>付款狀態：</b>{activePaymentLabel}</span>}
          {searchParams.keyword && <span><b>關鍵字：</b>{searchParams.keyword}</span>}
          {activeCategoryName  && <span><b>分類：</b>{activeCategoryName}</span>}
          {searchParams.productName && <span><b>商品：</b>{searchParams.productName}</span>}
          <span><b>筆數：</b>{printOrders.length} 筆</span>
          <span><b>總金額：</b>{formatCurrency(totalAmount)}</span>
        </div>

        {/* 訂單表格 */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th className="border px-3 py-2 whitespace-nowrap">#</th>
              <th className="qr-col border px-3 py-2 whitespace-nowrap">QR Code</th>
              <th className="border px-3 py-2 whitespace-nowrap">訂單編號／時間</th>
              <th className="border px-3 py-2 whitespace-nowrap">會員</th>
              <th className="border px-3 py-2">商品明細</th>
              <th className="border px-3 py-2 whitespace-nowrap">金額</th>
              <th className="border px-3 py-2 whitespace-nowrap">訂單狀態</th>
              <th className="border px-3 py-2 whitespace-nowrap">付款狀態</th>
            </tr>
          </thead>
          <tbody>
            {printOrders.map((order, idx) => {
              const statusInfo = STATUS_LABELS[order.status] ?? STATUS_LABELS.PENDING;
              const payLabel   = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                  <td className="qr-col border px-3 py-2 text-center align-middle">
                    <OrderQRCode value={order.orderNumber} />
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{order.orderNumber}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.createdAt)}</div>
                  </td>
                  <td className="border px-3 py-2 whitespace-nowrap">
                    {order.user?.name
                      ? <span className="font-medium">{order.user.name}</span>
                      : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="border px-3 py-2">
                    {order.items
                      .filter((item: any) => !item.product?.isCeremony)
                      .map((item: any, i: number) => (
                        <div key={i} className="text-xs">
                          {item.name} × {item.quantity}
                          <span className="text-gray-500 ml-1">({formatCurrency(Number(item.price))})</span>
                        </div>
                      ))}
                  </td>
                  <td className="border px-3 py-2 text-right font-medium whitespace-nowrap">
                    {formatCurrency(Number(order.totalAmount))}
                  </td>
                  <td className={`border px-3 py-2 text-center text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.label}
                  </td>
                  <td className={`border px-3 py-2 text-center text-xs font-medium ${
                    order.paymentStatus === "PAID"     ? "text-green-700"  :
                    order.paymentStatus === "REFUNDED" ? "text-blue-700"   :
                    order.paymentStatus === "FAILED"   ? "text-red-700"    : "text-yellow-700"
                  }`}>
                    {payLabel}
                  </td>
                </tr>
              );
            })}
            {printOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="border px-3 py-8 text-center text-gray-400">
                  沒有符合條件的訂單
                </td>
              </tr>
            )}
          </tbody>
          {printOrders.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="border px-3 py-2 text-right text-sm">
                  合計（{printOrders.length} 筆）
                </td>
                <td className="border px-3 py-2 text-right text-sm">
                  {formatCurrency(totalAmount)}
                </td>
                <td colSpan={3} className="border px-3 py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}

// build query string from searchParams (excluding undefined)
function buildQs(sp: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => { if (v) p.set(k, v); });
  return p.toString();
}
