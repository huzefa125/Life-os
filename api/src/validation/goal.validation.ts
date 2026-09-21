import { z } from "zod";

export const goalIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const goalPropertiesSchema = z
  .object({
    targetAmount: z.number().positive("targetAmount must be greater than 0"),
    currency: z.string().trim().min(1, "currency is required"),
    targetDate: z.string().date("targetDate must be a valid date (YYYY-MM-DD)").optional(),
    currentAmount: z.number().min(0).optional(),
    linkedAccountId: z.uuid("linkedAccountId must be a valid UUID").optional(),
  })
  .strict();

export const createGoalSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: goalPropertiesSchema,
});

export const updateGoalSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      targetAmount: z.number().positive("targetAmount must be greater than 0").optional(),
      currency: z.string().trim().min(1, "currency is required").optional(),
      targetDate: z.string().date("targetDate must be a valid date (YYYY-MM-DD)").optional(),
      currentAmount: z.number().min(0).optional(),
      linkedAccountId: z.uuid("linkedAccountId must be a valid UUID").optional(),
    })
    .strict()
    .optional(),
});

export type CreateGoalBody = z.infer<typeof createGoalSchema>;
export type UpdateGoalBody = z.infer<typeof updateGoalSchema>;
