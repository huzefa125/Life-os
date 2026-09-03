import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { objectIdParamSchema } from "../../validation/object.validation";
import * as objectService from "../../services/objects/object.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function getObjectConnections(req: Request, res: Response) {
  const paramsParsed = objectIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const result = await objectService.getObjectWithConnections(
    paramsParsed.data.id,
    req.userId as string
  );
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, result);
}
