import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import PrintActions from "@/components/admin/PrintActions";
import CloseButton from "@/components/admin/CloseButton";
import { checkPermission } from "@/lib/check-permission";

export default async function PrintCeremonyCardsPage({
  searchParams,
}: {
  searchParams: { productId?: string };
}) {
  await checkPermission("ceremonies");
  // If no productId, show ceremony product selector
  if (!searchParams.productId) {
    let products: any[] = [];
    try {
      const allProducts = await prisma.product.findMany({
        where: { isCeremony: true },
        select: { id: true, name: true, ceremonyDate: true, ceremonyLocation: true },
        orderBy: { ceremonyDate: "desc" },
      });
      const counts = await Promise.all(
        allProducts.map((p) =>
          prisma.ceremonyInfo.count({
            where: { order: { items: { some: { productId: p.id } } } },
          })
        )
      );
      products = allProducts.map((p, i) => ({ ...p, participantCount: counts[i] }));
    } catch {}

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-xl font-bold mb-2 text-center">🃏 列印祈福卡片</h1>
          <p className="text-gray-500 text-sm text-center mb-6">請先選擇法事項目</p>
          {products.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mb-4">
              尚無法事商品，請先至商品管理建立
            </p>
          ) : (
            <div className="space-y-2 mb-6">
              {products.map((p: any) => {
                const hasParticipants = p.participantCount > 0;
                return hasParticipants ? (
                  <Link
                    key={p.id}
                    href={`/admin/ceremonies/print-cards?productId=${p.id}`}
                    className="flex justify-between items-center w-full border rounded-lg px-4 py-3 hover:bg-amber-50 hover:border-amber-400 transition"
                  >
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.ceremonyDate && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(p.ceremonyDate).toLocaleDateString("zh-TW")}
                          {p.ceremonyLocation && `　${p.ceremonyLocation}`}
                        </p>
                      )}
                    </div>
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full font-medium">
                      {p.participantCount} 人
                    </span>
                  </Link>
                ) : (
                  <div
                    key={p.id}
                    className="flex justify-between items-center w-full border border-dashed border-gray-200 rounded-lg px-4 py-3 bg-gray-50 opacity-60 cursor-not-allowed"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-400">{p.name}</p>
                      {p.ceremonyDate && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(p.ceremonyDate).toLocaleDateString("zh-TW")}
                        </p>
                      )}
                    </div>
                    <span className="bg-gray-100 text-gray-400 text-xs px-2 py-1 rounded-full">
                      尚無報名人員
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <CloseButton className="w-full border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50" />
        </div>
      </div>
    );
  }

  // Fetch ceremonies for selected product
  let ceremonies: any[] = [];
  let productName = "";
  let productDate = "";

  try {
    const product = await prisma.product.findUnique({
      where: { id: searchParams.productId },
      select: { name: true, ceremonyDate: true, ceremonyLocation: true },
    });
    if (product) {
      productName = product.name;
      productDate = product.ceremonyDate
        ? product.ceremonyDate.toLocaleDateString("zh-TW")
        : "";
    }

    ceremonies = await prisma.ceremonyInfo.findMany({
      where: { order: { items: { some: { productId: searchParams.productId } } } },
      include: {
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  } catch {}

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
          .card-grid { page-break-inside: avoid; }
        }
        body { font-family: "Microsoft JhengHei", "NotoSansTC", sans-serif; }
        .ceremony-card {
          width: 85mm;
          min-height: 54mm;
          border: 1.5px solid #92400e;
          border-radius: 8px;
          padding: 10px 12px;
          display: inline-block;
          box-sizing: border-box;
          vertical-align: top;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          page-break-inside: avoid;
          margin: 3mm;
        }
      ` }} />

      <div className="print-area p-4">
        <PrintActions
          backHref="/admin/ceremonies/print-cards"
          backLabel="重新選擇"
          printLabel="列印所有卡片"
          subtitle={`${productName}${productDate ? `　${productDate}` : ""}　共 ${ceremonies.length} 張卡片`}
        />

        <div className="flex flex-wrap">
          {ceremonies.map((c: any, i: number) => (
            <div key={c.id} className="ceremony-card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-amber-800">🙏</span>
                  <span className="text-xs font-bold text-amber-900">祈福法事牌位</span>
                </div>
                <span className="text-xs text-gray-500">#{String(i + 1).padStart(3, "0")}</span>
              </div>

              <div className="text-center mb-2">
                <p className="text-2xl font-bold text-amber-900 tracking-wider">{c.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-x-2 text-xs text-gray-700 mb-2">
                <div>
                  <span className="text-gray-500">出生：</span>
                  {formatDate(c.birthDate)}
                </div>
                {c.lunarBirth && (
                  <div className="col-span-2">
                    <span className="text-gray-500">農曆：</span>
                    {c.lunarBirth}
                  </div>
                )}
                <div className="col-span-2 text-xs text-gray-400 mt-1">
                  訂單：{c.order.orderNumber}
                </div>
              </div>

              {c.notes && (
                <div className="text-xs text-gray-600 border-t border-amber-200 pt-1 mt-1 line-clamp-2">
                  {c.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {ceremonies.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <p>此法事項目尚無參與者</p>
          </div>
        )}
      </div>
    </>
  );
}
