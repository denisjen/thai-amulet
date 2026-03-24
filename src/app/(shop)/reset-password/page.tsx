"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow p-8 text-center max-w-md w-full">
          <p className="text-red-600 mb-4">無效的重設連結</p>
          <Link href="/forgot-password" className="text-amber-700 hover:underline">
            重新申請
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("兩次密碼不一致");
      return;
    }
    if (password.length < 6) {
      toast.error("密碼至少 6 個字元");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success("密碼已重設！");
      router.push("/login");
    } else {
      toast.error(data.error || "重設失敗");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-2xl font-bold text-center mb-6">重設密碼</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">新密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字元"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">確認新密碼</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次輸入密碼"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-700 text-white py-2.5 rounded-lg font-semibold hover:bg-amber-600 transition disabled:opacity-50"
            >
              {loading ? "重設中..." : "確認重設"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
