import { FileArchive, FileImage, FileText, FileVideo, Music, File as FileIcon } from "lucide-react";

export function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className={className} />;
  if (mimeType.startsWith("video/")) return <FileVideo className={className} />;
  if (mimeType.startsWith("audio/")) return <Music className={className} />;
  if (mimeType.includes("zip") || mimeType.includes("compressed")) {
    return <FileArchive className={className} />;
  }
  if (mimeType.startsWith("text/") || mimeType.includes("pdf") || mimeType.includes("document")) {
    return <FileText className={className} />;
  }
  return <FileIcon className={className} />;
}
