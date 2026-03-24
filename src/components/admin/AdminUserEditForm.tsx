"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AdminUserEditForm({ user }: { user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [form, setForm] = useState({
    name: user.name || "",
    phone: user.phone || "",
    email: user.email || "",
    isActive: user.isActive,
  });
  const [pwForm, setPwForm] = useState({ newPw: "", confirm: "" });
  const [showPwForm, setShowPwForm] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("已更新");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "更新失敗");
    }
  };

  const handlePasswordReset = async () => {
    if (pwForm.newPw !== pwForm.confirm) { toast.error("兩次密碼不一致"); return; }
    if (pwForm.newPw.length < 6) { toast.error("密碼至少 6 個字元"); return; }
    setPwLoading(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: pwForm.newPw }),
    });
    setPwLoading(false);
    if (res.ok) {
      toast.success("密碼已更新");
      setPwForm({ newPw: "", confirm: "" });
      setShowPwForm(false);
    } else {
      const data = await res.json();
      toast.error(data.error || "更新失敗");
    }
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      <h2 className="font-bold mb-4">編輯資料</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">姓名</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            手機號碼
            <span className="ml-1 text-xs font-normal text-gray-400">（含國碼，如 +886912345678）</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+886912345678"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-amber-600"
            />
            <span className="text-sm font-medium">帳號啟用</span>
          </label>
        </div>
      </div>
      <button
        onClick={handleSave}
        disabled={loading}
        className="mt-5 bg-amber-700 text-white px-5 py-2 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50"
      >
        {loading ? "儲存中…" : "儲存變更"}
      </button>

      {/* 更改密碼 */}
      <div className="mt-6 pt-5 border-t">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700">重設密碼</h3>
          <button
            type="button"
            onClick={() => { setShowPwForm(!showPwForm); setPwForm({ newPw: "", confirm: "" }); }}
            className="text-xs text-amber-700 border border-amber-300 px-3 py-1 rounded-lg hover:bg-amber-50 transition"
          >
            {showPwForm ? "取消" : "更改密碼"}
          </button>
        </div>
        {showPwForm && (
          <div className="space-y-3 bg-gray-50 rounded-xl p-4">
            <div>
              <label className="block text-sm font-medium mb-1">新密碼</label>
              <input
                type="password"
                value={pwForm.newPw}
                onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                placeholder="至少 6 個字元"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">確認新密碼</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                placeholder="再次輸入新密碼"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={pwLoading || !pwForm.newPw || !pwForm.confirm}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50"
            >
              {pwLoading ? "更新中…" : "確認更新密碼"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
