"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fromDatetimeLocalValue, toDatetimeLocalValue } from "@/lib/form-field-meta";
import type { FormSettings } from "@/lib/types";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 rounded-md border p-2.5">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" />
      <span className="flex flex-col">
        <span className="text-[13px] font-medium">{label}</span>
        {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  );
}

export function FormSettingsPanel({
  settings,
  onChange,
}: {
  settings: FormSettings;
  onChange: (settings: FormSettings) => void;
}) {
  function update(patch: Partial<FormSettings>) {
    onChange({ ...settings, ...patch });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          checked={settings.acceptResponses}
          onChange={(v) => update({ acceptResponses: v })}
          label="Accept responses"
          hint="Turn off to pause a published form without closing it."
        />
        <Toggle
          checked={settings.onePerPerson}
          onChange={(v) => update({ onePerPerson: v })}
          label="One response per person"
          hint="Best-effort — remembered per browser, not a hard identity check."
        />
        <Toggle
          checked={settings.allowResponseEditing}
          onChange={(v) => update({ allowResponseEditing: v })}
          label="Allow response editing"
          hint="Respondents can revisit their submission link and change answers."
        />
        <Toggle
          checked={settings.saveAndResumeLater}
          onChange={(v) => update({ saveAndResumeLater: v })}
          label="Save & resume later"
          hint="Adds a 'Save for later' button that returns a resume link."
        />
        <Toggle
          checked={settings.requireLogin}
          onChange={(v) => update({ requireLogin: v })}
          label="Require login"
          hint="Respondent must be signed into LifeOS."
        />
        <Toggle
          checked={!settings.anonymousResponses}
          onChange={(v) => update({ anonymousResponses: !v })}
          label="Record respondent info"
          hint="Captures IP/user agent instead of staying fully anonymous."
        />
        <Toggle
          checked={settings.showProgressBar ?? false}
          onChange={(v) => update({ showProgressBar: v })}
          label="Show progress bar"
        />
        <Toggle
          checked={settings.randomizeFields ?? false}
          onChange={(v) => update({ randomizeFields: v })}
          label="Randomize question order"
        />
        <Toggle
          checked={settings.spamProtectionEnabled}
          onChange={(v) => update({ spamProtectionEnabled: v })}
          label="Spam protection"
          hint="Not yet enforced — placeholder for a future CAPTCHA integration."
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Starts</Label>
          <Input
            type="datetime-local"
            value={toDatetimeLocalValue(settings.startDate)}
            onChange={(e) => update({ startDate: fromDatetimeLocalValue(e.target.value) })}
            className="h-8 text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Ends</Label>
          <Input
            type="datetime-local"
            value={toDatetimeLocalValue(settings.endDate)}
            onChange={(e) => update({ endDate: fromDatetimeLocalValue(e.target.value) })}
            className="h-8 text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Response limit</Label>
          <Input
            type="number"
            min={1}
            value={settings.responseLimit ?? ""}
            onChange={(e) => update({ responseLimit: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="No limit"
            className="h-8 text-[13px]"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Redirect after submission</Label>
          <Input
            type="url"
            value={settings.redirectUrl ?? ""}
            onChange={(e) => update({ redirectUrl: e.target.value || undefined })}
            placeholder="https://example.com/thank-you"
            className="h-8 text-[13px]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-[12px] text-muted-foreground">Layout</Label>
          <Select value={settings.layout ?? "card"} onValueChange={(v) => update({ layout: v as FormSettings["layout"] })}>
            <SelectTrigger size="sm" className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="full_page">Full page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
