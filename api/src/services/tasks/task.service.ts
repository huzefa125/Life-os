import { prisma } from "../../db";
import type { CreateTaskBody, UpdateTaskBody } from "../../validation/task.validation";

const TASK_TYPE = "task";
const DEFAULT_STATUS = "todo";

export async function createTask(userId: string, input: CreateTaskBody) {
  return prisma.object.create({
    data: {
      userId,
      type: TASK_TYPE,
      title: input.title,
      properties: {
        status: input.properties?.status ?? DEFAULT_STATUS,
        ...(input.properties?.priority !== undefined ? { priority: input.properties.priority } : {}),
        ...(input.properties?.dueDate !== undefined ? { dueDate: input.properties.dueDate } : {}),
      },
    },
  });
}

export async function getTasksByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: TASK_TYPE },
    orderBy: { createdAt: "desc" },
  });
}

export async function getTaskById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: TASK_TYPE },
  });
}

export async function updateTask(id: string, userId: string, input: UpdateTaskBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: TASK_TYPE },
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

export async function deleteTask(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: TASK_TYPE },
  });
  if (!existing) return null;

  await prisma.object.delete({ where: { id } });
  return existing;
}
