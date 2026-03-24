"use client";

import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: any;
  images: any; // JSON string or array
  isCeremony: boolean;
  isOneOnOne?: boolean;
  stock: number;
  category: { name: string; slug: string };
}

function parseImages(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw) ?? []; } catch { return []; }
}

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const images = parseImages(product.images);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!product.isCeremony && !product.isOneOnOne && product.stock <= 0) return;

    addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
      image: images[0],
      isCeremony: product.isCeremony,
      isOneOnOne: product.isOneOnOne,
    });
    toast.success("已加入購物車");
  };

  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group"
    >
      <div className="relative aspect-square bg-gray-100">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {product.isCeremony ? "🙏" : "📿"}
          </div>
        )}
        {product.isCeremony && (
          <span className="absolute top-2 left-2 bg-amber-700 text-white text-xs px-2 py-0.5 rounded">
            法事服務
          </span>
        )}
        {product.isOneOnOne && (
          <span className="absolute top-2 right-2 bg-purple-700 text-white text-xs px-2 py-0.5 rounded">
            一對一
          </span>
        )}
        {!product.isCeremony && !product.isOneOnOne && product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-800 px-3 py-1 rounded font-medium text-sm">
              已售完
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-amber-700 mb-1">{product.category.name}</p>
        <h3 className="font-medium text-sm line-clamp-2 mb-2">{product.name}</h3>
        <div className="flex items-center justify-between">
          <span className="font-bold text-amber-900">
            {formatCurrency(Number(product.price))}
          </span>
          {(product.isCeremony || product.isOneOnOne || product.stock > 0) && (
            <button
              onClick={handleAddToCart}
              className="text-xs bg-amber-700 text-white px-2 py-1 rounded hover:bg-amber-600 transition"
            >
              加入購物車
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
