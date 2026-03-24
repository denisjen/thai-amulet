"use client";

import { useState, useEffect } from "react";

export default function PrintOptions() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [showQR, setShowQR] = useState(true);

  // 注入 @page 方向設定
  useEffect(() => {
    const id = "po-orientation";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = `@page { size: ${orientation}; }`;
  }, [orientation]);

  // 切換 QR Code 欄位顯示
  useEffect(() => {
    const id = "po-qr";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    style.textContent = showQR ? "" : `.qr-col { display: none !important; }`;
  }, [showQR]);

  return (
    <div className="flex items-center gap-4 flex-wrap border-l pl-4 ml-1">
      {/* 列印方向 */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500">方向：</span>
        <button
          type="button"
          onClick={() => setOrientation("portrait")}
          className={`px-2.5 py-1 text-xs rounded border transition ${
            orientation === "portrait"
              ? "bg-amber-700 text-white border-amber-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          直式
        </button>
        <button
          type="button"
          onClick={() => setOrientation("landscape")}
          className={`px-2.5 py-1 text-xs rounded border transition ${
            orientation === "landscape"
              ? "bg-amber-700 text-white border-amber-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          橫式
        </button>
      </div>

      {/* QR Code 開關 */}
      <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showQR}
          onChange={(e) => setShowQR(e.target.checked)}
          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
        列印 QR Code
      </label>
    </div>
  );
}
