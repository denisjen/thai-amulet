"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** 取得或建立匿名 sessionId（localStorage） */
function getSessionId(): string {
  try {
    let sid = localStorage.getItem("_vsid");
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem("_vsid", sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export default function Tracker() {
  const pathname = usePathname();
  const prevPath = useRef<string>("");

  useEffect(() => {
    // 同一路徑不重複送（React Strict Mode 雙重執行保護）
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // admin 路徑不追蹤
    if (pathname.startsWith("/admin")) return;

    const sessionId = getSessionId();
    const referrer =
      typeof document !== "undefined" ? document.referrer || null : null;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer, sessionId }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
