import { z } from "zod";

export const blockSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "heading", "todo", "bullet", "quote", "code"]),
  content: z.string(),
  level: z.number().int().min(1).max(3).optional(),
  checked: z.boolean().optional(),
  language: z.string().optional(),
});

export const pagePropertiesSchema = z.object({
  blocks: z.array(blockSchema).default([]),
});

export const createPageSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: pagePropertiesSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const updatePageSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: pagePropertiesSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const pageIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export type Block = z.infer<typeof blockSchema>;
export type PageProperties = z.infer<typeof pagePropertiesSchema>;
export type CreatePageBody = z.infer<typeof createPageSchema>;
export type UpdatePageBody = z.infer<typeof updatePageSchema>;
