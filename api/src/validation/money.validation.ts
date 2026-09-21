import { z } from "zod";

export const moneySummaryQuerySchema = z.object({
  granularity: z.enum(["day", "week", "month", "year"]).default("month"),
});

export type MoneySummaryQuery = z.infer<typeof moneySummaryQuerySchema>;
