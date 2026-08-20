export type AccountSnapshot = {
  id: number;
  name: string;
  type: string;
  openingBalanceCents: number;
  color: string;
};

export type TransactionSnapshot = {
  id: number;
  ownerId: number;
  accountId: number;
  categoryId: number | null;
  type: "income" | "expense";
  amountCents: number;
  occurredAt: Date;
  categoryName?: string | null;
  categoryColor?: string | null;
  accountName?: string | null;
  ownerName?: string | null;
};

export function signedAmount(transaction: Pick<TransactionSnapshot, "type" | "amountCents">) {
  return transaction.type === "income" ? transaction.amountCents : -transaction.amountCents;
}

export function buildAccountBalances(accounts: AccountSnapshot[], transactions: TransactionSnapshot[]) {
  const transactionTotals = new Map<number, number>();
  for (const transaction of transactions) {
    transactionTotals.set(
      transaction.accountId,
      (transactionTotals.get(transaction.accountId) ?? 0) + signedAmount(transaction),
    );
  }

  return accounts.map(account => ({
    ...account,
    balanceCents: account.openingBalanceCents + (transactionTotals.get(account.id) ?? 0),
  }));
}

export function summarizePeriod(
  accounts: AccountSnapshot[],
  transactions: TransactionSnapshot[],
  start: Date,
  end: Date,
) {
  const periodTransactions = transactions.filter(
    transaction => transaction.occurredAt >= start && transaction.occurredAt < end,
  );
  const incomeCents = periodTransactions
    .filter(transaction => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const expenseCents = periodTransactions
    .filter(transaction => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const accountBalances = buildAccountBalances(accounts, transactions);

  return {
    incomeCents,
    expenseCents,
    cashflowCents: incomeCents - expenseCents,
    netWorthCents: accountBalances.reduce((total, account) => total + account.balanceCents, 0),
    accountBalances,
  };
}

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
  return { start, end, key: monthKey(reference) };
}

export function previousMonthRange(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  return { start, end, key: monthKey(start) };
}

export function buildCategoryTotals(transactions: TransactionSnapshot[], start: Date, end: Date) {
  const totals = new Map<string, { name: string; color: string; valueCents: number }>();
  transactions
    .filter(transaction => transaction.type === "expense" && transaction.occurredAt >= start && transaction.occurredAt < end)
    .forEach(transaction => {
      const name = transaction.categoryName ?? "Sem categoria";
      const current = totals.get(name) ?? { name, color: transaction.categoryColor ?? "#64748B", valueCents: 0 };
      current.valueCents += transaction.amountCents;
      totals.set(name, current);
    });
  return Array.from(totals.values()).sort((a, b) => b.valueCents - a.valueCents);
}

export function comparePeriods(current: Pick<ReturnType<typeof summarizePeriod>, "incomeCents" | "expenseCents" | "cashflowCents" | "netWorthCents">, previous: Pick<ReturnType<typeof summarizePeriod>, "incomeCents" | "expenseCents" | "cashflowCents" | "netWorthCents">) {
  return {
    incomeChangeCents: current.incomeCents - previous.incomeCents,
    expenseChangeCents: current.expenseCents - previous.expenseCents,
    cashflowChangeCents: current.cashflowCents - previous.cashflowCents,
    netWorthChangeCents: current.netWorthCents - previous.netWorthCents,
  };
}
