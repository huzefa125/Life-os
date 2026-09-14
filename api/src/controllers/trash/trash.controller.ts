import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { objectIdParamSchema } from "../../validation/object.validation";
import * as trashService from "../../services/trash/trash.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function moveToTrash(req: Request, res: Response) {
  const params = objectIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const result = await trashService.moveToTrash(req.userId as string, params.data.id);
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, result);
}

export async function restoreFromTrash(req: Request, res: Response) {
  const params = objectIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const result = await trashService.restoreFromTrash(req.userId as string, params.data.id);
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, result);
}

export async function getTrashObjects(req: Request, res: Response) {
  const list = await trashService.getTrashObjects(req.userId as string);
  return sendSuccess(res, list);
}

export async function permanentDelete(req: Request, res: Response) {
  const params = objectIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const result = await trashService.permanentDelete(req.userId as string, params.data.id);
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, { message: "Permanently deleted" });
}

export async function emptyTrash(req: Request, res: Response) {
  const result = await trashService.emptyTrash(req.userId as string);
  return sendSuccess(res, { count: result.count, message: "Trash emptied" });
}
