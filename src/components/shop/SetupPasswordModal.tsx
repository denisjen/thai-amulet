"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Props {
  onComplete: () => void;
}

export default function SetupPasswordModal({ onComplete }: Props) {
  const { update } = useSession();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("兩次密碼不一致");
      return;
    }
    if (form.password.length < 6) {
      toast.error("密碼至少 6 個字元");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "設定失敗");
        return;
      }
      toast.success("密碼設定成功！");
      onComplete(); // 通知父元件立即隱藏
      update().catch(() => {}); // 背景刷新 session（不阻塞 UI）
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* 頭部 */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-gray-900">設定帳號密碼</h2>
          <p className="text-sm text-gray-500 mt-2">
            您的帳號透過 Google 登入建立，請設定一組密碼以便日後也可用帳號密碼登入。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              設定密碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="至少 6 個字元"
              required
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">
              確認密碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="再次輸入密碼"
              required
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.password || !form.confirm}
            className="w-full bg-amber-700 text-white py-3 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50 mt-2"
          >
            {loading ? "設定中…" : "完成設定"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-4">
          設定密碼後即可使用手機號碼或 Email 搭配密碼登入
        </p>
      </div>
    </div>
  );
}
