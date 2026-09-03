import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseIdParamSchema,
} from "../../validation/expense.validation";
import * as expenseService from "../../services/expenses/expense.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createExpense(req: Request, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const expense = await expenseService.createExpense(req.userId as string, parsed.data);
  return sendSuccess(res, expense, 201);
}

export async function getExpenses(req: Request, res: Response) {
  const expenses = await expenseService.getExpensesByUser(req.userId as string);
  return sendSuccess(res, expenses);
}

export async function getExpense(req: Request, res: Response) {
  const paramsParsed = expenseIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const expense = await expenseService.getExpenseById(paramsParsed.data.id, req.userId as string);
  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }
  return sendSuccess(res, expense);
}

export async function updateExpense(req: Request, res: Response) {
  const paramsParsed = expenseIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateExpenseSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const expense = await expenseService.updateExpense(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }
  return sendSuccess(res, expense);
}

export async function deleteExpense(req: Request, res: Response) {
  const paramsParsed = expenseIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const expense = await expenseService.deleteExpense(paramsParsed.data.id, req.userId as string);
  if (!expense) {
    return sendError(res, "Expense not found", 404);
  }
  return sendSuccess(res, expense);
}
