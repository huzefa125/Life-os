import { prisma } from "../../db";
import type { Prisma } from "../../generated/prisma/client";
import type { CreateRecurringBody, UpdateRecurringBody } from "../../validation/recurring.validation";
import { logActivity } from "../activity/activity.service";
import { createTransactionRecord } from "../transactions/transaction.service";

const RECURRING_TYPE = "recurring_transaction";
const ACCOUNT_TYPE = "account";
const CATEGORY_TYPE = "category";
const MAX_CATCH_UP_OCCURRENCES = 52;

type Frequency = "weekly" | "monthly" | "yearly";

interface RecurringProperties {
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  description?: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  frequency: Frequency;
  startDate: string;
  nextRunDate: string;
  endDate?: string;
  active?: boolean;
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** Advances a YYYY-MM-DD date string by one occurrence of `frequency`, parsed as UTC to stay a pure calendar-date operation. */
function advanceDate(date: string, frequency: Frequency): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

async function validateReferences(userId: string, properties: { accountId: string; toAccountId?: string; categoryId?: string }) {
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

export type RecurringReferenceResult =
  | { ok: true }
  | { ok: false; reason: "ACCOUNT_NOT_FOUND" | "TO_ACCOUNT_NOT_FOUND" | "CATEGORY_NOT_FOUND" };

export async function createRecurring(userId: string, input: CreateRecurringBody) {
  const validation = await validateReferences(userId, input.properties);
  if (!validation.ok) return validation;

  const properties: RecurringProperties = {
    ...input.properties,
    nextRunDate: input.properties.startDate,
    active: input.properties.active ?? true,
  };

  const recurring = await prisma.object.create({
    data: {
      userId,
      type: RECURRING_TYPE,
      title: input.title,
      status: "active",
      properties: properties as unknown as Prisma.InputJsonValue,
    },
  });

  await logActivity(userId, recurring.id, "created", { title: recurring.title });
  return { ok: true as const, recurring };
}

export async function getRecurringByUser(userId: string) {
  return prisma.object.findMany({
    where: { userId, type: RECURRING_TYPE, status: "active" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecurringById(id: string, userId: string) {
  return prisma.object.findFirst({ where: { id, userId, type: RECURRING_TYPE } });
}

export async function updateRecurring(id: string, userId: string, input: UpdateRecurringBody) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: RECURRING_TYPE } });
  if (!existing) return { ok: true as const, recurring: null };

  if (input.properties !== undefined) {
    const validation = await validateReferences(userId, input.properties as RecurringProperties);
    if (!validation.ok) return validation;
  }

  let properties = existing.properties as unknown as RecurringProperties;
  if (input.properties !== undefined) {
    const existingStartDate = properties.startDate;
    const nextStartDate = input.properties.startDate ?? existingStartDate;
    properties = {
      ...(input.properties as RecurringProperties),
      // nextRunDate is server-managed, not client-settable — only reset it
      // when startDate actually changed, otherwise keep progress as-is.
      nextRunDate: nextStartDate === existingStartDate ? properties.nextRunDate : nextStartDate,
    };
  }

  const updated = await prisma.object.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.properties !== undefined ? { properties: properties as unknown as Prisma.InputJsonValue } : {}),
    },
  });

  await logActivity(userId, id, "updated");
  return { ok: true as const, recurring: updated };
}

export async function deleteRecurring(id: string, userId: string) {
  const existing = await prisma.object.findFirst({ where: { id, userId, type: RECURRING_TYPE } });
  if (!existing) return null;

  const trashed = await prisma.object.update({
    where: { id },
    data: { status: "trash", deletedAt: new Date() },
  });

  await logActivity(userId, id, "trashed");
  return trashed;
}

/**
 * Catches up any recurring templates whose next occurrence is due. There's no
 * cron in this app, so this runs lazily whenever the user visits a Money tab
 * that needs an up-to-date transaction list (see transaction/recurring
 * controllers). Capped per template so a long-dormant one can't runaway-generate.
 */
export async function processDueRecurring(userId: string): Promise<void> {
  const templates = await prisma.object.findMany({
    where: { userId, type: RECURRING_TYPE, status: "active" },
  });

  const today = todayDateString();

  for (const template of templates) {
    const properties = template.properties as unknown as RecurringProperties | null;
    if (!properties || properties.active === false) continue;

    let nextRunDate = properties.nextRunDate;
    let occurrences = 0;

    while (
      nextRunDate <= today &&
      (!properties.endDate || nextRunDate <= properties.endDate) &&
      occurrences < MAX_CATCH_UP_OCCURRENCES
    ) {
      try {
        const result = await createTransactionRecord(userId, template.title, {
          transactionType: properties.transactionType,
          amount: properties.amount,
          currency: properties.currency,
          date: nextRunDate,
          description: properties.description,
          accountId: properties.accountId,
          toAccountId: properties.toAccountId,
          categoryId: properties.categoryId,
          recurringId: template.id,
        });
        if (!result.ok) {
          // Referenced account/category was deleted since the template was
          // created — skip this occurrence rather than blocking the whole
          // catch-up pass.
          console.error(`Skipping recurring transaction for ${template.id}: ${result.reason}`);
        }
      } catch (err) {
        console.error(`Failed to generate recurring transaction for ${template.id}:`, err);
      }

      nextRunDate = advanceDate(nextRunDate, properties.frequency);
      occurrences += 1;
    }

    if (occurrences > 0) {
      await prisma.object.update({
        where: { id: template.id },
        data: { properties: { ...properties, nextRunDate } },
      });
    }
  }
}
