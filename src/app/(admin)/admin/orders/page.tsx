import { prisma } from "@/lib/db";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import OrderStatusCheckboxes from "@/components/admin/OrderStatusCheckboxes";
import OrderNotesCell from "@/components/admin/OrderNotesCell";
import { checkPermission } from "@/lib/check-permission";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待確認", color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "已確認", color: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "處理中", color: "bg-purple-100 text-purple-800" },
  SHIPPED: { label: "已出貨", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "已送達", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "已取消", color: "bg-red-100 text-red-800" },
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "待付款",
  PAID: "已付款",
  FAILED: "付款失敗",
  REFUNDED: "已退款",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;

    categoryId?: string;
    productName?: string;
    paymentStatus?: string;
    userId?: string;
    excludeCancelled?: string;
  };
}) {
  await checkPermission("orders");
  const page = parseInt(searchParams.page || "1");
  const limit = 20;
  const where: any = {};

  // 預設今天日期（指定會員時不限日期）
  const todayStr = new Date().toISOString().split("T")[0];
  const dateFrom = searchParams.userId
    ? (searchParams.dateFrom ?? "")
    : (searchParams.dateFrom !== undefined ? searchParams.dateFrom : todayStr);
  const dateTo = searchParams.userId
    ? (searchParams.dateTo ?? "")
    : (searchParams.dateTo !== undefined ? searchParams.dateTo : todayStr);

  // 訂單狀態
  if (searchParams.status) {
    where.status = searchParams.status;
  } else if (searchParams.excludeCancelled === "1") {
    where.status = { not: "CANCELLED" };
  }

  // 付款狀態
  if (searchParams.paymentStatus) where.paymentStatus = searchParams.paymentStatus;

  // 指定會員
  if (searchParams.userId) where.userId = searchParams.userId;

  // 時間區段篩選
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom + "T00:00:00");
    if (dateTo) where.createdAt.lte = new Date(dateTo + "T23:59:59");
  }

  // 關鍵字篩選（訂單編號 or 會員電話/姓名）
  if (searchParams.keyword) {
    const kw = searchParams.keyword.trim();
    where.OR = [
      { orderNumber: { contains: kw } },
      { user: { phone: { contains: kw } } },
      { user: { name: { contains: kw } } },
    ];
  }

  // 商品分類 & 商品名稱（透過 items 關聯篩選，不限商品類型）
  if (searchParams.categoryId || searchParams.productName) {
    const itemFilter: any = {};
    if (searchParams.productName) {
      itemFilter.name = { contains: searchParams.productName };
    }
    if (searchParams.categoryId) {
      itemFilter.product = { categoryId: searchParams.categoryId };
    }
    where.AND = [{ items: { some: itemFilter } }];
  }

  let orders: any[] = [];
  let total = 0;
  let categories: any[] = [];

  try {
    [orders, total, categories] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          items: { take: 3 },
          ceremonies: { select: { id: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
  } catch {
    // Database not connected yet
  }

  const totalPages = Math.ceil(total / limit);

  // Find category name for display
  const activeCategoryName = categories.find((c) => c.id === searchParams.categoryId)?.name;

  const hasFilters = !!(
    searchParams.keyword ||
    searchParams.categoryId ||
    searchParams.productName ||
    searchParams.paymentStatus ||
    searchParams.excludeCancelled
  );

  // Build print URL with all current filters
  const buildPrintUrl = (
    sp: typeof searchParams,
    df: string,
    dt: string
  ) => {
    const p = new URLSearchParams();
    if (sp.status)        p.set("status",        sp.status);
    if (df)               p.set("dateFrom",       df);
    if (dt)               p.set("dateTo",         dt);
    if (sp.keyword)       p.set("keyword",        sp.keyword);
    if (sp.categoryId)    p.set("categoryId",     sp.categoryId);
    if (sp.productName)   p.set("productName",    sp.productName);
    if (sp.paymentStatus)    p.set("paymentStatus",    sp.paymentStatus);
    if (sp.userId)           p.set("userId",            sp.userId);
    if (sp.excludeCancelled) p.set("excludeCancelled",  sp.excludeCancelled);
    return p.toString();
  };

  // Build URL helper (keep other params, update one)
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      status: searchParams.status,
      dateFrom,
      dateTo,
      keyword: searchParams.keyword,
      categoryId: searchParams.categoryId,
      productName: searchParams.productName,
      paymentStatus: searchParams.paymentStatus,
      userId: searchParams.userId,
      excludeCancelled: searchParams.excludeCancelled,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

  // 查詢被篩選的會員名稱
  let filteredUserName = "";
  if (searchParams.userId && orders.length > 0) {
    filteredUserName = orders[0]?.user?.name || orders[0]?.user?.phone || searchParams.userId;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">訂單管理</h1>

      {/* 會員篩選提示列 */}
      {searchParams.userId && (
        <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm">
          <span className="text-amber-800">
            👤 顯示會員「<strong>{filteredUserName || searchParams.userId}</strong>」的全部訂單（共 {total} 筆）
          </span>
          <Link
            href="/admin/orders"
            className="ml-auto text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2 py-0.5 rounded"
          >
            ✕ 清除篩選
          </Link>
        </div>
      )}

      {/* 訂單狀態 tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Link
          href={buildUrl({ status: undefined, page: undefined })}
          className={`px-3 py-1 rounded text-sm ${!searchParams.status ? "bg-amber-700 text-white" : "bg-white border hover:border-amber-500"}`}
        >
          全部
        </Link>
        {Object.entries(STATUS_LABELS).map(([key, val]) => (
          <Link
            key={key}
            href={buildUrl({ status: key, page: undefined })}
            className={`px-3 py-1 rounded text-sm ${searchParams.status === key ? "bg-amber-700 text-white" : "bg-white border hover:border-amber-500"}`}
          >
            {val.label}
          </Link>
        ))}
      </div>

      {/* 篩選表單 */}
      <form method="GET" action="/admin/orders" className="bg-white rounded-xl border p-4 mb-4">
        {/* 保留訂單狀態 tab */}
        {searchParams.status && (
          <input type="hidden" name="status" value={searchParams.status} />
        )}

        {/* 第一列：日期 + 關鍵字 */}
        <div className="flex flex-wrap gap-3 items-end mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">開始日期</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">結束日期</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              搜尋（訂單編號 / 會員）
            </label>
            <input
              type="text"
              name="keyword"
              defaultValue={searchParams.keyword || ""}
              placeholder="訂單編號或電話姓名"
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-48"
            />
          </div>
        </div>

        {/* 第二列：分類 + 商品名稱 + 付款狀態 + 按鈕 */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">商品分類</label>
            <select
              name="categoryId"
              defaultValue={searchParams.categoryId || ""}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">全部分類</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">商品名稱</label>
            <input
              type="text"
              name="productName"
              defaultValue={searchParams.productName || ""}
              placeholder="輸入商品名稱..."
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">付款狀態</label>
            <select
              name="paymentStatus"
              defaultValue={searchParams.paymentStatus || ""}
              className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">全部</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer self-end pb-1.5">
            <input
              type="checkbox"
              name="excludeCancelled"
              value="1"
              defaultChecked={searchParams.excludeCancelled === "1"}
              className="w-4 h-4 accent-amber-600"
            />
            不含取消訂單
          </label>
          <button
            type="submit"
            className="bg-amber-700 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-amber-600 transition"
          >
            篩選
          </button>
          {hasFilters && (
            <Link
              href={buildUrl({
                keyword: undefined,
                categoryId: undefined,
                productName: undefined,
                paymentStatus: undefined,
                excludeCancelled: undefined,
                page: undefined,
              })}
              className="text-sm text-gray-500 hover:text-gray-800 pb-0.5"
            >
              ✕ 清除篩選
            </Link>
          )}
        </div>

        {/* 篩選摘要 + 列印按鈕 */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="text-xs text-amber-800 bg-amber-50 rounded px-3 py-1.5 inline-flex gap-3 flex-wrap items-center">
            <span>日期：{dateFrom} ～ {dateTo}</span>
            {searchParams.keyword && <span>關鍵字：{searchParams.keyword}</span>}
            {activeCategoryName && <span>分類：{activeCategoryName}</span>}
            {searchParams.productName && <span>商品：{searchParams.productName}</span>}
            {searchParams.paymentStatus && (
              <span>付款：{PAYMENT_STATUS_LABELS[searchParams.paymentStatus]}</span>
            )}
            {searchParams.excludeCancelled === "1" && (
              <span className="text-red-600">不含取消訂單</span>
            )}
            <span className="text-gray-500">共 {total} 筆</span>
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              href={`/admin/orders/print?${buildPrintUrl(searchParams, dateFrom, dateTo)}`}
              target="_blank"
              className="text-xs flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
            >
              🖨️ 列印明細
            </Link>
            <Link
              href={`/admin/orders/print/labels?${buildPrintUrl(searchParams, dateFrom, dateTo)}`}
              target="_blank"
              className="text-xs flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-600 transition"
            >
              🏷️ 地址標籤
            </Link>
          </div>
        </div>
      </form>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">訂單編號</th>
              <th className="text-left px-4 py-3">會員</th>
              <th className="text-left px-4 py-3">商品</th>
              <th className="text-right px-4 py-3">金額</th>
              <th className="text-center px-4 py-3">狀態</th>
              <th className="text-center px-4 py-3 whitespace-nowrap">開始處理／出貨</th>
              <th className="text-left px-4 py-3 whitespace-nowrap">處理說明</th>
              <th className="text-center px-4 py-3">付款</th>
              <th className="text-left px-4 py-3">時間</th>
              <th className="text-center px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {order.orderNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.user?.name || order.user?.phone || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    {order.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="truncate text-xs">
                            {item.name}
                            {item.quantity > 1 && (
                              <span className="text-gray-400 ml-1">×{item.quantity}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(Number(order.totalAmount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusCheckboxes orderId={order.id} status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderNotesCell orderId={order.id} initialNotes={order.notes || ""} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {order.status === "CANCELLED" && order.paymentStatus === "PENDING" ? (
                      <span className="text-xs font-medium text-red-500">已取消</span>
                    ) : (
                      <span
                        className={`text-xs font-medium ${
                          order.paymentStatus === "PAID"
                            ? "text-green-600"
                            : order.paymentStatus === "REFUNDED"
                              ? "text-blue-600"
                              : order.paymentStatus === "FAILED"
                                ? "text-red-600"
                                : "text-yellow-600"
                        }`}
                      >
                        {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-amber-700 hover:underline text-xs"
                    >
                      詳情
                    </Link>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400">
                  {hasFilters ? "找不到符合條件的訂單" : "尚無訂單"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <span>共 {total} 筆，第 {page} / {totalPages || 1} 頁</span>
        {totalPages > 1 && (
          <div className="flex gap-1">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1 border rounded hover:bg-gray-50"
              >
                ← 上一頁
              </Link>
            )}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <Link
                  key={p}
                  href={buildUrl({ page: String(p) })}
                  className={`px-3 py-1 border rounded ${p === page ? "bg-amber-700 text-white border-amber-700" : "hover:bg-gray-50"}`}
                >
                  {p}
                </Link>
              );
            })}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1 border rounded hover:bg-gray-50"
              >
                下一頁 →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
