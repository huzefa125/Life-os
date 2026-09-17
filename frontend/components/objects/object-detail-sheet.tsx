"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  History,
  Link as LinkIcon,
  Paperclip,
  Plus,
  Tag as TagIcon,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api-client";
import type { DetailedObject, GenericObject, RelationType } from "@/lib/types";
import { TagPicker } from "@/components/tags/tag-picker";
import { TagBadge } from "@/components/tags/tag-badge";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function getObjectIcon(type: string) {
  switch (type) {
    case "project":
      return FolderKanban;
    case "task":
      return CheckCircle2;
    case "person":
      return Users;
    case "note":
    case "page":
      return FileText;
    case "file":
      return Paperclip;
    default:
      return LinkIcon;
  }
}

export function ObjectDetailSheet({
  objectId,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onNavigateObject,
}: {
  objectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (object: GenericObject) => void;
  onDeleted?: (id: string) => void;
  onNavigateObject?: (id: string) => void;
}) {
  const [detail, setDetail] = useState<DetailedObject | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [relationTargetId, setRelationTargetId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("related_to");
  const [allObjects, setAllObjects] = useState<GenericObject[]>([]);
  const [addingRelation, setAddingRelation] = useState(false);

  useEffect(() => {
    if (!objectId || !open) return;
    loadDetail(objectId);
  }, [objectId, open]);

  async function loadDetail(id: string) {
    setLoading(true);
    try {
      const data = await api.objects.detail(id);
      setDetail(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't load object details");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!detail) return;
    try {
      await api.archive.archive(detail.object.id);
      toast.success("Object archived");
      onDeleted?.(detail.object.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't archive object");
    }
  }

  async function handleTrash() {
    if (!detail) return;
    try {
      await api.trash.move(detail.object.id);
      toast.success("Moved to trash");
      onDeleted?.(detail.object.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete object");
    }
  }

  async function handleTagsChange(newTags: string[]) {
    if (!detail) return;
    try {
      const updated = await api.tags.update(detail.object.id, newTags);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              object: {
                ...prev.object,
                tags: updated.tags,
              },
            }
          : null
      );
      onUpdated?.(updated);
      toast.success("Tags updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't update tags");
    }
  }

  async function handleOpenAddRelation() {
    setShowAddRelation(true);
    if (allObjects.length === 0) {
      try {
        const searchResults = await api.search.query("");
        setAllObjects(searchResults.filter((o) => o.id !== detail?.object.id));
      } catch {
        // ignore
      }
    }
  }

  async function handleCreateRelation() {
    if (!detail || !relationTargetId) return;
    setAddingRelation(true);
    try {
      await api.relations.create({
        sourceId: detail.object.id,
        targetId: relationTargetId,
        type: relationType,
      });
      toast.success("Relation added");
      setShowAddRelation(false);
      setRelationTargetId("");
      // Reload details to show updated relation
      loadDetail(detail.object.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't add relation");
    } finally {
      setAddingRelation(false);
    }
  }

  if (!objectId) return null;

  if (loading || !detail) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col gap-0 sm:max-w-xl overflow-y-auto">
          <div className="flex h-96 items-center justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const obj = detail.object;
  const ObjIcon = getObjectIcon(obj.type);
  const properties = (obj.properties ?? {}) as Record<string, any>;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 sm:max-w-xl overflow-y-auto">
        <div className="flex flex-col gap-6 py-4">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground uppercase tracking-wider">
                  <ObjIcon className="size-3.5 text-primary" />
                  <span>{obj.type}</span>
                </span>
              </div>

              <div className="flex items-center gap-1">
                <FavoriteButton
                  objectId={obj.id}
                  initialFavorite={obj.isFavorite}
                  onToggle={(isFav) => {
                    setDetail((prev) =>
                      prev
                        ? {
                            ...prev,
                            object: { ...prev.object, isFavorite: isFav },
                          }
                        : null
                    );
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleArchive}
                    title="Archive object"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Archive className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={handleTrash}
                    title="Move to trash"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {/* Title */}
              <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {obj.title}
              </h2>

              {/* Tags Section */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tags:</span>
                <TagPicker tags={obj.tags ?? []} onChange={handleTagsChange} />
              </div>
            </div>

            <Separator />

            {/* Properties Section */}
            <div>
              <h3 className="mb-3 font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Properties
              </h3>
              <div className="rounded-lg border border-border/70 bg-card p-3.5">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-0.5 font-medium capitalize text-foreground">
                      {properties.status ?? obj.status ?? "Active"}
                    </dd>
                  </div>

                  {properties.deadline && (
                    <div>
                      <dt className="text-muted-foreground">Deadline</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {properties.deadline}
                      </dd>
                    </div>
                  )}

                  {properties.priority && (
                    <div>
                      <dt className="text-muted-foreground">Priority</dt>
                      <dd className="mt-0.5 font-medium capitalize text-foreground">
                        {properties.priority}
                      </dd>
                    </div>
                  )}

                  {properties.amount !== undefined && (
                    <div>
                      <dt className="text-muted-foreground">Amount</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {properties.amount} {properties.currency ?? "USD"}
                      </dd>
                    </div>
                  )}

                  {properties.startAt && (
                    <div>
                      <dt className="text-muted-foreground">Event Date</dt>
                      <dd className="mt-0.5 font-medium text-foreground">
                        {formatDate(properties.startAt)}
                      </dd>
                    </div>
                  )}

                  {properties.description && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Description</dt>
                      <dd className="mt-0.5 text-foreground leading-relaxed">
                        {properties.description}
                      </dd>
                    </div>
                  )}

                  {properties.content && (
                    <div className="col-span-2">
                      <dt className="text-muted-foreground">Content</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap rounded bg-muted/50 p-2 text-foreground">
                        {properties.content}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <Separator />

            {/* Relations Section */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Relations
                </h3>
                <Button
                  variant="outline"
                  size="xs"
                  className="h-6 gap-1 rounded-full text-xs"
                  onClick={handleOpenAddRelation}
                >
                  <Plus className="size-3" />
                  <span>Add Relation</span>
                </Button>
              </div>

              {showAddRelation && (
                <div className="mb-3 space-y-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
                  <div className="font-medium text-foreground">Link an object</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px]">Select Object</Label>
                      <select
                        value={relationTargetId}
                        onChange={(e) => setRelationTargetId(e.target.value)}
                        className="mt-1 w-full rounded border bg-background p-1.5 text-xs text-foreground"
                      >
                        <option value="">Choose object...</option>
                        {allObjects.map((item) => (
                          <option key={item.id} value={item.id}>
                            [{item.type}] {item.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label className="text-[11px]">Relation Type</Label>
                      <select
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value as RelationType)}
                        className="mt-1 w-full rounded border bg-background p-1.5 text-xs text-foreground"
                      >
                        <option value="works_on">works_on</option>
                        <option value="has_task">has_task</option>
                        <option value="has_note">has_note</option>
                        <option value="has_file">has_file</option>
                        <option value="knows">knows</option>
                        <option value="related_to">related_to</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowAddRelation(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      disabled={!relationTargetId || addingRelation}
                      onClick={handleCreateRelation}
                    >
                      {addingRelation ? "Adding…" : "Save Relation"}
                    </Button>
                  </div>
                </div>
              )}

              {detail.relations.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                  No relations yet. Link tasks, notes, people, or projects.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {detail.relations.map((rel) => {
                    const RelIcon = getObjectIcon(rel.otherObject.type);
                    return (
                      <div
                        key={rel.id}
                        onClick={() => {
                          if (onNavigateObject) {
                            onNavigateObject(rel.otherObject.id);
                          } else {
                            loadDetail(rel.otherObject.id);
                          }
                        }}
                        className="group flex cursor-pointer items-center justify-between rounded-lg border border-border/70 bg-card px-3 py-2 text-xs transition-colors hover:border-primary/40 hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          <RelIcon className="size-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground group-hover:text-primary">
                            {rel.otherObject.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-[11px] font-mono">→ {rel.type}</span>
                          <ArrowRight className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Files Section */}
            <div>
              <h3 className="mb-3 font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Files
              </h3>
              {detail.files.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                  No attached files.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {detail.files.map((file) => {
                    const fileProps = (file.properties ?? {}) as any;
                    return (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="size-3.5 text-primary" />
                          <span className="font-medium text-foreground">{file.title}</span>
                          {fileProps.size && (
                            <span className="text-[11px] text-muted-foreground">
                              ({Math.round(fileProps.size / 1024)} KB)
                            </span>
                          )}
                        </div>

                        {fileProps.url && (
                          <a
                            href={fileProps.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span>Open</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Activity Timeline Section */}
            <div>
              <h3 className="mb-3 font-heading text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Activity
              </h3>
              <div className="space-y-3 pl-2 border-l-2 border-border/60">
                {detail.activities.map((act) => (
                  <div key={act.id} className="relative pl-4 text-xs">
                    <div className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground capitalize">
                        {act.action.replace("_", " ")}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(act.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </SheetContent>
    </Sheet>
  );
}
