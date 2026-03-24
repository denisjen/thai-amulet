"use client";

import { useCartStore } from "@/store/cart";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: any;
  stock: number;
  images: any;
  isCeremony: boolean;
  isOneOnOne?: boolean;
  specialVersionEnabled?: boolean;
  specialVersionSurcharge?: any;
  specialVersionLabel?: string | null;
}

function parseImages(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [isSpecial, setIsSpecial] = useState(
    !!(product.specialVersionEnabled && Number(product.specialVersionSurcharge) > 0)
  );
  const [stickyVisible, setStickyVisible] = useState(false);
  const mainCTARef = useRef<HTMLDivElement>(null);
  const images = parseImages(product.images);

  const surcharge = Number(product.specialVersionSurcharge ?? 0);
  const basePrice = Number(product.price);
  const finalPrice = isSpecial ? basePrice + surcharge : basePrice;
  const label = product.specialVersionLabel || "特別版";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -60px 0px" }
    );
    if (mainCTARef.current) observer.observe(mainCTARef.current);
    return () => observer.disconnect();
  }, []);

  const buildItem = () => ({
    id: isSpecial ? `${product.id}-special` : product.id,
    name: isSpecial ? `${product.name}（${label}）` : product.name,
    price: finalPrice,
    quantity: qty,
    image: images[0],
    isCeremony: product.isCeremony,
    isOneOnOne: product.isOneOnOne,
    isSpecialVersion: isSpecial,
    specialVersionLabel: isSpecial ? label : undefined,
  });

  const handleAddToCart = () => {
    addItem(buildItem());
    toast.success(`已加入購物車 × ${qty}`);
  };

  const handleBuyNow = () => {
    addItem(buildItem());
    router.push("/checkout");
  };

  if (!product.isCeremony && !product.isOneOnOne && product.stock <= 0) {
    return (
      <div className="py-3 px-4 bg-gray-100 text-gray-500 text-center rounded-lg font-medium">
        此商品已售完
      </div>
    );
  }

  return (
    <>
      <div ref={mainCTARef} className="space-y-3">
        {/* 特別版選項 */}
        {product.specialVersionEnabled && surcharge > 0 && (
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <div className="bg-purple-50 px-3 py-1.5">
              <p className="text-xs font-semibold text-purple-700">✨ 版本選擇</p>
            </div>
            <div className="divide-y divide-gray-100">
              <label className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${!isSpecial ? "bg-amber-50" : "hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  name="version"
                  checked={!isSpecial}
                  onChange={() => setIsSpecial(false)}
                  className="accent-amber-600"
                />
                <span className="flex-1 text-sm font-medium">標準版</span>
                <span className="text-sm font-bold text-amber-900">{formatCurrency(basePrice)}</span>
              </label>
              <label className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition ${isSpecial ? "bg-purple-50" : "hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  name="version"
                  checked={isSpecial}
                  onChange={() => setIsSpecial(true)}
                  className="accent-purple-600"
                />
                <span className="flex-1 text-sm font-medium">✨ {label}</span>
                <span className="text-sm font-bold text-purple-900">{formatCurrency(basePrice + surcharge)}</span>
              </label>
            </div>
          </div>
        )}

        {/* Quantity selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">數量：</span>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition text-xl font-medium text-gray-600"
              aria-label="減少"
            >
              −
            </button>
            <span className="w-12 text-center font-semibold border-x border-gray-300">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(product.isCeremony || product.isOneOnOne ? 99 : product.stock, q + 1))}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition text-xl font-medium text-gray-600"
              aria-label="增加"
            >
              +
            </button>
          </div>
          {!product.isCeremony && !product.isOneOnOne && (
            <span className="text-sm text-gray-400">庫存 {product.stock} 件</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleAddToCart}
            className="flex-1 border-2 border-amber-700 text-amber-700 py-3 rounded-lg font-semibold hover:bg-amber-50 active:bg-amber-100 transition text-sm md:text-base"
          >
            🛒 加入購物車
          </button>
          <button
            onClick={handleBuyNow}
            className="flex-1 bg-amber-700 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 active:bg-amber-800 transition text-sm md:text-base"
          >
            立即購買
          </button>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-2xl transition-transform duration-300 ${
          stickyVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="font-medium text-sm truncate">{product.name}{isSpecial ? `（${label}）` : ""}</p>
            <p className="text-amber-900 font-bold text-sm">{formatCurrency(finalPrice)}</p>
          </div>
          {/* Mini qty control */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden text-sm">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-9 flex items-center justify-center hover:bg-gray-100 transition">−</button>
            <span className="w-8 text-center font-medium border-x border-gray-300">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(product.isCeremony || product.isOneOnOne ? 99 : product.stock, q + 1))} className="w-8 h-9 flex items-center justify-center hover:bg-gray-100 transition">+</button>
          </div>
          <button
            onClick={handleAddToCart}
            className="border-2 border-amber-700 text-amber-700 px-4 py-2 rounded-lg font-semibold hover:bg-amber-50 transition text-sm whitespace-nowrap"
          >
            加入購物車
          </button>
          <button
            onClick={handleBuyNow}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-amber-600 transition text-sm whitespace-nowrap"
          >
            立即購買
          </button>
        </div>
      </div>
    </>
  );
}
