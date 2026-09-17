"use client";

import { useState } from "react";
import {
  AlignLeft,
  Code,
  Heading,
  List,
  Plus,
  Quote,
  SquareCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Block, BlockType } from "@/lib/types";
import { BlockItem } from "./block-item";

function createEmptyBlock(type: BlockType = "text"): Block {
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    content: "",
    checked: type === "todo" ? false : undefined,
  };
}

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}) {
  const [activeFocusId, setActiveFocusId] = useState<string | null>(null);

  // If no blocks exist, provide at least one initial empty text block
  const safeBlocks = blocks.length > 0 ? blocks : [createEmptyBlock("text")];

  function handleUpdateBlock(index: number, updated: Block) {
    const next = [...safeBlocks];
    next[index] = updated;
    onChange(next);
  }

  function handleDeleteBlock(index: number) {
    if (safeBlocks.length <= 1) {
      // Clear content instead of removing sole block
      onChange([{ ...safeBlocks[0], content: "" }]);
      return;
    }
    const next = safeBlocks.filter((_, i) => i !== index);
    onChange(next);
  }

  function handleAddBelow(index: number, type: BlockType = "text") {
    const newBlock = createEmptyBlock(type);
    const next = [...safeBlocks];
    next.splice(index + 1, 0, newBlock);
    onChange(next);
    setActiveFocusId(newBlock.id);
  }

  function handleMoveUp(index: number) {
    if (index <= 0) return;
    const next = [...safeBlocks];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onChange(next);
  }

  function handleMoveDown(index: number) {
    if (index >= safeBlocks.length - 1) return;
    const next = [...safeBlocks];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onChange(next);
  }

  function handleAppendType(type: BlockType) {
    const newBlock = createEmptyBlock(type);
    onChange([...safeBlocks, newBlock]);
    setActiveFocusId(newBlock.id);
  }

  return (
    <div className="space-y-1">
      {safeBlocks.map((block, index) => (
        <BlockItem
          key={block.id}
          block={block}
          isFirst={index === 0}
          isLast={index === safeBlocks.length - 1}
          autoFocus={block.id === activeFocusId}
          onChange={(updated) => handleUpdateBlock(index, updated)}
          onDelete={() => handleDeleteBlock(index)}
          onAddBelow={(type) => handleAddBelow(index, type)}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      ))}

      {/* Quick Add Toolbar */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-4">
        <span className="mr-1 text-xs font-medium text-muted-foreground">Add block:</span>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
          onClick={() => handleAppendType("text")}
        >
          <AlignLeft className="size-3" />
          Text
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
          onClick={() => handleAppendType("heading")}
        >
          <Heading className="size-3" />
          Heading
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
          onClick={() => handleAppendType("todo")}
        >
          <SquareCheck className="size-3" />
          To-do
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
          onClick={() => handleAppendType("bullet")}
        >
          <List className="size-3" />
          Bullet
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
          onClick={() => handleAppendType("quote")}
        >
          <Quote className="size-3" />
          Quote
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
          onClick={() => handleAppendType("code")}
        >
          <Code className="size-3" />
          Code
        </Button>
      </div>
    </div>
  );
}
