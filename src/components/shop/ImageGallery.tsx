"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface ImageGalleryProps {
  images: string[];
  productName: string;
  isCeremony?: boolean;
}

export default function ImageGallery({ images, productName, isCeremony }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const mainImage = images[activeIndex] ?? null;
  const isOpen = lightboxIndex !== null;

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i - 1 + images.length) % images.length : null));
  }, [images.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i) => (i !== null ? (i + 1) % images.length : null));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, lightboxPrev, lightboxNext]);

  // Prevent background scroll when lightbox open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const prev = () => setActiveIndex((i) => (i - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));
  const next = () => setActiveIndex((i) => (i + 1) % Math.max(images.length, 1));

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Main Image */}
        <div
          className={`relative rounded-xl overflow-hidden bg-gray-100 select-none ${mainImage ? "cursor-pointer" : "aspect-square"}`}
          onClick={() => mainImage && openLightbox(activeIndex)}
        >
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage}
              alt={productName}
              className="w-full h-auto block"
              style={{ maxHeight: "560px", objectFit: "contain" }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">
              {isCeremony ? "🙏" : "📿"}
            </div>
          )}

          {/* Arrow navigation */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-md transition text-xl font-bold text-gray-700 z-10"
                aria-label="上一張"
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full w-9 h-9 flex items-center justify-center shadow-md transition text-xl font-bold text-gray-700 z-10"
                aria-label="下一張"
              >
                ›
              </button>
              {/* Dot indicators */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`rounded-full transition-all ${
                      i === activeIndex ? "bg-amber-500 w-4 h-2" : "bg-white/70 w-2 h-2"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Click hint */}
          {mainImage && (
            <span className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2 py-0.5 rounded pointer-events-none">
              🔍 點擊放大
            </span>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${
                  i === activeIndex
                    ? "border-amber-600 ring-1 ring-amber-400"
                    : "border-gray-200 hover:border-amber-400"
                }`}
                aria-label={`圖片 ${i + 1}`}
              >
                <Image
                  src={img}
                  alt={`${productName} 圖片 ${i + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isOpen && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded-full w-10 h-10 flex items-center justify-center text-2xl z-10 transition"
            onClick={closeLightbox}
            aria-label="關閉"
          >
            ✕
          </button>

          {/* Counter */}
          {images.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}

          {/* Prev button */}
          {images.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl z-10 transition"
              onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
              aria-label="上一張"
            >
              ‹
            </button>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-5xl max-h-screen p-14 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex]}
              alt={`${productName} 圖片 ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 rounded-full w-12 h-12 flex items-center justify-center text-3xl z-10 transition"
              onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
              aria-label="下一張"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
