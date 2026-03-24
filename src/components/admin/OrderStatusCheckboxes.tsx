"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// 狀態階段順序（用於比較）
const STATUS_RANK: Record<string, number> = {
  PENDING:    0,
  CONFIRMED:  1,
  PROCESSING: 2,
  SHIPPED:    3,
  DELIVERED:  4,
  CANCELLED:  -1,
};

interface Props {
  orderId: string;
  status: string;
}

export default function OrderStatusCheckboxes({ orderId, status }: Props) {
  const router = useRouter();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [isPending, startTransition] = useTransition();

  const rank = STATUS_RANK[optimisticStatus] ?? 0;
  const isProcessing = rank >= 2;   // PROCESSING, SHIPPED, DELIVERED
  const isShipped    = rank >= 3;   // SHIPPED, DELIVERED

  // 已取消或已完成時不可操作
  const disabled = isPending || optimisticStatus === "CANCELLED" || optimisticStatus === "DELIVERED";

  async function updateStatus(newStatus: string) {
    const prev = optimisticStatus;
    setOptimisticStatus(newStatus);  // 樂觀更新 UI

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setOptimisticStatus(prev);     // 回滾
      toast.error("狀態更新失敗");
    }
  }

  function handleProcessing(checked: boolean) {
    if (checked) {
      // 勾選：升至 PROCESSING
      updateStatus("PROCESSING");
    } else {
      // 取消勾選：退回 CONFIRMED（如果尚未出貨）
      if (rank < 3) updateStatus("CONFIRMED");
    }
  }

  function handleShipped(checked: boolean) {
    if (checked) {
      // 勾選：升至 SHIPPED（若尚未處理，順帶升為 PROCESSING 再 SHIPPED）
      updateStatus("SHIPPED");
    } else {
      // 取消勾選：退回 PROCESSING
      if (rank < 4) updateStatus("PROCESSING");
    }
  }

  return (
    <div className={`flex gap-4 justify-center ${isPending ? "opacity-60" : ""}`}>
      {/* 開始處理 */}
      <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isProcessing}
          disabled={disabled && !isProcessing}
          onChange={(e) => handleProcessing(e.target.checked)}
          className="w-4 h-4 accent-purple-600 cursor-pointer disabled:cursor-not-allowed"
        />
        <span className={`text-xs ${isProcessing ? "text-purple-700 font-medium" : "text-gray-400"}`}>
          處理
        </span>
      </label>

      {/* 出貨 */}
      <label className="flex flex-col items-center gap-1 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isShipped}
          disabled={disabled && !isShipped}
          onChange={(e) => handleShipped(e.target.checked)}
          className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed"
        />
        <span className={`text-xs ${isShipped ? "text-indigo-700 font-medium" : "text-gray-400"}`}>
          出貨
        </span>
      </label>
    </div>
  );
}
