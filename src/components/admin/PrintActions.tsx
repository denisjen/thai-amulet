"use client";

interface Props {
  backHref?: string;
  backLabel?: string;
  closeHref?: string;
  printLabel?: string;
  subtitle?: string;
}

export default function PrintActions({ backHref, backLabel, closeHref, printLabel, subtitle }: Props) {
  const handleClose = () => {
    // 先嘗試關閉視窗（若由 window.open 開啟才有效）
    window.close();
    // 若無法關閉（一般連結開啟的頁面），則導向指定頁面
    setTimeout(() => {
      window.location.href = closeHref || "/admin/ceremonies";
    }, 200);
  };

  return (
    <div className="no-print mb-4 flex gap-3 items-center flex-wrap">
      <button
        onClick={() => window.print()}
        className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-600"
      >
        🖨️ {printLabel || "列印"}
      </button>
      <button
        onClick={handleClose}
        className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
      >
        關閉
      </button>
      {backHref && (
        <a
          href={backHref}
          className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 text-gray-600"
        >
          ← {backLabel || "返回"}
        </a>
      )}
      {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
    </div>
  );
}
