import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import ConfirmCeremonyTimeButton from "@/components/admin/ConfirmCeremonyTimeButton";
import { checkPermission } from "@/lib/check-permission";

export default async function AdminCeremoniesPage({
  searchParams,
}: {
  searchParams: { productId?: string; date?: string; includeCancelled?: string };
}) {
  await checkPermission("ceremonies");
  let ceremonies: any[] = [];
  let ceremonyProducts: any[] = [];

  try {
    // 取得所有法事商品
    ceremonyProducts = await prisma.product.findMany({
      where: { isCeremony: true },
      select: {
        id: true,
        name: true,
        ceremonyDate: true,
        ceremonyLocation: true,
      },
      orderBy: { ceremonyDate: "desc" },
    });

    // 計算每個法事商品的精確參與人數（依 participantIndex 對應）
    const ceremonyProductIdSet = new Set(ceremonyProducts.map((p: any) => p.id));
    const allCeremoniesForCount = await prisma.ceremonyInfo.findMany({
      where: { order: { status: { not: "CANCELLED" } } },
      select: {
        participantIndex: true,
        order: {
          select: {
            items: { select: { productId: true, quantity: true } },
          },
        },
      },
    });

    const productCountMap: Record<string, number> = {};
    for (const ci of allCeremoniesForCount) {
      const ceremonyItems = ci.order.items.filter(
        (item: any) => ceremonyProductIdSet.has(item.productId)
      );
      let remaining = ci.participantIndex ?? 0;
      let matchedProductId: string | null = null;
      for (const item of ceremonyItems) {
        const qty = item.quantity ?? 1;
        if (remaining < qty) {
          matchedProductId = item.productId;
          break;
        }
        remaining -= qty;
      }
      if (!matchedProductId && ceremonyItems.length > 0) {
        matchedProductId = ceremonyItems[0].productId;
      }
      if (matchedProductId) {
        productCountMap[matchedProductId] = (productCountMap[matchedProductId] || 0) + 1;
      }
    }

    ceremonyProducts = ceremonyProducts.map((p: any) => ({
      ...p,
      participantCount: productCountMap[p.id] || 0,
    }));

    // 篩選條件（預設排除已取消訂單，勾選「含取消訂單」時全顯示）
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
    }
    where.order = orderConditions;

    ceremonies = await prisma.ceremonyInfo.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            user: { select: { phone: true, name: true } },
            items: {
              select: { name: true, productId: true, quantity: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // Database not connected yet
  }

  // 當篩選特定法事商品時，依 participantIndex 精確過濾
  if (searchParams.productId) {
    const targetProductId = searchParams.productId;
    const ceremonyProductIdSet = new Set(ceremonyProducts.map((p: any) => p.id));

    ceremonies = ceremonies.filter((c: any) => {
      // 取出該訂單中的法事項目（依建立順序）
      const ceremonyOrderItems = c.order.items.filter(
        (item: any) => ceremonyProductIdSet.has(item.productId)
      );
      // 用 participantIndex 走訪，找到此 CeremonyInfo 對應的 productId
      let remaining = c.participantIndex ?? 0;
      for (const item of ceremonyOrderItems) {
        const qty = item.quantity ?? 1;
        if (remaining < qty) {
          return item.productId === targetProductId;
        }
        remaining -= qty;
      }
      // fallback: 第一個法事項目
      return ceremonyOrderItems[0]?.productId === targetProductId;
    });
  }

  const selectedProduct = searchParams.productId
    ? ceremonyProducts.find((p: any) => p.id === searchParams.productId)
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">法事管理</h1>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-gray-800">📋 法事訂單列表</h2>
          <div className="flex gap-2">
            {(() => {
              const qs = new URLSearchParams();
              if (searchParams.productId) qs.set("productId", searchParams.productId);
              else if (searchParams.date) qs.set("date", searchParams.date);
              if (searchParams.includeCancelled === "1") qs.set("includeCancelled", "1");
              const qsStr = qs.toString() ? `?${qs.toString()}` : "";
              return (
                <>
                  <Link
                    href={`/admin/ceremonies/print-roster${qsStr}`}
                    className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition"
                    target="_blank"
                  >
                    📋 列印名單
                  </Link>
                  <Link
                    href={`/admin/ceremonies/print-badges${qsStr}`}
                    className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition"
                    target="_blank"
                  >
                    🏷️ 整批名牌
                  </Link>
                </>
              );
            })()}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">篩選法事項目</label>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/ceremonies"
                className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                  !searchParams.productId && !searchParams.date
                    ? "bg-amber-700 text-white border-amber-700"
                    : "border-gray-300 hover:border-amber-500 hover:text-amber-700"
                }`}
              >
                全部
              </Link>
              {ceremonyProducts.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/admin/ceremonies?productId=${p.id}`}
                  className={`text-sm px-3 py-1.5 rounded-lg border transition ${
                    searchParams.productId === p.id
                      ? "bg-amber-700 text-white border-amber-700"
                      : "border-gray-300 hover:border-amber-500 hover:text-amber-700"
                  }`}
                >
                  {p.name}
                  <span className="ml-1 text-xs opacity-75">({p.participantCount})</span>
                </Link>
              ))}
            </div>
          </div>
          {/* Date filter (fallback) */}
          {!searchParams.productId && (
            <form className="flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1">或依訂單日期</label>
                <input
                  type="date"
                  name="date"
                  defaultValue={searchParams.date || ""}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer pb-2">
                <input
                  type="checkbox"
                  name="includeCancelled"
                  value="1"
                  defaultChecked={searchParams.includeCancelled === "1"}
                  className="w-4 h-4 accent-amber-600"
                />
                含取消訂單
              </label>
              <button type="submit" className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
                篩選
              </button>
            </form>
          )}
          {(searchParams.productId || searchParams.date) && (
            <Link
              href="/admin/ceremonies"
              className="text-sm text-gray-500 hover:text-gray-800 self-end pb-2"
            >
              ✕ 清除篩選
            </Link>
          )}
        </div>

        {selectedProduct && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm text-amber-900">
            目前顯示：<strong>{selectedProduct.name}</strong>
            {selectedProduct.ceremonyDate && (
              <span className="ml-2 text-amber-700">
                ｜法事日期：{new Date(selectedProduct.ceremonyDate).toLocaleDateString("zh-TW")}
              </span>
            )}
            {selectedProduct.ceremonyLocation && (
              <span className="ml-2 text-amber-700">｜地點：{selectedProduct.ceremonyLocation}</span>
            )}
            <span className="ml-2 text-gray-500">共 {ceremonies.length} 位參與者</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">序號</th>
              <th className="text-left px-4 py-3">姓名</th>
              <th className="text-left px-4 py-3">電話</th>
              <th className="text-left px-4 py-3">出生日期</th>
              <th className="text-left px-4 py-3">出生時間</th>
              <th className="text-left px-4 py-3">農曆生辰</th>
              <th className="text-left px-4 py-3">法事項目</th>
              <th className="text-left px-4 py-3">希望日期</th>
              <th className="text-left px-4 py-3">確認時間</th>
              <th className="text-left px-4 py-3">訂單</th>
              <th className="text-center px-4 py-3">照片</th>
              <th className="text-left px-4 py-3">建立時間</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {ceremonies.map((c: any, index: number) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(c.birthDate)}</td>
                <td className="px-4 py-3 text-gray-600">{c.birthTime || "-"}</td>
                <td className="px-4 py-3 text-gray-600">{c.lunarBirth || "-"}</td>
                <td className="px-4 py-3">
                  {(() => {
                    // 依 participantIndex 對應正確的法事商品
                    const ceremonyOrderItems = c.order.items.filter(
                      (item: any) => ceremonyProducts.some((p: any) => p.id === item.productId)
                    );
                    let remaining = c.participantIndex ?? 0;
                    let matchedName: string | null = null;
                    for (const item of ceremonyOrderItems) {
                      if (remaining < (item.quantity ?? 1)) {
                        matchedName = item.name;
                        break;
                      }
                      remaining -= (item.quantity ?? 1);
                    }
                    const itemName = matchedName || ceremonyOrderItems[0]?.name;
                    return itemName ? (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        {itemName}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {c.preferredTime
                    ? new Date(c.preferredTime).toLocaleDateString("zh-TW", {
                        year: "numeric", month: "2-digit", day: "2-digit",
                      })
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {c.preferredTime ? (
                    <ConfirmCeremonyTimeButton
                      ceremonyId={c.id}
                      preferredTime={c.preferredTime.toISOString()}
                      confirmedTime={c.confirmedTime ? c.confirmedTime.toISOString() : null}
                      timeConfirmed={c.timeConfirmed}
                    />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${c.order.id}`}
                    className="text-amber-700 hover:underline text-xs"
                  >
                    {c.order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/uploads/${c.photoPath}`}
                    alt={c.name}
                    className="w-10 h-10 rounded-lg object-cover border mx-auto"
                  />
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {formatDateTime(c.createdAt)}
                </td>
              </tr>
            ))}
            {ceremonies.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-8 text-gray-400">
                  {searchParams.productId || searchParams.date
                    ? "此篩選條件下無法事訂單"
                    : "尚無法事訂單"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500 mt-2">共 {ceremonies.length} 筆</p>
    </div>
  );
}
