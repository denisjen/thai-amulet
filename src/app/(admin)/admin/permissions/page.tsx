import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { hasPermission, ALL_PERMISSIONS, parsePermissions } from "@/lib/permissions";
import PermissionManager from "@/components/admin/PermissionManager";

export default async function PermissionsPage() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { permissions: true },
  });

  if (!hasPermission(currentUser?.permissions, "permissions")) {
    redirect("/admin");
  }

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      permissions: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const adminList = admins.map((a) => ({
    id: a.id,
    name: a.name || "未命名",
    email: a.email || "",
    phone: a.phone || "",
    permissions: parsePermissions(a.permissions),
    isSelf: a.id === session.user!.id,
  }));

  const canCreateAdmin = hasPermission(currentUser?.permissions, "permissions.create_admin");
  const canEditPermissions = hasPermission(currentUser?.permissions, "permissions.edit");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">權限管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        管理各管理員的後台操作權限。未設定權限的管理員預設擁有全部權限。
      </p>
      <PermissionManager
        admins={adminList}
        permissionGroups={ALL_PERMISSIONS.map((g) => ({
          key: g.key,
          label: g.label,
          description: g.description,
          subs: g.subs.map((s) => ({ key: s.key, label: s.label })),
        }))}
        canCreateAdmin={canCreateAdmin}
        canEditPermissions={canEditPermissions}
      />
    </div>
  );
}
