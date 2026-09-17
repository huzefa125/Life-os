import { prisma } from "../../db";

const TRANSACTION_TYPE = "transaction";

interface TransactionProperties {
  transactionType: "income" | "expense" | "transfer";
  amount: number;
  accountId: string;
  toAccountId?: string;
}

/**
 * Balances aren't stored — they're derived from starting balance + every
 * transaction that touches the account, computed fresh on each read.
 */
export async function computeAccountBalances(
  userId: string,
  startingBalances: Map<string, number>
): Promise<Map<string, number>> {
  const transactions = await prisma.object.findMany({
    where: { userId, type: TRANSACTION_TYPE, status: "active" },
    select: { properties: true },
  });

  const balances = new Map(startingBalances);

  for (const { properties } of transactions) {
    const props = properties as unknown as TransactionProperties | null;
    if (!props) continue;
    const { transactionType, amount, accountId, toAccountId } = props;

    if (transactionType === "income") {
      balances.set(accountId, (balances.get(accountId) ?? 0) + amount);
    } else if (transactionType === "expense") {
      balances.set(accountId, (balances.get(accountId) ?? 0) - amount);
    } else if (transactionType === "transfer") {
      balances.set(accountId, (balances.get(accountId) ?? 0) - amount);
      if (toAccountId) {
        balances.set(toAccountId, (balances.get(toAccountId) ?? 0) + amount);
      }
    }
  }

  return balances;
}
