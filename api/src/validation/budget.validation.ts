import { z } from "zod";

export const BUDGET_PERIODS = ["weekly", "monthly"] as const;

export const budgetIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const budgetPropertiesSchema = z
  .object({
    categoryId: z.uuid("categoryId must be a valid UUID"),
    amount: z.number().positive("amount must be greater than 0"),
    currency: z.string().trim().min(1, "currency is required"),
    period: z.enum(BUDGET_PERIODS, { error: `period must be one of: ${BUDGET_PERIODS.join(", ")}` }),
  })
  .strict();

export const createBudgetSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: budgetPropertiesSchema,
});

export const updateBudgetSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      categoryId: z.uuid("categoryId must be a valid UUID").optional(),
      amount: z.number().positive("amount must be greater than 0").optional(),
      currency: z.string().trim().min(1, "currency is required").optional(),
      period: z.enum(BUDGET_PERIODS, { error: `period must be one of: ${BUDGET_PERIODS.join(", ")}` }).optional(),
    })
    .strict()
    .optional(),
});

export type CreateBudgetBody = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetBody = z.infer<typeof updateBudgetSchema>;
