/**
 * One-time migration: converts legacy `expense` Objects (flat, accountless
 * records with a free-text `category` string) into the new `transaction`
 * Object type used by the Money module.
 *
 * For each user with legacy expenses:
 *  - get-or-creates a `category` Object (kind: "expense") per distinct
 *    free-text category string
 *  - get-or-creates a fallback "Cash" `account` Object if the user has none
 *  - rewrites each `expense` Object in place to `type: "transaction"` with
 *    `transactionType: "expense"`, pointing at the resolved account/category
 *  - syncs the transaction's `in_account`/`in_category` relations
 *
 * Idempotent: only ever queries `type: "expense"` rows, so already-migrated
 * (now `type: "transaction"`) rows are never touched again.
 *
 * Run manually once, after reviewing the results on a copy of the data:
 *   npx tsx scripts/migrate-expenses-to-transactions.ts
 */
import { prisma } from "../src/db";

const EXPENSE_TYPE = "expense";
const ACCOUNT_TYPE = "account";
const CATEGORY_TYPE = "category";
const TRANSACTION_TYPE = "transaction";
const RELATION_TYPES = ["in_account", "in_category", "transfer_to"] as const;

interface LegacyExpenseProperties {
  amount: number;
  currency: string;
  category: string;
  date: string;
  description?: string;
}

async function migrateUser(userId: string) {
  const expenses = await prisma.object.findMany({
    where: { userId, type: EXPENSE_TYPE },
  });
  if (expenses.length === 0) return { migrated: 0 };

  const existingAccount = await prisma.object.findFirst({
    where: { userId, type: ACCOUNT_TYPE, status: "active" },
    orderBy: { createdAt: "asc" },
  });

  const fallbackCurrency =
    (expenses[0].properties as unknown as LegacyExpenseProperties | null)?.currency ?? "USD";

  const fallbackAccount =
    existingAccount ??
    (await prisma.object.create({
      data: {
        userId,
        type: ACCOUNT_TYPE,
        title: "Cash",
        status: "active",
        properties: { accountType: "cash", currency: fallbackCurrency, startingBalance: 0 },
      },
    }));

  const categoryIdByTitle = new Map<string, string>();
  const existingCategories = await prisma.object.findMany({
    where: { userId, type: CATEGORY_TYPE, status: "active" },
  });
  for (const category of existingCategories) {
    categoryIdByTitle.set(category.title.toLowerCase(), category.id);
  }

  async function resolveCategoryId(categoryTitle: string): Promise<string> {
    const key = categoryTitle.toLowerCase();
    const existing = categoryIdByTitle.get(key);
    if (existing) return existing;

    const created = await prisma.object.create({
      data: {
        userId,
        type: CATEGORY_TYPE,
        title: categoryTitle,
        status: "active",
        properties: { kind: "expense" },
      },
    });
    categoryIdByTitle.set(key, created.id);
    return created.id;
  }

  let migrated = 0;
  for (const expense of expenses) {
    const legacy = expense.properties as unknown as LegacyExpenseProperties | null;
    if (!legacy) continue;

    const categoryId = await resolveCategoryId(legacy.category || "Uncategorized");

    await prisma.object.update({
      where: { id: expense.id },
      data: {
        type: TRANSACTION_TYPE,
        properties: {
          transactionType: "expense",
          amount: legacy.amount,
          currency: legacy.currency,
          date: legacy.date,
          ...(legacy.description ? { description: legacy.description } : {}),
          accountId: fallbackAccount.id,
          categoryId,
        },
      },
    });

    await prisma.relation.deleteMany({
      where: { userId, sourceId: expense.id, type: { in: [...RELATION_TYPES] } },
    });
    await prisma.relation.createMany({
      data: [
        { userId, sourceId: expense.id, targetId: fallbackAccount.id, type: "in_account" },
        { userId, sourceId: expense.id, targetId: categoryId, type: "in_category" },
      ],
    });

    migrated += 1;
  }

  return { migrated };
}

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });

  let totalMigrated = 0;
  for (const user of users) {
    const { migrated } = await migrateUser(user.id);
    if (migrated > 0) {
      console.log(`Migrated ${migrated} expense(s) for ${user.email}`);
      totalMigrated += migrated;
    }
  }

  console.log(`Done. ${totalMigrated} expense(s) migrated across ${users.length} user(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
