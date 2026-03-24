"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cart";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";

function ItemCard({
  item,
  selected,
  onToggle,
  onUpdate,
  onRemove,
}: {
  item: ReturnType<typeof useCartStore.getState>["items"][0];
  selected: boolean;
  onToggle: () => void;
  onUpdate: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 flex gap-3 items-center transition ${
        selected ? "border-amber-400 bg-amber-50" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="w-4 h-4 accent-amber-600 cursor-pointer flex-shrink-0"
      />
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            {item.isCeremony ? "🙏" : "📿"}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        {item.isCeremony && (
          <span className="inline-flex gap-1 flex-wrap mt-0.5">
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              法事服務
            </span>
            {item.isOneOnOne && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                一對一
              </span>
            )}
          </span>
        )}
        <p className="text-amber-900 font-semibold mt-1">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex items-center border rounded-lg">
        <button onClick={() => onUpdate(item.quantity - 1)} className="px-2.5 py-1 hover:bg-gray-100 transition">-</button>
        <span className="px-3">{item.quantity}</span>
        <button onClick={() => onUpdate(item.quantity + 1)} className="px-2.5 py-1 hover:bg-gray-100 transition">+</button>
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 transition" title="刪除">✕</button>
    </div>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold mb-4">購物車是空的</h1>
        <Link
          href="/products"
          className="bg-amber-700 text-white px-6 py-2.5 rounded-lg hover:bg-amber-600 transition"
        >
          去選購商品
        </Link>
      </div>
    );
  }

  const ceremonyItems = items.filter((i) => i.isCeremony);
  const regularItems = items.filter((i) => !i.isCeremony);
  const ceremonyTotal = ceremonyItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const regularTotal = regularItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const toggleItem = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () =>
    allSelected ? setSelected(new Set()) : setSelected(new Set(items.map((i) => i.id)));

  const confirmBatchDelete = () => {
    selected.forEach((id) => removeItem(id));
    setSelected(new Set());
    setConfirmDelete(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">購物車</h1>

      {/* Batch action bar */}
      <div className="flex items-center gap-3 mb-3 bg-gray-50 border rounded-xl px-4 py-2.5">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="w-4 h-4 accent-amber-600 cursor-pointer"
          title="全選"
        />
        <span className="text-sm text-gray-600 flex-1">
          {selected.size > 0 ? `已選取 ${selected.size} 件` : "全選"}
        </span>
        {selected.size > 0 && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-600 hover:text-red-700 border border-red-200 bg-red-50 px-3 py-1 rounded-lg transition hover:bg-red-100"
          >
            🗑️ 刪除選取（{selected.size}）
          </button>
        )}
      </div>

      {confirmDelete && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800 mb-3">
            確定要刪除已選取的 <span className="font-bold">{selected.size} 件</span> 商品嗎？
          </p>
          <div className="flex gap-2">
            <button onClick={confirmBatchDelete} className="bg-red-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-red-500 transition">確定刪除</button>
            <button onClick={() => setConfirmDelete(false)} className="border border-gray-300 text-gray-600 text-sm px-4 py-1.5 rounded-lg hover:bg-gray-50 transition">取消</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 商品列表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 法事服務 */}
          {ceremonyItems.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                🙏 法事服務
                <span className="text-xs font-normal text-amber-600">（需單獨結帳）</span>
              </h2>
              <div className="space-y-3">
                {ceremonyItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    onUpdate={(q) => updateQuantity(item.id, q)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 一般商品 */}
          {regularItems.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                📿 一般商品
                {ceremonyItems.length > 0 && (
                  <span className="text-xs font-normal text-gray-500">（需單獨結帳）</span>
                )}
              </h2>
              <div className="space-y-3">
                {regularItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    selected={selected.has(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    onUpdate={(q) => updateQuantity(item.id, q)}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 右欄：結帳摘要 */}
        <div className="space-y-4">
          {/* 法事結帳 */}
          {ceremonyItems.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
              <h2 className="font-bold text-amber-900 mb-3">🙏 法事服務結帳</h2>
              <div className="space-y-1.5 text-sm mb-3">
                {ceremonyItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-gray-700">
                    <span className="truncate max-w-[60%]">{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-amber-200 pt-3 flex justify-between font-bold">
                <span>小計</span>
                <span className="text-amber-900">{formatCurrency(ceremonyTotal)}</span>
              </div>
              <Link
                href="/checkout?type=ceremony"
                className="block mt-4 bg-amber-700 text-white text-center py-2.5 rounded-lg font-semibold hover:bg-amber-600 transition text-sm"
              >
                前往法事服務結帳 →
              </Link>
            </div>
          )}

          {/* 一般商品結帳 */}
          {regularItems.length > 0 && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold mb-3">📿 一般商品結帳</h2>
              <div className="space-y-1.5 text-sm mb-3">
                {regularItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-gray-600">
                    <span className="truncate max-w-[60%]">{item.name} × {item.quantity}</span>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold">
                <span>小計</span>
                <span className="text-amber-900">{formatCurrency(regularTotal)}</span>
              </div>
              <Link
                href="/checkout?type=regular"
                className="block mt-4 bg-amber-700 text-white text-center py-2.5 rounded-lg font-semibold hover:bg-amber-600 transition text-sm"
              >
                前往一般商品結帳 →
              </Link>
            </div>
          )}

          <Link
            href="/products"
            className="block text-center text-amber-700 text-sm hover:underline"
          >
            繼續購物
          </Link>
        </div>
      </div>
    </div>
  );
}
