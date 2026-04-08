import path from "path";
import fs from "fs";

export const UPLOAD_DIR = path.join(process.cwd(), "private", "uploads");
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function generateFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}${ext}`;
}

// 是否使用 Vercel Blob（雲端環境）
const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * 儲存檔案：Vercel 環境用 Blob，本地用 filesystem
 * 回傳可存入資料庫的 URL 或路徑
 */
export async function saveFile(
  buffer: Buffer,
  fileName: string,
  prefix = "uploads"
): Promise<string> {
  if (useVercelBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${prefix}/${fileName}`, buffer, {
      access: "public",
      contentType: getMimeType(fileName),
    });
    return blob.url;
  }

  // 本地儲存
  ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

/**
 * 刪除檔案：Vercel Blob 或本地
 */
export async function deleteFile(fileNameOrUrl: string): Promise<void> {
  if (useVercelBlob) {
    try {
      const { del } = await import("@vercel/blob");
      await del(fileNameOrUrl);
    } catch {}
    return;
  }

  const filePath = path.join(UPLOAD_DIR, fileNameOrUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  return map[ext] || "application/octet-stream";
}
