import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { registerSchema, loginSchema } from "../../validation/auth.validation";
import * as authService from "../../services/auth/auth.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await authService.registerUser(parsed.data);
  if (!result.ok) {
    return sendError(res, "Email is already registered", 409);
  }

  return sendSuccess(res, result.user, 201);
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await authService.loginUser(parsed.data);
  if (!result.ok) {
    return sendError(res, "Invalid email or password", 401);
  }

  return sendSuccess(res, { token: result.token, user: result.user });
}

export async function me(req: Request, res: Response) {
  const user = await authService.getUserById(req.userId as string);
  if (!user) {
    return sendError(res, "User not found", 404);
  }

  return sendSuccess(res, user);
}
