"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  objectId,
  initialFavorite = false,
  onToggle,
  className,
}: {
  objectId: string;
  initialFavorite?: boolean;
  onToggle?: (isFavorite: boolean) => void;
  className?: string;
}) {
  const [favorite, setFavorite] = useState(initialFavorite);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    const nextState = !favorite;
    setFavorite(nextState);

    try {
      if (nextState) {
        await api.favorites.add(objectId);
        toast.success("Added to favorites");
      } else {
        await api.favorites.remove(objectId);
        toast.success("Removed from favorites");
      }
      onToggle?.(nextState);
    } catch (err) {
      setFavorite(!nextState); // rollback
      toast.error(err instanceof ApiError ? err.message : "Couldn't update favorite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        "rounded-md p-1 transition-colors",
        favorite
          ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          : "text-muted-foreground/40 hover:text-amber-500 hover:bg-muted",
        className
      )}
      title={favorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={cn(
          "size-3.5 transition-transform active:scale-125",
          favorite && "fill-amber-500 text-amber-500"
        )}
      />
    </Button>
  );
}
