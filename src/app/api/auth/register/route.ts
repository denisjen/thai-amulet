import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";

const phoneSchema = z.object({
  type: z.literal("phone"),
  phone: z.string().regex(/^09\d{8}$/, "請輸入有效的台灣手機號碼"),
  password: z.string().min(6, "密碼至少 6 個字元"),
  name: z.string().optional(),
});

const emailSchema = z.object({
  type: z.literal("email"),
  email: z.string().email("請輸入有效的 Email 地址"),
  password: z.string().min(6, "密碼至少 6 個字元"),
  name: z.string().optional(),
});

const registerSchema = z.discriminatedUnion("type", [phoneSchema, emailSchema]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const hashed = await bcrypt.hash(data.password, 12);

    if (data.type === "phone") {
      // 手機號碼註冊
      const existing = await prisma.user.findFirst({ where: { phone: data.phone } });
      if (existing) {
        return NextResponse.json({ error: "此手機號碼已註冊" }, { status: 409 });
      }
      const user = await prisma.user.create({
        data: { phone: data.phone, password: hashed, name: data.name },
        select: { id: true, phone: true, name: true, role: true },
      });
      return NextResponse.json({ user }, { status: 201 });
    } else {
      // Email 註冊
      const existing = await prisma.user.findFirst({ where: { email: data.email } });
      if (existing) {
        return NextResponse.json({ error: "此 Email 已註冊" }, { status: 409 });
      }
      const user = await prisma.user.create({
        data: { email: data.email, password: hashed, name: data.name },
        select: { id: true, email: true, name: true, role: true },
      });
      return NextResponse.json({ user }, { status: 201 });
    }
  } catch {
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
