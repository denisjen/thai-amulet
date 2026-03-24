"use client";

import Link from "next/link";

export default function LabelPrintActions({ backUrl }: { backUrl: string }) {
  return (
    <>
      <button
        onClick={() => window.print()}
        className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
      >
        🏷️ 列印地址標籤
      </button>
      <Link
        href={backUrl}
        className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        ← 返回訂單明細
      </Link>
    </>
  );
}
