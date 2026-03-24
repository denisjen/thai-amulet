import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import RetryPaymentButton from "@/components/shop/RetryPaymentButton";
import CeremonyPhotoGallery from "@/components/shop/CeremonyPhotoGallery";
import BankTransferRefInput from "@/components/shop/BankTransferRefInput";
import ChangePaymentMethod from "@/components/shop/ChangePaymentMethod";
import CancelOrderButton from "@/components/shop/CancelOrderButton";

export const dynamic = "force-dynamic";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CREDIT_CARD: "信用卡",
  ATM_TRANSFER: "ATM 轉帳",
  LINE_PAY: "LINE Pay",
  ALIPAY: "支付寶",
  BANK_TRANSFER: "銀行轉帳",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  PROCESSING: "處理中",
  SHIPPED: "已出貨",
  DELIVERED: "已送達",
  CANCELLED: "已取消",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { payment?: string; awaiting_time?: string; msg?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  let order: any = null;
  let settings: any = null;
  try {
    [order, settings] = await Promise.all([
      prisma.order.findFirst({
        where: { id: params.id, userId: session.user.id! },
        include: {
          items: true,
          ceremonies: {
            select: {
              id: true,
              name: true,
              participantIndex: true,
              preferredTime: true,
              confirmedTime: true,
              timeConfirmed: true,
            },
            orderBy: { participantIndex: "asc" },
          },
        },
      }),
      prisma.siteSettings.findUnique({ where: { id: "singleton" } }),
    ]);
  } catch {
    // Database not connected yet
  }

  if (!order) notFound();

  let ceremonyPhotos: any[] = [];
  try {
    ceremonyPhotos = await prisma.ceremonyPhoto.findMany({
      where: { orderId: params.id },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    // CeremonyPhoto table may not exist yet
  }

  const hasCeremonies = order.ceremonies && order.ceremonies.length > 0;

  // 取得法事商品 ID 清單
  const ceremonyProductIds = new Set<string>();
  try {
    const cps = await prisma.product.findMany({
      where: { isCeremony: true },
      select: { id: true },
    });
    cps.forEach((p: any) => ceremonyProductIds.add(p.id));
  } catch { /* ignore */ }

  // 建立 item → 對應 ceremonies 的對照表（依 participantIndex 順序）
  const itemCeremoniesMap = new Map<string, any[]>();
  if (hasCeremonies) {
    let offset = 0;
    for (const item of order.items) {
      if (ceremonyProductIds.has(item.productId)) {
        const cers = order.ceremonies.slice(offset, offset + item.quantity);
        if (cers.length > 0) itemCeremoniesMap.set(item.id, cers);
        offset += item.quantity;
      }
    }
  }
  // 只有設定了 preferredTime（一對一法事）才需要確認時間
  const allTimesConfirmed = hasCeremonies
    ? order.ceremonies.every((c: any) => !c.preferredTime || c.timeConfirmed)
    : true;
  // 只有在訂單尚待確認（PENDING）且一對一法事時間未全部確認時，才鎖定付款
  const pendingTimeConfirmation =
    hasCeremonies && !allTimesConfirmed && order.status === "PENDING";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">訂單詳情</h1>
        <Link href="/orders" className="text-amber-700 text-sm hover:underline">
          ← 返回訂單列表
        </Link>
      </div>

      {order.paymentStatus === "PENDING" && order.status === "PENDING" && searchParams.payment !== "success" && (
        pendingTimeConfirmation ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⏳</span>
              <div className="flex-1">
                <h2 className="font-bold text-blue-900 mb-1">等待預約時間確認</h2>
                <p className="text-sm text-blue-800 mb-3">
                  您的預約申請已收到，管理員正在確認可用時間，確認後將開放付款。
                </p>
                <div className="space-y-2">
                  {order.ceremonies.map((c: any) => (
                    <div key={c.id} className="bg-white rounded-lg p-3 text-sm">
                      <span className="font-medium text-gray-800">{c.name}</span>
                      {c.preferredTime && (
                        <span className="ml-2 text-gray-500">
                          希望日期：{new Date(c.preferredTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                        </span>
                      )}
                      {c.timeConfirmed && c.confirmedTime ? (
                        <span className="ml-2 text-green-600 font-medium">
                          ✓ 確認日期：{new Date(c.confirmedTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                        </span>
                      ) : (
                        <span className="ml-2 text-orange-500">（待確認）</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-6">
            {hasCeremonies && allTimesConfirmed && (
              <div className="flex items-center gap-2 mb-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                <span>✅</span>
                <span>預約時間已確認，請完成付款。</span>
              </div>
            )}
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="font-bold text-yellow-900 mb-1">訂單尚未付款</h2>
                {order.paymentMethod === "BANK_TRANSFER" ? (
                  <p className="text-sm text-yellow-800">
                    請依下方銀行資訊完成匯款，並填入匯款帳號末五碼，管理員確認收款後將更新付款狀態。
                  </p>
                ) : (
                  <p className="text-sm text-yellow-800">您的訂單已建立，但付款尚未完成。請點擊下方按鈕完成付款。</p>
                )}
                {hasCeremonies && (
                  <div className="mt-2 space-y-1">
                    {order.ceremonies.map((c: any) => (
                      c.timeConfirmed && c.confirmedTime && (
                        <p key={c.id} className="text-xs text-green-700">
                          🗓️ {c.name} 確認日期：{new Date(c.confirmedTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                        </p>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* 銀行轉帳由管理員手動確認，不顯示立即付款按鈕 */}
            {order.paymentMethod !== "BANK_TRANSFER" && (
              <RetryPaymentButton orderId={order.id} paymentMethod={order.paymentMethod} />
            )}
            <div className="flex items-center gap-3 mt-3">
              <ChangePaymentMethod orderId={order.id} currentMethod={order.paymentMethod} />
              <div className="ml-auto">
                <CancelOrderButton orderId={order.id} />
              </div>
            </div>
          </div>
        )
      )}

      {searchParams.awaiting_time === "true" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">🙏</span>
          <div>
            <h2 className="font-bold text-blue-900 mb-1">預約申請已送出！</h2>
            <p className="text-sm text-blue-700">
              感謝您的預約，管理員將確認可用時間後通知您。確認後請回到此頁面完成付款。
            </p>
          </div>
        </div>
      )}

      {searchParams.payment === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <h2 className="font-bold text-green-900 mb-1">付款成功！感謝您的訂購</h2>
            <p className="text-sm text-green-700">您的訂單已確認，我們將盡快為您處理。如有問題請聯絡客服。</p>
          </div>
        </div>
      )}

      {searchParams.payment === "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <h2 className="font-bold text-yellow-900 mb-1">付款確認中</h2>
            <p className="text-sm text-yellow-700">付款資訊已送出，系統正在確認中，請稍候片刻後重新整理頁面。</p>
          </div>
        </div>
      )}

      {searchParams.payment === "failed" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <h2 className="font-bold text-red-900 mb-1">付款失敗</h2>
            <p className="text-sm text-red-700">
              {searchParams.msg ? decodeURIComponent(searchParams.msg as string) : "付款過程發生問題，請重試或選擇其他付款方式。"}
            </p>
          </div>
        </div>
      )}

      {/* LINE Pay 交易資訊 */}
      {order.paymentMethod === "LINE_PAY" && order.linePayTransactionId && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <h2 className="font-bold text-green-900 mb-2">💚 LINE Pay 付款資訊</h2>
          <p className="text-sm text-green-800">
            交易編號：<span className="font-mono">{order.linePayTransactionId}</span>
          </p>
        </div>
      )}

      {/* 銀行轉帳資訊：銀行轉帳訂單且未取消才顯示 */}
      {order.paymentMethod === "BANK_TRANSFER" && order.status !== "CANCELLED" && (
        <div className={`rounded-xl p-4 mb-6 border ${order.paymentStatus === "PAID" ? "bg-gray-50 border-gray-200" : "bg-blue-50 border-blue-200"}`}>
          <h2 className={`font-bold mb-2 ${order.paymentStatus === "PAID" ? "text-gray-700" : "text-blue-900"}`}>
            📋 銀行轉帳資訊
          </h2>
          {order.paymentStatus !== "PAID" && (
            <>
              <p className="text-sm text-blue-800 mb-2">請轉帳以下金額，並保留收據：</p>
              <div className="bg-white rounded-lg p-3 text-sm space-y-1">
                <p>銀行名稱：{settings?.bankName || "請聯絡客服"}</p>
                <p>帳號：{settings?.bankAccount || "請聯絡客服"}</p>
                <p>戶名：{settings?.bankHolder || "請聯絡客服"}</p>
                <p className="font-bold">轉帳金額：{formatCurrency(Number(order.totalAmount))}</p>
                <p className="text-gray-500">備註請填寫訂單編號：{order.orderNumber}</p>
              </div>
            </>
          )}
          <BankTransferRefInput
            orderId={order.id}
            existing={order.bankTransferRef ?? null}
            readOnly={order.paymentStatus === "PAID"}
          />
        </div>
      )}

      {/* 法事完成照片（客戶唯讀） */}
      {ceremonyPhotos.length > 0 && (
        <CeremonyPhotoGallery
          photos={ceremonyPhotos.map((p: any) => ({
            id: p.id,
            url: p.url,
            caption: p.caption ?? null,
          }))}
        />
      )}

      <div className="bg-white rounded-xl border divide-y">
        <div className="p-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-0.5">訂單編號</p>
            <p className="font-semibold">{order.orderNumber}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">訂單時間</p>
            <p>{formatDateTime(order.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-0.5">訂單狀態</p>
            <p className="font-medium">{STATUS_LABELS[order.status]}</p>
          </div>
          {(order.status !== "CANCELLED" || order.paymentStatus !== "PENDING") && (
            <div>
              <p className="text-gray-500 mb-0.5">付款方式</p>
              <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            </div>
          )}
          {(order.status !== "CANCELLED" || order.paymentStatus !== "PENDING") && (
          <div>
            <p className="text-gray-500 mb-0.5">付款狀態</p>
            <p
              className={
                order.paymentStatus === "PAID"
                  ? "text-green-600 font-medium"
                  : order.paymentStatus === "REFUNDED"
                  ? "text-gray-600 font-medium"
                  : "text-yellow-600 font-medium"
              }
            >
              {order.paymentStatus === "PAID"
                ? "已付款"
                : order.paymentStatus === "PENDING"
                ? "待付款"
                : order.paymentStatus === "REFUNDED"
                ? "已退款"
                : order.paymentStatus === "FAILED"
                ? "付款失敗"
                : order.paymentStatus}
            </p>
          </div>
          )}
          {order.paidAt && (
            <div>
              <p className="text-gray-500 mb-0.5">付款時間</p>
              <p>{formatDateTime(order.paidAt)}</p>
            </div>
          )}
          {order.shippingMethod === "CVS_PICKUP" && order.cvsStoreName && (
            <div className="col-span-2">
              <p className="text-gray-500 mb-0.5">取貨門市</p>
              <p className="font-medium">{order.cvsStoreName}</p>
              {order.shippingAddress && (
                <p className="text-gray-500 text-xs mt-0.5">{order.shippingAddress}</p>
              )}
            </div>
          )}
          {order.shippingMethod === "HOME_DELIVERY" && order.shippingAddress && (
            <div className="col-span-2">
              <p className="text-gray-500 mb-0.5">收件地址</p>
              <p>{order.shippingName && <span className="font-medium">{order.shippingName}　</span>}{order.shippingPhone && <span className="text-gray-600">{order.shippingPhone}　</span>}{order.shippingAddress}</p>
            </div>
          )}
        </div>

        <div className="p-5">
          <h2 className="font-semibold mb-3">商品明細</h2>
          <div className="space-y-2">
            {order.items.map((item) => {
              const cers = itemCeremoniesMap.get(item.id)?.filter((c: any) => c.preferredTime) ?? [];
              return (
                <div key={item.id}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(Number(item.price) * item.quantity)}
                    </span>
                  </div>
                  {cers.length > 0 && (
                    <div className="mt-1.5 space-y-1">
                      {cers.map((c: any) => (
                        <div key={c.id} className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 flex flex-wrap gap-x-3">
                          {item.quantity > 1 && (
                            <span className="font-medium text-gray-700">{c.name}：</span>
                          )}
                          <span>
                            希望日期：{new Date(c.preferredTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                          </span>
                          {c.timeConfirmed && c.confirmedTime ? (
                            <span className="text-green-600 font-medium">
                              ✓ 確認日期：{new Date(c.confirmedTime).toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" })}
                            </span>
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
          <div className="border-t mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">小計</span>
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
      </div>
    </div>
  );
}
