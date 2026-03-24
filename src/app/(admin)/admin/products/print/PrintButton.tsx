"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-2"
    >
      🖨️ 列印 / 儲存 PDF
    </button>
  );
}
