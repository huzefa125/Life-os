import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createPageSchema,
  updatePageSchema,
  pageIdParamSchema,
} from "../../validation/page.validation";
import * as pageService from "../../services/pages/page.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createPage(req: Request, res: Response) {
  const parsed = createPageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const page = await pageService.createPage(req.userId as string, parsed.data);
  return sendSuccess(res, page, 201);
}

export async function getPages(req: Request, res: Response) {
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const pages = await pageService.getPagesByUser(req.userId as string, tag);
  return sendSuccess(res, pages);
}

export async function getPage(req: Request, res: Response) {
  const params = pageIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const page = await pageService.getPageById(params.data.id, req.userId as string);
  if (!page) {
    return sendError(res, "Page not found", 404);
  }

  return sendSuccess(res, page);
}

export async function updatePage(req: Request, res: Response) {
  const params = pageIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const parsed = updatePageSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const page = await pageService.updatePage(params.data.id, req.userId as string, parsed.data);
  if (!page) {
    return sendError(res, "Page not found", 404);
  }

  return sendSuccess(res, page);
}

export async function deletePage(req: Request, res: Response) {
  const params = pageIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const page = await pageService.deletePage(params.data.id, req.userId as string);
  if (!page) {
    return sendError(res, "Page not found", 404);
  }

  return sendSuccess(res, { message: "Page moved to trash" });
}
