"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Inbox } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, ApiError } from "@/lib/api-client";
import type { Form, FormResponse } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ResponseDetailSheet } from "./response-detail-sheet";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ResponsesListView({ form }: { form: Form }) {
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.forms.responses
      .list(form.id)
      .then((data) => {
        if (!cancelled) setResponses(data);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load responses"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.id]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await api.forms.responses.exportCsv(form.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${form.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-responses.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't export CSV");
    } finally {
      setExporting(false);
    }
  }

  const fields = form.properties?.fields ?? [];

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <Link href="/forms" className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }))}>
          <ArrowLeft className="size-3.5" />
        </Link>
        <div className="flex size-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <Inbox className="size-3" />
        </div>
        <h1 className="truncate text-[15px] font-semibold">{form.title} — Responses</h1>
        {!loading ? <AnimatedNumber value={responses.length} className="text-[13px] text-muted-foreground" /> : null}
        <Button size="sm" variant="outline" className="ml-auto gap-1.5" disabled={exporting || responses.length === 0} onClick={handleExport}>
          <Download className="size-3.5" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : responses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No responses yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Submitted</TableHead>
                {fields.slice(0, 3).map((field) => (
                  <TableHead key={field.id} className="text-[13px]">
                    {field.label}
                  </TableHead>
                ))}
                <TableHead className="pr-0 text-right text-[13px]">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((response) => (
                <TableRow
                  key={response.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelectedId(response.id);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">
                    {formatDate(response.properties?.submittedAt ?? response.createdAt)}
                  </TableCell>
                  {fields.slice(0, 3).map((field) => {
                    const value = response.properties?.answers[field.id];
                    return (
                      <TableCell key={field.id} className="max-w-40 truncate text-[13px] text-muted-foreground">
                        {value === undefined || value === null || value === "" ? "—" : Array.isArray(value) ? value.join(", ") : String(value)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">
                    {response.properties?.createdObjects.length ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ResponseDetailSheet
        form={form}
        responseId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={(id) => setResponses((prev) => prev.filter((r) => r.id !== id))}
      />
    </div>
  );
}
