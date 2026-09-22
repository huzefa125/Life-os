import { z } from "zod";

export const publicFormIdParamSchema = z.object({
  formId: z.uuid("formId must be a valid UUID"),
});

export const submitFormSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
});

export type SubmitFormBody = z.infer<typeof submitFormSchema>;
