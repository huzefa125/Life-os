import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { moneySummaryQuerySchema } from "../../validation/money.validation";
import { computeMoneySummary } from "../../services/money/money.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function getSummary(req: Request, res: Response) {
  const parsed = moneySummaryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const summary = await computeMoneySummary(req.userId as string, parsed.data.granularity);
  return sendSuccess(res, summary);
}
