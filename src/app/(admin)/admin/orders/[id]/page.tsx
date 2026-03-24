import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";
import Link from "next/link";
import OrderStatusForm from "@/components/admin/OrderStatusForm";
import CeremonyPhotoManager from "@/components/admin/CeremonyPhotoManager";
import ConfirmCeremonyTimeButton from "@/components/admin/ConfirmCeremonyTimeButton";
import { checkPermission } from "@/lib/check-permission";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await checkPermission("orders");
  let order: any = null;
  let ceremonyPhotos: any[] = [];
  try {
    order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        ceremonies: true,
        user: { select: { name: true, phone: true, email: true } },
      },
    });
  } catch {
    // Database not connected yet
  }

  if (order) {
    try {
      ceremonyPhotos = await prisma.ceremonyPhoto.findMany({
        where: { orderId: params.id },
        orderBy: { createdAt: "asc" },
      });
    } catch {
      // CeremonyPhoto table may not exist yet
    }
  }

  if (!order) notFound();

  // Serialize Decimal / Date fields before passing to client components
  const serializedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    bankTransferRef: order.bankTransferRef,
    notes: order.notes,
    subtotal: Number(order.subtotal),
    discountAmount: Number(order.discountAmount),
    totalAmount: Number(order.totalAmount),
    shippingFee: Number(order.shippingFee ?? 0),
    shippingMethod: order.shippingMethod ?? null,
    couponCode: order.couponCode,
    items: order.items.map((item: any) => ({ ...item, price: Number(item.price) })),
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">訂單詳情</h1>
        <Link
          href={order.ceremonies && order.ceremonies.length > 0 ? "/admin/ceremonies" : "/admin/orders"}
          className="text-amber-700 text-sm hover:underline"
        >
          ← 返回{order.ceremonies && order.ceremonies.length > 0 ? "法事訂單" : "列表"}
        </Link>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-xl border p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">訂單編號</p>
            <p className="font-semibold">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-gray-500">下單時間</p>
            <p>{formatDateTime(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500">會員</p>
            <p>
              {order.user?.name} ({order.user?.phone})
            </p>
          </div>
          <div>
            <p className="text-gray-500">付款方式</p>
            <p>{order.paymentMethod}</p>
          </div>
          {order.paymentMethod === "BANK_TRANSFER" && (
            <div>
              <p className="text-gray-500">匯款末五碼</p>
              {order.bankTransferRef ? (
                <p className="font-mono font-bold tracking-widest text-blue-700">
                  {order.bankTransferRef}
                </p>
              ) : (
                <p className="text-gray-400 text-xs">買家尚未填寫</p>
              )}
            </div>
          )}
          {order.shippingMethod === "CVS_PICKUP" && (order.cvsStoreName || order.shippingAddress) && (
            <div className="col-span-2">
              <p className="text-gray-500">取貨門市</p>
              <p className="font-medium">{order.cvsStoreName || "—"}</p>
              {order.shippingAddress && <p className="text-gray-500 text-xs mt-0.5">{order.shippingAddress}</p>}
            </div>
          )}
          {order.shippingMethod === "HOME_DELIVERY" && order.shippingAddress && (
            <div className="col-span-2">
              <p className="text-gray-500">收件地址</p>
              <p>
                {order.shippingName && <span className="font-medium">{order.shippingName}　</span>}
                {order.shippingPhone && <span className="text-gray-600">{order.shippingPhone}　</span>}
                {order.shippingAddress}
              </p>
            </div>
          )}
        </div>

        {order.status === "CANCELLED" && order.notes?.startsWith("[客戶取消]") && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            <span className="font-semibold">客戶取消原因：</span>
            {order.notes.replace("[客戶取消] ", "")}
          </div>
        )}

        <OrderStatusForm order={serializedOrder} />

        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-bold mb-3">商品明細</h2>
          <div className="space-y-2 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">小計</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <>
                {order.couponCode && (
                  <div className="flex justify-between text-green-700">
                    <span>折扣碼：<span className="font-mono font-semibold">{order.couponCode}</span></span>
                    <span>-{formatCurrency(Number(order.discountAmount))}</span>
                  </div>
                )}
                {!order.couponCode && (
                  <div className="flex justify-between text-green-700">
                    <span>折扣</span>
                    <span>-{formatCurrency(Number(order.discountAmount))}</span>
                  </div>
                )}
              </>
            )}
            {order.shippingMethod && (
              <div className="flex justify-between text-gray-600">
                <span>
                  {order.shippingMethod === "CVS_PICKUP" ? "🏪 超商取貨運費" : "🏠 宅配運費"}
                </span>
                {Number(order.shippingFee) > 0 ? (
                  <span>{formatCurrency(Number(order.shippingFee))}</span>
                ) : (
                  <span className="text-green-600">免運</span>
                )}
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-2">
              <span>總計</span>
              <span className="text-amber-900">
                {formatCurrency(Number(order.totalAmount))}
              </span>
            </div>
          </div>
        </div>

        {/* 法事完成照片 */}
        {order.ceremonies && order.ceremonies.length > 0 && (
          <div className="bg-green-50 rounded-xl border border-green-200 p-5">
            <CeremonyPhotoManager
              orderId={order.id}
              initialPhotos={ceremonyPhotos.map((p: any) => ({
                id: p.id,
                orderId: p.orderId,
                url: p.url,
                caption: p.caption,
                createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
              }))}
            />
          </div>
        )}

        {order.ceremonies && order.ceremonies.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-amber-900">
                🙏 法事個人資料
                {order.ceremonies.length > 1 && (
                  <span className="ml-2 text-sm font-normal text-amber-700">共 {order.ceremonies.length} 位</span>
                )}
              </h2>
              <div className="flex gap-2">
                <Link
                  href={`/admin/orders/${order.id}/print-badges`}
                  target="_blank"
                  className="text-xs flex items-center gap-1 px-3 py-1.5 bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition"
                >
                  🏷️ 列印名牌
                </Link>
                <Link
                  href={`/admin/orders/${order.id}/print-roster`}
                  target="_blank"
                  className="text-xs flex items-center gap-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  📋 列印名單
                </Link>
              </div>
            </div>
            <div className="space-y-4">
              {order.ceremonies.map((c: any, idx: number) => (
                <div key={c.id} className={`${order.ceremonies.length > 1 ? "border rounded-lg p-3 bg-white" : ""}`}>
                  {order.ceremonies.length > 1 && (
                    <p className="text-xs font-semibold text-amber-700 mb-2">第 {idx + 1} 位</p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                    <div>
                      <p className="text-gray-500">姓名</p>
                      <p className="font-medium">{c.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">電話</p>
                      <p className="font-medium">{c.phone}</p>
                    </div>
                    {c.englishName && (
                      <div className="col-span-2">
                        <p className="text-gray-500">英文名（護照名）</p>
                        <p className="font-medium">{c.englishName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-500">出生日期（國曆）</p>
                      <p className="font-medium">{formatDate(c.birthDate)}</p>
                    </div>
                    {c.birthTime && (
                      <div>
                        <p className="text-gray-500">出生時間</p>
                        <p className="font-medium">{c.birthTime}</p>
                      </div>
                    )}
                    {c.lunarBirth && (
                      <div>
                        <p className="text-gray-500">農曆生辰</p>
                        <p className="font-medium">{c.lunarBirth}</p>
                      </div>
                    )}
                  </div>
                  {c.preferredTime && (
                    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200 mb-2">
                      <p className="text-xs font-semibold text-blue-700 mb-2">⏰ 一對一法事預約時間</p>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="text-sm text-blue-900">
                          <span className="text-gray-500 mr-1">希望日期：</span>
                          {new Date(c.preferredTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                        </div>
                        <ConfirmCeremonyTimeButton
                          ceremonyId={c.id}
                          preferredTime={c.preferredTime instanceof Date ? c.preferredTime.toISOString() : String(c.preferredTime)}
                          confirmedTime={c.confirmedTime ? (c.confirmedTime instanceof Date ? c.confirmedTime.toISOString() : String(c.confirmedTime)) : null}
                          timeConfirmed={c.timeConfirmed}
                        />
                      </div>
                    </div>
                  )}
                  {c.notes && (
                    <div className="mb-2">
                      <p className="text-gray-500 text-sm">備註</p>
                      <p className="text-sm">{c.notes}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-500 text-sm mb-2">上傳照片</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/uploads/${c.photoPath}`}
                      alt={c.name}
                      className="w-24 h-24 rounded-lg object-cover border"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
