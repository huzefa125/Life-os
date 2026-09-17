import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
} from "../../validation/account.validation";
import * as accountService from "../../services/accounts/account.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createAccount(req: Request, res: Response) {
  const parsed = createAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const account = await accountService.createAccount(req.userId as string, parsed.data);
  return sendSuccess(res, account, 201);
}

export async function getAccounts(req: Request, res: Response) {
  const accounts = await accountService.getAccountsByUser(req.userId as string);
  return sendSuccess(res, accounts);
}

export async function getAccount(req: Request, res: Response) {
  const paramsParsed = accountIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const account = await accountService.getAccountById(paramsParsed.data.id, req.userId as string);
  if (!account) {
    return sendError(res, "Account not found", 404);
  }
  return sendSuccess(res, account);
}

export async function updateAccount(req: Request, res: Response) {
  const paramsParsed = accountIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateAccountSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const account = await accountService.updateAccount(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!account) {
    return sendError(res, "Account not found", 404);
  }
  return sendSuccess(res, account);
}

export async function deleteAccount(req: Request, res: Response) {
  const paramsParsed = accountIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const account = await accountService.deleteAccount(paramsParsed.data.id, req.userId as string);
  if (!account) {
    return sendError(res, "Account not found", 404);
  }
  return sendSuccess(res, account);
}
