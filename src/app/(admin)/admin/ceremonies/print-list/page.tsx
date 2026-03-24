import { prisma } from "@/lib/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import PrintActions from "@/components/admin/PrintActions";
import CloseButton from "@/components/admin/CloseButton";
import Link from "next/link";
import { checkPermission } from "@/lib/check-permission";

export default async function PrintCeremonyListPage({
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
          <h1 className="text-xl font-bold mb-2 text-center">🖨️ 列印法事名單</h1>
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
                    href={`/admin/ceremonies/print-list?productId=${p.id}`}
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
  let productLocation = "";

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
      productLocation = product.ceremonyLocation || "";
    }

    ceremonies = await prisma.ceremonyInfo.findMany({
      where: { order: { items: { some: { productId: searchParams.productId } } } },
      include: {
        order: { select: { orderNumber: true, paymentStatus: true } },
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
          @page { size: A4; margin: 15mm; }
        }
        body { font-family: "Microsoft JhengHei", sans-serif; }
      ` }} />

      <div className="print-area max-w-4xl mx-auto p-6">
        <PrintActions backHref="/admin/ceremonies/print-list" backLabel="重新選擇" />

        <div className="text-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">{productName}</h1>
          <h2 className="text-lg text-gray-700 mt-1">法事參與者名單</h2>
          <p className="text-gray-600 mt-1 text-sm">
            {productDate && <>法事日期：{productDate}</>}
            {productDate && productLocation && <>　｜　</>}
            {productLocation && <>地點：{productLocation}</>}
            {(productDate || productLocation) && <>　｜　</>}
            列印時間：{formatDateTime(new Date())}
          </p>
          <p className="text-gray-600 text-sm">共 {ceremonies.length} 位</p>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-3 py-2 text-left w-8">序</th>
              <th className="border border-gray-300 px-3 py-2 text-left">姓名</th>
              <th className="border border-gray-300 px-3 py-2 text-left">電話</th>
              <th className="border border-gray-300 px-3 py-2 text-left">出生日期（國曆）</th>
              <th className="border border-gray-300 px-3 py-2 text-left">出生時間</th>
              <th className="border border-gray-300 px-3 py-2 text-left">農曆生辰</th>
              <th className="border border-gray-300 px-3 py-2 text-left">訂單編號</th>
              <th className="border border-gray-300 px-3 py-2 text-center">付款</th>
              <th className="border border-gray-300 px-3 py-2 text-left">備註</th>
            </tr>
          </thead>
          <tbody>
            {ceremonies.map((c: any, i: number) => (
              <tr key={c.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">{i + 1}</td>
                <td className="border border-gray-300 px-3 py-2 font-medium">{c.name}</td>
                <td className="border border-gray-300 px-3 py-2">{c.phone}</td>
                <td className="border border-gray-300 px-3 py-2">{formatDate(c.birthDate)}</td>
                <td className="border border-gray-300 px-3 py-2">{c.birthTime || ""}</td>
                <td className="border border-gray-300 px-3 py-2">{c.lunarBirth || ""}</td>
                <td className="border border-gray-300 px-3 py-2 text-xs">{c.order.orderNumber}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">
                  <span className={c.order.paymentStatus === "PAID" ? "text-green-700 font-medium" : "text-red-600"}>
                    {c.order.paymentStatus === "PAID" ? "✓" : "✗"}
                  </span>
                </td>
                <td className="border border-gray-300 px-3 py-2 text-xs">{c.notes || ""}</td>
              </tr>
            ))}
            {ceremonies.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">此法事項目尚無參與者</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-3 gap-8 text-sm text-center">
          <div><div className="border-t border-gray-400 pt-2 mt-8">主持師父簽名</div></div>
          <div><div className="border-t border-gray-400 pt-2 mt-8">核對人員</div></div>
          <div><div className="border-t border-gray-400 pt-2 mt-8">日期</div></div>
        </div>
      </div>
    </>
  );
}
