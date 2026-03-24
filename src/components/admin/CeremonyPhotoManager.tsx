"use client";

import { useState, useRef } from "react";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: string;
}

interface Props {
  orderId: string;
  initialPhotos: Photo[];
}

export default function CeremonyPhotoManager({ orderId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("orderId", orderId);
        const res = await fetch("/api/admin/ceremony-photos", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || "上傳失敗");
          continue;
        }
        const photo = await res.json();
        setPhotos((prev) => [...prev, { ...photo, createdAt: photo.createdAt }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除這張照片？")) return;
    const res = await fetch(`/api/admin/ceremony-photos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert("刪除失敗");
    }
  }

  async function handleSaveCaption(id: string) {
    const res = await fetch(`/api/admin/ceremony-photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption: editCaption }),
    });
    if (res.ok) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, caption: editCaption } : p))
      );
      setEditingId(null);
    } else {
      alert("儲存失敗");
    }
  }

  return (
    <div>
      {/* 標頭 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-green-900 flex items-center gap-2">
          📸 法事完成照片
          {photos.length > 0 && (
            <span className="text-sm font-normal text-green-700">共 {photos.length} 張</span>
          )}
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="text-xs flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded-lg hover:bg-green-600 transition disabled:opacity-50"
        >
          {uploading ? (
            <><span className="animate-spin">⏳</span> 上傳中…</>
          ) : (
            <>📤 上傳照片</>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* 空狀態 */}
      {photos.length === 0 && (
        <div
          className="border-2 border-dashed border-green-200 rounded-xl p-8 text-center text-gray-400 cursor-pointer hover:border-green-400 hover:text-green-600 transition"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-4xl mb-2">📷</div>
          <p className="text-sm">點擊或拖曳上傳法事完成照片</p>
          <p className="text-xs mt-1">支援 JPG、PNG、WebP，每張最大 10MB</p>
        </div>
      )}

      {/* 照片格 */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative rounded-xl overflow-hidden border bg-gray-50">
              {/* 照片 */}
              <div
                className="relative aspect-square cursor-zoom-in"
                onClick={() => setLightbox(photo.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption || "法事照片"}
                  className="w-full h-full object-cover"
                />
                {/* hover overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="text-white text-xs">點擊放大</span>
                </div>
              </div>

              {/* 說明 + 操作 */}
              <div className="p-2">
                {editingId === photo.id ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveCaption(photo.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 text-xs border rounded px-1 py-0.5"
                      placeholder="輸入說明…"
                    />
                    <button
                      onClick={() => handleSaveCaption(photo.id)}
                      className="text-xs text-green-700 font-bold"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs text-gray-400"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1">
                    <p
                      className="text-xs text-gray-500 flex-1 cursor-pointer hover:text-gray-700 truncate"
                      title="點擊編輯說明"
                      onClick={() => {
                        setEditingId(photo.id);
                        setEditCaption(photo.caption || "");
                      }}
                    >
                      {photo.caption || <span className="italic text-gray-300">點擊新增說明</span>}
                    </p>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                      title="刪除照片"
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 加號格 */}
          <div
            className="aspect-square rounded-xl border-2 border-dashed border-green-200 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition text-gray-300 hover:text-green-500"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-3xl">+</div>
            <p className="text-xs mt-1">新增照片</p>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="法事照片"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
