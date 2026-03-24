"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "全部狀態" },
  { value: "PENDING",    label: "待確認" },
  { value: "CONFIRMED",  label: "已確認" },
  { value: "PROCESSING", label: "處理中" },
  { value: "SHIPPED",    label: "已出貨" },
  { value: "DELIVERED",  label: "已送達" },
  { value: "CANCELLED",  label: "已取消" },
];

const QUICK_RANGES = [
  { label: "近3個月", months: 3 },
  { label: "近6個月", months: 6 },
  { label: "近1年",   months: 12 },
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return toDateStr(d);
}

export default function OrdersFilter() {
  const router   = useRouter();
  const pathname = usePathname();
  const params   = useSearchParams();

  const today = toDateStr(new Date());
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [from,   setFrom]   = useState(params.get("from")   ?? today);
  const [to,     setTo]     = useState(params.get("to")     ?? today);
  const [activeRange, setActiveRange] = useState<number | null>(
    params.get("range") ? Number(params.get("range")) : null
  );

  // sync if URL changes externally
  useEffect(() => {
    setStatus(params.get("status") ?? "");
    setFrom(params.get("from")   ?? today);
    setTo(params.get("to")       ?? today);
    setActiveRange(params.get("range") ? Number(params.get("range")) : null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const apply = (overrides?: { status?: string; from?: string; to?: string; range?: number | null }) => {
    const s = overrides?.status  !== undefined ? overrides.status  : status;
    const f = overrides?.from    !== undefined ? overrides.from    : from;
    const t = overrides?.to      !== undefined ? overrides.to      : to;
    const r = overrides?.range   !== undefined ? overrides.range   : activeRange;

    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (f) sp.set("from", f);
    if (t) sp.set("to", t);
    if (r) sp.set("range", String(r));
    router.push(`${pathname}?${sp.toString()}`);
  };

  const setRange = (months: number) => {
    const f = monthsAgo(months);
    const t = toDateStr(new Date());
    setFrom(f);
    setTo(t);
    setActiveRange(months);
    apply({ from: f, to: t, range: months });
  };

  const clearAll = () => {
    setStatus("");
    setFrom(today);
    setTo(today);
    setActiveRange(null);
    router.push(pathname);
  };

  const hasCustomFilter = params.get("status") || params.get("from") || params.get("to");

  return (
    <div className="mb-6 space-y-3">
      {/* 快速日期篩選 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">快速篩選：</span>
        {QUICK_RANGES.map((r) => (
          <button
            key={r.months}
            type="button"
            onClick={() => setRange(r.months)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition ${
              activeRange === r.months
                ? "bg-amber-700 text-white border-amber-700"
                : "border-amber-300 text-amber-700 hover:bg-amber-50"
            }`}
          >
            {r.label}
          </button>
        ))}
        {hasCustomFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 text-xs border rounded-lg text-gray-500 hover:bg-gray-50"
          >
            清除篩選
          </button>
        )}
      </div>

      {/* 細部篩選 */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">訂單狀態</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">開始日期</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setActiveRange(null); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">結束日期</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setActiveRange(null); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          type="button"
          onClick={() => apply()}
          className="self-end px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-600 transition"
        >
          篩選
        </button>
      </div>
    </div>
  );
}
