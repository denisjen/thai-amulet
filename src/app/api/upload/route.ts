import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveFile, generateFileName, ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/upload";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "權限不足" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未收到檔案" }, { status: 400 });
    }

    if (![...ALLOWED_TYPES, "image/gif"].includes(file.type)) {
      return NextResponse.json({ error: "僅支援 JPG、PNG、WebP、GIF 格式" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "檔案大小不得超過 5MB" }, { status: 400 });
    }

    const fileName = generateFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob
      const fileUrl = await saveFile(buffer, fileName, "uploads");
      return NextResponse.json({ url: fileUrl, fileName });
    } else {
      // 本地儲存
      const uploadDir = join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, fileName), buffer);
      return NextResponse.json({ url: `/uploads/${fileName}`, fileName });
    }
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message || "上傳失敗" }, { status: 500 });
  }
}
