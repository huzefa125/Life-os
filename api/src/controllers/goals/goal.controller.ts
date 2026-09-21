import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { createGoalSchema, updateGoalSchema, goalIdParamSchema } from "../../validation/goal.validation";
import * as goalService from "../../services/goals/goal.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createGoal(req: Request, res: Response) {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await goalService.createGoal(req.userId as string, parsed.data);
  if (!result.ok) {
    return sendError(res, "Linked account not found", 404);
  }
  return sendSuccess(res, result.goal, 201);
}

export async function getGoals(req: Request, res: Response) {
  const goals = await goalService.getGoalsByUser(req.userId as string);
  return sendSuccess(res, goals);
}

export async function getGoal(req: Request, res: Response) {
  const paramsParsed = goalIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const goal = await goalService.getGoalById(paramsParsed.data.id, req.userId as string);
  if (!goal) {
    return sendError(res, "Goal not found", 404);
  }
  return sendSuccess(res, goal);
}

export async function updateGoal(req: Request, res: Response) {
  const paramsParsed = goalIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateGoalSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const result = await goalService.updateGoal(paramsParsed.data.id, req.userId as string, bodyParsed.data);
  if (!result.ok) {
    return sendError(res, "Linked account not found", 404);
  }
  if (!result.goal) {
    return sendError(res, "Goal not found", 404);
  }
  return sendSuccess(res, result.goal);
}

export async function deleteGoal(req: Request, res: Response) {
  const paramsParsed = goalIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const goal = await goalService.deleteGoal(paramsParsed.data.id, req.userId as string);
  if (!goal) {
    return sendError(res, "Goal not found", 404);
  }
  return sendSuccess(res, goal);
}
