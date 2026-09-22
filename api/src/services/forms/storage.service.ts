import path from "path";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import multer from "multer";
import { env } from "../../config/env";

// Explicitly excludes SVG/HTML and any other script-executable type — the
// classic stored-XSS vector for user-uploaded content served back to other
// users (a form owner viewing a respondent's upload).
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/csv",
  "text/plain",
  "application/zip",
]);

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("File type not allowed"));
      return;
    }
    cb(null, true);
  },
}).single("file");

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
}

export interface SavedUpload {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Local-disk storage for form-upload attachments, isolated behind this one
 * function so a future S3 (or other) adapter can replace it without any
 * caller changes.
 */
export async function saveUploadedFile(
  publicOrigin: string,
  formId: string,
  file: Express.Multer.File
): Promise<SavedUpload> {
  const dir = path.join(process.cwd(), env.UPLOAD_DIR, "forms", formId);
  await fs.mkdir(dir, { recursive: true });

  const storedName = `${randomUUID()}-${sanitizeFileName(file.originalname)}`;
  await fs.writeFile(path.join(dir, storedName), file.buffer);

  return {
    url: `${publicOrigin}/uploads/forms/${formId}/${storedName}`,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}
