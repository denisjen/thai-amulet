import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "未授權" }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: session.user.id! } });
    if (!user) return NextResponse.json({ error: "使用者不存在" }, { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return NextResponse.json({ error: "目前密碼不正確" }, { status: 400 });

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "新密碼至少 6 個字元" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: "密碼已更改" });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
