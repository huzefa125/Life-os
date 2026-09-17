import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
} from "../../validation/category.validation";
import * as categoryService from "../../services/categories/category.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function createCategory(req: Request, res: Response) {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const category = await categoryService.createCategory(req.userId as string, parsed.data);
  return sendSuccess(res, category, 201);
}

export async function getCategories(req: Request, res: Response) {
  const categories = await categoryService.getCategoriesByUser(req.userId as string);
  return sendSuccess(res, categories);
}

export async function getCategory(req: Request, res: Response) {
  const paramsParsed = categoryIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const category = await categoryService.getCategoryById(paramsParsed.data.id, req.userId as string);
  if (!category) {
    return sendError(res, "Category not found", 404);
  }
  return sendSuccess(res, category);
}

export async function updateCategory(req: Request, res: Response) {
  const paramsParsed = categoryIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const bodyParsed = updateCategorySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return sendError(res, formatZodError(bodyParsed.error), 400);
  }

  const category = await categoryService.updateCategory(
    paramsParsed.data.id,
    req.userId as string,
    bodyParsed.data
  );
  if (!category) {
    return sendError(res, "Category not found", 404);
  }
  return sendSuccess(res, category);
}

export async function deleteCategory(req: Request, res: Response) {
  const paramsParsed = categoryIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return sendError(res, formatZodError(paramsParsed.error), 400);
  }

  const category = await categoryService.deleteCategory(paramsParsed.data.id, req.userId as string);
  if (!category) {
    return sendError(res, "Category not found", 404);
  }
  return sendSuccess(res, category);
}
