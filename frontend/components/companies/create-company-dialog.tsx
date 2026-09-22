"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/lib/api-client";
import type { Company } from "@/lib/types";

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (company: Company) => void;
}) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setWebsite("");
    setIndustry("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const properties = {
        ...(website.trim() ? { website: website.trim() } : {}),
        ...(industry.trim() ? { industry: industry.trim() } : {}),
      };
      const company = await api.companies.create({
        name: name.trim(),
        ...(Object.keys(properties).length > 0 ? { properties } : {}),
      });
      onCreated(company);
      toast.success(`${company.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create company");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New company</DialogTitle>
            <DialogDescription>Add a company to your workspace.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Name</Label>
            <Input id="company-name" autoFocus placeholder="Acme Inc" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-website">Website</Label>
              <Input id="company-website" type="url" placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company-industry">Industry</Label>
              <Input id="company-industry" placeholder="Software" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Adding…" : "Add company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
