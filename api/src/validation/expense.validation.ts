import { z } from "zod";

export const expenseIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const expensePropertiesSchema = z
  .object({
    amount: z.number().positive("amount must be greater than 0"),
    currency: z.string().trim().min(1, "currency is required"),
    category: z.string().trim().min(1, "category is required"),
    date: z.string().date("date must be a valid date (YYYY-MM-DD)"),
    description: z.string().optional(),
  })
  .strict();

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: expensePropertiesSchema,
});

export const updateExpenseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      amount: z.number().positive("amount must be greater than 0").optional(),
      currency: z.string().trim().min(1, "currency is required").optional(),
      category: z.string().trim().min(1, "category is required").optional(),
      date: z.string().date("date must be a valid date (YYYY-MM-DD)").optional(),
      description: z.string().optional(),
    })
    .strict()
    .optional(),
});

export type CreateExpenseBody = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseBody = z.infer<typeof updateExpenseSchema>;
