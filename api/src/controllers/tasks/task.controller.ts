import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
} from "../../validation/task.validation";
import * as taskService from "../../services/tasks/task.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createTask(req: Request, res: Response) {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const task = await taskService.createTask(req.userId as string, parsed.data);
  return sendSuccess(res, task, 201);
}

export async function getTasks(req: Request, res: Response) {
  const tasks = await taskService.getTasksByUser(req.userId as string);
  return sendSuccess(res, tasks);
}

export async function getTask(req: Request, res: Response) {
  const paramsParsed = taskIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const task = await taskService.getTaskById(paramsParsed.data.id, req.userId as string);
  if (!task) {
    return sendError(res, "Task not found", 404);
  }
  return sendSuccess(res, task);
}

export async function updateTask(req: Request, res: Response) {
  const paramsParsed = taskIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateTaskSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const task = await taskService.updateTask(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!task) {
    return sendError(res, "Task not found", 404);
  }
  return sendSuccess(res, task);
}

export async function deleteTask(req: Request, res: Response) {
  const paramsParsed = taskIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const task = await taskService.deleteTask(paramsParsed.data.id, req.userId as string);
  if (!task) {
    return sendError(res, "Task not found", 404);
  }
  return sendSuccess(res, task);
}
