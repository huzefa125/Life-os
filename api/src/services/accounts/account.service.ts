import { prisma } from "../../db";
import type { CreateAccountBody, UpdateAccountBody } from "../../validation/account.validation";
import { logActivity } from "../activity/activity.service";
import { computeAccountBalances } from "../money/money.service";

const ACCOUNT_TYPE = "account";

interface AccountProperties {
  startingBalance: number;
  [key: string]: unknown;
}

function withBalance<T extends { id: string; properties: unknown }>(
  account: T,
  balances: Map<string, number>
) {
  return { ...account, balance: balances.get(account.id) ?? 0 };
}

export async function createAccount(userId: string, input: CreateAccountBody) {
  const account = await prisma.object.create({
    data: {
      userId,
      type: ACCOUNT_TYPE,
      title: input.title,
      status: "active",
      properties: input.properties,
    },
  });

  await logActivity(userId, account.id, "created", { title: account.title });
  return withBalance(account, new Map([[account.id, input.properties.startingBalance]]));
}

export async function getAccountsByUser(userId: string) {
  const accounts = await prisma.object.findMany({
    where: { userId, type: ACCOUNT_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  const startingBalances = new Map(
    accounts.map((a) => [a.id, (a.properties as unknown as AccountProperties | null)?.startingBalance ?? 0])
  );
  const balances = await computeAccountBalances(userId, startingBalances);

  return accounts.map((account) => withBalance(account, balances));
}

export async function getAccountById(id: string, userId: string) {
  const account = await prisma.object.findFirst({
    where: { id, userId, type: ACCOUNT_TYPE },
  });
  if (!account) return null;

  const startingBalance = (account.properties as unknown as AccountProperties | null)?.startingBalance ?? 0;
  const balances = await computeAccountBalances(userId, new Map([[account.id, startingBalance]]));
  return withBalance(account, balances);
}

export async function updateAccount(id: string, userId: string, input: UpdateAccountBody) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: ACCOUNT_TYPE },
  });
  if (!existing) return null;

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  await logActivity(userId, id, "updated");

  const startingBalance = (updated.properties as unknown as AccountProperties | null)?.startingBalance ?? 0;
  const balances = await computeAccountBalances(userId, new Map([[updated.id, startingBalance]]));
  return withBalance(updated, balances);
}

export async function deleteAccount(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: ACCOUNT_TYPE },
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
