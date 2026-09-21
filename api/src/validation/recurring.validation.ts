import { z } from "zod";
import { TRANSACTION_TYPES } from "./transaction.validation";

export const RECURRING_FREQUENCIES = ["weekly", "monthly", "yearly"] as const;

export const recurringIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const baseRecurringProperties = {
  transactionType: z.enum(TRANSACTION_TYPES, {
    error: `transactionType must be one of: ${TRANSACTION_TYPES.join(", ")}`,
  }),
  amount: z.number().positive("amount must be greater than 0"),
  currency: z.string().trim().min(1, "currency is required"),
  description: z.string().optional(),
  accountId: z.uuid("accountId must be a valid UUID"),
  toAccountId: z.uuid("toAccountId must be a valid UUID").optional(),
  categoryId: z.uuid("categoryId must be a valid UUID").optional(),
  frequency: z.enum(RECURRING_FREQUENCIES, {
    error: `frequency must be one of: ${RECURRING_FREQUENCIES.join(", ")}`,
  }),
  startDate: z.string().date("startDate must be a valid date (YYYY-MM-DD)"),
  endDate: z.string().date("endDate must be a valid date (YYYY-MM-DD)").optional(),
  active: z.boolean().optional(),
};

function refineRecurringShape<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data: z.infer<T>, ctx: z.RefinementCtx) => {
    const { transactionType, accountId, toAccountId, categoryId } = data as {
      transactionType?: string;
      accountId?: string;
      toAccountId?: string;
      categoryId?: string;
    };

    if (transactionType === "transfer") {
      if (!toAccountId) {
        ctx.addIssue({ code: "custom", message: "toAccountId is required for transfers", path: ["toAccountId"] });
      } else if (toAccountId === accountId) {
        ctx.addIssue({ code: "custom", message: "toAccountId must differ from accountId", path: ["toAccountId"] });
      }
      if (categoryId) {
        ctx.addIssue({ code: "custom", message: "categoryId is not allowed for transfers", path: ["categoryId"] });
      }
    } else {
      if (!categoryId) {
        ctx.addIssue({ code: "custom", message: "categoryId is required", path: ["categoryId"] });
      }
      if (toAccountId) {
        ctx.addIssue({ code: "custom", message: "toAccountId is only allowed for transfers", path: ["toAccountId"] });
      }
    }
  });
}

export const createRecurringSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: refineRecurringShape(z.object(baseRecurringProperties).strict()),
});

const updateRecurringPropertiesShape = Object.fromEntries(
  Object.entries(baseRecurringProperties).map(([key, schema]) => [key, schema.optional()])
) as { [K in keyof typeof baseRecurringProperties]: z.ZodOptional<(typeof baseRecurringProperties)[K]> };

export const updateRecurringSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: refineRecurringShape(z.object(updateRecurringPropertiesShape).strict()).optional(),
});

export type CreateRecurringBody = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringBody = z.infer<typeof updateRecurringSchema>;
