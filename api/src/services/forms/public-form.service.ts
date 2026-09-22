import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";
import type { FormDesign, FormField, FormProperties, FormSection } from "../../validation/form.validation";
import { FORM_RESPONSE_TYPE, FORM_TYPE } from "./form.service";
import { evaluateCondition } from "./condition.util";
import { runAutomations } from "./automation.service";
import * as relationService from "../relations/relation.service";
import * as fileService from "../files/file.service";
import { logActivity } from "../activity/activity.service";

export interface FormAvailability {
  status: "open" | "not_yet_open" | "closed" | "paused" | "limit_reached";
  message?: string;
}

export interface PublicFormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  sections?: FormSection[];
  design?: FormDesign;
  submitButtonLabel?: string;
  availability: FormAvailability;
  allowResponseEditing: boolean;
  saveAndResumeLater: boolean;
  onePerPerson: boolean;
  requireLogin: boolean;
  showProgressBar?: boolean;
  randomizeFields?: boolean;
  layout?: FormProperties["settings"]["layout"];
}

/**
 * Looks up a form by id, returning it whenever it isn't a draft. Drafts and
 * nonexistent ids are indistinguishable to an anonymous caller — both
 * resolve to `null`, mapped to the same generic 404 by the controller.
 * Published *and* closed forms resolve so the public page can show a
 * specific "this form is closed" message instead of a blank 404.
 */
async function getPublishedFormRecord(formId: string) {
  const form = await prisma.object.findFirst({ where: { id: formId, type: FORM_TYPE, status: "active" } });
  if (!form) return null;

  const properties = form.properties as unknown as FormProperties;
  if (!properties?.settings || properties.settings.status === "draft") return null;

  return { form, properties };
}

async function countResponses(userId: string, formId: string): Promise<number> {
  const all = await prisma.object.findMany({ where: { userId, type: FORM_RESPONSE_TYPE, status: "active" } });
  return all.filter((r) => {
    const props = r.properties as { formId?: string; draft?: boolean } | null;
    return props?.formId === formId && !props?.draft;
  }).length;
}

function computeAvailability(properties: FormProperties, responseCount: number): FormAvailability {
  const settings = properties.settings;
  if (settings.status === "closed") return { status: "closed", message: "This form is closed." };
  if (!settings.acceptResponses) return { status: "paused", message: "This form isn't accepting responses right now." };

  // Compared as real Date objects, not strings — startDate/endDate are stored
  // as full ISO-with-offset values from the builder, but comparing datetime
  // strings lexicographically breaks the moment their formats/lengths differ
  // (e.g. a UTC "...Z" string vs a shorter naive one).
  const now = new Date();
  if (settings.startDate && now < new Date(settings.startDate)) {
    return { status: "not_yet_open", message: "This form isn't open yet." };
  }
  if (settings.endDate && now > new Date(settings.endDate)) {
    return { status: "closed", message: "This form has closed." };
  }
  if (settings.responseLimit && responseCount >= settings.responseLimit) {
    return { status: "limit_reached", message: "This form has reached its response limit." };
  }
  return { status: "open" };
}

export type GetPublicFormResult =
  | { ok: true; schema: PublicFormSchema }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "REQUIRES_LOGIN" };

export async function getPublishedFormSchema(formId: string, requesterUserId: string | null): Promise<GetPublicFormResult> {
  const result = await getPublishedFormRecord(formId);
  if (!result) return { ok: false, reason: "NOT_FOUND" };

  const { form, properties } = result;
  if (properties.settings.requireLogin && !requesterUserId) {
    return { ok: false, reason: "REQUIRES_LOGIN" };
  }

  const responseCount = await countResponses(form.userId, form.id);
  const availability = computeAvailability(properties, responseCount);

  return {
    ok: true,
    schema: {
      id: form.id,
      title: form.title,
      description: properties.description,
      fields: properties.fields,
      sections: properties.sections,
      design: properties.design,
      submitButtonLabel: properties.submitButtonLabel,
      availability,
      allowResponseEditing: properties.settings.allowResponseEditing,
      saveAndResumeLater: properties.settings.saveAndResumeLater,
      onePerPerson: properties.settings.onePerPerson,
      requireLogin: properties.settings.requireLogin,
      showProgressBar: properties.settings.showProgressBar,
      randomizeFields: properties.settings.randomizeFields,
      layout: properties.settings.layout,
    },
  };
}

/** For "save and resume later" / "allow response editing" — fetches a response's raw answers to pre-fill the form. */
export async function getResumableResponse(
  formId: string,
  responseId: string
): Promise<{ answers: Record<string, unknown>; draft: boolean } | null> {
  const result = await getPublishedFormRecord(formId);
  if (!result) return null;
  const { properties } = result;
  if (!properties.settings.allowResponseEditing && !properties.settings.saveAndResumeLater) return null;

  const response = await prisma.object.findFirst({ where: { id: responseId, type: FORM_RESPONSE_TYPE, status: "active" } });
  if (!response) return null;

  const respProps = response.properties as { formId?: string; answers?: Record<string, unknown>; draft?: boolean } | null;
  if (respProps?.formId !== formId) return null;

  return { answers: respProps.answers ?? {}, draft: !!respProps.draft };
}

function isAnswerEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every((v) => !v);
  return String(value).trim().length === 0;
}

function validateFieldValue(field: FormField, value: unknown): string | null {
  if (field.required && isAnswerEmpty(value)) return `"${field.label}" is required`;
  if (isAnswerEmpty(value)) return null;

  if (field.type === "number" || field.type === "currency" || field.type === "rating") {
    const num = Number(value);
    if (Number.isNaN(num)) return `"${field.label}" must be a number`;
    if (field.min !== undefined && num < field.min) return `"${field.label}" must be at least ${field.min}`;
    if (field.max !== undefined && num > field.max) return `"${field.label}" must be at most ${field.max}`;
  }

  if (field.type === "short_text" || field.type === "long_text") {
    const str = String(value);
    if (field.minLength !== undefined && str.length < field.minLength) {
      return `"${field.label}" must be at least ${field.minLength} characters`;
    }
    if (field.maxLength !== undefined && str.length > field.maxLength) {
      return `"${field.label}" must be at most ${field.maxLength} characters`;
    }
  }

  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
    return `"${field.label}" must be a valid email`;
  }

  if (field.type === "url") {
    try {
      new URL(String(value));
    } catch {
      return `"${field.label}" must be a valid URL`;
    }
  }

  if (field.type === "checkbox" && Array.isArray(value)) {
    if (field.minSelections !== undefined && value.length < field.minSelections) {
      return `"${field.label}" needs at least ${field.minSelections} selections`;
    }
    if (field.maxSelections !== undefined && value.length > field.maxSelections) {
      return `"${field.label}" allows at most ${field.maxSelections} selections`;
    }
  }

  if (field.pattern) {
    try {
      if (!new RegExp(field.pattern).test(String(value))) {
        return field.patternMessage || `"${field.label}" is not valid`;
      }
    } catch {
      // An invalid regex authored in the builder shouldn't 500 a submission.
    }
  }

  return null;
}

export function validateAnswersAgainstFields(
  fields: FormField[],
  answers: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const field of fields) {
    if (!evaluateCondition(field.visibleIf, answers)) continue; // hidden fields skip all validation
    const error = validateFieldValue(field, answers[field.id]);
    if (error) return { ok: false, message: error };
  }
  return { ok: true };
}

interface UploadedFileAnswer {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
}

function isUploadedFileAnswer(value: unknown): value is UploadedFileAnswer {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as UploadedFileAnswer).url === "string" &&
    typeof (value as UploadedFileAnswer).fileName === "string"
  );
}

/**
 * Turns every `file`-type answer into a real `type:"file"` Object (reusing
 * the existing file-creation pattern verbatim) and `has_file`-relates it to
 * the response — this is what makes an upload show up in the existing Files
 * feature automatically instead of a parallel "form attachments" viewer.
 */
async function materializeFileAnswers(
  userId: string,
  responseId: string,
  fields: FormField[],
  answers: Record<string, unknown>
) {
  for (const field of fields) {
    if (field.type !== "file") continue;
    const answer = answers[field.id];
    if (!isUploadedFileAnswer(answer)) continue;

    try {
      const file = await fileService.createFile(userId, {
        properties: { url: answer.url, fileName: answer.fileName, mimeType: answer.mimeType, size: answer.size },
      });
      await relationService.createRelation(userId, { sourceId: responseId, targetId: file.id, type: "has_file" });
    } catch (err) {
      console.error(`Couldn't materialize uploaded file for field "${field.id}":`, err);
    }
  }
}

export interface SubmitFormOptions {
  draft?: boolean;
  resumeId?: string;
  requesterUserId?: string | null;
  ip?: string;
  userAgent?: string;
}

export type SubmitFormResult =
  | { ok: true; responseId: string; draft?: boolean; successMessage?: string; redirectUrl?: string }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "UNAVAILABLE"; message: string }
  | { ok: false; reason: "VALIDATION"; message: string };

export async function submitForm(
  formId: string,
  answers: Record<string, unknown>,
  options: SubmitFormOptions = {}
): Promise<SubmitFormResult> {
  const result = await getPublishedFormRecord(formId);
  if (!result) return { ok: false, reason: "NOT_FOUND" };

  const { form, properties } = result;
  const userId = form.userId;

  if (properties.settings.requireLogin && !options.requesterUserId) {
    return { ok: false, reason: "UNAVAILABLE", message: "Please log in to submit this form." };
  }

  let existingResponse: Awaited<ReturnType<typeof prisma.object.findFirst>> | null = null;
  if (options.resumeId) {
    existingResponse = await prisma.object.findFirst({ where: { id: options.resumeId, type: FORM_RESPONSE_TYPE, status: "active" } });
    const respProps = existingResponse?.properties as { formId?: string } | null;
    if (!existingResponse || respProps?.formId !== formId) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    const wasDraft = !!(existingResponse.properties as { draft?: boolean } | null)?.draft;
    if (!wasDraft && !properties.settings.allowResponseEditing) {
      return { ok: false, reason: "UNAVAILABLE", message: "Editing responses isn't allowed for this form." };
    }
  }

  const isNewFinalSubmission = !options.draft && (!existingResponse || (existingResponse.properties as { draft?: boolean } | null)?.draft);

  if (!options.draft) {
    if (isNewFinalSubmission) {
      const responseCount = await countResponses(userId, formId);
      const availability = computeAvailability(properties, responseCount);
      if (availability.status !== "open") {
        return { ok: false, reason: "UNAVAILABLE", message: availability.message ?? "This form isn't accepting responses." };
      }
    }
    const validation = validateAnswersAgainstFields(properties.fields, answers);
    if (!validation.ok) return { ok: false, reason: "VALIDATION", message: validation.message };
  }

  const meta = !properties.settings.anonymousResponses
    ? { ip: options.ip, userAgent: options.userAgent, respondentUserId: options.requesterUserId ?? undefined }
    : undefined;

  let response: Awaited<ReturnType<typeof prisma.object.create>>;
  let shouldRunAutomations: boolean;

  if (existingResponse) {
    const wasDraft = !!(existingResponse.properties as { draft?: boolean } | null)?.draft;
    const previousCreatedObjects = (existingResponse.properties as { createdObjects?: unknown[] } | null)?.createdObjects ?? [];
    response = await prisma.object.update({
      where: { id: existingResponse.id },
      data: {
        properties: {
          formId: form.id,
          answers,
          submittedAt: options.draft ? existingResponse.createdAt.toISOString() : new Date().toISOString(),
          draft: !!options.draft,
          createdObjects: previousCreatedObjects,
          ...(meta ? { meta } : {}),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    shouldRunAutomations = !options.draft && wasDraft;
  } else {
    response = await prisma.object.create({
      data: {
        userId,
        type: FORM_RESPONSE_TYPE,
        title: `Response to ${form.title}`,
        status: "active",
        properties: {
          formId: form.id,
          answers,
          submittedAt: new Date().toISOString(),
          draft: !!options.draft,
          createdObjects: [],
          ...(meta ? { meta } : {}),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await relationService.createRelation(userId, { sourceId: form.id, targetId: response.id, type: "has_response" }).catch((err) => {
      console.error("Couldn't link form to its response:", err);
    });
    shouldRunAutomations = !options.draft;
  }

  if (options.draft) {
    return { ok: true, responseId: response.id, draft: true };
  }

  if (shouldRunAutomations) {
    await materializeFileAnswers(userId, response.id, properties.fields, answers);
    const createdObjects = await runAutomations(userId, response.id, properties.automations, answers);

    response = await prisma.object.update({
      where: { id: response.id },
      data: {
        properties: {
          formId: form.id,
          answers,
          submittedAt: (response.properties as { submittedAt?: string } | null)?.submittedAt ?? new Date().toISOString(),
          draft: false,
          createdObjects,
          ...(meta ? { meta } : {}),
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logActivity(userId, response.id, "created", { title: response.title });
  } else {
    await logActivity(userId, response.id, "updated", { title: response.title });
  }

  return {
    ok: true,
    responseId: response.id,
    successMessage: properties.successMessage,
    redirectUrl: properties.settings.redirectUrl,
  };
}
