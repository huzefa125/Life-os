"use client";

import { useEffect, useRef } from "react";
import {
  AlignLeft,
  ChevronDown,
  Code,
  GripVertical,
  Heading,
  List,
  Quote,
  SquareCheck,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Block, BlockType } from "@/lib/types";
import { cn } from "@/lib/utils";

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "text", label: "Text", icon: AlignLeft },
  { type: "heading", label: "Heading", icon: Heading },
  { type: "todo", label: "To-do list", icon: SquareCheck },
  { type: "bullet", label: "Bulleted list", icon: List },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "code", label: "Code", icon: Code },
];

export function BlockItem({
  block,
  isFirst,
  isLast,
  autoFocus = false,
  onChange,
  onDelete,
  onAddBelow,
  onMoveUp,
  onMoveDown,
}: {
  block: Block;
  isFirst: boolean;
  isLast: boolean;
  autoFocus?: boolean;
  onChange: (updated: Block) => void;
  onDelete: () => void;
  onAddBelow: (type?: BlockType) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  function resize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  }, [block.content, block.type]);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      // Enter on heading/quote/bullet/todo/text creates a new block below
      if (block.type !== "code") {
        e.preventDefault();
        onAddBelow(block.type === "todo" || block.type === "bullet" ? block.type : "text");
      }
    } else if (e.key === "Backspace" && block.content === "") {
      // If block is empty and not basic text, convert to text first
      if (block.type !== "text") {
        e.preventDefault();
        onChange({ ...block, type: "text" });
      } else if (!isFirst) {
        // Backspace on empty text deletes the block
        e.preventDefault();
        onDelete();
      }
    }
  }

  const currentTypeInfo = BLOCK_TYPES.find((t) => t.type === block.type) ?? BLOCK_TYPES[0];
  const CurrentIcon = currentTypeInfo.icon;

  return (
    <div className="group relative -mx-2 flex items-start rounded-md px-2 py-1 transition-colors hover:bg-muted/40">
      {/* Left block handle & action menu */}
      <div className="mr-1.5 mt-1 flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-5 items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            title="Block options & change type"
          >
            <GripVertical className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
              Turn into
            </div>
            {BLOCK_TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <DropdownMenuItem
                  key={t.type}
                  onClick={() => onChange({ ...block, type: t.type })}
                  className={cn("gap-2 text-xs", block.type === t.type && "bg-muted font-medium")}
                >
                  <Icon className="size-3.5" />
                  <span>{t.label}</span>
                </DropdownMenuItem>
              );
            })}
            <div className="my-1 border-t" />
            {!isFirst && onMoveUp && (
              <DropdownMenuItem onClick={onMoveUp} className="gap-2 text-xs">
                <ArrowUp className="size-3.5" />
                <span>Move up</span>
              </DropdownMenuItem>
            )}
            {!isLast && onMoveDown && (
              <DropdownMenuItem onClick={onMoveDown} className="gap-2 text-xs">
                <ArrowDown className="size-3.5" />
                <span>Move down</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              <span>Delete block</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={() => onAddBelow("text")}
          className="flex size-5 items-center justify-center rounded text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          title="Add block below"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* Block content based on type */}
      <div className="min-w-0 flex-1">
        {block.type === "todo" && (
          <div className="flex items-start gap-2.5">
            <div className="mt-1 flex shrink-0 items-center">
              <Checkbox
                checked={block.checked ?? false}
                onCheckedChange={(checked) =>
                  onChange({ ...block, checked: Boolean(checked) })
                }
              />
            </div>
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={(e) => {
                onChange({ ...block, content: e.target.value });
                resize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="To-do item..."
              className={cn(
                "w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0",
                block.checked && "line-through text-muted-foreground"
              )}
            />
          </div>
        )}

        {block.type === "bullet" && (
          <div className="flex items-start gap-2.5">
            <span className="mt-1 select-none text-base leading-none text-foreground/80">•</span>
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={(e) => {
                onChange({ ...block, content: e.target.value });
                resize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="List item..."
              className="w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {block.type === "heading" && (
          <div className="flex items-center gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={(e) => {
                onChange({ ...block, content: e.target.value });
                resize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Heading..."
              className="w-full resize-none border-none bg-transparent p-0 font-heading text-xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {block.type === "quote" && (
          <div className="border-l-2 border-primary/70 pl-3.5 py-0.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={block.content}
              onChange={(e) => {
                onChange({ ...block, content: e.target.value });
                resize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Quote..."
              className="w-full resize-none border-none bg-transparent p-0 text-sm italic leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {block.type === "code" && (
          <div className="rounded-md border border-border bg-muted/60 p-2.5 font-mono text-xs shadow-xs">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-sans font-medium uppercase tracking-wider">Code Block</span>
              <span>Tab / Shift+Enter for newline</span>
            </div>
            <textarea
              ref={textareaRef}
              rows={3}
              value={block.content}
              onChange={(e) => {
                onChange({ ...block, content: e.target.value });
                resize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="// Write code here..."
              className="w-full resize-none border-none bg-transparent p-0 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
            />
          </div>
        )}

        {block.type === "text" && (
          <textarea
            ref={textareaRef}
            rows={1}
            value={block.content}
            onChange={(e) => {
              onChange({ ...block, content: e.target.value });
              resize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your text..."
            className="w-full resize-none border-none bg-transparent p-0 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
          />
        )}
      </div>
    </div>
  );
}
