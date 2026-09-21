import { prisma } from "../../db";
import type { CreateBudgetBody, UpdateBudgetBody } from "../../validation/budget.validation";
import { logActivity } from "../activity/activity.service";
import { computeCategorySpent, getPeriodStart } from "../money/money.service";

const BUDGET_TYPE = "budget";
const CATEGORY_TYPE = "category";

interface BudgetProperties {
  categoryId: string;
  amount: number;
  currency: string;
  period: "weekly" | "monthly";
}

async function validateCategory(userId: string, categoryId: string) {
  const category = await prisma.object.findFirst({ where: { id: categoryId, userId, type: CATEGORY_TYPE } });
  return Boolean(category);
}

async function withProgress<T extends { userId: string; properties: unknown }>(budget: T) {
  const properties = budget.properties as unknown as BudgetProperties;
  const periodStart = getPeriodStart(new Date().toISOString().slice(0, 10), properties.period === "weekly" ? "week" : "month");
  const spent = await computeCategorySpent(budget.userId, properties.categoryId, periodStart);
  return { ...budget, spent, remaining: properties.amount - spent };
}

export async function createBudget(userId: string, input: CreateBudgetBody) {
  const categoryExists = await validateCategory(userId, input.properties.categoryId);
  if (!categoryExists) return { ok: false as const };

  const budget = await prisma.object.create({
    data: {
      userId,
      type: BUDGET_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, budget.id, "created", { title: budget.title });
  return { ok: true as const, budget: await withProgress(budget) };
}

export async function getBudgetsByUser(userId: string) {
  const budgets = await prisma.object.findMany({
    where: { userId, type: BUDGET_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(budgets.map((b) => withProgress(b)));
}

export async function getBudgetById(id: string, userId: string) {
  const budget = await prisma.object.findFirst({ where: { id, userId, type: BUDGET_TYPE } });
  if (!budget) return null;
  return withProgress(budget);
}

export async function updateBudget(id: string, userId: string, input: UpdateBudgetBody) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: BUDGET_TYPE } });
  if (!existing) return { ok: true as const, budget: null };

  if (input.properties?.categoryId) {
    const categoryExists = await validateCategory(userId, input.properties.categoryId);
    if (!categoryExists) return { ok: false as const };
  }

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return { ok: true as const, budget: await withProgress(updated) };
}

export async function deleteBudget(id: string, userId: string) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: BUDGET_TYPE } });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: { status: "trash", deletedAt: new Date() },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}
