import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID!;
const TWILIO_BASE = `https://verify.twilio.com/v2/Services/${SERVICE_SID}`;
const BASIC = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");

// POST /api/account/phone-verify?action=send  → send OTP
// POST /api/account/phone-verify?action=check → verify OTP and bind phone
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  // Block if user already has a phone
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { phone: true },
  });
  if (dbUser?.phone) {
    return NextResponse.json({ error: "手機號碼已綁定" }, { status: 400 });
  }

  const action = req.nextUrl.searchParams.get("action");
  const body = await req.json();

  if (action === "send") {
    const { phone } = body;
    if (!phone) return NextResponse.json({ error: "請輸入手機號碼" }, { status: 400 });

    // Normalize to E.164: 09xxxxxxxx → +8869xxxxxxxx
    const normalized = phone.startsWith("+")
      ? phone
      : "+886" + phone.replace(/^0/, "");

    // Check phone not already taken by another user
    const existing = await prisma.user.findFirst({ where: { phone: normalized } });
    if (existing) {
      return NextResponse.json({ error: "此手機號碼已被其他帳號使用" }, { status: 400 });
    }

    const res = await fetch(`${TWILIO_BASE}/Verifications`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${BASIC}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: normalized, Channel: "sms" }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.message || "簡訊發送失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, phone: normalized });
  }

  if (action === "check") {
    const { phone, code } = body;
    if (!phone || !code) {
      return NextResponse.json({ error: "請填寫手機號碼與驗證碼" }, { status: 400 });
    }

    const normalized = phone.startsWith("+")
      ? phone
      : "+886" + phone.replace(/^0/, "");

    const res = await fetch(`${TWILIO_BASE}/VerificationCheck`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${BASIC}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: normalized, Code: code }),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "approved") {
      return NextResponse.json({ error: "驗證碼錯誤或已過期" }, { status: 400 });
    }

    // Save verified phone to DB
    await prisma.user.update({
      where: { id: session.user.id! },
      data: { phone: normalized },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "無效操作" }, { status: 400 });
}
