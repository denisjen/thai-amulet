import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import ProductFilterBar from "@/components/admin/ProductFilterBar";
import { checkPermission } from "@/lib/check-permission";
import DeleteProductButton from "@/components/admin/DeleteProductButton";

function getPublishStatus(product: any): { label: string; color: string } {
  const now = new Date();
  if (!product.isActive) return { label: "停用", color: "bg-red-100 text-red-800" };

  const started = !product.publishAt || new Date(product.publishAt) <= now;
  const notEnded = !product.unpublishAt || new Date(product.unpublishAt) > now;

  if (started && notEnded) return { label: "上架中", color: "bg-green-100 text-green-800" };
  if (!started) return { label: "待上架", color: "bg-blue-100 text-blue-800" };
  return { label: "已下架", color: "bg-gray-100 text-gray-600" };
}

function formatDt(dt: any) {
  if (!dt) return "-";
  const d = new Date(dt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${day} ${h}:${min}`;
}

interface PageProps {
  searchParams: {
    category?: string;
    status?: string;
    publishFrom?: string;
    publishTo?: string;
    unpublishFrom?: string;
    unpublishTo?: string;
    search?: string;
  };
}

export default async function AdminProductsPage({ searchParams }: PageProps) {
  await checkPermission("products");
  const {
    category,
    status: statusFilter,
    publishFrom,
    publishTo,
    unpublishFrom,
    unpublishTo,
    search,
  } = searchParams;

  const now = new Date();
  const where: any = {};

  // 狀態篩選
  if (statusFilter === "disabled") {
    where.isActive = false;
  } else if (statusFilter === "active") {
    where.isActive = true;
    where.AND = [
      { OR: [{ publishAt: null }, { publishAt: { lte: now } }] },
      { OR: [{ unpublishAt: null }, { unpublishAt: { gt: now } }] },
    ];
  } else if (statusFilter === "pending") {
    where.isActive = true;
    where.AND = [{ publishAt: { gt: now } }];
  } else if (statusFilter === "ended") {
    where.isActive = true;
    where.AND = [
      { NOT: { unpublishAt: null } },
      { unpublishAt: { lte: now } },
    ];
  }

  // 分類篩選
  if (category) where.categoryId = category;

  // 商品名稱搜尋
  if (search) where.name = { contains: search };

  // 上架時間範圍篩選
  if (publishFrom || publishTo) {
    const range: any = {};
    if (publishFrom) range.gte = new Date(publishFrom);
    if (publishTo) {
      const end = new Date(publishTo);
      end.setDate(end.getDate() + 1); // 包含當天結束
      range.lte = end;
    }
    where.AND = [...(where.AND ?? []), { publishAt: range }];
  }

  // 下架時間範圍篩選
  if (unpublishFrom || unpublishTo) {
    const range: any = {};
    if (unpublishFrom) range.gte = new Date(unpublishFrom);
    if (unpublishTo) {
      const end = new Date(unpublishTo);
      end.setDate(end.getDate() + 1); // 包含當天結束
      range.lte = end;
    }
    where.AND = [...(where.AND ?? []), { unpublishAt: range }];
  }

  let products: any[] = [];
  let categories: any[] = [];

  try {
    [products, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { name: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      }),
    ]);
  } catch {
    // Database not connected yet
  }

  const isFiltered = !!(
    category || statusFilter || publishFrom || publishTo || unpublishFrom || unpublishTo || search
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">商品管理</h1>
        <div className="flex gap-2">
          <Link
            href={`/admin/products/print?${buildPrintQs(searchParams)}`}
            target="_blank"
            className="border border-amber-700 text-amber-700 px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition"
          >
            🖨️ 列印明細
          </Link>
          <Link
            href="/admin/products/new"
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition"
          >
            + 新增商品
          </Link>
        </div>
      </div>

      <ProductFilterBar
        categories={categories}
        defaultValues={{
          category: category ?? "",
          status: statusFilter ?? "",
          publishFrom: publishFrom ?? "",
          publishTo: publishTo ?? "",
          unpublishFrom: unpublishFrom ?? "",
          unpublishTo: unpublishTo ?? "",
          search: search ?? "",
        }}
      />

      {isFiltered && (
        <p className="mb-4 text-sm text-gray-600">
          找到{" "}
          <span className="font-semibold text-amber-700">{products.length}</span>{" "}
          筆符合條件的商品
        </p>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3">商品名稱</th>
              <th className="text-left px-4 py-3">分類</th>
              <th className="text-right px-4 py-3">售價</th>
              <th className="text-center px-4 py-3">庫存</th>
              <th className="text-left px-4 py-3">上架時間</th>
              <th className="text-left px-4 py-3">下架時間</th>
              <th className="text-center px-4 py-3">狀態</th>
              <th className="text-center px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  {isFiltered ? "查無符合條件的商品" : "尚無商品"}
                </td>
              </tr>
            )}
            {products.map((product) => {
              const rowStatus = getPublishStatus(product);
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-1.5 flex-wrap">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="font-medium text-gray-900 hover:text-amber-700 hover:underline transition"
                      >
                        {product.name}
                      </Link>
                      {product.isCeremony && (
                        <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                          法事
                        </span>
                      )}
                      {product.isOneOnOne && (
                        <span className="text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                          一對一
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{product.category.name}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(Number(product.price))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={product.stock === 0 ? "text-red-600 font-medium" : ""}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDt(product.publishAt)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{formatDt(product.unpublishAt)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded ${rowStatus.color}`}>
                      {rowStatus.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-amber-700 hover:underline text-xs"
                    >
                      編輯
                    </Link>
                    <DeleteProductButton
                      productId={product.id}
                      productName={product.name}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildPrintQs(sp: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => { if (v) p.set(k, v); });
  return p.toString();
}
