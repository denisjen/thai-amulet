import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { path, referrer, sessionId } = await req.json();
    if (!path) return NextResponse.json({ ok: false });

    // 取得已登入者 userId（若有）
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const userId = (token?.id as string) ?? null;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const ua = req.headers.get("user-agent") || null;

    await prisma.visitLog.create({
      data: {
        sessionId: sessionId ?? null,
        userId,
        path,
        referrer: referrer ?? null,
        ipAddress: ip,
        userAgent: ua,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
