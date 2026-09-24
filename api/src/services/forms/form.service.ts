import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateFormBody, FormProperties, FormSettings, ManualActionBody, UpdateFormBody } from "../../validation/form.validation";
import { logActivity } from "../activity/activity.service";
import { buildResponsesCsv } from "../../utils/csv";
import { runSingleAction, type CreatedObjectRecord } from "./automation.service";
import * as relationService from "../relations/relation.service";

export const FORM_TYPE = "form";
export const FORM_RESPONSE_TYPE = "form_response";

const DEFAULT_SETTINGS: FormSettings = {
  status: "draft",
  acceptResponses: true,
  onePerPerson: false,
  allowResponseEditing: false,
  saveAndResumeLater: false,
  requireLogin: false,
  anonymousResponses: true,
  spamProtectionEnabled: false,
};

const DEFAULT_FORM_PROPERTIES: FormProperties = {
  fields: [],
  settings: DEFAULT_SETTINGS,
  automations: [],
};

export async function createForm(userId: string, input: CreateFormBody) {
  const form = await prisma.object.create({
    data: {
      userId,
      type: FORM_TYPE,
      title: input.title,
      status: "active",
      properties: DEFAULT_FORM_PROPERTIES as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, form.id, "created", { title: form.title });
  return form;
}

export async function getFormsByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: FORM_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFormById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: FORM_TYPE },
  });
}

export async function updateForm(id: string, userId: string, input: UpdateFormBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: FORM_TYPE },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties as unknown as Prisma.InputJsonValue } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return updated;
}

export async function deleteForm(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: FORM_TYPE },
  });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: { status: "trash", deletedAt: new Date() },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}

async function updateFormStatus(
  id: string,
  userId: string,
  status: FormSettings["status"],
  extra?: Partial<FormSettings>
) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: FORM_TYPE } });
  if (!existing) return null;

  const properties = existing.properties as unknown as FormProperties;
  const updated = await prisma.object.update({
    where: { id },
    data: {
      properties: {
        ...properties,
        settings: { ...properties.settings, ...extra, status },
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, id, "updated", { status });
  return updated;
}

export type PublishFormResult =
  | { ok: true; form: Awaited<ReturnType<typeof prisma.object.update>> }
  | { ok: false; reason: "NOT_FOUND" | "NO_FIELDS" };

export async function publishForm(id: string, userId: string): Promise<PublishFormResult> {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: FORM_TYPE } });
  if (!existing) return { ok: false, reason: "NOT_FOUND" };

  const properties = existing.properties as unknown as FormProperties;
  if (!properties.fields || properties.fields.length === 0) {
    return { ok: false, reason: "NO_FIELDS" };
  }

  const updated = await updateFormStatus(id, userId, "published");
  return { ok: true, form: updated! };
}

export async function unpublishForm(id: string, userId: string) {
  return updateFormStatus(id, userId, "draft");
}

export async function closeForm(id: string, userId: string) {
  return updateFormStatus(id, userId, "closed");
}

export async function reopenForm(id: string, userId: string) {
  return updateFormStatus(id, userId, "published");
}

export async function getResponsesForForm(formId: string, userId: string, includeDrafts = false) {
  const form = await prisma.object.findFirst({ where: { id: formId, userId, type: FORM_TYPE } });
  if (!form) return null;

  const all = await prisma.object.findMany({
    where: { userId, type: FORM_RESPONSE_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return all.filter((r) => {
    const props = r.properties as { formId?: string; draft?: boolean } | null;
    if (props?.formId !== formId) return false;
    if (!includeDrafts && props?.draft) return false;
    return true;
  });
}

export async function getResponseById(formId: string, responseId: string, userId: string) {
  const response = await prisma.object.findFirst({
    where: { id: responseId, userId, type: FORM_RESPONSE_TYPE },
  });
  if (!response) return null;
  if ((response.properties as { formId?: string } | null)?.formId !== formId) return null;
  return response;
}

export async function deleteResponse(formId: string, responseId: string, userId: string) {
  const response = await getResponseById(formId, responseId, userId);
  if (!response) return null;

  const trashed = await prisma.object.update({
    where: { id: response.id },
    data: { status: "trash", deletedAt: new Date() },
  });

  await logActivity(userId, response.id, "trashed");
  return trashed;
}

export type CreateObjectFromResponseResult =
  | { ok: true; created: CreatedObjectRecord }
  | { ok: false; reason: "NOT_FOUND" | "ACTION_FAILED" };

/**
 * The response detail view's "Create Person / Task / Project /
 * Transaction" buttons — runs one action against a response's already-stored
 * answers, on demand, reusing the exact same executor the automation engine
 * uses at submit time. Appends the result to the response's `createdObjects`
 * and links it with the same `created` relation type automations use, so it
 * shows up identically in the response detail view either way.
 */
export async function createObjectFromResponse(
  formId: string,
  responseId: string,
  userId: string,
  action: ManualActionBody
): Promise<CreateObjectFromResponseResult> {
  const response = await getResponseById(formId, responseId, userId);
  if (!response) return { ok: false, reason: "NOT_FOUND" };

  const properties = response.properties as unknown as {
    formId: string;
    answers: Record<string, unknown>;
    submittedAt: string;
    draft?: boolean;
    createdObjects: CreatedObjectRecord[];
  };
  const actionId = `manual-${Date.now()}`;

  const created = await runSingleAction(userId, { id: actionId, ...action }, properties.answers);
  if (!created) return { ok: false, reason: "ACTION_FAILED" };

  await relationService.createRelation(userId, { sourceId: responseId, targetId: created.objectId, type: "created" }).catch((err) => {
    console.error("Couldn't link response to manually created object:", err);
  });

  await prisma.object.update({
    where: { id: responseId },
    data: {
      properties: {
        ...properties,
        createdObjects: [...(properties.createdObjects ?? []), created],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, responseId, "updated", { manualAction: action.type });
  return { ok: true, created };
}

export async function exportResponsesCsv(formId: string, userId: string): Promise<string | null> {
  const form = await prisma.object.findFirst({ where: { id: formId, userId, type: FORM_TYPE } });
  if (!form) return null;

  const properties = form.properties as unknown as FormProperties;
  const responses = await getResponsesForForm(formId, userId);

  return buildResponsesCsv(
    properties.fields.map((f) => ({ id: f.id, label: f.label })),
    (responses ?? []) as { properties: { answers: Record<string, unknown>; submittedAt: string } | null }[]
  );
}
