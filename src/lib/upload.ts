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

export async function saveFile(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return fileName;
}

export function deleteFile(fileName: string): void {
  const filePath = path.join(UPLOAD_DIR, fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
