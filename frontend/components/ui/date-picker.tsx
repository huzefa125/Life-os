"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "cn"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const TRIGGER_CLASS =
  "flex h-8 w-full items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-[13px] whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50"

/** Local "YYYY-MM-DD" (no time component) — parsed/formatted without UTC conversion, matching a plain date field. */
function parsePlainDate(value?: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function formatPlainDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
}: {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parsePlainDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(TRIGGER_CLASS, !selected && "text-muted-foreground", className)}
      >
        <CalendarIcon className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">{selected ? format(selected, "PPP") : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? formatPlainDate(date) : undefined)
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date & time",
  disabled,
  className,
}: {
  /** Full ISO instant (`Date#toISOString()`), so it's unambiguous regardless of the reading machine's timezone. */
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? new Date(value) : undefined
  const validSelected = selected && !Number.isNaN(selected.getTime()) ? selected : undefined

  function commit(next: Date) {
    onChange(next.toISOString())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(TRIGGER_CLASS, !validSelected && "text-muted-foreground", className)}
      >
        <CalendarIcon className="size-3.5 shrink-0" />
        <span className="flex-1 text-left">{validSelected ? format(validSelected, "PPP 'at' p") : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={validSelected}
          onSelect={(date) => {
            if (!date) return
            const next = new Date(date)
            if (validSelected) {
              next.setHours(validSelected.getHours(), validSelected.getMinutes())
            }
            commit(next)
          }}
          autoFocus
        />
        <div className="flex items-center gap-1.5 border-t p-2.5">
          <Input
            type="time"
            value={validSelected ? `${String(validSelected.getHours()).padStart(2, "0")}:${String(validSelected.getMinutes()).padStart(2, "0")}` : ""}
            onChange={(e) => {
              const [hours, minutes] = e.target.value.split(":").map(Number)
              const base = validSelected ? new Date(validSelected) : new Date()
              base.setHours(hours || 0, minutes || 0, 0, 0)
              commit(base)
            }}
            className="h-8 text-[13px]"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
