import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parsePermissions } from "@/lib/permissions";
import AdminSidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  // 取得當前使用者權限
  let userPermissions: string[] | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id! },
      select: { permissions: true },
    });
    userPermissions = parsePermissions(user?.permissions);
  } catch { /* ignore */ }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <AdminSidebar permissions={userPermissions} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
