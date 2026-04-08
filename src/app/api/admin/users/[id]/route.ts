import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }
  // 不可刪除自己
  if (session.user?.id === params.id) {
    return NextResponse.json({ error: "無法刪除自己的帳號" }, { status: 400 });
  }
  try {
    // 有訂單記錄則不可刪除
    const orderCount = await prisma.order.count({ where: { userId: params.id } });
    if (orderCount > 0) {
      return NextResponse.json(
        { error: `此會員有 ${orderCount} 筆訂單記錄，無法刪除` },
        { status: 400 }
      );
    }
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { phone, name, email, isActive, newPassword } = body;

    const updateData: any = {};
    if (phone !== undefined) updateData.phone = phone || null;
    if (name !== undefined) updateData.name = name || null;
    if (email !== undefined) updateData.email = email || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // 管理員直接設定新密碼（不需要舊密碼）
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "密碼至少需要 6 個字元" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Check phone uniqueness if changing phone
    if (phone) {
      const existing = await prisma.user.findFirst({
        where: { phone, id: { not: params.id } },
      });
      if (existing) {
        return NextResponse.json({ error: "此手機號碼已被其他帳號使用" }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, phone: true, name: true, email: true, isActive: true },
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }
}
