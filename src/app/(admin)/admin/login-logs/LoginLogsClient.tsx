"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/* ─────────────────────────────── types ─────────────────────────────── */
interface LoginLog {
  id: string;
  userId: string | null;
  userName: string | null;
  provider: string;
  identifier: string | null;
  success: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
interface VisitLog {
  id: string;
  sessionId: string | null;
  userId: string | null;
  path: string;
  productName: string | null;
  referrer: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

/* ───────────────────────── helpers ───────────────────────── */
function parseDevice(ua: string | null): string {
  if (!ua) return "—";
  if (/iPhone|iPad/i.test(ua)) return "📱 iOS";
  if (/Android/i.test(ua)) return "📱 Android";
  if (/Windows/i.test(ua)) return "💻 Windows";
  if (/Mac OS/i.test(ua)) return "💻 macOS";
  if (/Linux/i.test(ua)) return "💻 Linux";
  return "💻 桌機";
}
function parseBrowser(ua: string | null): string {
  if (!ua) return "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  return "";
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
}

/* ═══════════════════════ 登入記錄 Tab ═══════════════════════ */
function LoginLogsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date().toISOString().split("T")[0];

  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const provider = searchParams.get("provider") || "";
  const success  = searchParams.get("success") || "";
  const search   = searchParams.get("search") || "";
  const dateFrom = searchParams.get("dateFrom") || today;
  const dateTo   = searchParams.get("dateTo")   || today;

  const [logs, setLogs]       = useState<LoginLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [searchInput,   setSearchInput]   = useState(search);
  const [dateFromInput, setDateFromInput] = useState(dateFrom);
  const [dateToInput,   setDateToInput]   = useState(dateTo);

  const pageSize   = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildUrl = useCallback((overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const vals: Record<string, string> = {
      tab: "login", page: String(page), provider, success, search, dateFrom, dateTo,
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/admin/login-logs?${p.toString()}`;
  }, [page, provider, success, search, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (provider) p.set("provider", provider);
    if (success !== "") p.set("success", success);
    if (search) p.set("search", search);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);

    fetch(`/api/admin/login-logs?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => setError("無法連接伺服器"))
      .finally(() => setLoading(false));
  }, [page, provider, success, search, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ page: 1, search: searchInput, dateFrom: dateFromInput, dateTo: dateToInput }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-600">登入方式</label>
            <select value={provider} onChange={(e) => router.push(buildUrl({ page: 1, provider: e.target.value }))}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">全部</option>
              <option value="credentials">帳號密碼</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-600">結果</label>
            <select value={success} onChange={(e) => router.push(buildUrl({ page: 1, success: e.target.value }))}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">全部</option>
              <option value="true">成功</option>
              <option value="false">失敗</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-600">日期</label>
            <input type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <span className="text-gray-400">–</span>
            <input type="date" value={dateToInput} onChange={(e) => setDateToInput(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-48">
            <input type="text" placeholder="搜尋會員 / 帳號 / IP" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button type="submit" className="bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 transition">搜尋</button>
            {(search || provider || success || dateFrom !== today || dateTo !== today) && (
              <button type="button" onClick={() => { setSearchInput(""); setDateFromInput(today); setDateToInput(today); router.push("/admin/login-logs?tab=login"); }}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">清除</button>
            )}
          </div>
        </div>
      </form>

      {/* Stats */}
      {!loading && logs.length > 0 && (
        <div className="flex gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">✅ 本頁成功 <strong>{logs.filter(l => l.success).length}</strong> 筆</div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">❌ 本頁失敗 <strong>{logs.filter(l => !l.success).length}</strong> 筆</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">共 <strong>{total.toLocaleString()}</strong> 筆</div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="text-center py-12 text-red-500">⚠️ {error}</div>
        ) : loading ? (
          <div className="text-center py-16 text-gray-400 animate-pulse">載入中…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">無符合條件的登入記錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">時間</th>
                  <th className="text-left px-4 py-3">會員</th>
                  <th className="text-left px-4 py-3">登入方式</th>
                  <th className="text-left px-4 py-3">帳號 / 識別</th>
                  <th className="text-left px-4 py-3">IP 位址</th>
                  <th className="text-left px-4 py-3">裝置 / 瀏覽器</th>
                  <th className="text-center px-4 py-3">結果</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className={`hover:bg-gray-50 transition ${!log.success ? "bg-red-50/40" : ""}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{fmtTime(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      {log.userId ? (
                        <a href={`/admin/users/${log.userId}`} className="text-amber-700 hover:underline font-medium">{log.userName || "（未命名）"}</a>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.provider === "google" ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                          <svg className="w-3 h-3" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                          Google
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2 py-0.5">🔑 帳號密碼</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{log.identifier || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.ipAddress || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div>{parseDevice(log.userAgent)}</div>
                      {parseBrowser(log.userAgent) && <div className="text-gray-400">{parseBrowser(log.userAgent)}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.success
                        ? <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">成功</span>
                        : <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">失敗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} buildUrl={buildUrl} />
    </div>
  );
}

/* ═══════════════════════ 瀏覽記錄 Tab ═══════════════════════ */
function VisitLogsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = new Date().toISOString().split("T")[0];

  const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const search    = searchParams.get("search") || "";
  const dateFrom  = searchParams.get("dateFrom") || today;
  const dateTo    = searchParams.get("dateTo")   || today;
  const onlyAnon  = searchParams.get("onlyAnon") || "";

  const [logs, setLogs]       = useState<VisitLog[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const [searchInput,   setSearchInput]   = useState(search);
  const [dateFromInput, setDateFromInput] = useState(dateFrom);
  const [dateToInput,   setDateToInput]   = useState(dateTo);

  const pageSize   = 50;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const buildUrl = useCallback((overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const vals: Record<string, string> = {
      tab: "visit", page: String(page), search, dateFrom, dateTo, onlyAnon,
      ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])),
    };
    Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/admin/login-logs?${p.toString()}`;
  }, [page, search, dateFrom, dateTo, onlyAnon]);

  useEffect(() => {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    if (page > 1) p.set("page", String(page));
    if (search) p.set("search", search);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    if (onlyAnon) p.set("onlyAnon", "1");

    fetch(`/api/admin/visit-logs?${p.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => setError("無法連接伺服器"))
      .finally(() => setLoading(false));
  }, [page, search, dateFrom, dateTo, onlyAnon]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(buildUrl({ page: 1, search: searchInput, dateFrom: dateFromInput, dateTo: dateToInput }));
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-600">類型</label>
            <select value={onlyAnon} onChange={(e) => router.push(buildUrl({ page: 1, onlyAnon: e.target.value }))}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="">全部訪客</option>
              <option value="1">僅未登入</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-sm text-gray-600">日期</label>
            <input type="date" value={dateFromInput} onChange={(e) => setDateFromInput(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <span className="text-gray-400">–</span>
            <input type="date" value={dateToInput} onChange={(e) => setDateToInput(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-48">
            <input type="text" placeholder="搜尋路徑 / IP / Session ID" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-amber-500" />
            <button type="submit" className="bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 transition">搜尋</button>
            {(search || onlyAnon || dateFrom !== today || dateTo !== today) && (
              <button type="button" onClick={() => { setSearchInput(""); setDateFromInput(today); setDateToInput(today); router.push("/admin/login-logs?tab=visit"); }}
                className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">清除</button>
            )}
          </div>
        </div>
      </form>

      {!loading && !error && (
        <div className="flex gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600">共 <strong>{total.toLocaleString()}</strong> 筆瀏覽記錄</div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {error ? (
          <div className="text-center py-12 text-red-500">⚠️ {error}</div>
        ) : loading ? (
          <div className="text-center py-16 text-gray-400 animate-pulse">載入中…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">無符合條件的瀏覽記錄</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">時間</th>
                  <th className="text-left px-4 py-3">瀏覽路徑</th>
                  <th className="text-left px-4 py-3">來源</th>
                  <th className="text-left px-4 py-3">IP 位址</th>
                  <th className="text-left px-4 py-3">裝置 / 瀏覽器</th>
                  <th className="text-left px-4 py-3">Session ID</th>
                  <th className="text-center px-4 py-3">身份</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">{fmtTime(log.createdAt)}</td>
                    <td className="px-4 py-3 text-xs max-w-52" title={log.path}>
                      {log.productName ? (
                        <div>
                          <div className="text-gray-800 font-medium truncate">{log.productName}</div>
                          <div className="text-gray-400 font-mono truncate">{log.path}</div>
                        </div>
                      ) : (
                        <span className="text-gray-600 font-mono truncate block">{log.path}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-40 truncate" title={log.referrer || ""}>
                      {log.referrer ? (
                        <a href={log.referrer} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{log.referrer}</a>
                      ) : <span className="text-gray-400">直接進入</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.ipAddress || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      <div>{parseDevice(log.userAgent)}</div>
                      {parseBrowser(log.userAgent) && <div className="text-gray-400">{parseBrowser(log.userAgent)}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-32" title={log.sessionId || ""}>{log.sessionId?.slice(0, 8) || "—"}…</td>
                    <td className="px-4 py-3 text-center">
                      {log.userId
                        ? <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">已登入</span>
                        : <span className="bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">訪客</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} buildUrl={buildUrl} />
    </div>
  );
}

/* ─────────────────────────── 分頁元件 ─────────────────────────── */
function Pagination({ page, totalPages, total, buildUrl }: {
  page: number; totalPages: number; total: number;
  buildUrl: (o: Record<string, string | number>) => string;
}) {
  const router = useRouter();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>第 {page} / {totalPages} 頁，共 {total.toLocaleString()} 筆</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => router.push(buildUrl({ page: page - 1 }))}
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">← 上一頁</button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const p = page <= 4 ? i + 1 : page - 3 + i;
          if (p < 1 || p > totalPages) return null;
          return (
            <button key={p} onClick={() => router.push(buildUrl({ page: p }))}
              className={`px-3 py-1.5 border rounded-lg transition ${p === page ? "bg-amber-700 text-white border-amber-700" : "hover:bg-gray-50"}`}>{p}</button>
          );
        })}
        <button disabled={page >= totalPages} onClick={() => router.push(buildUrl({ page: page + 1 }))}
          className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">下一頁 →</button>
      </div>
    </div>
  );
}

/* ═══════════════════════ 主頁面 ═══════════════════════ */
function LogsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "login";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">記錄查詢</h1>
        <p className="text-sm text-gray-500 mt-0.5">追蹤登入行為與訪客瀏覽軌跡</p>
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1.5 w-fit">
        {[
          { key: "login", label: "🔑 登入記錄" },
          { key: "visit", label: "👁️ 瀏覽記錄" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => router.push(`/admin/login-logs?tab=${key}`)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              tab === key
                ? "bg-amber-700 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "login" ? <LoginLogsTab /> : <VisitLogsTab />}
    </div>
  );
}

export default function LoginLogsClient() {
  return (
    <Suspense>
      <LogsPageContent />
    </Suspense>
  );
}
