"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  userId: string;
  userName: string;
  orderCount: number;
}

export default function DeleteUserButton({ userId, userName, orderCount }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 有訂單記錄 → 不可刪除
  if (orderCount > 0) {
    return (
      <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        此會員有 <strong>{orderCount}</strong> 筆訂單記錄，無法刪除帳號。
        若需停用請使用「帳號啟用」開關。
      </div>
    );
  }

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "刪除失敗");
        setConfirm(false);
        return;
      }
      toast.success("會員帳號已刪除");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  if (confirm) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-red-800">
          確定要刪除會員「<strong>{userName}</strong>」的帳號？
        </p>
        <p className="text-xs text-red-500">此操作無法復原。</p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-500 transition disabled:opacity-50"
          >
            {loading ? "刪除中…" : "確認刪除"}
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-sm text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition"
    >
      🗑️ 刪除此帳號
    </button>
  );
}
