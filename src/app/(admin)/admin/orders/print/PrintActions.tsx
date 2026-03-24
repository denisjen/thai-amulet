"use client";

import Link from "next/link";

export default function PrintActions({
  backUrl,
  labelsUrl,
}: {
  backUrl: string;
  labelsUrl: string;
}) {
  return (
    <>
      <button
        onClick={() => window.print()}
        className="bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition flex items-center gap-2"
      >
        🖨️ 列印 / 儲存 PDF
      </button>
      <Link
        href={labelsUrl}
        target="_blank"
        className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center gap-2"
      >
        🏷️ 列印地址標籤
      </Link>
      <Link
        href={backUrl}
        className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
      >
        ← 返回訂單管理
      </Link>
    </>
  );
}
