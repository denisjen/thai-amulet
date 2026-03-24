import { prisma } from "@/lib/db";
import ProductCard from "@/components/shop/ProductCard";

interface Props {
  searchParams: {
    category?: string;
    ceremony?: string;
    search?: string;
    page?: string;
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const page = parseInt(searchParams.page || "1");
  const limit = 12;

  const now = new Date();
  const where: any = {
    isActive: true,
    AND: [
      { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
    ],
  };
  if (searchParams.category) where.category = { slug: searchParams.category };
  if (searchParams.ceremony !== undefined)
    where.isCeremony = searchParams.ceremony === "true";
  if (searchParams.search)
    where.name = { contains: searchParams.search };

  let products: any[] = [];
  let total = 0;
  let categories: any[] = [];

  try {
    const [rawProducts, count, cats] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
      prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);
    products = rawProducts.map((p: any) => ({ ...p, price: Number(p.price) }));
    total = count;
    categories = cats;
  } catch {
    // Database not connected yet
  }

  const totalPages = Math.ceil(total / limit);
  const isCeremonyView = searchParams.ceremony === "true";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isCeremonyView ? "法事服務" : "佛牌商品"}
      </h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <a
          href={isCeremonyView ? "/products?ceremony=true" : "/products"}
          className="bg-amber-700 text-white px-4 py-1.5 rounded-full text-sm"
        >
          全部
        </a>
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`/products?category=${cat.slug}${isCeremonyView ? "&ceremony=true" : ""}`}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              searchParams.category === cat.slug
                ? "bg-amber-700 text-white border-amber-700"
                : "border-amber-300 text-amber-800 hover:bg-amber-50"
            }`}
          >
            {cat.name}
          </a>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="text-center text-gray-500 py-20">目前沒有商品</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`?${new URLSearchParams({ ...searchParams, page: String(p) })}`}
              className={`w-9 h-9 flex items-center justify-center rounded border text-sm ${
                p === page
                  ? "bg-amber-700 text-white border-amber-700"
                  : "border-gray-300 hover:border-amber-500"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
