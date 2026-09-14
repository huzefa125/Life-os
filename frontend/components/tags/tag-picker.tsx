"use client";

import { useState } from "react";
import { Plus, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { TagBadge } from "./tag-badge";

const PRESET_TAGS = ["work", "personal", "college", "project"];

export function TagPicker({
  tags,
  onChange,
  disabled = false,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");

  const normalizedTags = tags.map((t) => (t.startsWith("#") ? t.slice(1).toLowerCase().trim() : t.toLowerCase().trim()));

  function toggleTag(tag: string) {
    const clean = tag.startsWith("#") ? tag.slice(1).toLowerCase().trim() : tag.toLowerCase().trim();
    if (!clean) return;

    if (normalizedTags.includes(clean)) {
      onChange(normalizedTags.filter((t) => t !== clean));
    } else {
      onChange([...normalizedTags, clean]);
    }
  }

  function handleAddCustom() {
    const clean = inputVal.startsWith("#") ? inputVal.slice(1).toLowerCase().trim() : inputVal.toLowerCase().trim();
    if (clean && !normalizedTags.includes(clean)) {
      onChange([...normalizedTags, clean]);
      setInputVal("");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {normalizedTags.map((tag) => (
        <TagBadge
          key={tag}
          tag={tag}
          onRemove={disabled ? undefined : () => toggleTag(tag)}
        />
      ))}

      {!disabled && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="inline-flex h-6 items-center gap-1 rounded-full border border-dashed border-border px-2 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            <Plus className="size-3" />
            <span>Tag</span>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 border-b pb-1.5 text-xs font-medium text-muted-foreground">
                <TagIcon className="size-3.5" />
                <span>Assign Tags</span>
              </div>

              <div className="flex flex-wrap gap-1 py-1">
                {PRESET_TAGS.map((preset) => {
                  const isSelected = normalizedTags.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleTag(preset)}
                      className="focus:outline-none"
                    >
                      <TagBadge
                        tag={preset}
                        active={isSelected}
                        className={isSelected ? "opacity-100" : "opacity-60 hover:opacity-100"}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 pt-1">
                <Input
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustom();
                    }
                  }}
                  placeholder="New tag..."
                  className="h-7 text-xs"
                />
                <Button
                  size="xs"
                  className="h-7 px-2"
                  onClick={handleAddCustom}
                  disabled={!inputVal.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
