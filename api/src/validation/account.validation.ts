import { z } from "zod";

export const ACCOUNT_TYPES = [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
  "loan",
  "other",
] as const;

export const accountIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

const accountPropertiesSchema = z
  .object({
    accountType: z.enum(ACCOUNT_TYPES, {
      error: `accountType must be one of: ${ACCOUNT_TYPES.join(", ")}`,
    }),
    currency: z.string().trim().min(1, "currency is required"),
    startingBalance: z.number(),
    institution: z.string().trim().optional(),
    notes: z.string().optional(),
  })
  .strict();

export const createAccountSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: accountPropertiesSchema,
});

export const updateAccountSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      accountType: z
        .enum(ACCOUNT_TYPES, { error: `accountType must be one of: ${ACCOUNT_TYPES.join(", ")}` })
        .optional(),
      currency: z.string().trim().min(1, "currency is required").optional(),
      startingBalance: z.number().optional(),
      institution: z.string().trim().optional(),
      notes: z.string().optional(),
    })
    .strict()
    .optional(),
});

export type CreateAccountBody = z.infer<typeof createAccountSchema>;
export type UpdateAccountBody = z.infer<typeof updateAccountSchema>;
