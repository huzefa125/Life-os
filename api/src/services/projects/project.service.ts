import { prisma } from "../../db";
import type { CreateProjectBody, UpdateProjectBody } from "../../validation/project.validation";
import { logActivity } from "../activity/activity.service";

const PROJECT_TYPE = "project";

export async function createProject(userId: string, input: CreateProjectBody) {
  const project = await prisma.object.create({
    data: {
      userId,
      type: PROJECT_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties ?? {},
    },
  });

  await logActivity(userId, project.id, "created", { title: project.title });
  return project;
}

export async function getProjectsByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: PROJECT_TYPE, status: "active" },
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

export async function deleteProject(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: PROJECT_TYPE },
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
