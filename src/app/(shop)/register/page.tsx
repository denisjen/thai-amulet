"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { signIn } from "next-auth/react";

type Tab = "phone" | "email";

export default function RegisterPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("phone");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ phone: "", email: "", password: "", name: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tab === "phone") {
      if (!/^09\d{8}$/.test(form.phone)) {
        toast.error("請輸入有效的台灣手機號碼（09XXXXXXXX）");
        return;
      }
    } else {
      if (!form.email.includes("@")) {
        toast.error("請輸入有效的 Email 地址");
        return;
      }
    }
    if (form.password.length < 6) {
      toast.error("密碼至少 6 個字元");
      return;
    }

    setLoading(true);
    const body =
      tab === "phone"
        ? { type: "phone", phone: form.phone, password: form.password, name: form.name }
        : { type: "email", email: form.email, password: form.password, name: form.name };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      toast.error(data.error || "註冊失敗");
      return;
    }

    // 自動登入
    await signIn("credentials", {
      login: tab === "phone" ? form.phone : form.email,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    toast.success("註冊成功！歡迎加入");
    router.push("/");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">會員註冊</h1>

          {/* Google 登入 */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "跳轉中..." : "使用 Google 帳號快速註冊"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-xs text-gray-400">或填寫資料註冊</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* 分頁 */}
          <div className="flex rounded-lg border border-gray-200 mb-4 overflow-hidden text-sm font-medium">
            <button
              type="button"
              onClick={() => setTab("phone")}
              className={`flex-1 py-2 transition ${
                tab === "phone"
                  ? "bg-amber-700 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              📱 手機號碼
            </button>
            <button
              type="button"
              onClick={() => setTab("email")}
              className={`flex-1 py-2 transition ${
                tab === "email"
                  ? "bg-amber-700 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              ✉️ Email
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "phone" ? (
              <div>
                <label className="block text-sm font-medium mb-1">手機號碼（帳號）</label>
                <input
                  type="tel"
                  placeholder="09XXXXXXXX"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">姓名（選填）</label>
              <input
                type="text"
                placeholder="您的姓名"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">密碼</label>
              <input
                type="password"
                placeholder="至少 6 個字元"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? "註冊中..." : "立即註冊"}
            </button>
          </form>
          <p className="text-center mt-4 text-sm text-gray-600">
            已有帳號？{" "}
            <Link href="/login" className="text-amber-700 hover:underline font-medium">
              立即登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
