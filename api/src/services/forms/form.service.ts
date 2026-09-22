import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateFormBody, FormProperties, UpdateFormBody } from "../../validation/form.validation";
import { logActivity } from "../activity/activity.service";
import { buildResponsesCsv } from "../../utils/csv";

export const FORM_TYPE = "form";
export const FORM_RESPONSE_TYPE = "form_response";

const DEFAULT_FORM_PROPERTIES: FormProperties = {
  fields: [],
  published: false,
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

  const updated = await prisma.object.update({
    where: { id },
    data: {
      properties: {
        ...properties,
        published: true,
        publishedAt: new Date().toISOString(),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, id, "updated", { published: true });
  return { ok: true, form: updated };
}

export async function unpublishForm(id: string, userId: string) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: FORM_TYPE } });
  if (!existing) return null;

  const properties = existing.properties as unknown as FormProperties;
  const updated = await prisma.object.update({
    where: { id },
    data: {
      properties: { ...properties, published: false } as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, id, "updated", { published: false });
  return updated;
}

export async function getResponsesForForm(formId: string, userId: string) {
  const form = await prisma.object.findFirst({ where: { id: formId, userId, type: FORM_TYPE } });
  if (!form) return null;

  return prisma.object.findMany({
    where: { userId, type: FORM_RESPONSE_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  }).then((all) => all.filter((r) => (r.properties as { formId?: string } | null)?.formId === formId));
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
