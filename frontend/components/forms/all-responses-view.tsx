"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Inbox } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
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
import { FormsTabs } from "./forms-tabs";

interface FormWithResponseCount {
  form: Form;
  count: number;
}

export function AllResponsesView() {
  const router = useRouter();
  const [rows, setRows] = useState<FormWithResponseCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.forms
      .list()
      .then(async (forms) => {
        const counts = await Promise.all(
          forms.map(async (form) => {
            try {
              const responses = await api.forms.responses.list(form.id);
              return { form, count: responses.length };
            } catch {
              return { form, count: 0 };
            }
          })
        );
        if (!cancelled) setRows(counts);
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load responses"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalResponses = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
          <ClipboardList className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Forms</h1>
        {!loading ? <AnimatedNumber value={totalResponses} className="text-[13px] text-muted-foreground" /> : null}
      </div>

      <FormsTabs />

      <div className="px-6 py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No forms yet — create one to start collecting responses.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Form</TableHead>
                <TableHead className="pr-0 text-right text-[13px]">Responses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ form, count }) => (
                <TableRow
                  key={form.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => router.push(`/forms/${form.id}/responses`)}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{form.title}</TableCell>
                  <TableCell className="pr-0 text-right text-[13px] text-muted-foreground">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
