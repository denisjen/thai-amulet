import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orderId = formData.get("orderId") as string | null;
    const caption = (formData.get("caption") as string | null) || null;

    if (!file) return NextResponse.json({ error: "未收到檔案" }, { status: 400 });
    if (!orderId) return NextResponse.json({ error: "未提供訂單 ID" }, { status: 400 });

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "僅支援 JPG、PNG、WebP、GIF 格式" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "檔案大小不得超過 10MB" }, { status: 400 });
    }

    // 確認訂單存在
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) return NextResponse.json({ error: "訂單不存在" }, { status: 404 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const uniqueName = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;

    const uploadDir = join(process.cwd(), "public", "uploads", "ceremony-photos");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(uploadDir, uniqueName), buffer);

    const url = `/uploads/ceremony-photos/${uniqueName}`;

    const photo = await prisma.ceremonyPhoto.create({
      data: { orderId, url, caption },
    });

    return NextResponse.json(photo);
  } catch (e: any) {
    console.error("Ceremony photo upload error:", e);
    return NextResponse.json({ error: e.message || "上傳失敗" }, { status: 500 });
  }
}
