import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// PATCH /api/ceremonies/[id] - assign ceremony to an event or confirm appointment time
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if ((session?.user as any)?.role !== "ADMIN")
      return NextResponse.json({ error: "權限不足" }, { status: 403 });

    const body = await req.json();
    const { ceremonyEventId, confirmedTime } = body;

    const data: any = {};
    if ("ceremonyEventId" in body) data.ceremonyEventId = ceremonyEventId || null;
    if (confirmedTime) {
      data.confirmedTime = new Date(confirmedTime);
      data.timeConfirmed = true;
    }

    const updated = await prisma.ceremonyInfo.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true, ceremony: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
