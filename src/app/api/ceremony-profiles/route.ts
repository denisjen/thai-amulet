import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function newCuid() {
  return "c" + randomBytes(11).toString("hex");
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const profiles: any[] = await prisma.$queryRaw`
    SELECT id, name, englishName, phone, birthDate, birthTime, lunarBirth, photoPath, updatedAt
    FROM \`CeremonyProfile\`
    WHERE userId = ${session.user.id}
    ORDER BY updatedAt DESC
    LIMIT 20
  `;

  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json();
  const { name, englishName, phone, birthDate, birthTime, lunarBirth, photoPath } = body;

  if (!name || !phone || !birthDate) {
    return NextResponse.json({ error: "姓名、手機、出生日期為必填" }, { status: 400 });
  }

  const userId = session.user.id;

  // 查詢同名+電話+生日是否已存在
  const existing: any[] = await prisma.$queryRaw`
    SELECT id FROM \`CeremonyProfile\`
    WHERE userId = ${userId} AND name = ${name} AND phone = ${phone} AND birthDate = ${birthDate}
    LIMIT 1
  `;

  if (existing.length > 0) {
    // 更新
    await prisma.$executeRaw`
      UPDATE \`CeremonyProfile\`
      SET englishName = ${englishName ?? null},
          birthTime   = ${birthTime   ?? null},
          lunarBirth  = ${lunarBirth  ?? null},
          photoPath   = ${photoPath   ?? null},
          updatedAt   = NOW()
      WHERE id = ${existing[0].id}
    `;
    return NextResponse.json({ id: existing[0].id, updated: true });
  } else {
    // 新增
    const id = newCuid();
    const now = new Date();
    await prisma.$executeRaw`
      INSERT INTO \`CeremonyProfile\`
        (id, userId, name, englishName, phone, birthDate, birthTime, lunarBirth, photoPath, createdAt, updatedAt)
      VALUES
        (${id}, ${userId}, ${name}, ${englishName ?? null}, ${phone}, ${birthDate},
         ${birthTime ?? null}, ${lunarBirth ?? null}, ${photoPath ?? null}, ${now}, ${now})
    `;
    return NextResponse.json({ id, updated: false }, { status: 201 });
  }
}
