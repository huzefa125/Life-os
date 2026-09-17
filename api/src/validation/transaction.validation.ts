import { z } from "zod";

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;

export const transactionIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const transactionListQuerySchema = z.object({
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  q: z.string().trim().optional(),
});

const baseTransactionProperties = {
  transactionType: z.enum(TRANSACTION_TYPES, {
    error: `transactionType must be one of: ${TRANSACTION_TYPES.join(", ")}`,
  }),
  amount: z.number().positive("amount must be greater than 0"),
  currency: z.string().trim().min(1, "currency is required"),
  date: z.string().date("date must be a valid date (YYYY-MM-DD)"),
  description: z.string().optional(),
  accountId: z.uuid("accountId must be a valid UUID"),
  toAccountId: z.uuid("toAccountId must be a valid UUID").optional(),
  categoryId: z.uuid("categoryId must be a valid UUID").optional(),
};

function refineTransactionShape<T extends z.ZodTypeAny>(schema: T) {
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

const createTransactionPropertiesSchema = refineTransactionShape(
  z.object(baseTransactionProperties).strict()
);

export const createTransactionSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: createTransactionPropertiesSchema,
});

const updateTransactionPropertiesShape = Object.fromEntries(
  Object.entries(baseTransactionProperties).map(([key, schema]) => [key, schema.optional()])
) as { [K in keyof typeof baseTransactionProperties]: z.ZodOptional<(typeof baseTransactionProperties)[K]> };

export const updateTransactionSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: refineTransactionShape(z.object(updateTransactionPropertiesShape).strict()).optional(),
});

export type CreateTransactionBody = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionBody = z.infer<typeof updateTransactionSchema>;
export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;
