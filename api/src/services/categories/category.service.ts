import { prisma } from "../../db";
import type { CreateCategoryBody, UpdateCategoryBody } from "../../validation/category.validation";
import { logActivity } from "../activity/activity.service";

const CATEGORY_TYPE = "category";

export async function createCategory(userId: string, input: CreateCategoryBody) {
  const category = await prisma.object.create({
    data: {
      userId,
      type: CATEGORY_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, category.id, "created", { title: category.title });
  return category;
}

export async function getCategoriesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: CATEGORY_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCategoryById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: CATEGORY_TYPE },
  });
}

export async function updateCategory(id: string, userId: string, input: UpdateCategoryBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: CATEGORY_TYPE },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return updated;
}

export async function deleteCategory(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: CATEGORY_TYPE },
  });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: {
      status: "trash",
      deletedAt: new Date(),
    },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}
