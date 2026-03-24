"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin", label: "儀表板", icon: "📊", permission: "dashboard" },
  { href: "/admin/products", label: "商品管理", icon: "📿", permission: "products" },
  { href: "/admin/orders", label: "訂單管理", icon: "📦", permission: "orders" },
  { href: "/admin/ceremonies", label: "法事訂單", icon: "🙏", permission: "ceremonies" },
  { href: "/admin/users", label: "會員管理", icon: "👥", permission: "users" },
  { href: "/admin/discounts", label: "折扣碼", icon: "🏷️", permission: "discounts" },
  { href: "/admin/categories", label: "分類管理", icon: "📁", permission: "categories" },
  { href: "/admin/login-logs", label: "登入記錄", icon: "🔍", permission: "login_logs" },
  { href: "/admin/settings", label: "系統設定", icon: "⚙️", permission: "settings" },
  { href: "/admin/permissions", label: "權限管理", icon: "🔐", permission: "permissions" },
];

interface Props {
  permissions: string[] | null; // null = 全部權限
}

export default function AdminSidebar({ permissions }: Props) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) => {
    if (permissions === null) return true; // 全部權限
    return permissions.includes(item.permission);
  });

  return (
    <aside className="w-56 bg-gray-900 text-gray-200 flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-700">
        <Link href="/admin" className="font-bold text-amber-400 text-lg">
          🙏 後台管理
        </Link>
      </div>
      <nav className="flex-1 py-4">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                ? "bg-amber-700 text-white"
                : "hover:bg-gray-800"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <Link
          href="/"
          className="block text-sm text-gray-400 hover:text-white mb-2"
        >
          ← 前往前台
        </Link>
        <button
          onClick={() => signOut()}
          className="text-sm text-gray-400 hover:text-red-400 transition"
        >
          登出
        </button>
      </div>
    </aside>
  );
}
