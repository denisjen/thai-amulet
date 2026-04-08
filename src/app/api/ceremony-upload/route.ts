import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveFile, generateFileName, ALLOWED_TYPES, MAX_FILE_SIZE, ensureUploadDir } from "@/lib/upload";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "僅支援 JPG、PNG、WebP 格式" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "檔案大小不得超過 5MB" }, { status: 400 });
    }

    ensureUploadDir();
    const fileName = generateFileName(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    await saveFile(buffer, fileName);

    return NextResponse.json({ fileName });
  } catch (e: any) {
    console.error("Ceremony upload error:", e);
    return NextResponse.json({ error: e.message || "上傳失敗" }, { status: 500 });
  }
}
