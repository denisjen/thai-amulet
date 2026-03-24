"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface Props {
  orderId: string;
  existing?: string | null;
  readOnly?: boolean;
}

export default function BankTransferRefInput({ orderId, existing, readOnly }: Props) {
  const [ref, setRef] = useState(existing || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existing);

  const handleSave = async () => {
    const digits = ref.replace(/\D/g, "").slice(0, 5);
    if (digits.length < 3) {
      toast.error("請輸入至少 3 位數字");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankTransferRef: digits }),
      });
      if (res.ok) {
        setRef(digits);
        setSaved(true);
        toast.success("匯款資訊已送出，感謝！");
      } else {
        const data = await res.json();
        toast.error(data.error || "送出失敗");
      }
    } finally {
      setSaving(false);
    }
  };

  // 付款已確認（管理員已收款）→ 唯讀顯示
  if (readOnly) {
    return (
      <div className="mt-4 border-t pt-4">
        <p className="text-sm font-medium text-gray-800 mb-1">匯款帳號末五碼</p>
        {existing ? (
          <div className="flex items-center gap-2">
            <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 font-mono font-bold tracking-widest">
              {existing}
            </div>
            <span className="text-green-600 text-sm">✓ 款項已確認收訖</span>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">（未填寫）</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t pt-4">
      <p className="text-sm font-medium text-gray-800 mb-1">
        📌 請輸入匯款帳號末五碼
      </p>
      <p className="text-xs text-gray-500 mb-3">
        完成匯款後，請填入您匯款帳號的末五碼，方便我們核對款項。
      </p>
      {saved ? (
        <div className="flex items-center gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-800 font-mono font-bold tracking-widest">
            {ref}
          </div>
          <span className="text-green-600 text-sm">✓ 已送出</span>
          <button
            type="button"
            onClick={() => setSaved(false)}
            className="text-xs text-gray-400 hover:underline"
          >
            修改
          </button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            value={ref}
            onChange={(e) => setRef(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="例：12345"
            className="w-32 border rounded-lg px-3 py-2 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || ref.replace(/\D/g, "").length < 3}
            className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50"
          >
            {saving ? "送出中…" : "確認送出"}
          </button>
          {existing && (
            <button
              type="button"
              onClick={() => { setRef(existing); setSaved(true); }}
              className="text-xs text-gray-400 hover:underline"
            >
              取消
            </button>
          )}
        </div>
      )}
    </div>
  );
}
