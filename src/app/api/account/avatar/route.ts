import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saveFile, generateFileName } from "@/lib/upload";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 3 * 1024 * 1024; // 3MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未收到檔案" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "僅支援 JPG、PNG、WebP、GIF 格式" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "檔案大小不得超過 3MB" }, { status: 400 });
    }

    const fileName = `avatar-${session.user.id}-${generateFileName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    let avatarUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob
      avatarUrl = await saveFile(buffer, fileName, "avatars");
    } else {
      // 本地儲存
      const uploadDir = join(process.cwd(), "public", "uploads", "avatars");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, fileName), buffer);
      avatarUrl = `/uploads/avatars/${fileName}`;
    }

    await prisma.user.update({
      where: { id: session.user.id! },
      data: { avatarUrl },
    });

    return NextResponse.json({ avatarUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "上傳失敗" }, { status: 500 });
  }
}
