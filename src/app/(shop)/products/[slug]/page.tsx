import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import AddToCartButton from "@/components/shop/AddToCartButton";
import ImageGallery from "@/components/shop/ImageGallery";
import ProductTabs from "@/components/shop/ProductTabs";
import ShareButtons from "@/components/shop/ShareButtons";
import ProductCard from "@/components/shop/ProductCard";

function parseImages(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getOffShelfStatus(product: any): "pending" | "active" | "expired" | "disabled" {
  const now = new Date();
  if (!product.isActive) return "disabled";
  const started = !product.publishAt || new Date(product.publishAt) <= now;
  const notEnded = !product.unpublishAt || new Date(product.unpublishAt) > now;
  if (started && notEnded) return "active";
  if (!started) return "pending";
  return "expired";
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)
    return <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />已售完</span>;
  if (stock <= 5)
    return <span className="inline-flex items-center gap-1 text-sm font-medium text-orange-600"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />僅剩 {stock} 件</span>;
  return <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />有庫存（{stock} 件）</span>;
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  let product: any = null;
  let relatedProducts: any[] = [];

  try {
    const rawProduct = await prisma.product.findFirst({
      where: { slug: params.slug, isActive: true },
      include: { category: { select: { name: true, slug: true } } },
    });
    if (rawProduct) {
      product = { ...rawProduct, price: Number(rawProduct.price) };
      // 補讀 Prisma client 尚未支援的新欄位
      const sv: any[] = await prisma.$queryRaw`
        SELECT specialVersionEnabled, specialVersionSurcharge, specialVersionLabel
        FROM \`Product\` WHERE id = ${rawProduct.id}
      `;
      if (sv[0]) {
        product.specialVersionEnabled = Boolean(sv[0].specialVersionEnabled);
        product.specialVersionSurcharge = Number(sv[0].specialVersionSurcharge ?? 0);
        product.specialVersionLabel = sv[0].specialVersionLabel ?? null;
      }
    }

    if (product) {
      const now = new Date();
      const rawRelated = await prisma.product.findMany({
        where: {
          categoryId: product.categoryId,
          id: { not: product.id },
          isActive: true,
          AND: [
            { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
            { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
          ],
        },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: { sortOrder: "asc" },
        take: 4,
      });
      relatedProducts = rawRelated.map((p: any) => ({ ...p, price: Number(p.price) }));
    }
  } catch {
    // Database not connected
  }

  if (!product) notFound();

  let siteSettings: any = null;
  try {
    siteSettings = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
  } catch { }

  const shippingInfo = siteSettings?.shippingInfo || "滿 NT$3,000 免運費 · 宅配 2–5 個工作日";
  const paymentInfo = siteSettings?.paymentInfo || "安全付款 · 綠界金流保障";
  const guaranteeInfo = siteSettings?.guaranteeInfo || "正品保證 · 泰國直接進口";

  const status = getOffShelfStatus(product);

  // Off-shelf / pending page
  if (status === "expired" || status === "pending") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1">
          <Link href="/" className="hover:text-amber-700">首頁</Link>
          <span>›</span>
          <Link href="/products" className="hover:text-amber-700">商品</Link>
          <span>›</span>
          <span className="text-gray-900">{product.name}</span>
        </nav>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">{product.name}</h1>
          <p className="text-gray-500 mb-2">
            {status === "expired" ? "此商品已下架，感謝您的支持。" : "此商品尚未開始販售。"}
          </p>
          {status === "expired" && product.unpublishAt && (
            <p className="text-sm text-gray-400 mb-6">
              下架時間：{new Date(product.unpublishAt).toLocaleString("zh-TW")}
            </p>
          )}
          {status === "pending" && product.publishAt && (
            <p className="text-sm text-gray-400 mb-6">
              預計上架：{new Date(product.publishAt).toLocaleString("zh-TW")}
            </p>
          )}
          <Link
            href="/products"
            className="bg-amber-700 text-white px-6 py-2.5 rounded-lg hover:bg-amber-600 transition font-medium"
          >
            瀏覽其他商品
          </Link>
        </div>
      </div>
    );
  }

  const images = parseImages(product.images);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1 flex-wrap">
        <Link href="/" className="hover:text-amber-700 transition">首頁</Link>
        <span>›</span>
        <Link href="/products" className="hover:text-amber-700 transition">商品</Link>
        <span>›</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-amber-700 transition">
          {product.category.name}
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        {/* Left: Image Gallery */}
        <ImageGallery
          images={images}
          productName={product.name}
          isCeremony={product.isCeremony}
        />

        {/* Right: Product Info */}
        <div className="flex flex-col">
          {/* Category badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full hover:bg-amber-200 transition"
            >
              {product.category.name}
            </Link>
            {product.isCeremony && (
              <span className="text-xs bg-amber-700 text-white px-2.5 py-1 rounded-full">
                法事服務
              </span>
            )}
            {product.isOneOnOne && (
              <span className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full">
                一對一專屬
              </span>
            )}
          </div>

          {/* Product name */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
            {product.name}
          </h1>

          {/* Summary (short plain-text description) */}
          {product.summary && (
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{product.summary}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-3xl font-bold text-amber-900">
              {formatCurrency(
                product.specialVersionEnabled && Number(product.specialVersionSurcharge) > 0
                  ? Number(product.price) + Number(product.specialVersionSurcharge)
                  : Number(product.price)
              )}
            </span>
            {product.specialVersionEnabled && Number(product.specialVersionSurcharge) > 0 && (
              <span className="text-xs text-gray-400">
                標準版 {formatCurrency(Number(product.price))}
              </span>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 mb-4">
            {/* Stock status */}
            <div className="mb-4">
              <StockBadge stock={product.stock} />
            </div>

            {/* Add to cart */}
            <AddToCartButton product={product} />
          </div>

          {/* Ceremony notice */}
          {product.isCeremony && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              <p className="font-semibold mb-1.5">⚠️ 法事服務提示</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                <li>預約後需提供個人出生年月日</li>
                <li>需上傳近照一張（用於法事施法）</li>
                <li>個人資料受嚴格保護，僅供法事使用</li>
                {product.isOneOnOne && (
                  <li className="text-blue-800 font-medium">
                    ⏰ 一對一服務：選擇希望時間後，管理員確認時間才可付款
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Shipping quick info */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-base">🚚</span>
              <span>{shippingInfo}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-base">🔒</span>
              <span>{paymentInfo}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-base">✅</span>
              <span>{guaranteeInfo}</span>
            </div>
          </div>

          {/* Share buttons */}
          <ShareButtons name={product.name} />
        </div>
      </div>

      {/* Tabs: 商品描述 / 購物須知 / 運送方式 */}
      <ProductTabs
        description={product.description}
        isCeremony={product.isCeremony}
        shoppingNotes={siteSettings?.shoppingNotes}
        shippingMethods={siteSettings?.shippingMethods}
      />

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              相關商品
              <span className="ml-2 text-sm font-normal text-gray-500">— {product.category.name}</span>
            </h2>
            <Link
              href={`/products?category=${product.category.slug}`}
              className="text-sm text-amber-700 hover:underline"
            >
              查看全部 →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
