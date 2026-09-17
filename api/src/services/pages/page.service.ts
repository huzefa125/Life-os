import { prisma } from "../../db";
import type { CreatePageBody, UpdatePageBody } from "../../validation/page.validation";
import { logActivity } from "../activity/activity.service";

const PAGE_TYPE = "page";

export async function createPage(userId: string, input: CreatePageBody) {
  const page = await prisma.object.create({
    data: {
      userId,
      type: PAGE_TYPE,
      title: input.title,
      properties: {
        blocks: input.properties?.blocks ?? [],
      },
      tags: input.tags ?? [],
      status: "active",
    },
  });

  await logActivity(userId, page.id, "created", { title: page.title });
  return page;
}

export async function getPagesByUser(userId: string, tag?: string) {
  return prisma.object.findMany({
    where: {
      userId,
      type: PAGE_TYPE,
      status: "active",
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getPageById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: PAGE_TYPE },
  });
}

export async function updatePage(id: string, userId: string, input: UpdatePageBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PAGE_TYPE },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
    },
  });

  await logActivity(userId, id, "updated", {
    titleChanged: input.title !== undefined,
    blocksChanged: input.properties !== undefined,
  });

  return updated;
}

export async function deletePage(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PAGE_TYPE },
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
