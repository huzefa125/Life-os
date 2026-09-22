import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { publicFormIdParamSchema, submitFormSchema } from "../../validation/public-form.validation";
import * as publicFormService from "../../services/forms/public-form.service";
import { saveUploadedFile } from "../../services/forms/storage.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function getPublicForm(req: Request, res: Response) {
  const parsed = publicFormIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, "Form not found", 404);

  const schema = await publicFormService.getPublishedFormSchema(parsed.data.formId);
  if (!schema) return sendError(res, "Form not found", 404);
  return sendSuccess(res, schema);
}

export async function submitPublicForm(req: Request, res: Response) {
  const paramsParsed = publicFormIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, "Form not found", 404);

  const bodyParsed = submitFormSchema.safeParse(req.body);
  if (!bodyParsed.success) return sendError(res, formatZodError(bodyParsed.error), 400);

  const result = await publicFormService.submitForm(paramsParsed.data.formId, bodyParsed.data.answers);
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return sendError(res, "Form not found", 404);
    return sendError(res, result.message, 400);
  }

  return sendSuccess(res, { responseId: result.responseId, successMessage: result.successMessage }, 201);
}

export async function uploadPublicFormFile(req: Request, res: Response) {
  const paramsParsed = publicFormIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, "Form not found", 404);

  const schema = await publicFormService.getPublishedFormSchema(paramsParsed.data.formId);
  if (!schema) return sendError(res, "Form not found", 404);

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return sendError(res, "No file was uploaded", 400);

  const publicOrigin = `${req.protocol}://${req.get("host")}`;
  const saved = await saveUploadedFile(publicOrigin, paramsParsed.data.formId, file);
  return sendSuccess(res, saved, 201);
}
