"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

export default function RosterPrintActions({ backUrl }: { backUrl: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isLandscape = searchParams.get("layout") === "landscape";

  const buildUrl = (landscape: boolean) => {
    const qs = new URLSearchParams(searchParams.toString());
    if (landscape) qs.set("layout", "landscape");
    else qs.delete("layout");
    return `${pathname}?${qs.toString()}`;
  };

  return (
    <>
      <button
        onClick={() => window.print()}
        className="bg-gray-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-600 transition flex items-center gap-2"
      >
        🖨️ 列印名單
      </button>

      {/* 直式 / 橫式切換 */}
      <div className="flex items-center gap-1 border rounded-lg overflow-hidden text-sm">
        <Link
          href={buildUrl(false)}
          className={`px-3 py-2 flex items-center gap-1 transition ${
            !isLandscape
              ? "bg-amber-700 text-white font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📄 直式
        </Link>
        <Link
          href={buildUrl(true)}
          className={`px-3 py-2 flex items-center gap-1 transition border-l ${
            isLandscape
              ? "bg-amber-700 text-white font-medium"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          📋 橫式
        </Link>
      </div>

      <Link
        href={backUrl}
        className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        ← 返回訂單詳情
      </Link>
    </>
  );
}
