import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1, "請填寫法事名稱"),
  eventDate: z.string().min(1, "請選擇法事日期"),
  description: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET() {
  try {
    const events = await prisma.ceremonyEvent.findMany({
      include: {
        _count: { select: { ceremonies: true } },
      },
      orderBy: { eventDate: "desc" },
    });
    return NextResponse.json({ events });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN")
      return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message ?? "資料格式錯誤" },
        { status: 400 }
      );

    const { name, eventDate, description, isActive } = parsed.data;
    const event = await prisma.ceremonyEvent.create({
      data: {
        name,
        eventDate: new Date(eventDate),
        description: description || null,
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
