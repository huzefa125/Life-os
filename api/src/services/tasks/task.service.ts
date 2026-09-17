import { prisma } from "../../db";
import type { CreateTaskBody, UpdateTaskBody } from "../../validation/task.validation";
import { logActivity } from "../activity/activity.service";

const TASK_TYPE = "task";
const DEFAULT_STATUS = "todo";

export async function createTask(userId: string, input: CreateTaskBody) {
  const task = await prisma.object.create({
    data: {
      userId,
      type: TASK_TYPE,
      title: input.title,
      status: "active",
      properties: {
        status: input.properties?.status ?? DEFAULT_STATUS,
        ...(input.properties?.priority !== undefined ? { priority: input.properties.priority } : {}),
        ...(input.properties?.dueDate !== undefined ? { dueDate: input.properties.dueDate } : {}),
        ...(input.properties?.notes !== undefined ? { notes: input.properties.notes } : {}),
      },
    },
  });

  await logActivity(userId, task.id, "created", { title: task.title });
  return task;
}

export async function getTasksByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: TASK_TYPE, status: "active" },
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

export async function deleteTask(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: TASK_TYPE },
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
