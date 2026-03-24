import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, ALL_PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

/** 根據權限找到第一個可用的後台頁面 */
const PERM_TO_PATH: Record<string, string> = {
  dashboard: "/admin",
  products: "/admin/products",
  orders: "/admin/orders",
  ceremonies: "/admin/ceremonies",
  users: "/admin/users",
  discounts: "/admin/discounts",
  categories: "/admin/categories",
  login_logs: "/admin/login-logs",
  settings: "/admin/settings",
  permissions: "/admin/permissions",
};

/**
 * 在 Server Component 中檢查當前管理員是否擁有指定權限
 * 無權限時自動 redirect 到第一個有權限的頁面
 */
export async function checkPermission(required: string): Promise<void> {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { permissions: true },
    });
    if (!hasPermission(user?.permissions, required)) {
      // 找到第一個有權限的頁面
      const fallback = ALL_PERMISSIONS.find((g) =>
        hasPermission(user?.permissions, g.key)
      );
      const fallbackPath = fallback ? (PERM_TO_PATH[fallback.key] || "/admin") : "/";
      redirect(fallbackPath);
    }
  } catch (e) {
    // redirect() throws a special error in Next.js — must re-throw
    if (e && typeof e === "object" && "digest" in e) throw e;
    // DB error → 放行（避免鎖死）
  }
}
