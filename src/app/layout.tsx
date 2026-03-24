import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import Tracker from "@/components/shop/Tracker";

export const metadata: Metadata = {
  title: "泰國佛牌 | 正品佛牌與法事服務",
  description: "提供正品泰國佛牌及專業法事服務，貨源保證，品質保障",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-gray-50 text-gray-900">
        <SessionProvider>
          <Tracker />
          {children}
          <Toaster position="top-center" />
        </SessionProvider>
      </body>
    </html>
  );
}
