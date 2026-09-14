import { prisma } from "../../db";
import type { CreateFileBody } from "../../validation/file.validation";
import { logActivity } from "../activity/activity.service";

const FILE_TYPE = "file";

export async function createFile(userId: string, input: CreateFileBody) {
  const file = await prisma.object.create({
    data: {
      userId,
      type: FILE_TYPE,
      title: input.properties.fileName,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, file.id, "created", { title: file.title });
  return file;
}

export async function getFilesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: FILE_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFileById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: FILE_TYPE },
  });
}

export async function deleteFile(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: FILE_TYPE },
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
