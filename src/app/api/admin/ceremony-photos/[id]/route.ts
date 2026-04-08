import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { unlink } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }
  try {
    const { caption } = await req.json();
    const photo = await prisma.ceremonyPhoto.update({
      where: { id: params.id },
      data: { caption },
    });
    return NextResponse.json(photo);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "更新失敗" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const photo = await prisma.ceremonyPhoto.findUnique({ where: { id: params.id } });
    if (!photo) return NextResponse.json({ error: "找不到照片" }, { status: 404 });

    // 刪除實體檔案
    const filePath = join(process.cwd(), "public", photo.url);
    try { await unlink(filePath); } catch { /* 檔案不存在不影響 */ }

    await prisma.ceremonyPhoto.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "刪除失敗" }, { status: 500 });
  }
}
