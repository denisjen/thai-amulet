import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import OrdersFilter from "@/components/shop/OrdersFilter";
import OrderCancelInline from "@/components/shop/OrderCancelInline";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:    { label: "待確認", color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED:  { label: "已確認", color: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "處理中", color: "bg-purple-100 text-purple-800" },
  SHIPPED:    { label: "已出貨", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED:  { label: "已送達", color: "bg-green-100 text-green-800" },
  CANCELLED:  { label: "已取消", color: "bg-red-100 text-red-800" },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "待付款", color: "text-yellow-600" },
  PAID:     { label: "已付款", color: "text-green-600" },
  FAILED:   { label: "付款失敗", color: "text-red-600" },
  REFUNDED: { label: "已退款",  color: "text-gray-600" },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; from?: string; to?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/orders");

  // Build filter — 預設當日
  const where: any = { userId: session.user.id! };
  if (searchParams.status) where.status = searchParams.status;

  const todayStr = new Date().toISOString().slice(0, 10);
  const fromStr = searchParams.from ?? todayStr;
  const toStr   = searchParams.to   ?? todayStr;
  where.createdAt = {
    gte: new Date(fromStr + "T00:00:00"),
    lte: new Date(toStr   + "T23:59:59"),
  };

  let orders: any[] = [];
  try {
    orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        ceremonies: {
          select: { id: true, name: true, participantIndex: true, preferredTime: true, confirmedTime: true, timeConfirmed: true },
          orderBy: { participantIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Database not connected yet
  }

  // Photos grouped by orderId
  const photosByOrder: Record<string, { id: string; url: string; caption: string | null }[]> = {};
  if (orders.length > 0) {
    try {
      const photos = await prisma.ceremonyPhoto.findMany({
        where: { orderId: { in: orders.map((o: any) => o.id) } },
        orderBy: { createdAt: "asc" },
        select: { id: true, orderId: true, url: true, caption: true },
      });
      for (const p of photos) {
        if (!photosByOrder[p.orderId]) photosByOrder[p.orderId] = [];
        photosByOrder[p.orderId].push({ id: p.id, url: p.url, caption: p.caption });
      }
    } catch { /* ignore */ }
  }

  // 取得法事商品 ID 清單（用來識別哪些 item 是法事商品）
  const ceremonyProductIds = new Set<string>();
  try {
    const cps = await prisma.product.findMany({
      where: { isCeremony: true },
      select: { id: true },
    });
    cps.forEach((p: any) => ceremonyProductIds.add(p.id));
  } catch { /* ignore */ }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">我的訂單</h1>

      <Suspense fallback={null}>
        <OrdersFilter />
      </Suspense>

      {orders.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">
            {searchParams.status || searchParams.from || searchParams.to
              ? "沒有符合條件的訂單"
              : "還沒有訂單"}
          </p>
          <Link href="/products" className="text-amber-700 hover:underline">
            去選購商品
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
            const payInfo    = PAYMENT_STATUS[order.paymentStatus] || PAYMENT_STATUS.PENDING;
            const canCancel  = order.paymentStatus === "PENDING" && order.status === "PENDING";
            const photos     = photosByOrder[order.id] || [];

            return (
              <div key={order.id} className={`bg-white rounded-xl border overflow-hidden ${canCancel ? "border-yellow-300" : ""}`}>
                <Link
                  href={`/orders/${order.id}`}
                  className={`block p-5 hover:bg-gray-50 transition ${canCancel ? "bg-yellow-50 hover:bg-yellow-100" : ""}`}
                >
                  {/* 頂列：訂單號 + 狀態 */}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      {(order.status !== "CANCELLED" || order.paymentStatus !== "PENDING") && (
                        <span className={`text-xs font-medium ${payInfo.color}`}>
                          {payInfo.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 法事照片 */}
                  {photos.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-green-700 font-medium mb-1.5 flex items-center gap-1">
                        📸 法事完成照片
                        {photos.length > 4 && <span className="text-gray-400">（共 {photos.length} 張）</span>}
                      </p>
                      <div className="flex gap-2">
                        {photos.slice(0, 4).map((photo) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={photo.id} src={photo.url} alt={photo.caption || "法事照片"}
                            className="w-16 h-16 rounded-lg object-cover border border-green-100" />
                        ))}
                        {photos.length > 4 && (
                          <div className="w-16 h-16 rounded-lg border border-green-100 bg-green-50 flex items-center justify-center text-xs text-green-700 font-medium">
                            +{photos.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 商品列表（法事項目下方顯示對應預約日期） */}
                  {(() => {
                    // 建立 item → ceremonies 對照表
                    const itemCeremoniesMap = new Map<string, any[]>();
                    if (order.ceremonies?.length > 0) {
                      let offset = 0;
                      for (const item of order.items) {
                        if (ceremonyProductIds.has(item.productId)) {
                          const cers = order.ceremonies.slice(offset, offset + item.quantity);
                          if (cers.length > 0) itemCeremoniesMap.set(item.id, cers);
                          offset += item.quantity;
                        }
                      }
                    }
                    return (
                      <div className="space-y-1">
                        {order.items.map((item: any) => {
                          const cers = itemCeremoniesMap.get(item.id)?.filter((c: any) => c.preferredTime) ?? [];
                          return (
                            <div key={item.id}>
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>{item.name} × {item.quantity}</span>
                                <span>{formatCurrency(Number(item.price) * item.quantity)}</span>
                              </div>
                              {cers.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {cers.map((c: any) => (
                                    <div key={c.id} className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 flex flex-wrap gap-x-3">
                                      {item.quantity > 1 && (
                                        <span className="font-medium text-gray-700">{c.name}：</span>
                                      )}
                                      <span>希望日期：{new Date(c.preferredTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                                      {c.timeConfirmed && c.confirmedTime ? (
                                        <span className="text-green-700 font-medium">✓ 確認日期：{new Date(c.confirmedTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}</span>
                                      ) : (
                                        <span className="text-orange-500">（待確認）</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* 底列：件數 + 總額 */}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="text-xs text-gray-400">{order.items.length} 件商品</span>
                    <div className="text-right">
                      <p className="font-bold text-amber-900">
                        {formatCurrency(Number(order.totalAmount))}
                      </p>
                      {canCancel && (
                        <span className="text-xs text-yellow-700 font-medium">點擊進入付款 →</span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* 取消按鈕（待付款且未取消） */}
                {canCancel && (
                  <div className="px-5 pb-4 border-t border-yellow-200 pt-3 flex justify-end">
                    <OrderCancelInline orderId={order.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
