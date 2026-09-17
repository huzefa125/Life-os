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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api-client";
import type { Person } from "@/lib/types";
import { PropertyEditor, rowsToProperties, type PropertyRow } from "./property-editor";

export function CreatePersonDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (person: Person) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setCompany("");
    setNotes("");
    setRows([]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const properties = {
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(company.trim() ? { company: company.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...rowsToProperties(rows),
      };
      const person = await api.people.create({
        name: name.trim(),
        ...(Object.keys(properties).length > 0 ? { properties } : {}),
      });
      onCreated(person);
      toast.success(`${person.title} added`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't create person");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>New person</DialogTitle>
            <DialogDescription>Add someone to your workspace.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              autoFocus
              placeholder="Ada Lovelace"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-email">Email</Label>
              <Input
                id="person-email"
                type="email"
                placeholder="ada@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-company">Company</Label>
              <Input
                id="person-company"
                placeholder="Acme"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-notes">Notes</Label>
            <Textarea
              id="person-notes"
              placeholder="Add any notes…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Other properties</Label>
            <PropertyEditor rows={rows} onChange={setRows} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "Adding…" : "Add person"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
