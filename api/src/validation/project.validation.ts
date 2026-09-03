import { z } from "zod";

export const projectIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const projectPropertiesSchema = z
  .object({
    status: z.string().trim().min(1, "status cannot be empty").optional(),
    description: z.string().optional(),
    deadline: z.string().date("deadline must be a valid date (YYYY-MM-DD)").optional(),
  })
  .strict();

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: projectPropertiesSchema.optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: projectPropertiesSchema.optional(),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>;
