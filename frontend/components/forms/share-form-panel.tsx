"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Code2, Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareFormPanel({ formId }: { formId: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // window.location isn't available during SSR — this has to run after mount,
    // not as a lazy useState initializer (that would mismatch the SSR'd markup).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(`${window.location.origin}/f/${formId}`);
  }, [formId]);

  useEffect(() => {
    if (showQr && url && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 160, margin: 1 }).catch(() => {});
    }
  }, [showQr, url]);

  const embedCode = `<iframe src="${url}" width="100%" height="720" style="border:0;" title="Form"></iframe>`;

  async function copy(text: string, which: "link" | "embed") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast.success(which === "link" ? "Link copied" : "Embed code copied");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  }

  if (!url) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/10">
      <p className="text-[13px] font-medium text-emerald-700 dark:text-emerald-400">Your form is live!</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 min-w-[200px] truncate rounded-md border bg-background px-2.5 py-1.5 text-[12px]">{url}</code>
        <Button size="xs" variant="outline" className="gap-1" onClick={() => copy(url, "link")}>
          {copied === "link" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          Copy link
        </Button>
        <a href={url} target="_blank" rel="noreferrer">
          <Button size="xs" variant="outline" className="gap-1">
            <ExternalLink className="size-3" />
            Open
          </Button>
        </a>
        <Button size="xs" variant="outline" className="gap-1" onClick={() => setShowQr((v) => !v)}>
          <QrCode className="size-3" />
          QR code
        </Button>
      </div>

      {showQr ? (
        <div className="flex items-center gap-3 rounded-md border bg-background p-3">
          <canvas ref={canvasRef} />
          <p className="text-[12px] text-muted-foreground">Scan to open the form on a phone.</p>
        </div>
      ) : null}

      <details className="text-[12px]">
        <summary className="flex cursor-pointer items-center gap-1.5 font-medium text-muted-foreground">
          <Code2 className="size-3.5" />
          Embed
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            readOnly
            value={embedCode}
            rows={2}
            className="w-full rounded-md border bg-muted/40 px-2.5 py-1.5 font-mono text-[11px]"
          />
          <Button size="xs" variant="outline" className="w-fit gap-1" onClick={() => copy(embedCode, "embed")}>
            {copied === "embed" ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            Copy embed code
          </Button>
        </div>
      </details>
    </div>
  );
}
