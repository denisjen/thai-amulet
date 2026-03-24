import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { checkPermission } from "@/lib/check-permission";
import PrintButton from "./PrintButton";

function getPublishStatus(product: any): { label: string; color: string } {
  const now = new Date();
  if (!product.isActive) return { label: "停用", color: "text-red-700" };

  const started = !product.publishAt || new Date(product.publishAt) <= now;
  const notEnded = !product.unpublishAt || new Date(product.unpublishAt) > now;

  if (started && notEnded) return { label: "上架中", color: "text-green-700" };
  if (!started) return { label: "待上架", color: "text-blue-700" };
  return { label: "已下架", color: "text-gray-500" };
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

const STATUS_LABELS: Record<string, string> = {
  active: "上架中",
  pending: "待上架",
  ended: "已下架",
  disabled: "停用",
};

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

export default async function ProductsPrintPage({ searchParams }: PageProps) {
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

  if (category) where.categoryId = category;
  if (search) where.name = { contains: search };

  if (publishFrom || publishTo) {
    const range: any = {};
    if (publishFrom) range.gte = new Date(publishFrom);
    if (publishTo) {
      const end = new Date(publishTo);
      end.setDate(end.getDate() + 1);
      range.lte = end;
    }
    where.AND = [...(where.AND ?? []), { publishAt: range }];
  }

  if (unpublishFrom || unpublishTo) {
    const range: any = {};
    if (unpublishFrom) range.gte = new Date(unpublishFrom);
    if (unpublishTo) {
      const end = new Date(unpublishTo);
      end.setDate(end.getDate() + 1);
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

  const activeCategoryName = categories.find((c) => c.id === category)?.name;
  const printTime = new Date().toLocaleString("zh-TW", { hour12: false });

  return (
    <>
      {/* 列印樣式 */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          .print-area { padding: 0 !important; border: none !important; border-radius: 0 !important; }
          table { page-break-inside: auto; border-collapse: collapse; width: 100%; }
          tr    { page-break-inside: avoid; page-break-after: auto; }
          td, th { border: 1px solid #ccc !important; }
        }
      `}</style>

      {/* 操作列（列印時隱藏） */}
      <div className="no-print flex items-center flex-wrap gap-3 mb-5 p-4 bg-white border rounded-xl">
        <PrintButton />
        <Link
          href={`/admin/products?${buildQs(searchParams)}`}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          ← 返回商品管理
        </Link>
      </div>

      {/* 文件主體 */}
      <div className="print-area bg-white rounded-xl border p-6">
        {/* 標頭 */}
        <div className="text-center mb-5 border-b pb-4">
          <h1 className="text-xl font-bold">商品明細表</h1>
          <p className="text-sm text-gray-500 mt-1">列印時間：{printTime}</p>
        </div>

        {/* 篩選條件摘要 */}
        <div className="no-print flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg px-4 py-2.5">
          {search && <span><b>搜尋：</b>{search}</span>}
          {activeCategoryName && <span><b>分類：</b>{activeCategoryName}</span>}
          {statusFilter && <span><b>狀態：</b>{STATUS_LABELS[statusFilter] ?? statusFilter}</span>}
          {publishFrom && <span><b>上架起：</b>{publishFrom}</span>}
          {publishTo && <span><b>上架迄：</b>{publishTo}</span>}
          {unpublishFrom && <span><b>下架起：</b>{unpublishFrom}</span>}
          {unpublishTo && <span><b>下架迄：</b>{unpublishTo}</span>}
          <span><b>筆數：</b>{products.length} 筆</span>
        </div>

        {/* 商品表格 */}
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 text-center">
              <th className="border px-3 py-2 whitespace-nowrap">#</th>
              <th className="border px-3 py-2 text-left">商品名稱</th>
              <th className="border px-3 py-2 whitespace-nowrap">分類</th>
              <th className="border px-3 py-2 whitespace-nowrap">類型</th>
              <th className="border px-3 py-2 whitespace-nowrap">售價</th>
              <th className="border px-3 py-2 whitespace-nowrap">庫存</th>
              <th className="border px-3 py-2 whitespace-nowrap">上架時間</th>
              <th className="border px-3 py-2 whitespace-nowrap">下架時間</th>
              <th className="border px-3 py-2 whitespace-nowrap">狀態</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const status = getPublishStatus(product);
              const tags: string[] = [];
              if (product.isCeremony) tags.push("法事");
              if (product.isOneOnOne) tags.push("一對一");
              if (product.specialVersionEnabled) tags.push("特別版");

              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="border px-3 py-2 text-gray-400 text-xs text-center">{idx + 1}</td>
                  <td className="border px-3 py-2">
                    <div className="font-medium">{product.name}</div>
                    {product.summary && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.summary}</div>
                    )}
                  </td>
                  <td className="border px-3 py-2 text-center whitespace-nowrap text-xs">
                    {product.category.name}
                  </td>
                  <td className="border px-3 py-2 text-center whitespace-nowrap text-xs">
                    {tags.length > 0 ? tags.join("・") : "一般"}
                  </td>
                  <td className="border px-3 py-2 text-right font-medium whitespace-nowrap">
                    {formatCurrency(Number(product.price))}
                  </td>
                  <td className={`border px-3 py-2 text-center whitespace-nowrap ${product.stock === 0 ? "text-red-600 font-bold" : ""}`}>
                    {product.stock}
                  </td>
                  <td className="border px-3 py-2 text-center text-xs whitespace-nowrap">
                    {formatDt(product.publishAt)}
                  </td>
                  <td className="border px-3 py-2 text-center text-xs whitespace-nowrap">
                    {formatDt(product.unpublishAt)}
                  </td>
                  <td className={`border px-3 py-2 text-center text-xs font-medium whitespace-nowrap ${status.color}`}>
                    {status.label}
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={9} className="border px-3 py-8 text-center text-gray-400">
                  沒有符合條件的商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function buildQs(sp: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => { if (v) p.set(k, v); });
  return p.toString();
}
