import { z } from "zod";

export const eventIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  properties: z
    .object({
      description: z.string().optional(),
      startAt: z.string().datetime("startAt must be a valid ISO datetime"),
      endAt: z.string().datetime("endAt must be a valid ISO datetime"),
      location: z.string().optional(),
    })
    .strict()
    .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
      message: "endAt must be after startAt",
      path: ["endAt"],
    }),
});

export const updateEventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: z
    .object({
      description: z.string().optional(),
      startAt: z.string().datetime("startAt must be a valid ISO datetime").optional(),
      endAt: z.string().datetime("endAt must be a valid ISO datetime").optional(),
      location: z.string().optional(),
    })
    .strict()
    .refine(
      (data) => !data.startAt || !data.endAt || new Date(data.endAt) > new Date(data.startAt),
      { message: "endAt must be after startAt", path: ["endAt"] }
    )
    .optional(),
});

export type CreateEventBody = z.infer<typeof createEventSchema>;
export type UpdateEventBody = z.infer<typeof updateEventSchema>;
