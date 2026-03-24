"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useCartStore } from "@/store/cart";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setSearchOpen(false);
      setMenuOpen(false);
    }
  };

  return (
    <header className="bg-amber-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-amber-100 flex items-center gap-2">
          🙏 泰國佛牌
        </Link>

        {/* Desktop Search */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center bg-amber-800 rounded-lg overflow-hidden">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋商品..."
            className="bg-transparent text-white placeholder-amber-300 text-sm px-3 py-1.5 w-44 focus:outline-none focus:w-56 transition-all"
          />
          <button type="submit" className="px-3 py-1.5 hover:bg-amber-700 transition text-amber-200">
            🔍
          </button>
        </form>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/products" className="hover:text-amber-200 transition">商品</Link>
          {session?.user ? (
            <>
              <Link href="/orders" className="hover:text-amber-200 transition">我的訂單</Link>
              <Link href="/account" className="hover:text-amber-200 transition">帳號</Link>
              {session.user.name && (
                <span className="text-amber-200 text-sm">
                  👤 {session.user.name}
                </span>
              )}
              <button
                onClick={() => signOut({ redirectTo: "/login" })}
                className="bg-amber-700 hover:bg-amber-600 text-white text-sm px-3 py-1.5 rounded transition"
              >
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-amber-200 transition">登入</Link>
              <Link
                href="/register"
                className="bg-amber-600 px-4 py-1.5 rounded hover:bg-amber-500 transition"
              >
                註冊
              </Link>
            </>
          )}
          <Link href="/cart" className="relative">
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-3">
          <button onClick={() => { setSearchOpen(!searchOpen); setMenuOpen(false); }} className="text-xl">
            🔍
          </button>
          <Link href="/cart" className="relative">
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-2xl">☰</button>
        </div>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="md:hidden bg-amber-800 px-4 py-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋商品..."
              autoFocus
              className="flex-1 bg-amber-700 text-white placeholder-amber-300 text-sm px-3 py-2 rounded-lg focus:outline-none"
            />
            <button type="submit" className="bg-amber-600 px-4 py-2 rounded-lg text-sm hover:bg-amber-500 transition">
              搜尋
            </button>
          </form>
        </div>
      )}

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-amber-800 px-4 pb-4 space-y-2">
          <Link href="/products" className="block py-2 hover:text-amber-200">商品</Link>
          {session?.user ? (
            <>
              {session.user.name && (
                <p className="py-2 text-amber-200 text-sm font-medium">👤 {session.user.name}</p>
              )}
              <Link href="/orders" className="block py-2 hover:text-amber-200">我的訂單</Link>
              <Link href="/account" className="block py-2 hover:text-amber-200">帳號</Link>
              <button onClick={() => signOut({ redirectTo: "/login" })} className="block py-2 text-amber-300">
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block py-2 hover:text-amber-200">登入</Link>
              <Link href="/register" className="block py-2 hover:text-amber-200">註冊</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
