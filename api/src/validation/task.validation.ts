import { z } from "zod";

export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export const taskIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const taskPropertiesSchema = z
  .object({
    status: z.enum(TASK_STATUSES, {
      error: `status must be one of: ${TASK_STATUSES.join(", ")}`,
    }).optional(),
    priority: z.enum(TASK_PRIORITIES, {
      error: `priority must be one of: ${TASK_PRIORITIES.join(", ")}`,
    }).optional(),
    dueDate: z.string().date("dueDate must be a valid date (YYYY-MM-DD)").optional(),
  })
  .strict();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: taskPropertiesSchema.optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: taskPropertiesSchema.optional(),
});

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
