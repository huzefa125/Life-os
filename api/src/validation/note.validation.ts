import { z } from "zod";

export const noteIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: z
    .object({
      content: z.string().trim().min(1, "content is required"),
    })
    .strict(),
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      content: z.string().trim().min(1, "content is required").optional(),
    })
    .strict()
    .optional(),
});

export type CreateNoteBody = z.infer<typeof createNoteSchema>;
export type UpdateNoteBody = z.infer<typeof updateNoteSchema>;
