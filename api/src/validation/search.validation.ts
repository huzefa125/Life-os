import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "q is required"),
  type: z.string().trim().min(1).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
