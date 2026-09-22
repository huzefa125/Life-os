import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createFormSchema,
  updateFormSchema,
  formIdParamSchema,
  formResponseIdParamSchema,
} from "../../validation/form.validation";
import * as formService from "../../services/forms/form.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createForm(req: Request, res: Response) {
  const parsed = createFormSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const form = await formService.createForm(req.userId as string, parsed.data);
  return sendSuccess(res, form, 201);
}

export async function getForms(req: Request, res: Response) {
  const forms = await formService.getFormsByUser(req.userId as string);
  return sendSuccess(res, forms);
}

export async function getForm(req: Request, res: Response) {
  const parsed = formIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const form = await formService.getFormById(parsed.data.id, req.userId as string);
  if (!form) return sendError(res, "Form not found", 404);
  return sendSuccess(res, form);
}

export async function updateForm(req: Request, res: Response) {
  const paramsParsed = formIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, formatZodError(paramsParsed.error), 400);

  const bodyParsed = updateFormSchema.safeParse(req.body);
  if (!bodyParsed.success) return sendError(res, formatZodError(bodyParsed.error), 400);

  const form = await formService.updateForm(paramsParsed.data.id, req.userId as string, bodyParsed.data);
  if (!form) return sendError(res, "Form not found", 404);
  return sendSuccess(res, form);
}

export async function deleteForm(req: Request, res: Response) {
  const parsed = formIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const form = await formService.deleteForm(parsed.data.id, req.userId as string);
  if (!form) return sendError(res, "Form not found", 404);
  return sendSuccess(res, form);
}

export async function publishForm(req: Request, res: Response) {
  const parsed = formIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const result = await formService.publishForm(parsed.data.id, req.userId as string);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return sendError(res, "Form not found", 404);
    return sendError(res, "Add at least one field before publishing", 400);
  }
  return sendSuccess(res, result.form);
}

export async function unpublishForm(req: Request, res: Response) {
  const parsed = formIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const form = await formService.unpublishForm(parsed.data.id, req.userId as string);
  if (!form) return sendError(res, "Form not found", 404);
  return sendSuccess(res, form);
}

export async function getResponses(req: Request, res: Response) {
  const parsed = formIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const responses = await formService.getResponsesForForm(parsed.data.id, req.userId as string);
  if (responses === null) return sendError(res, "Form not found", 404);
  return sendSuccess(res, responses);
}

export async function getResponse(req: Request, res: Response) {
  const parsed = formResponseIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const response = await formService.getResponseById(parsed.data.id, parsed.data.responseId, req.userId as string);
  if (!response) return sendError(res, "Response not found", 404);
  return sendSuccess(res, response);
}

export async function deleteResponse(req: Request, res: Response) {
  const parsed = formResponseIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const response = await formService.deleteResponse(parsed.data.id, parsed.data.responseId, req.userId as string);
  if (!response) return sendError(res, "Response not found", 404);
  return sendSuccess(res, response);
}

export async function exportResponsesCsv(req: Request, res: Response) {
  const parsed = formIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, formatZodError(parsed.error), 400);

  const csv = await formService.exportResponsesCsv(parsed.data.id, req.userId as string);
  if (csv === null) return sendError(res, "Form not found", 404);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="responses-${parsed.data.id}.csv"`);
  return res.status(200).send(csv);
}
