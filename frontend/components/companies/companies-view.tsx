"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, List, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Company } from "@/lib/types";
import { CreateCompanyDialog } from "./create-company-dialog";
import { CompanyDetailSheet } from "./company-detail-sheet";

export function CompaniesView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.companies
      .list()
      .then((data) => {
        if (cancelled) return;
        setCompanies(data);
        const focusId = searchParams.get("focus");
        if (focusId) {
          const match = data.find((c) => c.id === focusId);
          if (match) {
            setSelected(match);
            setDetailOpen(true);
          }
          router.replace("/companies");
        }
      })
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Couldn't load companies"))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.title.toLowerCase().includes(q));
  }, [filter, companies]);

  return (
    <div className="flex min-h-full flex-col bg-background">
      <div className="flex items-center gap-2 px-6 py-3">
        <div className="flex size-5 items-center justify-center rounded-md bg-fuchsia-100 text-fuchsia-600">
          <Building2 className="size-3" />
        </div>
        <h1 className="text-[15px] font-semibold">Companies</h1>
        {!loading ? <AnimatedNumber value={companies.length} className="text-[13px] text-muted-foreground" /> : null}
        <Button size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          New
        </Button>
      </div>

      <div className="flex items-center gap-1.5 border-y bg-canvas px-6 py-1.5">
        <List className="size-3.5 text-muted-foreground" />
        <span className="text-[13px] font-medium text-foreground/80">All Companies</span>
        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 w-44 border-none bg-transparent pl-7 text-[13px] shadow-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="px-6">
        {loading ? (
          <div className="flex flex-col gap-3 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-fuchsia-100">
              <Building2 className="size-5 text-fuchsia-600" />
            </div>
            {companies.length === 0 ? (
              <>
                <div>
                  <p className="text-sm font-medium">No companies yet</p>
                  <p className="text-sm text-muted-foreground">Add a company to link people, projects, and forms to it.</p>
                </div>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-3.5" />
                  New company
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No companies match &quot;{filter}&quot;.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0 text-[13px]">Name</TableHead>
                <TableHead className="text-[13px]">Website</TableHead>
                <TableHead className="pr-0 text-[13px]">Industry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((company) => (
                <TableRow
                  key={company.id}
                  className="cursor-pointer border-border/70"
                  onClick={() => {
                    setSelected(company);
                    setDetailOpen(true);
                  }}
                >
                  <TableCell className="py-2 pl-0 text-[13px] font-medium">{company.title}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{String(company.properties?.website ?? "—")}</TableCell>
                  <TableCell className="pr-0 text-[13px] text-muted-foreground">{String(company.properties?.industry ?? "—")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(c) => setCompanies((prev) => [c, ...prev])} />
      <CompanyDetailSheet
        company={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdated={(c) => {
          setCompanies((prev) => prev.map((x) => (x.id === c.id ? c : x)));
          setSelected(c);
        }}
        onDeleted={(id) => setCompanies((prev) => prev.filter((x) => x.id !== id))}
      />
    </div>
  );
}
