import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/upload";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const filename = path.basename(params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "檔案不存在" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filename).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
      ? "image/webp"
      : "image/jpeg";

  return new NextResponse(fileBuffer, {
    headers: { "Content-Type": contentType },
  });
}
