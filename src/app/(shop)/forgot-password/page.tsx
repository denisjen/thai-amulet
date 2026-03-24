"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json();
      toast.error(data.error || "請稍後再試");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-2">忘記密碼</h1>
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📧</div>
              <p className="text-gray-700 mb-2">重設郵件已發送！</p>
              <p className="text-sm text-gray-500 mb-6">
                請查收您的 Email，點擊信中連結重設密碼（連結 1 小時內有效）。
              </p>
              <Link href="/login" className="text-amber-700 hover:underline">
                返回登入
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 text-center mb-6">
                輸入您的 Email，我們將發送密碼重設連結。
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {loading ? "發送中..." : "發送重設郵件"}
                </button>
              </form>
              <p className="text-center mt-4 text-sm text-gray-600">
                <Link href="/login" className="text-amber-700 hover:underline">
                  返回登入
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
