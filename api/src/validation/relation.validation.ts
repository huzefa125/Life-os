import { z } from "zod";

export const RELATION_TYPES = [
  "works_on",
  "has_task",
  "has_file",
  "has_note",
  "has_event",
  "knows",
  "related_to",
  "assigned_to",
  "in_account",
  "in_category",
  "transfer_to",
  "for_category",
  "funds_from",
  "has_response",
  "created",
] as const;

export const relationIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const objectIdParamSchema = z.object({
  objectId: z.uuid("objectId must be a valid UUID"),
});

export const createRelationSchema = z
  .object({
    sourceId: z.uuid("sourceId must be a valid UUID"),
    targetId: z.uuid("targetId must be a valid UUID"),
    type: z.enum(RELATION_TYPES, {
      error: `type must be one of: ${RELATION_TYPES.join(", ")}`,
    }),
  })
  .refine((data) => data.sourceId !== data.targetId, {
    message: "sourceId and targetId cannot be the same",
    path: ["targetId"],
  });

export type CreateRelationBody = z.infer<typeof createRelationSchema>;
