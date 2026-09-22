import { z } from "zod";

export const publicFormIdParamSchema = z.object({
  formId: z.uuid("formId must be a valid UUID"),
});

export const submitFormSchema = z.object({
  answers: z.record(z.string(), z.unknown()),
  draft: z.boolean().optional(),
  resumeId: z.uuid().optional(),
});

export const publicResponseIdParamSchema = z.object({
  formId: z.uuid("formId must be a valid UUID"),
  responseId: z.uuid("responseId must be a valid UUID"),
});

export type SubmitFormBody = z.infer<typeof submitFormSchema>;
