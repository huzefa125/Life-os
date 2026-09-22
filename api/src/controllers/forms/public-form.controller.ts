import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  publicFormIdParamSchema,
  publicResponseIdParamSchema,
  submitFormSchema,
} from "../../validation/public-form.validation";
import * as publicFormService from "../../services/forms/public-form.service";
import { saveUploadedFile } from "../../services/forms/storage.service";
import { getOptionalUserId } from "../../middleware/auth.middleware";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function getPublicForm(req: Request, res: Response) {
  const parsed = publicFormIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, "Form not found", 404);

  const requesterUserId = getOptionalUserId(req);
  const result = await publicFormService.getPublishedFormSchema(parsed.data.formId, requesterUserId);
  if (!result.ok) {
    if (result.reason === "REQUIRES_LOGIN") return sendError(res, "Please log in to LifeOS to view this form", 401);
    return sendError(res, "Form not found", 404);
  }
  return sendSuccess(res, result.schema);
}

export async function getResumableResponse(req: Request, res: Response) {
  const parsed = publicResponseIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendError(res, "Response not found", 404);

  const result = await publicFormService.getResumableResponse(parsed.data.formId, parsed.data.responseId);
  if (!result) return sendError(res, "Response not found", 404);
  return sendSuccess(res, result);
}

export async function submitPublicForm(req: Request, res: Response) {
  const paramsParsed = publicFormIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, "Form not found", 404);

  const bodyParsed = submitFormSchema.safeParse(req.body);
  if (!bodyParsed.success) return sendError(res, formatZodError(bodyParsed.error), 400);

  const requesterUserId = getOptionalUserId(req);
  const result = await publicFormService.submitForm(paramsParsed.data.formId, bodyParsed.data.answers, {
    draft: bodyParsed.data.draft,
    resumeId: bodyParsed.data.resumeId,
    requesterUserId,
    ip: req.ip,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
  });

  if (!result.ok) {
    if (result.reason === "NOT_FOUND") return sendError(res, "Form not found", 404);
    return sendError(res, result.message, 400);
  }

  return sendSuccess(
    res,
    { responseId: result.responseId, draft: result.draft, successMessage: result.successMessage, redirectUrl: result.redirectUrl },
    201
  );
}

export async function uploadPublicFormFile(req: Request, res: Response) {
  const paramsParsed = publicFormIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) return sendError(res, "Form not found", 404);

  const requesterUserId = getOptionalUserId(req);
  const result = await publicFormService.getPublishedFormSchema(paramsParsed.data.formId, requesterUserId);
  if (!result.ok) return sendError(res, "Form not found", 404);

  const file = (req as Request & { file?: Express.Multer.File }).file;
  if (!file) return sendError(res, "No file was uploaded", 400);

  const publicOrigin = `${req.protocol}://${req.get("host")}`;
  const saved = await saveUploadedFile(publicOrigin, paramsParsed.data.formId, file);
  return sendSuccess(res, saved, 201);
}
