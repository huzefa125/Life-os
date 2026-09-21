import { prisma } from "../../db";
import type { CreateGoalBody, UpdateGoalBody } from "../../validation/goal.validation";
import { logActivity } from "../activity/activity.service";
import { computeAccountBalances } from "../money/money.service";

const GOAL_TYPE = "goal";
const ACCOUNT_TYPE = "account";
const FUNDS_FROM = "funds_from";

interface GoalProperties {
  targetAmount: number;
  currency: string;
  targetDate?: string;
  currentAmount?: number;
  linkedAccountId?: string;
}

async function validateLinkedAccount(userId: string, linkedAccountId?: string) {
  if (!linkedAccountId) return true;
  const account = await prisma.object.findFirst({ where: { id: linkedAccountId, userId, type: ACCOUNT_TYPE } });
  return Boolean(account);
}

async function syncGoalRelation(userId: string, goalId: string, linkedAccountId?: string) {
  await prisma.relation.deleteMany({ where: { userId, sourceId: goalId, type: FUNDS_FROM } });
  if (linkedAccountId) {
    await prisma.relation.create({
      data: { userId, sourceId: goalId, targetId: linkedAccountId, type: FUNDS_FROM },
    });
  }
}

async function withProgress<T extends { userId: string; properties: unknown }>(goal: T) {
  const properties = goal.properties as unknown as GoalProperties;
  let currentValue = properties.currentAmount ?? 0;

  if (properties.linkedAccountId) {
    const account = await prisma.object.findFirst({
      where: { id: properties.linkedAccountId, userId: goal.userId, type: ACCOUNT_TYPE },
    });
    if (account) {
      const startingBalance = (account.properties as { startingBalance?: number } | null)?.startingBalance ?? 0;
      const balances = await computeAccountBalances(goal.userId, new Map([[account.id, startingBalance]]));
      currentValue = balances.get(account.id) ?? 0;
    }
  }

  const progress = properties.targetAmount > 0 ? Math.min(currentValue / properties.targetAmount, 1) : 0;
  return { ...goal, currentValue, progress };
}

export async function createGoal(userId: string, input: CreateGoalBody) {
  const validAccount = await validateLinkedAccount(userId, input.properties.linkedAccountId);
  if (!validAccount) return { ok: false as const };

  const goal = await prisma.object.create({
    data: {
      userId,
      type: GOAL_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await syncGoalRelation(userId, goal.id, input.properties.linkedAccountId);
  await logActivity(userId, goal.id, "created", { title: goal.title });
  return { ok: true as const, goal: await withProgress(goal) };
}

export async function getGoalsByUser(userId: string) {
  const goals = await prisma.object.findMany({
    where: { userId, type: GOAL_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(goals.map((g) => withProgress(g)));
}

export async function getGoalById(id: string, userId: string) {
  const goal = await prisma.object.findFirst({ where: { id, userId, type: GOAL_TYPE } });
  if (!goal) return null;
  return withProgress(goal);
}

export async function updateGoal(id: string, userId: string, input: UpdateGoalBody) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: GOAL_TYPE } });
  if (!existing) return { ok: true as const, goal: null };

  if (input.properties !== undefined) {
    const validAccount = await validateLinkedAccount(userId, input.properties.linkedAccountId);
    if (!validAccount) return { ok: false as const };
  }

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  if (input.properties !== undefined) {
    await syncGoalRelation(userId, id, input.properties.linkedAccountId);
  }

  await logActivity(userId, id, "updated");
  return { ok: true as const, goal: await withProgress(updated) };
}

export async function deleteGoal(id: string, userId: string) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: GOAL_TYPE } });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: { status: "trash", deletedAt: new Date() },
  });

  await prisma.relation.deleteMany({ where: { userId, sourceId: id, type: FUNDS_FROM } });
  await logActivity(userId, id, "trashed");
  return trashed;
}
