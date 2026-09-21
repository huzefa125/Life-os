import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";
import type {
  CreateTransactionBody,
  UpdateTransactionBody,
  TransactionListQuery,
} from "../../validation/transaction.validation";
import { logActivity } from "../activity/activity.service";

const TRANSACTION_TYPE = "transaction";
const ACCOUNT_TYPE = "account";
const CATEGORY_TYPE = "category";
const RELATION_TYPES = ["in_account", "in_category", "transfer_to"] as const;

interface TransactionProperties {
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  date: string;
  description?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  recurringId?: string;
}

export type CreateTransactionResult =
  | { ok: true; transaction: Awaited<ReturnType<typeof prisma.object.create>> }
  | { ok: false; reason: "ACCOUNT_NOT_FOUND" | "TO_ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND" };

async function validateReferences(userId: string, properties: TransactionProperties) {
  const ids = [properties.accountId, properties.toAccountId].filter(Boolean) as string[];
  const accounts = await prisma.object.findMany({
    where: { id: { in: ids }, userId, type: ACCOUNT_TYPE },
    select: { id: true },
  });
  const accountIds = new Set(accounts.map((a) => a.id));

  if (!accountIds.has(properties.accountId)) return { ok: false as const, reason: "ACCOUNT_NOT_FOUND" as const };
  if (properties.toAccountId && !accountIds.has(properties.toAccountId)) {
    return { ok: false as const, reason: "TO_ACCOUNT_NOT_FOUND" as const };
  }

  if (properties.categoryId) {
    const category = await prisma.object.findFirst({
      where: { id: properties.categoryId, userId, type: CATEGORY_TYPE },
      select: { id: true },
    });
    if (!category) return { ok: false as const, reason: "CATEGORY_NOT_FOUND" as const };
  }

  return { ok: true as const };
}

async function syncRelations(userId: string, transactionId: string, properties: TransactionProperties) {
  await prisma.relation.deleteMany({
    where: { userId, sourceId: transactionId, type: { in: [...RELATION_TYPES] } },
  });

  const relations: { userId: string; sourceId: string; targetId: string; type: (typeof RELATION_TYPES)[number] }[] = [
    { userId, sourceId: transactionId, targetId: properties.accountId, type: "in_account" },
  ];
  if (properties.categoryId) {
    relations.push({ userId, sourceId: transactionId, targetId: properties.categoryId, type: "in_category" });
  }
  if (properties.toAccountId) {
    relations.push({ userId, sourceId: transactionId, targetId: properties.toAccountId, type: "transfer_to" });
  }

  await prisma.relation.createMany({ data: relations });
}

/**
 * Shared by the public createTransaction (after Zod validation) and by
 * recurring-transaction generation, which builds already-trusted properties
 * from a template and has no HTTP body to validate.
 */
export async function createTransactionRecord(
  userId: string,
  title: string,
  properties: TransactionProperties
): Promise<CreateTransactionResult> {
  const validation = await validateReferences(userId, properties);
  if (!validation.ok) return validation;

  const transaction = await prisma.object.create({
    data: {
      userId,
      type: TRANSACTION_TYPE,
      title,
      status: "active",
      properties: properties as unknown as Prisma.InputJsonValue,
    },
  });

  await syncRelations(userId, transaction.id, properties);
  await logActivity(userId, transaction.id, "created", { title: transaction.title });
  return { ok: true, transaction };
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionBody
): Promise<CreateTransactionResult> {
  return createTransactionRecord(userId, input.title, input.properties);
}

export async function getTransactionsByUser(userId: string, filters: TransactionListQuery) {
  const all = await prisma.object.findMany({
    where: { userId, type: TRANSACTION_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });

  return all.filter((transaction) => {
    const props = transaction.properties as unknown as TransactionProperties | null;
    if (!props) return false;
    if (filters.accountId && props.accountId !== filters.accountId && props.toAccountId !== filters.accountId) {
      return false;
    }
    if (filters.categoryId && props.categoryId !== filters.categoryId) return false;
    if (filters.transactionType && props.transactionType !== filters.transactionType) return false;
    if (filters.dateFrom && props.date < filters.dateFrom) return false;
    if (filters.dateTo && props.date > filters.dateTo) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const haystack = `${transaction.title} ${props.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export async function getTransactionById(id: string, userId: string) {
  return prisma.object.findFirst({
    where: { id, userId, type: TRANSACTION_TYPE },
  });
}

export async function updateTransaction(
  id: string,
  userId: string,
  input: UpdateTransactionBody
): Promise<
  | { ok: true; transaction: Awaited<ReturnType<typeof prisma.object.update>> | null }
  | { ok: false; reason: "ACCOUNT_NOT_FOUND" | "TO_ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND" }
> {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: TRANSACTION_TYPE },
  });
  if (!existing) return { ok: true, transaction: null };

  if (input.properties !== undefined) {
    const validation = await validateReferences(userId, input.properties as TransactionProperties);
    if (!validation.ok) return validation;
  }

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: input.properties } : {}),
    },
  });

  if (input.properties !== undefined) {
    await syncRelations(userId, id, input.properties as TransactionProperties);
  }

  await logActivity(userId, id, "updated");
  return { ok: true, transaction: updated };
}

export async function deleteTransaction(id: string, userId: string) {
  const existing = await prisma.object.findFirst({
    where: { id, userId, type: TRANSACTION_TYPE },
  });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: {
      status: "trash",
      deletedAt: new Date(),
    },
  });

  await prisma.relation.deleteMany({
    where: { userId, sourceId: id, type: { in: [...RELATION_TYPES] } },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}
