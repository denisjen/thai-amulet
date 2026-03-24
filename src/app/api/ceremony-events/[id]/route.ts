import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  eventDate: z.string().optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN")
      return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "資料格式錯誤" }, { status: 400 });

    const { name, eventDate, description, isActive } = parsed.data;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (eventDate !== undefined) data.eventDate = new Date(eventDate);
    if (description !== undefined) data.description = description;
    if (isActive !== undefined) data.isActive = isActive;

    const event = await prisma.ceremonyEvent.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ event });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN")
      return NextResponse.json({ error: "權限不足" }, { status: 403 });

    // Check if event has ceremonies assigned
    const count = await prisma.ceremonyInfo.count({
      where: { ceremonyEventId: params.id },
    });
    if (count > 0)
      return NextResponse.json(
        { error: `此法事項目已有 ${count} 筆法事訂單，無法刪除` },
        { status: 400 }
      );

    await prisma.ceremonyEvent.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
