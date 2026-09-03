import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { createFileSchema, fileIdParamSchema } from "../../validation/file.validation";
import * as fileService from "../../services/files/file.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createFile(req: Request, res: Response) {
  const parsed = createFileSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const file = await fileService.createFile(req.userId as string, parsed.data);
  return sendSuccess(res, file, 201);
}

export async function getFiles(req: Request, res: Response) {
  const files = await fileService.getFilesByUser(req.userId as string);
  return sendSuccess(res, files);
}

export async function getFile(req: Request, res: Response) {
  const paramsParsed = fileIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const file = await fileService.getFileById(paramsParsed.data.id, req.userId as string);
  if (!file) {
    return sendError(res, "File not found", 404);
  }
  return sendSuccess(res, file);
}

export async function deleteFile(req: Request, res: Response) {
  const paramsParsed = fileIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const file = await fileService.deleteFile(paramsParsed.data.id, req.userId as string);
  if (!file) {
    return sendError(res, "File not found", 404);
  }
  return sendSuccess(res, file);
}
