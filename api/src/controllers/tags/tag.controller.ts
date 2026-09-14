import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { objectIdParamSchema } from "../../validation/object.validation";
import { updateTagsSchema } from "../../validation/tag.validation";
import * as tagService from "../../services/tags/tag.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function getAllTags(req: Request, res: Response) {
  const tags = await tagService.getAllTags(req.userId as string);
  return sendSuccess(res, tags);
}

export async function updateObjectTags(req: Request, res: Response) {
  const params = objectIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const parsed = updateTagsSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const updated = await tagService.updateObjectTags(
    req.userId as string,
    params.data.id,
    parsed.data.tags
  );
  if (!updated) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, updated);
}

export async function getObjectsByTag(req: Request, res: Response) {
  const rawTag = req.params.tag;
  const tag = Array.isArray(rawTag) ? rawTag[0] : rawTag;
  if (!tag) {
    return sendError(res, "Tag is required", 400);
  }

  const objects = await tagService.getObjectsByTag(req.userId as string, tag);
  return sendSuccess(res, objects);
}
