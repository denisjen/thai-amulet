"use client";

import { useState } from "react";

interface Photo {
  id: string;
  url: string;
  caption: string | null;
}

export default function CeremonyPhotoGallery({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [current, setCurrent] = useState(0);

  function openAt(index: number) {
    setCurrent(index);
    setLightbox(photos[index]);
  }

  function prev() {
    const i = (current - 1 + photos.length) % photos.length;
    setCurrent(i);
    setLightbox(photos[i]);
  }

  function next() {
    const i = (current + 1) % photos.length;
    setCurrent(i);
    setLightbox(photos[i]);
  }

  return (
    <>
      <div className="bg-green-50 rounded-xl border border-green-200 p-5 mb-4">
        <h2 className="font-bold text-green-900 mb-3 flex items-center gap-2">
          📸 法事完成照片
          <span className="text-sm font-normal text-green-700">共 {photos.length} 張</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="cursor-zoom-in rounded-xl overflow-hidden border border-green-100 bg-white group relative"
              onClick={() => openAt(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.caption || "法事照片"}
                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {photo.caption && (
                <p className="text-xs text-gray-500 px-2 py-1 truncate bg-white">{photo.caption}</p>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 關閉 */}
            <button
              className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300 z-10"
              onClick={() => setLightbox(null)}
            >×</button>

            {/* 圖片 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.url}
              alt={lightbox.caption || "法事照片"}
              className="w-full max-h-[75vh] object-contain rounded-xl"
            />

            {/* 說明 */}
            {lightbox.caption && (
              <p className="text-center text-white/80 text-sm mt-3">{lightbox.caption}</p>
            )}

            {/* 計數 */}
            <p className="text-center text-white/50 text-xs mt-1">
              {current + 1} / {photos.length}
            </p>

            {/* 左右切換（超過一張才顯示） */}
            {photos.length > 1 && (
              <>
                <button
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white text-3xl hover:text-amber-300"
                  onClick={prev}
                >‹</button>
                <button
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white text-3xl hover:text-amber-300"
                  onClick={next}
                >›</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
