"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/admin/RichTextEditor"), { ssr: false });

interface Settings {
  id: string;
  siteName: string;
  bannerText: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  shippingInfo: string | null;
  paymentInfo: string | null;
  guaranteeInfo: string | null;
  contactLine: string | null;
  contactServiceHours: string | null;
  footerDescription: string | null;
  shoppingNotes: string | null;
  shippingMethods: string | null;
  homeDeliveryFee: number | null;
  cvsPickupFee: number | null;
  freeShippingThreshold: number | null;
  enableHomeDelivery: boolean | null;
  enableCvsPickup: boolean | null;
}

export default function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    siteName: settings.siteName || "",
    bannerText: settings.bannerText || "",
    bankName: settings.bankName || "",
    bankAccount: settings.bankAccount || "",
    bankHolder: settings.bankHolder || "",
    contactPhone: settings.contactPhone || "",
    contactEmail: settings.contactEmail || "",
    shippingInfo: settings.shippingInfo || "滿 NT$3,000 免運費 · 宅配 2–5 個工作日",
    paymentInfo: settings.paymentInfo || "安全付款 · 綠界金流保障",
    guaranteeInfo: settings.guaranteeInfo || "正品保證 · 泰國直接進口",
    contactLine: settings.contactLine || "@thai-amulet",
    contactServiceHours: settings.contactServiceHours || "週一至週六 10:00-20:00",
    footerDescription: settings.footerDescription || "正品泰國佛牌專賣店，提供各式佛牌及法事服務，品質保障，誠信經營。",
    shoppingNotes: settings.shoppingNotes || "",
    shippingMethods: settings.shippingMethods || "",
    homeDeliveryFee: settings.homeDeliveryFee ?? 100,
    cvsPickupFee: settings.cvsPickupFee ?? 60,
    freeShippingThreshold: settings.freeShippingThreshold ?? 3000,
    enableHomeDelivery: settings.enableHomeDelivery ?? true,
    enableCvsPickup: settings.enableCvsPickup ?? true,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("設定已儲存");
        router.refresh();
      } else {
        toast.error("儲存失敗");
      }
    } catch {
      toast.error("儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold">基本設定</h2>
        <div>
          <label className="block text-sm font-medium mb-1">網站名稱</label>
          <input
            type="text"
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">首頁公告文字（選填）</label>
          <textarea
            rows={2}
            value={form.bannerText}
            onChange={(e) => setForm({ ...form, bannerText: e.target.value })}
            placeholder="例：本週特惠商品全館 9 折..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold">銀行轉帳資訊</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">銀行名稱</label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              placeholder="例：台灣銀行"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">戶名</label>
            <input
              type="text"
              value={form.bankHolder}
              onChange={(e) => setForm({ ...form, bankHolder: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">銀行帳號</label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              placeholder="例：004-012345678900"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold">聯絡資訊</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">聯絡電話</label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">聯絡 Email</label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold">頁尾 / 聯絡我們</h2>
        <div>
          <label className="block text-sm font-medium mb-1">品牌說明（頁尾左欄）</label>
          <textarea
            rows={2}
            value={form.footerDescription}
            onChange={(e) => setForm({ ...form, footerDescription: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">LINE ID</label>
            <input
              type="text"
              value={form.contactLine}
              onChange={(e) => setForm({ ...form, contactLine: e.target.value })}
              placeholder="例：@thai-amulet"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">服務時間</label>
            <input
              type="text"
              value={form.contactServiceHours}
              onChange={(e) => setForm({ ...form, contactServiceHours: e.target.value })}
              placeholder="例：週一至週六 10:00-20:00"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">商品頁面說明文字</h2>
          <a
            href="/products"
            target="_blank"
            className="text-xs text-amber-700 hover:underline"
          >
            預覽商品頁 →
          </a>
        </div>
        <p className="text-xs text-gray-500">以下文字顯示於每個商品詳情頁面下方</p>
        <div>
          <label className="block text-sm font-medium mb-1">🚚 運費說明</label>
          <input
            type="text"
            value={form.shippingInfo}
            onChange={(e) => setForm({ ...form, shippingInfo: e.target.value })}
            placeholder="例：滿 NT$3,000 免運費 · 宅配 2–5 個工作日"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">🔒 付款說明</label>
          <input
            type="text"
            value={form.paymentInfo}
            onChange={(e) => setForm({ ...form, paymentInfo: e.target.value })}
            placeholder="例：安全付款 · 綠界金流保障"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">✅ 保證說明</label>
          <input
            type="text"
            value={form.guaranteeInfo}
            onChange={(e) => setForm({ ...form, guaranteeInfo: e.target.value })}
            placeholder="例：正品保證 · 泰國直接進口"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">購物需知</h2>
            <p className="text-xs text-gray-500 mt-0.5">顯示於商品詳情頁「購物須知」分頁</p>
          </div>
        </div>
        <RichTextEditor
          value={form.shoppingNotes}
          onChange={(val) => setForm({ ...form, shoppingNotes: val })}
          placeholder="請輸入購物需知內容（支援富文本格式）…"
          height={280}
        />
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <div>
          <h2 className="font-bold">運送方式</h2>
          <p className="text-xs text-gray-500 mt-0.5">顯示於商品詳情頁「運送方式」分頁</p>
        </div>
        <RichTextEditor
          value={form.shippingMethods}
          onChange={(val) => setForm({ ...form, shippingMethods: val })}
          placeholder="請輸入運送方式說明（支援富文本格式）…"
          height={200}
        />
      </div>

      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-bold">運費設定</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">開放宅配</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, enableHomeDelivery: !form.enableHomeDelivery })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                form.enableHomeDelivery ? "bg-amber-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  form.enableHomeDelivery ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">宅配運費 (NT$)</label>
            <input
              type="number"
              min="0"
              value={form.homeDeliveryFee}
              onChange={(e) => setForm({ ...form, homeDeliveryFee: parseInt(e.target.value, 10) || 0 })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">開放超商取貨</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, enableCvsPickup: !form.enableCvsPickup })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                form.enableCvsPickup ? "bg-amber-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  form.enableCvsPickup ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">超商取貨費用 (NT$)</label>
            <input
              type="number"
              min="0"
              value={form.cvsPickupFee}
              onChange={(e) => setForm({ ...form, cvsPickupFee: parseInt(e.target.value, 10) || 0 })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">滿額免運金額 (NT$)</label>
            <input
              type="number"
              min="0"
              value={form.freeShippingThreshold}
              onChange={(e) => setForm({ ...form, freeShippingThreshold: parseInt(e.target.value, 10) || 0 })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">訂單商品小計達此金額時免運費，設為 0 則不啟用</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="bg-amber-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-amber-600 transition disabled:opacity-50"
      >
        {loading ? "儲存中..." : "儲存設定"}
      </button>
    </div>
  );
}
