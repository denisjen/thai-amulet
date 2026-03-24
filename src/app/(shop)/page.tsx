import Link from "next/link";
import { prisma } from "@/lib/db";
import ProductCard from "@/components/shop/ProductCard";

export default async function HomePage() {
  let amulets: any[] = [];
  let ceremonies: any[] = [];
  let categories: any[] = [];

  try {
    const now = new Date();
    const timeFilter = {
      AND: [
        { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
        { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
      ],
    };
    const [rawAmulets, rawCeremonies, cats] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, isCeremony: false, ...timeFilter },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.product.findMany({
        where: { isActive: true, isCeremony: true, ...timeFilter },
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        take: 4,
      }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);
    amulets = rawAmulets.map((p: any) => ({ ...p, price: Number(p.price) }));
    ceremonies = rawCeremonies.map((p: any) => ({ ...p, price: Number(p.price) }));
    categories = cats;
  } catch {
    // Database not connected yet — render page with empty data
  }

  return (
    <div>
      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-12 px-4 bg-white">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">商品分類</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="bg-amber-50 border border-amber-200 text-amber-900 px-6 py-2 rounded-full hover:bg-amber-100 transition font-medium"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Amulets */}
      {amulets.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">精選佛牌</h2>
              <Link href="/products" className="text-amber-700 hover:underline">
                查看全部 →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {amulets.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Ceremonies */}
      {ceremonies.length > 0 && (
        <section className="py-12 px-4 bg-amber-50">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">法事服務</h2>
              <Link
                href="/products?ceremony=true"
                className="text-amber-700 hover:underline"
              >
                查看全部 →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ceremonies.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-3">🛡️</div>
            <h3 className="font-bold text-lg mb-2">正品保障</h3>
            <p className="text-gray-600">直接從泰國原廟請回，附有開光證明</p>
          </div>
          <div>
            <div className="text-4xl mb-3">🙏</div>
            <h3 className="font-bold text-lg mb-2">專業法事</h3>
            <p className="text-gray-600">由資深師父主持各類法事，誠心祈福</p>
          </div>
          <div>
            <div className="text-4xl mb-3">🚚</div>
            <h3 className="font-bold text-lg mb-2">安全配送</h3>
            <p className="text-gray-600">精心包裝，確保佛牌安全到達您手中</p>
          </div>
        </div>
      </section>
    </div>
  );
}
