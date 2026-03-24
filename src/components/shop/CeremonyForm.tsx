"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export interface CeremonyData {
  name: string;
  englishName?: string;
  phone: string;
  birthDate: string;
  birthTime?: string;
  lunarBirth?: string;
  photoPath: string | null;
  notes?: string;
  preferredTime?: string;
}

interface CeremonyProfile {
  id: string;
  name: string;
  englishName?: string;
  phone: string;
  birthDate: string;
  birthTime?: string;
  lunarBirth?: string;
  photoPath?: string;
}

interface Props {
  index?: number;
  total?: number;
  isOneOnOne?: boolean;
  onChange: (data: CeremonyData | null) => void;
}

export default function CeremonyForm({ index = 0, total = 1, isOneOnOne = false, onChange }: Props) {
  const [form, setForm] = useState<CeremonyData>({
    name: "", englishName: "", phone: "", birthDate: "",
    birthTime: "", lunarBirth: "", photoPath: null, notes: "", preferredTime: "",
  });
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // 歷史記錄
  const [profiles, setProfiles] = useState<CeremonyProfile[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    const valid = form.name && form.phone && form.birthDate &&
      (!isOneOnOne || form.preferredTime);
    onChange(valid ? form : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const loadProfiles = async () => {
    if (profiles.length > 0) { setShowHistory(true); return; }
    setLoadingProfiles(true);
    try {
      const res = await fetch("/api/ceremony-profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setShowHistory(true);
      }
    } catch { /* ignore */ } finally {
      setLoadingProfiles(false);
    }
  };

  const applyProfile = (p: CeremonyProfile) => {
    setForm((f) => ({
      ...f,
      name: p.name,
      englishName: p.englishName || "",
      phone: p.phone,
      birthDate: p.birthDate,
      birthTime: p.birthTime || "",
      lunarBirth: p.lunarBirth || "",
      photoPath: p.photoPath || null,
    }));
    if (p.photoPath) setPhotoPreview(`/api/uploads/${p.photoPath}`);
    setShowHistory(false);
    toast.success("已套用歷史資料");
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("僅支援 JPG、PNG、WebP 格式"); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("檔案大小不得超過 5MB"); return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/ceremony-upload", { method: "POST", body: formData });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) { toast.error(data.error || "上傳失敗"); return; }
    setForm((f) => ({ ...f, photoPath: data.fileName }));
    setPhotoPreview(URL.createObjectURL(file));
    toast.success("照片上傳成功");
  };

  return (
    <div className="bg-white rounded-xl border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg">法事個人資料</h2>
          {total > 1 && (
            <span className="bg-amber-100 text-amber-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">
              第 {index + 1} 位
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={loadProfiles}
          disabled={loadingProfiles}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-amber-400 text-amber-700 rounded-lg hover:bg-amber-50 transition disabled:opacity-50"
        >
          {loadingProfiles ? "載入中..." : "📋 從歷史記錄選取"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-3">以下資料僅用於法事施法，受嚴格保護。</p>

      {/* 歷史記錄面板 */}
      {showHistory && (
        <div className="mb-4 border border-amber-200 rounded-lg overflow-hidden">
          <div className="bg-amber-50 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">選擇歷史資料</span>
            <button type="button" onClick={() => setShowHistory(false)} className="text-xs text-gray-500 hover:text-gray-700">✕ 關閉</button>
          </div>
          {profiles.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">尚無歷史記錄</div>
          ) : (
            <div className="divide-y max-h-60 overflow-y-auto">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyProfile(p)}
                  className="w-full text-left px-4 py-3 hover:bg-amber-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{p.name}</span>
                      {p.englishName && <span className="ml-2 text-xs text-gray-400">{p.englishName}</span>}
                    </div>
                    <span className="text-xs text-gray-400">{p.phone}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    生日：{p.birthDate}
                    {p.birthTime && ` · ${p.birthTime}`}
                    {p.lunarBirth && ` · ${p.lunarBirth}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isOneOnOne && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-xs text-amber-800">
          ⏰ 此為一對一法事服務，請選擇您希望的預約日期，管理員確認後方可付款。
        </div>
      )}

      <div className="space-y-3">
        {/* 姓名 + 電話 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">姓名 <span className="text-red-500">*</span></label>
            <input type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">手機號碼 <span className="text-red-500">*</span></label>
            <input type="tel" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="09XXXXXXXX"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" required />
          </div>
        </div>

        {/* 英文名 */}
        <div>
          <label className="block text-sm font-medium mb-1">英文名（護照名，選填）</label>
          <input type="text" value={form.englishName}
            onChange={(e) => setForm({ ...form, englishName: e.target.value })}
            placeholder="例：CHAN TAI MAN"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        {/* 出生日期 + 出生時間 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">出生日期（國曆）<span className="text-red-500">*</span></label>
            <input type="date" value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">出生時間（選填）</label>
            <input type="time" value={form.birthTime}
              onChange={(e) => setForm({ ...form, birthTime: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>

        {/* 農曆生辰 */}
        <div>
          <label className="block text-sm font-medium mb-1">農曆生辰（選填）</label>
          <input type="text" value={form.lunarBirth}
            onChange={(e) => setForm({ ...form, lunarBirth: e.target.value })}
            placeholder="例：農曆三月十五亥時"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        {/* 照片上傳 */}
        <div>
          <label className="block text-sm font-medium mb-1">上傳照片（選填）</label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-amber-50 border-2 border-dashed border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition flex-1 text-center">
              {uploading ? "上傳中..." : form.photoPath ? "✓ 已上傳，點擊更換" : "點擊上傳近照（JPG / PNG，最大 5MB）"}
              <input type="file" accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
            </label>
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="預覽" className="w-16 h-16 rounded-lg object-cover border" />
            )}
          </div>
        </div>

        {/* 希望預約時間（一對一） */}
        {isOneOnOne && (
          <div>
            <label className="block text-sm font-medium mb-1">希望預約日期 <span className="text-red-500">*</span></label>
            <input type="date" value={form.preferredTime}
              onChange={(e) => setForm({ ...form, preferredTime: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" required={isOneOnOne} />
            <p className="text-xs text-gray-400 mt-1">請選擇希望進行一對一法事的日期，管理員將與您確認後開放付款。</p>
          </div>
        )}

        {/* 備註 */}
        <div>
          <label className="block text-sm font-medium mb-1">備註（選填）</label>
          <textarea rows={2} value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="特殊需求或祈願內容..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
        </div>
      </div>
    </div>
  );
}
