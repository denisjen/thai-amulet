import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import bcrypt from "bcryptjs";

/** GET: 取得所有 ADMIN 使用者及其權限 */
export async function GET() {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { permissions: true },
  });
  if (!hasPermission(currentUser?.permissions, "permissions")) {
    return NextResponse.json({ error: "您沒有權限管理的權限" }, { status: 403 });
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

  return NextResponse.json({ admins });
}

/** POST: 新增管理員 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user!.id! },
    select: { permissions: true },
  });
  if (!hasPermission(currentUser?.permissions, "permissions.create_admin")) {
    return NextResponse.json({ error: "您沒有新增管理員的權限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, phone, email, password, permissions } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "請輸入姓名" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "密碼至少需要 6 個字元" }, { status: 400 });
    }
    if (!phone?.trim() && !email?.trim()) {
      return NextResponse.json({ error: "請輸入手機號碼或 Email" }, { status: 400 });
    }

    // 檢查手機/Email 是否已存在
    if (phone?.trim()) {
      const existing = await prisma.user.findFirst({ where: { phone: phone.trim() } });
      if (existing) {
        return NextResponse.json({ error: "此手機號碼已被使用" }, { status: 400 });
      }
    }
    if (email?.trim()) {
      const existing = await prisma.user.findFirst({ where: { email: email.trim() } });
      if (existing) {
        return NextResponse.json({ error: "此 Email 已被使用" }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const permissionsJson = Array.isArray(permissions) ? JSON.stringify(permissions) : null;

    const newAdmin = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        password: hashedPassword,
        role: "ADMIN",
        permissions: permissionsJson,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        permissions: true,
      },
    });

    return NextResponse.json({ admin: newAdmin });
  } catch {
    return NextResponse.json({ error: "建立失敗" }, { status: 500 });
  }
}
