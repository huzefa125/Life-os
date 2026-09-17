import { z } from "zod";

export const updateTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1)),
});

export type UpdateTagsBody = z.infer<typeof updateTagsSchema>;
