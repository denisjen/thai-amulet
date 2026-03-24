"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

interface Category {
  id: string;
  name: string;
}

interface CeremonyEvent {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  summary?: string | null;
  description: string;
  price: any;
  stock: number;
  categoryId: string;
  images: string | string[] | null;
  isCeremony: boolean;
  isOneOnOne?: boolean;
  ceremonyEventId?: string | null;
  ceremonyDate?: string | Date | null;
  ceremonyLocation?: string | null;
  specialVersionEnabled?: boolean;
  specialVersionSurcharge?: any;
  specialVersionLabel?: string | null;
  isActive: boolean;
  sortOrder: number;
  publishAt?: string | Date | null;
  unpublishAt?: string | Date | null;
}

function toDatetimeLocal(val?: string | Date | null): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseImages(images: string | string[] | null): string[] {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try { return JSON.parse(images); } catch { return []; }
}

export default function ProductForm({
  product,
  categories,
  ceremonyEvents = [],
}: {
  product?: Product;
  categories: Category[];
  ceremonyEvents?: CeremonyEvent[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name || "",
    summary: product?.summary || "",
    description: product?.description || "",
    price: product ? String(Number(product.price)) : "",
    stock: product ? String(product.stock) : "0",
    categoryId: product?.categoryId || categories[0]?.id || "",
    images: parseImages(product?.images ?? null),
    isCeremony: product?.isCeremony || false,
    isOneOnOne: product?.isOneOnOne || false,
    ceremonyEventId: product?.ceremonyEventId || "",
    ceremonyDate: toDatetimeLocal(product?.ceremonyDate).split("T")[0] || "",
    ceremonyLocation: product?.ceremonyLocation || "",
    specialVersionEnabled: product?.specialVersionEnabled || false,
    specialVersionSurcharge: product ? String(Number(product.specialVersionSurcharge ?? 0)) : "0",
    specialVersionLabel: product?.specialVersionLabel || "特別版",
    isActive: product?.isActive ?? true,
    sortOrder: product ? String(product.sortOrder) : "0",
    publishAt: toDatetimeLocal(product?.publishAt),
    unpublishAt: toDatetimeLocal(product?.unpublishAt),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);

    const newImages: string[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (res.ok && data.url) {
          newImages.push(data.url); // 儲存完整路徑，如 /uploads/xxx.jpg
        } else {
          toast.error(data.error || `${file.name} 上傳失敗`);
        }
      }
      if (newImages.length > 0) {
        setForm((f) => ({ ...f, images: [...f.images, ...newImages] }));
        toast.success(`已上傳 ${newImages.length} 張圖片`);
      }
    } catch (err) {
      toast.error("上傳發生錯誤，請稍後再試");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const moveImage = (from: number, to: number) => {
    setForm((f) => {
      const imgs = [...f.images];
      const [item] = imgs.splice(from, 1);
      imgs.splice(to, 0, item);
      return { ...f, images: imgs };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.categoryId) {
      toast.error("請先建立商品分類");
      return;
    }

    if (!form.description || form.description === "<p><br></p>") {
      toast.error("請輸入商品描述");
      return;
    }

    if (form.publishAt && form.unpublishAt) {
      if (new Date(form.publishAt) >= new Date(form.unpublishAt)) {
        toast.error("下架時間必須晚於上架時間");
        return;
      }
    }

    const price = parseFloat(form.price);
    if (!form.price || isNaN(price) || price <= 0) {
      toast.error("請輸入有效售價");
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      price,
      stock: parseInt(form.stock) || 0,
      sortOrder: parseInt(form.sortOrder) || 0,
      publishAt: form.publishAt || null,
      unpublishAt: form.unpublishAt || null,
      ceremonyEventId: form.isCeremony ? (form.ceremonyEventId || null) : null,
      ceremonyDate: form.isCeremony ? (form.ceremonyDate || null) : null,
      ceremonyLocation: form.isCeremony ? (form.ceremonyLocation || null) : null,
      specialVersionEnabled: form.specialVersionEnabled,
      specialVersionSurcharge: parseFloat(form.specialVersionSurcharge) || 0,
      specialVersionLabel: form.specialVersionEnabled ? (form.specialVersionLabel || "特別版") : null,
    };

    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Response wasn't JSON (e.g. server HTML error page)
      }

      if (res.ok) {
        toast.success(product ? "商品已更新" : "商品已建立");
        router.push("/admin/products");
        router.refresh();
      } else {
        toast.error(data.error || `伺服器錯誤 (${res.status})`);
      }
    } catch (err: any) {
      toast.error("網路錯誤，請確認連線後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 基本資料 */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-700 border-b pb-2">基本資料</h2>

        <div>
          <label className="block text-sm font-medium mb-1">商品名稱 *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            商品說明
            <span className="text-gray-400 font-normal ml-1 text-xs">（顯示於商品頁標題下方，純文字）</span>
          </label>
          <textarea
            rows={2}
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="簡短介紹此商品的特色或亮點，例如：龍婆托親自開光，護身化煞效果強大..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">商品描述 *</label>
          <RichTextEditor
            value={form.description}
            onChange={(val) => setForm({ ...form, description: val })}
            placeholder="請輸入商品描述（支援格式化文字、連結等）"
            height={280}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">售價 (TWD) *</label>
            <input
              type="number"
              required
              min="0"
              step="1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">庫存數量</label>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">排序（小的優先）</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">商品分類 *</label>
            {categories.length === 0 ? (
              <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                尚無分類，請先至「分類管理」建立分類
              </div>
            ) : (
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-5 items-center flex-wrap">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isCeremony}
                  onChange={(e) => setForm({ ...form, isCeremony: e.target.checked, isOneOnOne: false, ceremonyEventId: "" })}
                  className="w-4 h-4 accent-amber-600"
                />
                法事服務
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 accent-amber-600"
                />
                啟用商品
              </label>
            </div>
            {/* 特別版設定 */}
            <div className="space-y-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-purple-800">✨ 特別版選項</p>
                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-purple-900 font-medium">
                  <input
                    type="checkbox"
                    checked={form.specialVersionEnabled}
                    onChange={(e) => setForm({ ...form, specialVersionEnabled: e.target.checked })}
                    className="w-3.5 h-3.5 accent-purple-600"
                  />
                  啟用特別版
                </label>
              </div>
              {form.specialVersionEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">選項名稱</label>
                    <input
                      type="text"
                      value={form.specialVersionLabel}
                      onChange={(e) => setForm({ ...form, specialVersionLabel: e.target.value })}
                      placeholder="例：特別版、加強版"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">加價金額（元）</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.specialVersionSurcharge}
                      onChange={(e) => setForm({ ...form, specialVersionSurcharge: e.target.value })}
                      placeholder="0"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {form.isCeremony && (
              <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-800">法事相關資訊</p>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-amber-900 font-medium">
                    <input
                      type="checkbox"
                      checked={form.isOneOnOne}
                      onChange={(e) => setForm({ ...form, isOneOnOne: e.target.checked, ceremonyDate: "", ceremonyLocation: "" })}
                      className="w-3.5 h-3.5 accent-amber-600"
                    />
                    一對一法事
                  </label>
                </div>
                {form.isOneOnOne ? (
                  <div className="bg-white border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 space-y-1">
                    <p className="font-semibold">✅ 已啟用一對一模式</p>
                    <p>客戶預約時需選擇希望時間，由管理員確認後才可付款。法事日期將由訂單確認流程決定，無需在此設定。</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">法事日期</label>
                      <input
                        type="date"
                        value={form.ceremonyDate}
                        onChange={(e) => setForm({ ...form, ceremonyDate: e.target.value })}
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">法事地點</label>
                      <input
                        type="text"
                        value={form.ceremonyLocation}
                        onChange={(e) => setForm({ ...form, ceremonyLocation: e.target.value })}
                        placeholder="例：台北市大安區XX寺"
                        className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 商品圖片 */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="font-semibold text-gray-700">
            商品圖片
            <span className="text-xs text-gray-400 font-normal ml-2">
              第一張為主圖，可左右拖移調整順序
            </span>
          </h2>
          <span className={`text-xs px-2 py-0.5 rounded ${
            form.images.length >= 3
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {form.images.length} / 已上傳（建議至少 3 張）
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          {form.images.map((img, i) => (
            <div key={i} className="relative group">
              {/* 主圖標記 */}
              {i === 0 && (
                <div className="absolute top-1 left-1 z-10 bg-amber-600 text-white text-xs px-1.5 py-0.5 rounded">
                  主圖
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`圖片 ${i + 1}`}
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 group-hover:border-amber-400 transition"
              />
              {/* 操作按鈕 */}
              <div className="absolute inset-0 bg-black bg-opacity-40 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    className="bg-white text-gray-700 rounded px-1.5 py-0.5 text-xs hover:bg-gray-100"
                    title="左移"
                  >
                    ←
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="bg-red-500 text-white rounded px-1.5 py-0.5 text-xs hover:bg-red-600"
                  title="刪除"
                >
                  ✕
                </button>
                {i < form.images.length - 1 && (
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    className="bg-white text-gray-700 rounded px-1.5 py-0.5 text-xs hover:bg-gray-100"
                    title="右移"
                  >
                    →
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* 上傳按鈕 */}
          <label className={`w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition ${
            uploading
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-amber-500 hover:bg-amber-50"
          }`}>
            {uploading ? (
              <span className="text-xs text-gray-400">上傳中...</span>
            ) : (
              <>
                <span className="text-2xl text-gray-400">+</span>
                <span className="text-xs text-gray-400 mt-0.5">新增圖片</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {form.images.length < 3 && (
          <p className="mt-3 text-xs text-amber-600">
            💡 建議上傳至少 3 張圖片，展示商品不同角度
          </p>
        )}
      </div>

      {/* 上下架時間 */}
      <div className="bg-white rounded-xl border p-5">
        <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">
          📅 上下架時間排程
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          不填寫則以「啟用商品」狀態為準。填寫後將在指定時間自動上/下架。
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              上架時間
              <span className="text-gray-400 font-normal ml-1 text-xs">（不填 = 立即）</span>
            </label>
            <input
              type="datetime-local"
              value={form.publishAt}
              onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {form.publishAt && (
              <button type="button" onClick={() => setForm({ ...form, publishAt: "" })}
                className="text-xs text-red-500 hover:underline mt-1">清除</button>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              下架時間
              <span className="text-gray-400 font-normal ml-1 text-xs">（不填 = 永不下架）</span>
            </label>
            <input
              type="datetime-local"
              value={form.unpublishAt}
              onChange={(e) => setForm({ ...form, unpublishAt: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {form.unpublishAt && (
              <button type="button" onClick={() => setForm({ ...form, unpublishAt: "" })}
                className="text-xs text-red-500 hover:underline mt-1">清除</button>
            )}
          </div>
        </div>
        {(form.publishAt || form.unpublishAt) && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-800 space-y-1">
            {form.publishAt && <div>🕐 上架：{new Date(form.publishAt).toLocaleString("zh-TW")}</div>}
            {form.unpublishAt && <div>🕐 下架：{new Date(form.unpublishAt).toLocaleString("zh-TW")}</div>}
          </div>
        )}
      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-amber-700 text-white px-8 py-2.5 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
        >
          {loading ? "儲存中..." : product ? "更新商品" : "建立商品"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="border border-gray-300 px-6 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
        >
          取消
        </button>
      </div>
    </form>
  );
}
