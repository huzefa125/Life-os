import { FileArchive, FileImage, FileText, FileVideo, Music, File as FileIcon } from "lucide-react";
import {
  Bash,
  CPlusplus,
  CSharp,
  Css3,
  Docker,
  Go,
  Html5,
  Java,
  Javascript,
  Json,
  Kotlin,
  Markdown,
  Php,
  Python,
  Ruby,
  Rust,
  Swift,
  Typescript,
  Yaml,
  _React,
} from "@dev.icons/react";

/** Recognized source/config file extensions mapped to their devicons brand logo. */
const EXTENSION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  js: Javascript,
  mjs: Javascript,
  cjs: Javascript,
  jsx: _React,
  ts: Typescript,
  tsx: _React,
  py: Python,
  rb: Ruby,
  php: Php,
  go: Go,
  rs: Rust,
  java: Java,
  kt: Kotlin,
  kts: Kotlin,
  swift: Swift,
  cs: CSharp,
  cpp: CPlusplus,
  cc: CPlusplus,
  cxx: CPlusplus,
  css: Css3,
  html: Html5,
  htm: Html5,
  json: Json,
  yaml: Yaml,
  yml: Yaml,
  md: Markdown,
  markdown: Markdown,
  sh: Bash,
  bash: Bash,
};

function extensionOf(fileName: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1].toLowerCase() : null;
}

export function FileTypeIcon({
  mimeType,
  fileName,
  className,
}: {
  mimeType: string;
  fileName?: string;
  className?: string;
}) {
  const extension = fileName ? extensionOf(fileName) : null;
  if (extension === "dockerfile" || fileName?.toLowerCase() === "dockerfile") {
    return <Docker className={className} />;
  }
  if (extension && EXTENSION_ICON[extension]) {
    const BrandIcon = EXTENSION_ICON[extension];
    return <BrandIcon className={className} />;
  }

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
