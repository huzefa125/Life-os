import { prisma } from "../../db";
import type { CreateProjectBody, UpdateProjectBody } from "../../validation/project.validation";

const PROJECT_TYPE = "project";

export async function createProject(userId: string, input: CreateProjectBody) {
  return prisma.object.create({
    data: {
      userId,
      type: PROJECT_TYPE,
      title: input.title,
      properties: input.properties ?? {},
    },
  });
}

export async function getProjectsByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: PROJECT_TYPE },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProjectById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: PROJECT_TYPE },
  });
}

export async function updateProject(id: string, userId: string, input: UpdateProjectBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PROJECT_TYPE },
  });
  if (!existing) return null;

  // properties, when provided, replaces the JSON blob wholesale (no deep merge)
  return prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });
}

export async function deleteProject(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PROJECT_TYPE },
  });
  if (!existing) return null;

  await prisma.object.delete({ where: { id } });
  return existing;
}
