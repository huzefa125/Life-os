import { z } from "zod";

export const objectIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});
