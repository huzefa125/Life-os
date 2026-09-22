import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";
import type { FormField, FormProperties } from "../../validation/form.validation";
import { FORM_RESPONSE_TYPE, FORM_TYPE } from "./form.service";
import { evaluateCondition } from "./condition.util";
import { runAutomations } from "./automation.service";
import * as relationService from "../relations/relation.service";
import * as fileService from "../files/file.service";
import { logActivity } from "../activity/activity.service";

export interface PublicFormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitButtonLabel?: string;
}

/**
 * Looks up a form by id, returning it only if published. Drafts and
 * nonexistent ids are indistinguishable to an anonymous caller — both
 * resolve to `null`, mapped to the same generic 404 by the controller.
 */
async function getPublishedForm(formId: string) {
  const form = await prisma.object.findFirst({ where: { id: formId, type: FORM_TYPE, status: "active" } });
  if (!form) return null;

  const properties = form.properties as unknown as FormProperties;
  if (!properties?.published) return null;

  return { form, properties };
}

export async function getPublishedFormSchema(formId: string): Promise<PublicFormSchema | null> {
  const result = await getPublishedForm(formId);
  if (!result) return null;

  return {
    id: result.form.id,
    title: result.form.title,
    description: result.properties.description,
    fields: result.properties.fields,
    submitButtonLabel: result.properties.submitButtonLabel,
  };
}

function isAnswerEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (Array.isArray(value)) return value.length === 0;
  return String(value).trim().length === 0;
}

export function validateAnswersAgainstFields(
  fields: FormField[],
  answers: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const field of fields) {
    if (!field.required) continue;
    if (!evaluateCondition(field.visibleIf, answers)) continue; // hidden fields aren't required

    if (isAnswerEmpty(answers[field.id])) {
      return { ok: false, message: `"${field.label}" is required` };
    }
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

export type SubmitFormResult =
  | { ok: true; responseId: string; successMessage?: string }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "VALIDATION"; message: string };

export async function submitForm(formId: string, answers: Record<string, unknown>): Promise<SubmitFormResult> {
  const result = await getPublishedForm(formId);
  if (!result) return { ok: false, reason: "NOT_FOUND" };

  const { form, properties } = result;
  const userId = form.userId;

  const validation = validateAnswersAgainstFields(properties.fields, answers);
  if (!validation.ok) return { ok: false, reason: "VALIDATION", message: validation.message };

  const response = await prisma.object.create({
    data: {
      userId,
      type: FORM_RESPONSE_TYPE,
      title: `Response to ${form.title}`,
      status: "active",
      properties: {
        formId: form.id,
        answers,
        submittedAt: new Date().toISOString(),
        createdObjects: [],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await relationService.createRelation(userId, { sourceId: form.id, targetId: response.id, type: "has_response" }).catch((err) => {
    console.error("Couldn't link form to its response:", err);
  });

  await materializeFileAnswers(userId, response.id, properties.fields, answers);

  const createdObjects = await runAutomations(userId, response.id, properties.automations, answers);

  await prisma.object.update({
    where: { id: response.id },
    data: {
      properties: {
        formId: form.id,
        answers,
        submittedAt: new Date().toISOString(),
        createdObjects,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, response.id, "created", { title: response.title });

  return { ok: true, responseId: response.id, successMessage: properties.successMessage };
}
