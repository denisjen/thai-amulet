import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, ALL_PERMISSION_KEYS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** PATCH: 更新指定管理員的權限 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  // 檢查當前使用者是否有權限管理權限
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { permissions: true },
  });
  if (!hasPermission(currentUser?.permissions, "permissions")) {
    return NextResponse.json({ error: "您沒有權限管理的權限" }, { status: 403 });
  }

  // 不可修改自己的權限
  if (session.user!.id === params.id) {
    return NextResponse.json({ error: "無法修改自己的權限" }, { status: 400 });
  }

  // 驗證目標使用者是 ADMIN
  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    select: { role: true },
  });
  if (!targetUser || targetUser.role !== "ADMIN") {
    return NextResponse.json({ error: "目標使用者不是管理員" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { permissions } = body as { permissions: string[] | null };

    // null = 全部權限
    let permissionsJson: string | null = null;
    if (permissions !== null && Array.isArray(permissions)) {
      // 過濾無效的權限 key
      const valid = permissions.filter((p) =>
        ALL_PERMISSION_KEYS.includes(p as any)
      );
      permissionsJson = JSON.stringify(valid);
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { permissions: permissionsJson },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
