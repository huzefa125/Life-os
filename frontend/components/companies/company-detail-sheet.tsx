"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api, ApiError } from "@/lib/api-client";
import type { Company } from "@/lib/types";

export function CompanyDetailSheet({
  company,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (company: Company) => void;
  onDeleted: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-md">
        {company ? (
          <CompanyDetailContent key={company.id} company={company} onOpenChange={onOpenChange} onUpdated={onUpdated} onDeleted={onDeleted} />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CompanyDetailContent({
  company,
  onOpenChange,
  onUpdated,
  onDeleted,
}: {
  company: Company;
  onOpenChange: (open: boolean) => void;
  onUpdated: (company: Company) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(company.title);
  const [website, setWebsite] = useState(String(company.properties?.website ?? ""));
  const [industry, setIndustry] = useState(String(company.properties?.industry ?? ""));
  const [size, setSize] = useState(String(company.properties?.size ?? ""));
  const [notes, setNotes] = useState(String(company.properties?.notes ?? ""));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    name !== company.title ||
    website !== String(company.properties?.website ?? "") ||
    industry !== String(company.properties?.industry ?? "") ||
    size !== String(company.properties?.size ?? "") ||
    notes !== String(company.properties?.notes ?? "");

  async function handleSave() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const updated = await api.companies.update(company.id, {
        name: name.trim(),
        properties: {
          ...(website.trim() ? { website: website.trim() } : {}),
          ...(industry.trim() ? { industry: industry.trim() } : {}),
          ...(size.trim() ? { size: size.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      onUpdated(updated);
      toast.success("Company saved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save company");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.companies.remove(company.id);
      toast.success(`${company.title} deleted`);
      onDeleted(company.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete company");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle>{company.title}</SheetTitle>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Website</Label>
            <Input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Industry</Label>
            <Input value={industry} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Size</Label>
            <Input value={size} onChange={(e) => setSize(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <SheetFooter className="flex-row justify-between">
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={deleting} onClick={handleDelete}>
          {deleting ? "Deleting..." : "Delete"}
        </Button>
        <Button size="sm" disabled={saving || !dirty || !name.trim()} onClick={handleSave}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </SheetFooter>
    </>
  );
}
