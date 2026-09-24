import { z } from "zod";
import { RELATION_TYPES } from "./relation.validation";

export const FORM_FIELD_TYPES = [
  "short_text",
  "long_text",
  "email",
  "phone",
  "number",
  "datetime",
  "dropdown",
  "radio",
  "checkbox",
  "rating",
  "url",
  "currency",
  "address",
  "file",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export const CONDITION_OPERATORS = ["equals", "not_equals", "contains", "is_empty", "is_not_empty"] as const;

const conditionSchema = z
  .object({
    fieldId: z.string().min(1),
    operator: z.enum(CONDITION_OPERATORS),
    value: z.string().optional(),
  })
  .strict();

const fieldSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(FORM_FIELD_TYPES),
    label: z.string().trim().min(1, "Field label is required"),
    helpText: z.string().optional(),
    placeholder: z.string().optional(),
    required: z.boolean(),
    sectionId: z.string().optional(),
    options: z.array(z.string().min(1)).optional(),
    optionDescriptions: z.record(z.string(), z.string()).optional(),
    allowOther: z.boolean().optional(),
    randomizeOptions: z.boolean().optional(),
    minSelections: z.number().int().nonnegative().optional(),
    maxSelections: z.number().int().positive().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    pattern: z.string().optional(),
    patternMessage: z.string().optional(),
    currencyCode: z.string().optional(),
    ratingMax: z.number().int().positive().optional(),
    maxSizeMB: z.number().positive().optional(),
    acceptedMimeTypes: z.array(z.string()).optional(),
    visibleIf: conditionSchema.optional(),
  })
  .strict()
  .superRefine((field, ctx) => {
    if (["dropdown", "radio", "checkbox"].includes(field.type) && (!field.options || field.options.length === 0)) {
      ctx.addIssue({ code: "custom", message: `${field.type} fields require at least one option`, path: ["options"] });
    }
  });

const sectionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1, "Section title is required"),
    description: z.string().optional(),
    skipIf: conditionSchema.optional(),
  })
  .strict();

const mappingSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("field"), fieldId: z.string().min(1) }).strict(),
  z.object({ source: z.literal("static"), value: z.unknown() }).strict(),
  z.object({ source: z.literal("action_object_id"), actionId: z.string().min(1) }).strict(),
]);

export const FORM_AUTOMATION_TYPES = [
  "create_person",
  "create_project",
  "create_task",
  "create_transaction",
] as const;
export type FormAutomationType = (typeof FORM_AUTOMATION_TYPES)[number];

const automationRelationSchema = z
  .object({
    relationType: z.enum(RELATION_TYPES),
    sourceActionId: z.string().min(1),
    targetActionId: z.string().min(1),
  })
  .strict();

const automationSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(FORM_AUTOMATION_TYPES),
    label: z.string().optional(),
    condition: conditionSchema.optional(),
    titleMapping: mappingSchema,
    propertyMappings: z.record(z.string(), mappingSchema),
    relations: z.array(automationRelationSchema).optional(),
  })
  .strict();

export const FORM_STATUSES = ["draft", "published", "closed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_LAYOUTS = ["card", "full_page"] as const;

const settingsSchema = z
  .object({
    status: z.enum(FORM_STATUSES),
    acceptResponses: z.boolean(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    responseLimit: z.number().int().positive().optional(),
    onePerPerson: z.boolean(),
    allowResponseEditing: z.boolean(),
    saveAndResumeLater: z.boolean(),
    redirectUrl: z.string().optional(),
    requireLogin: z.boolean(),
    anonymousResponses: z.boolean(),
    spamProtectionEnabled: z.boolean(),
    randomizeFields: z.boolean().optional(),
    showProgressBar: z.boolean().optional(),
    layout: z.enum(FORM_LAYOUTS).optional(),
  })
  .strict();

const designSchema = z
  .object({
    accentColor: z.string().optional(),
    logoUrl: z.string().optional(),
    coverImageUrl: z.string().optional(),
    backgroundColor: z.string().optional(),
  })
  .strict();

export const formPropertiesSchema = z
  .object({
    description: z.string().optional(),
    fields: z.array(fieldSchema),
    sections: z.array(sectionSchema).optional(),
    settings: settingsSchema,
    design: designSchema.optional(),
    automations: z.array(automationSchema),
    submitButtonLabel: z.string().optional(),
    successMessage: z.string().optional(),
  })
  .strict();

export const formIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
});

export const createFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

export const updateFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  properties: formPropertiesSchema.optional(),
});

export const manualActionSchema = z.object({
  type: z.enum(FORM_AUTOMATION_TYPES),
  titleMapping: mappingSchema,
  propertyMappings: z.record(z.string(), mappingSchema),
});
export type ManualActionBody = z.infer<typeof manualActionSchema>;

export const formResponseIdParamSchema = z.object({
  id: z.uuid("id must be a valid UUID"),
  responseId: z.uuid("responseId must be a valid UUID"),
});

export type FormField = z.infer<typeof fieldSchema>;
export type FormSection = z.infer<typeof sectionSchema>;
export type FormCondition = z.infer<typeof conditionSchema>;
export type FormFieldMapping = z.infer<typeof mappingSchema>;
export type FormAutomation = z.infer<typeof automationSchema>;
export type FormSettings = z.infer<typeof settingsSchema>;
export type FormDesign = z.infer<typeof designSchema>;
export type FormProperties = z.infer<typeof formPropertiesSchema>;
export type CreateFormBody = z.infer<typeof createFormSchema>;
export type UpdateFormBody = z.infer<typeof updateFormSchema>;

// Reused by Collections — a collection automation's trigger is a Forms-style
// condition and its actions are Forms automation actions.
export const formConditionSchema = conditionSchema;
export const formAutomationSchema = automationSchema;
