import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { objectIdParamSchema } from "../../validation/object.validation";
import * as archiveService from "../../services/archive/archive.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function archiveObject(req: Request, res: Response) {
  const params = objectIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const result = await archiveService.archiveObject(req.userId as string, params.data.id);
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, result);
}

export async function unarchiveObject(req: Request, res: Response) {
  const params = objectIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const result = await archiveService.unarchiveObject(req.userId as string, params.data.id);
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, result);
}

export async function getArchivedObjects(req: Request, res: Response) {
  const list = await archiveService.getArchivedObjects(req.userId as string);
  return sendSuccess(res, list);
}
