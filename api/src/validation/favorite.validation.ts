import { z } from "zod";

export const addFavoriteSchema = z.object({
  objectId: z.string().uuid("objectId must be a valid UUID"),
});

export const favoriteIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export type AddFavoriteBody = z.infer<typeof addFavoriteSchema>;
