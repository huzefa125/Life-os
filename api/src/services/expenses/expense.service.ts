import { prisma } from "../../db";
import type { CreateExpenseBody, UpdateExpenseBody } from "../../validation/expense.validation";

const EXPENSE_TYPE = "expense";

export async function createExpense(userId: string, input: CreateExpenseBody) {
  return prisma.object.create({
    data: {
      userId,
      type: EXPENSE_TYPE,
      title: input.title,
      properties: input.properties,
    },
  });
}

export async function getExpensesByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: EXPENSE_TYPE },
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
  return prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });
}

export async function deleteExpense(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: EXPENSE_TYPE },
  });
  if (!existing) return null;

  await prisma.object.delete({ where: { id } });
  return existing;
}
