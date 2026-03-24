"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const CANCEL_REASONS = [
  "不想要了",
  "訂錯商品",
  "找到更便宜的",
  "等待時間太長",
  "資金問題",
  "其他",
];

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleCancel = async () => {
    const finalReason = reason === "其他" ? customReason.trim() : reason;
    if (!finalReason) { toast.error("請選擇取消原因"); return; }
    if (!confirmed) { setConfirmed(true); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          status:       "CANCELLED",
          cancelReason: `[客戶取消] ${finalReason}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "取消失敗"); return; }
      toast.success("訂單已取消");
      router.push("/products");
    } catch {
      toast.error("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm border border-red-400 text-red-600 rounded-lg hover:bg-red-50 transition"
      >
        取消訂單
      </button>
    );
  }

  return (
    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
      <p className="text-sm font-semibold text-red-800 mb-3">選擇取消原因</p>
      <div className="space-y-2 mb-3">
        {CANCEL_REASONS.map((r) => (
          <label
            key={r}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => { setReason(r); setConfirmed(false); }}
          >
            <input
              type="radio"
              name={`cancelReason-${orderId}`}
              value={r}
              checked={reason === r}
              onChange={() => { setReason(r); setConfirmed(false); }}
              className="accent-red-600"
            />
            <span className="text-sm text-gray-700">{r}</span>
          </label>
        ))}
      </div>
      {reason === "其他" && (
        <textarea
          value={customReason}
          onChange={(e) => { setCustomReason(e.target.value); setConfirmed(false); }}
          placeholder="請說明取消原因..."
          rows={2}
          className="w-full border border-red-200 rounded px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-red-400"
        />
      )}
      {confirmed && (
        <p className="text-xs text-red-700 bg-red-100 border border-red-200 rounded px-3 py-2 mb-3">
          ⚠ 取消後無法復原，請再次點擊確認取消
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={loading || !reason}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          {loading ? "處理中..." : confirmed ? "確認取消訂單" : "申請取消"}
        </button>
        <button
          onClick={() => { setOpen(false); setReason(""); setConfirmed(false); }}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          返回
        </button>
      </div>
    </div>
  );
}
