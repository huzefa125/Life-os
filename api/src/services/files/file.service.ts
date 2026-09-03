import { prisma } from "../../db";
import type { CreateFileBody } from "../../validation/file.validation";

const FILE_TYPE = "file";

export async function createFile(userId: string, input: CreateFileBody) {
  return prisma.object.create({
    data: {
      userId,
      type: FILE_TYPE,
      title: input.properties.fileName,
      properties: input.properties,
    },
  });
}

export async function getFilesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: FILE_TYPE },
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

  await prisma.object.delete({ where: { id } });
  return existing;
}
