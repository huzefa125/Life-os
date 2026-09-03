import { z } from "zod";

export const fileIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const createFileSchema = z.object({
  properties: z
    .object({
      url: z.url("url must be a valid URL"),
      fileName: z.string().trim().min(1, "fileName is required"),
      mimeType: z.string().trim().min(1, "mimeType is required"),
      size: z.number().int().positive("size must be a positive integer"),
    })
    .strict(),
});

export type CreateFileBody = z.infer<typeof createFileSchema>;
