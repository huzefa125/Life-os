import type { Request, Response } from "express";
import { sendSuccess, sendError } from "../../utils/apiResponse";
import { addFavoriteSchema, favoriteIdParamSchema } from "../../validation/favorite.validation";
import * as favoriteService from "../../services/favorites/favorite.service";

function formatZodError(error: { issues: { message: string }[] }) {
  return error.issues.map((issue) => issue.message).join(", ");
}

export async function addFavorite(req: Request, res: Response) {
  const parsed = addFavoriteSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, formatZodError(parsed.error), 400);
  }

  const result = await favoriteService.addFavorite(req.userId as string, parsed.data.objectId);
  if (!result) {
    return sendError(res, "Object not found", 404);
  }

  return sendSuccess(res, result, 201);
}

export async function removeFavorite(req: Request, res: Response) {
  const params = favoriteIdParamSchema.safeParse(req.params);
  if (!params.success) {
    return sendError(res, formatZodError(params.error), 400);
  }

  const result = await favoriteService.removeFavorite(req.userId as string, params.data.id);
  if (!result) {
    return sendError(res, "Favorite not found", 404);
  }

  return sendSuccess(res, { message: "Removed from favorites" });
}

export async function getFavorites(req: Request, res: Response) {
  const list = await favoriteService.getFavorites(req.userId as string);
  return sendSuccess(res, list);
}
