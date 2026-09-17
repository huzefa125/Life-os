import { prisma } from "../../db";
import type { CreateExpenseBody, UpdateExpenseBody } from "../../validation/expense.validation";
import { logActivity } from "../activity/activity.service";

const EXPENSE_TYPE = "expense";

export async function createExpense(userId: string, input: CreateExpenseBody) {
  const expense = await prisma.object.create({
    data: {
      userId,
      type: EXPENSE_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, expense.id, "created", { title: expense.title });
  return expense;
}

export async function getExpensesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: EXPENSE_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getExpenseById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: EXPENSE_TYPE },
  });
}

export async function updateExpense(id: string, userId: string, input: UpdateExpenseBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: EXPENSE_TYPE },
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

export async function deleteExpense(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: EXPENSE_TYPE },
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
