"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const METHODS = [
  { value: "LINE_PAY",      label: "💚 LINE Pay" },
  { value: "BANK_TRANSFER", label: "🏦 銀行轉帳" },
];

export default function ChangePaymentMethod({
  orderId,
  currentMethod,
}: {
  orderId: string;
  currentMethod: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(currentMethod);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (selected === currentMethod) { setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: selected }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "更改失敗"); return; }
      toast.success("付款方式已更新");
      setOpen(false);
      router.refresh();
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
        className="px-4 py-2 text-sm border border-amber-600 text-amber-700 rounded-lg hover:bg-amber-50 transition"
      >
        更改付款方式
      </button>
    );
  }

  return (
    <div className="mt-3 bg-white rounded-lg border border-amber-200 p-4">
      <p className="text-sm font-medium text-gray-700 mb-3">選擇新的付款方式</p>
      <div className="space-y-2 mb-4">
        {METHODS.map((m) => (
          <label key={m.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name="paymentMethod"
              value={m.value}
              checked={selected === m.value}
              onChange={() => setSelected(m.value)}
              className="accent-amber-700"
            />
            <span className="text-sm">{m.label}</span>
            {m.value === currentMethod && (
              <span className="text-xs text-gray-400">（目前）</span>
            )}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleChange}
          disabled={loading || selected === currentMethod}
          className="flex-1 bg-amber-700 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50"
        >
          {loading ? "更新中..." : "確認更改"}
        </button>
        <button
          onClick={() => { setOpen(false); setSelected(currentMethod); }}
          className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}
