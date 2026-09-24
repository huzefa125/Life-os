"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageLoader } from "@/components/ui/loader";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import type { Page } from "@/lib/types";
import { PageEditorView } from "@/components/pages/page-editor-view";

export default function SinglePageClient() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    api.pages
      .get(id)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Page not found");
          router.push("/pages");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return <PageLoader label="Opening page" />;
  }

  if (!page) return null;

  return <PageEditorView initialPage={page} />;
}
