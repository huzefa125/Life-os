import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createRelationSchema,
  relationIdParamSchema,
  objectIdParamSchema,
} from "../../validation/relation.validation";
import * as relationService from "../../services/relations/relation.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createRelation(req: Request, res: Response) {
  const parsed = createRelationSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await relationService.createRelation(req.userId as string, parsed.data);
  if (!result.ok) {
    const message =
      result.reason === "SOURCE_NOT_FOUND" ? "Source object not found" : "Target object not found";
    return sendError(res, message, 404);
  }

  return sendSuccess(res, result.relation, 201);
}

export async function getRelationsForObject(req: Request, res: Response) {
  const paramsParsed = objectIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const relations = await relationService.getRelationsForObject(
    paramsParsed.data.objectId,
    req.userId as string
  );
  if (relations === null) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, relations);
}

export async function deleteRelation(req: Request, res: Response) {
  const paramsParsed = relationIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const relation = await relationService.deleteRelation(paramsParsed.data.id, req.userId as string);
  if (!relation) {
    return sendError(res, "Relation not found", 404);
  }

  return sendSuccess(res, relation);
}
