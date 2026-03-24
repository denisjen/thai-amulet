"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const CANCEL_REASONS = [
  "不想要了", "訂錯商品", "找到更便宜的", "等待時間太長", "資金問題", "其他",
];

export default function OrderCancelInline({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const finalReason = reason === "其他" ? customReason.trim() : reason;
    if (!finalReason) { toast.error("請選擇取消原因"); return; }
    if (!confirmed) { setConfirmed(true); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: "CANCELLED", cancelReason: `[客戶取消] ${finalReason}` }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "取消失敗"); return; }
      toast.success("訂單已取消");
      window.location.reload();
    } catch {
      toast.error("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="px-3 py-1.5 text-xs border border-red-400 text-red-600 rounded-lg hover:bg-red-50 transition"
      >
        取消訂單
      </button>
    );
  }

  return (
    <div
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3"
    >
      <p className="text-xs font-semibold text-red-800 mb-2">選擇取消原因</p>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {CANCEL_REASONS.map((r) => (
          <label
            key={r}
            className="flex items-center gap-1.5 cursor-pointer"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setReason(r); setConfirmed(false); }}
          >
            <input type="radio" name={`cancel-${orderId}`} value={r}
              checked={reason === r}
              onChange={() => { setReason(r); setConfirmed(false); }}
              className="accent-red-600" />
            <span className="text-xs text-gray-700">{r}</span>
          </label>
        ))}
      </div>
      {reason === "其他" && (
        <textarea value={customReason}
          onChange={(e) => { setCustomReason(e.target.value); setConfirmed(false); }}
          placeholder="請說明原因..."
          rows={2}
          className="w-full border border-red-200 rounded px-2 py-1 text-xs mb-2 focus:outline-none"
        />
      )}
      {confirmed && (
        <p className="text-xs text-red-700 bg-red-100 rounded px-2 py-1 mb-2">
          ⚠ 再次點擊確認取消訂單
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={handleCancel} disabled={loading || !reason}
          className="flex-1 bg-red-600 text-white py-1.5 rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50">
          {loading ? "處理中..." : confirmed ? "確認取消" : "申請取消"}
        </button>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); setReason(""); setConfirmed(false); }}
          className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50">
          返回
        </button>
      </div>
    </div>
  );
}
