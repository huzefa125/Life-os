import { z } from "zod";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const jsonSchema: z.ZodType<Json> = z
  .lazy(() =>
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(jsonSchema),
      z.record(z.string(), jsonSchema),
    ])
  )
  .openapi("JsonValue");

const propertiesSchema = z.record(z.string(), jsonSchema);

export const companyIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  properties: propertiesSchema.optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(1, "Name is required").optional(),
  properties: propertiesSchema.optional(),
});

export type CreateCompanyBody = z.infer<typeof createCompanySchema>;
export type UpdateCompanyBody = z.infer<typeof updateCompanySchema>;
