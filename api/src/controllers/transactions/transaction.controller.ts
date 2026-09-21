import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
  transactionListQuerySchema,
} from "../../validation/transaction.validation";
import * as transactionService from "../../services/transactions/transaction.service";
import { processDueRecurring } from "../../services/recurring/recurring.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

function referenceErrorMessage(reason: "ACCOUNT_NOT_FOUND" | "TO_ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND") {
  if (reason === "ACCOUNT_NOT_FOUND") return "Account not found";
  if (reason === "TO_ACCOUNT_NOT_FOUND") return "Destination account not found";
  return "Category not found";
}

export async function createTransaction(req: Request, res: Response) {
  const parsed = createTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await transactionService.createTransaction(req.userId as string, parsed.data);
  if (!result.ok) {
    return sendError(res, referenceErrorMessage(result.reason), 404);
  }
  return sendSuccess(res, result.transaction, 201);
}

export async function getTransactions(req: Request, res: Response) {
  const parsed = transactionListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  await processDueRecurring(req.userId as string);
  const transactions = await transactionService.getTransactionsByUser(req.userId as string, parsed.data);
  return sendSuccess(res, transactions);
}

export async function getTransaction(req: Request, res: Response) {
  const paramsParsed = transactionIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const transaction = await transactionService.getTransactionById(paramsParsed.data.id, req.userId as string);
  if (!transaction) {
    return sendError(res, "Transaction not found", 404);
  }
  return sendSuccess(res, transaction);
}

export async function updateTransaction(req: Request, res: Response) {
  const paramsParsed = transactionIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateTransactionSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const result = await transactionService.updateTransaction(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!result.ok) {
    return sendError(res, referenceErrorMessage(result.reason), 404);
  }
  if (!result.transaction) {
    return sendError(res, "Transaction not found", 404);
  }
  return sendSuccess(res, result.transaction);
}

export async function deleteTransaction(req: Request, res: Response) {
  const paramsParsed = transactionIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const transaction = await transactionService.deleteTransaction(paramsParsed.data.id, req.userId as string);
  if (!transaction) {
    return sendError(res, "Transaction not found", 404);
  }
  return sendSuccess(res, transaction);
}
