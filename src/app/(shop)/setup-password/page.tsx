"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

type PageState = "checking" | "form" | "done";

export default function SetupPasswordPage() {
  const { status, update } = useSession();
  const [pageState, setPageState] = useState<PageState>("checking");
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  // 向後端確認是否真的需要設定密碼（不依賴 JWT flag 時序）
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      window.location.replace("/login?callbackUrl=/setup-password");
      return;
    }

    // 已登入 → 查 DB 確認
    fetch("/api/account/set-password")
      .then((r) => r.json())
      .then((data) => {
        if (!data.needsSetup) {
          // 已有密碼 → 直接跳商品頁
          window.location.replace("/products");
        } else {
          setPageState("form");
        }
      })
      .catch(() => {
        // 查詢失敗時仍顯示表單，讓使用者可以操作
        setPageState("form");
      });
  }, [status]);

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
      setPageState("done");
      // 更新 session token（背景執行），然後立即導向商品頁
      update().catch(() => {});
      window.location.replace("/products");
    } finally {
      setLoading(false);
    }
  };

  // 確認中 / 已完成（導向中）— 顯示 loading 畫面
  if (pageState !== "form") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">載入中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold text-gray-900">設定帳號密碼</h1>
            <p className="text-sm text-gray-500 mt-2">
              您的帳號透過 Google 登入建立，請設定一組密碼，<br />
              日後也可使用帳號密碼登入。
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
                autoFocus
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

          <p className="text-xs text-center text-gray-400 mt-5">
            設定完成後即可使用手機號碼或 Email 搭配密碼登入
          </p>
        </div>
      </div>
    </div>
  );
}
