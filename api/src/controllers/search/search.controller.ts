import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { searchQuerySchema } from "../../validation/search.validation";
import * as searchService from "../../services/search/search.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function search(req: Request, res: Response) {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const { q, type } = parsed.data;
  const results = await searchService.searchObjects(req.userId as string, q, type);
  return sendSuccess(res, results);
}
