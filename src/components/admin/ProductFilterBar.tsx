"use client";

import { useRouter, usePathname } from "next/navigation";

interface Category {
  id: string;
  name: string;
}

interface DefaultValues {
  category: string;
  status: string;
  publishFrom: string;
  publishTo: string;
  unpublishFrom: string;
  unpublishTo: string;
  search: string;
}

interface Props {
  categories: Category[];
  defaultValues: DefaultValues;
}

export default function ProductFilterBar({ categories, defaultValues }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    (
      ["category", "status", "publishFrom", "publishTo", "unpublishFrom", "unpublishTo", "search"] as const
    ).forEach((key) => {
      const val = data.get(key) as string;
      if (val) params.set(key, val);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleReset() {
    router.push(pathname);
  }

  const hasFilter =
    defaultValues.category ||
    defaultValues.status ||
    defaultValues.publishFrom ||
    defaultValues.publishTo ||
    defaultValues.unpublishFrom ||
    defaultValues.unpublishTo ||
    defaultValues.search;

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* 搜尋 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">搜尋商品名稱</label>
          <input
            name="search"
            type="text"
            defaultValue={defaultValues.search}
            placeholder="輸入商品名稱..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* 分類 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">分類</label>
          <select
            name="category"
            defaultValue={defaultValues.category}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">全部分類</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 上架狀態 */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">上架狀態</label>
          <select
            name="status"
            defaultValue={defaultValues.status}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">全部狀態</option>
            <option value="active">上架中</option>
            <option value="pending">待上架</option>
            <option value="ended">已下架</option>
            <option value="disabled">停用</option>
          </select>
        </div>
      </div>

      {/* 上下架時間範圍 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <span className="text-green-700">▲</span> 上架時間（起）
          </label>
          <input
            name="publishFrom"
            type="date"
            defaultValue={defaultValues.publishFrom}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <span className="text-green-700">▲</span> 上架時間（迄）
          </label>
          <input
            name="publishTo"
            type="date"
            defaultValue={defaultValues.publishTo}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <span className="text-gray-500">▼</span> 下架時間（起）
          </label>
          <input
            name="unpublishFrom"
            type="date"
            defaultValue={defaultValues.unpublishFrom}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <span className="text-gray-500">▼</span> 下架時間（迄）
          </label>
          <input
            name="unpublishTo"
            type="date"
            defaultValue={defaultValues.unpublishTo}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {hasFilter ? (
          <p className="text-xs text-amber-700">✦ 篩選條件已套用</p>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50 transition"
          >
            清除篩選
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition"
          >
            套用篩選
          </button>
        </div>
      </div>
    </form>
  );
}
