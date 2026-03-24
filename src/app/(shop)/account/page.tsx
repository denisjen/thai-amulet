"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import AddressBook from "@/components/shop/AddressBook";

export default function AccountPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    lineId: "",
    birthDate: "",
    birthTime: "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phoneBound, setPhoneBound] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user) {
      router.push("/login?callbackUrl=/account");
      return;
    }
    Promise.all([
      fetch("/api/account/profile").then((r) => r.json()),
      fetch("/api/account/address").then((r) => r.json()),
    ]).then(([profileData, addrData]) => {
      if (profileData.user) {
        setForm({
          name: profileData.user.name || "",
          phone: profileData.user.phone || "",
          email: profileData.user.email || "",
          lineId: profileData.user.lineId || "",
          birthDate: profileData.user.birthDate
            ? new Date(profileData.user.birthDate).toISOString().split("T")[0]
            : "",
          birthTime: profileData.user.birthTime || "",
        });
        setAvatarUrl(profileData.user.avatarUrl || null);
      }
      if (addrData.addresses) {
        setAddresses(addrData.addresses);
      }
    });
  }, [session, router]);

  // ── Avatar upload ────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/account/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setAvatarUrl(data.avatarUrl);
        toast.success("大頭照已更新");
        update().catch(() => {});
      } else {
        toast.error(data.error || "上傳失敗");
      }
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Profile save ─────────────────────────────────────
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          lineId: form.lineId,
          birthDate: form.birthDate || null,
          birthTime: form.birthTime || null,
        }),
      });
      if (res.ok) {
        toast.success("資料已更新");
        update().catch(() => {});
      } else {
        const data = await res.json();
        toast.error(data.error || "更新失敗");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Password change ──────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { toast.error("兩次密碼不一致"); return; }
    if (pwForm.newPw.length < 6) { toast.error("密碼至少 6 個字元"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("密碼已更改");
        setPwForm({ current: "", newPw: "", confirm: "" });
      } else {
        toast.error(data.error || "更改失敗");
      }
    } finally {
      setPwLoading(false);
    }
  };

  // ── Phone OTP handlers ───────────────────────────────
  const handleSendOtp = async () => {
    if (!form.phone) { toast.error("請輸入手機號碼"); return; }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/account/phone-verify?action=send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
        setCountdown(60);
        toast.success("驗證碼已發送，請查看簡訊");
      } else {
        toast.error(data.error || "發送失敗");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) { toast.error("請輸入驗證碼"); return; }
    setOtpLoading(true);
    try {
      const res = await fetch("/api/account/phone-verify?action=check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, code: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("手機號碼已綁定！");
        setPhoneBound(true);
        setOtpSent(false);
        setOtpCode("");
        update().catch(() => {});
        router.refresh();
      } else {
        toast.error(data.error || "驗證失敗");
      }
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const phone = (session?.user as any)?.phone || "";
  const displayName = form.name || form.phone || phone;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">帳號設定</h1>

      {/* Profile form */}
      <form onSubmit={handleProfileSave} className="bg-white rounded-xl border p-5 mb-6">
        <h2 className="font-bold text-lg mb-5">個人資料</h2>

        {/* Avatar section */}
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-gray-100">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-amber-100 border-2 border-amber-200">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="大頭照" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-amber-700">
                  {initials || "👤"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 bg-amber-700 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-amber-600 transition shadow-md"
              title="更換大頭照"
            >
              {avatarUploading ? "…" : "📷"}
            </button>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{displayName || "未設定姓名"}</p>
            <p className="text-sm text-gray-400 mb-2">{phone}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="text-xs text-amber-700 border border-amber-300 px-3 py-1 rounded-full hover:bg-amber-50 transition"
            >
              {avatarUploading ? "上傳中…" : "更換大頭照"}
            </button>
            <p className="text-xs text-gray-400 mt-1">支援 JPG、PNG、WebP，最大 3MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Input fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">手機號碼</label>
            {(phone || phoneBound) ? (
              <input
                type="text"
                value={form.phone || phone}
                disabled
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
              />
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    disabled={otpSent}
                    placeholder="09xxxxxxxx"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading || countdown > 0}
                    className="whitespace-nowrap px-3 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition disabled:opacity-50"
                  >
                    {countdown > 0 ? `重新發送 (${countdown}s)` : otpSent ? "重新發送" : "發送驗證碼"}
                  </button>
                </div>
                {otpSent && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="請輸入 6 位驗證碼"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpLoading || otpCode.length < 4}
                      className="whitespace-nowrap px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {otpLoading ? "驗證中…" : "驗證並綁定"}
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400">綁定後可使用手機號碼登入</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">姓名</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="請輸入真實姓名"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                出生日期
                <span className="ml-1 text-xs font-normal text-gray-400">（法事服務使用）</span>
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                max={new Date().toISOString().split("T")[0]}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">
                出生時間
                <span className="ml-1 text-xs font-normal text-gray-400">（選填）</span>
              </label>
              <input
                type="time"
                value={form.birthTime}
                onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your@email.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-gray-400 mt-1">用於接收訂單通知及密碼重設</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">LINE ID</label>
            <input
              type="text"
              value={form.lineId}
              onChange={(e) => setForm({ ...form, lineId: e.target.value })}
              placeholder="您的 LINE ID"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-5 bg-amber-700 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-amber-600 transition disabled:opacity-50 font-medium"
        >
          {loading ? "儲存中…" : "儲存資料"}
        </button>
      </form>

      {/* Address Book */}
      <div className="bg-white rounded-xl border p-5 mb-6">
        <h2 className="font-bold text-lg mb-1">收件地址名單</h2>
        <p className="text-xs text-gray-400 mb-5">可儲存多組地址，結帳時快速選用</p>
        <AddressBook initialAddresses={addresses} />
      </div>

      {/* Change Password */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-lg mb-4">更改密碼</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">目前密碼</label>
            <input
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">新密碼</label>
            <input
              type="password"
              value={pwForm.newPw}
              onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
              required
              placeholder="至少 6 個字元"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">確認新密碼</label>
            <input
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pwLoading}
          className="mt-4 bg-gray-800 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-gray-700 transition disabled:opacity-50 font-medium"
        >
          {pwLoading ? "更改中…" : "更改密碼"}
        </button>
      </form>
    </div>
  );
}
