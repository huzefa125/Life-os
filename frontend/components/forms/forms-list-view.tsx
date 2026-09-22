"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
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
import type { Form } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FormsTabs } from "./forms-tabs";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function FormsListView() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.forms
      .list()
      .then((data) => {
        if (!cancelled) setForms(data);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load forms"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createForm() {
    setCreating(true);
    try {
      const form = await api.forms.create({ title: "Untitled form" });
      router.push(`/forms/${form.id}/edit`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create form");
      setCreating(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <ClipboardList className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Forms</h1>
        {!loading ? <AnimatedNumber value={forms.length} className="text-[13px] text-muted-foreground" /> : null}
        <Button size="sm" className="ml-auto" disabled={creating} onClick={createForm}>
          <Plus className="size-3.5" />
          New
        </Button>
      </div>

      <FormsTabs />

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-indigo-100">
              <ClipboardList className="size-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium">No forms yet</p>
              <p className="text-sm text-muted-foreground">Build a form and connect it to your LifeOS data.</p>
            </div>
            <Button size="sm" disabled={creating} onClick={createForm}>
              <Plus className="size-3.5" />
              New form
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Name</TableHead>
                <TableHead className="text-[13px]">Status</TableHead>
                <TableHead className="text-[13px]">Fields</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => {
                const published = form.properties?.published ?? false;
                return (
                  <TableRow
                    key={form.id}
                    className="cursor-pointer border-border/70"
                    onClick={() => router.push(`/forms/${form.id}/edit`)}
                  >
                    <TableCell className="py-2 pl-0 text-[13px] font-medium">{form.title}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          published ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {published ? "Published" : "Draft"}
                        {published ? (
                          <a
                            href={`/f/${form.id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="ml-0.5"
                          >
                            <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{form.properties?.fields.length ?? 0}</TableCell>
                    <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">{formatDate(form.updatedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
