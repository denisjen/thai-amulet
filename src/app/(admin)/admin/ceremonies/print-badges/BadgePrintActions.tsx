"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export default function BadgePrintActions({ backUrl }: { backUrl: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const size = searchParams.get("size") || "a5";

  const buildUrl = (s: string) => {
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("size", s);
    return `${pathname}?${qs.toString()}`;
  };

  return (
    <>
      <button
        onClick={() => window.print()}
        className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-2"
      >
        🖨️ 列印名牌
      </button>

      {/* 尺寸切換 */}
      <div className="flex items-center gap-1 border rounded-lg overflow-hidden text-sm">
        <Link
          href={buildUrl("a5")}
          className={`px-3 py-2 flex items-center gap-1 transition ${
            size === "a5" ? "bg-amber-700 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📄 A5 橫式（1張/頁）
        </Link>
        <Link
          href={buildUrl("a4")}
          className={`px-3 py-2 flex items-center gap-1 transition border-l ${
            size === "a4" ? "bg-amber-700 text-white font-medium" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📋 A4 直式（2張/頁）
        </Link>
      </div>

      <Link
        href={backUrl}
        className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        ← 返回法事管理
      </Link>
    </>
  );
}
