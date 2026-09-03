import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} from "../../validation/project.validation";
import * as projectService from "../../services/projects/project.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createProject(req: Request, res: Response) {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const project = await projectService.createProject(req.userId as string, parsed.data);
  return sendSuccess(res, project, 201);
}

export async function getProjects(req: Request, res: Response) {
  const projects = await projectService.getProjectsByUser(req.userId as string);
  return sendSuccess(res, projects);
}

export async function getProject(req: Request, res: Response) {
  const paramsParsed = projectIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const project = await projectService.getProjectById(paramsParsed.data.id, req.userId as string);
  if (!project) {
    return sendError(res, "Project not found", 404);
  }
  return sendSuccess(res, project);
}

export async function updateProject(req: Request, res: Response) {
  const paramsParsed = projectIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateProjectSchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const project = await projectService.updateProject(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!project) {
    return sendError(res, "Project not found", 404);
  }
  return sendSuccess(res, project);
}

export async function deleteProject(req: Request, res: Response) {
  const paramsParsed = projectIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const project = await projectService.deleteProject(paramsParsed.data.id, req.userId as string);
  if (!project) {
    return sendError(res, "Project not found", 404);
  }
  return sendSuccess(res, project);
}
