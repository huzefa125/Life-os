import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createRecurringSchema,
  updateRecurringSchema,
  recurringIdParamSchema,
} from "../../validation/recurring.validation";
import * as recurringService from "../../services/recurring/recurring.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

function referenceErrorMessage(reason: "ACCOUNT_NOT_FOUND" | "TO_ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND") {
  if (reason === "ACCOUNT_NOT_FOUND") return "Account not found";
  if (reason === "TO_ACCOUNT_NOT_FOUND") return "Destination account not found";
  return "Category not found";
}

export async function createRecurring(req: Request, res: Response) {
  const parsed = createRecurringSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await recurringService.createRecurring(req.userId as string, parsed.data);
  if (!result.ok) {
    return sendError(res, referenceErrorMessage(result.reason), 404);
  }
  return sendSuccess(res, result.recurring, 201);
}

export async function getRecurring(req: Request, res: Response) {
  await recurringService.processDueRecurring(req.userId as string);
  const recurring = await recurringService.getRecurringByUser(req.userId as string);
  return sendSuccess(res, recurring);
}

export async function getRecurringOne(req: Request, res: Response) {
  const paramsParsed = recurringIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const recurring = await recurringService.getRecurringById(paramsParsed.data.id, req.userId as string);
  if (!recurring) {
    return sendError(res, "Recurring transaction not found", 404);
  }
  return sendSuccess(res, recurring);
}

export async function updateRecurring(req: Request, res: Response) {
  const paramsParsed = recurringIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateRecurringSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const result = await recurringService.updateRecurring(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!result.ok) {
    return sendError(res, referenceErrorMessage(result.reason), 404);
  }
  if (!result.recurring) {
    return sendError(res, "Recurring transaction not found", 404);
  }
  return sendSuccess(res, result.recurring);
}

export async function deleteRecurring(req: Request, res: Response) {
  const paramsParsed = recurringIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const recurring = await recurringService.deleteRecurring(paramsParsed.data.id, req.userId as string);
  if (!recurring) {
    return sendError(res, "Recurring transaction not found", 404);
  }
  return sendSuccess(res, recurring);
}
