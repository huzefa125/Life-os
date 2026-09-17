import { z } from "zod";

export const CATEGORY_KINDS = ["income", "expense"] as const;

export const categoryIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const categoryPropertiesSchema = z
  .object({
    kind: z.enum(CATEGORY_KINDS, { error: `kind must be one of: ${CATEGORY_KINDS.join(", ")}` }),
    color: z.string().trim().optional(),
    icon: z.string().trim().optional(),
  })
  .strict();

export const createCategorySchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: categoryPropertiesSchema,
});

export const updateCategorySchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      kind: z.enum(CATEGORY_KINDS, { error: `kind must be one of: ${CATEGORY_KINDS.join(", ")}` }).optional(),
      color: z.string().trim().optional(),
      icon: z.string().trim().optional(),
    })
    .strict()
    .optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
