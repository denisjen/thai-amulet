import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

/** GET /api/account/set-password → 確認目前帳號是否尚未設定密碼 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  return NextResponse.json({ needsSetup: !user?.password });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "密碼至少需要 6 個字元" }, { status: 400 });
    }

    // 確認此帳號目前沒有密碼（Google 登入的新帳號）
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });
    if (!user) return NextResponse.json({ error: "帳號不存在" }, { status: 404 });
    if (user.password) {
      return NextResponse.json({ error: "此帳號已設有密碼，請使用「更改密碼」功能" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "設定失敗" }, { status: 500 });
  }
}
