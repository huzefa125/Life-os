import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetIdParamSchema,
} from "../../validation/budget.validation";
import * as budgetService from "../../services/budgets/budget.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createBudget(req: Request, res: Response) {
  const parsed = createBudgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await budgetService.createBudget(req.userId as string, parsed.data);
  if (!result.ok) {
    return sendError(res, "Category not found", 404);
  }
  return sendSuccess(res, result.budget, 201);
}

export async function getBudgets(req: Request, res: Response) {
  const budgets = await budgetService.getBudgetsByUser(req.userId as string);
  return sendSuccess(res, budgets);
}

export async function getBudget(req: Request, res: Response) {
  const paramsParsed = budgetIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const budget = await budgetService.getBudgetById(paramsParsed.data.id, req.userId as string);
  if (!budget) {
    return sendError(res, "Budget not found", 404);
  }
  return sendSuccess(res, budget);
}

export async function updateBudget(req: Request, res: Response) {
  const paramsParsed = budgetIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateBudgetSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const result = await budgetService.updateBudget(paramsParsed.data.id, req.userId as string, bodyParsed.data);
  if (!result.ok) {
    return sendError(res, "Category not found", 404);
  }
  if (!result.budget) {
    return sendError(res, "Budget not found", 404);
  }
  return sendSuccess(res, result.budget);
}

export async function deleteBudget(req: Request, res: Response) {
  const paramsParsed = budgetIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const budget = await budgetService.deleteBudget(paramsParsed.data.id, req.userId as string);
  if (!budget) {
    return sendError(res, "Budget not found", 404);
  }
  return sendSuccess(res, budget);
}
