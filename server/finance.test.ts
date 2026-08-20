import { describe, expect, it } from "vitest";
import { buildAccountBalances, buildCategoryTotals, comparePeriods, summarizePeriod } from "./finance";

const accounts = [
  { id: 1, name: "Conta principal", type: "checking", openingBalanceCents: 125000, color: "#8B5CF6" },
  { id: 2, name: "Cartão", type: "credit_card", openingBalanceCents: 0, color: "#FB7185" },
];

const transactions = [
  { id: 1, ownerId: 1, accountId: 1, categoryId: 1, type: "income" as const, amountCents: 450000, occurredAt: new Date("2026-08-03T12:00:00.000Z") },
  { id: 2, ownerId: 1, accountId: 1, categoryId: 2, type: "expense" as const, amountCents: 75000, occurredAt: new Date("2026-08-10T12:00:00.000Z") },
  { id: 3, ownerId: 1, accountId: 2, categoryId: 3, type: "expense" as const, amountCents: 42000, occurredAt: new Date("2026-08-14T12:00:00.000Z") },
  { id: 4, ownerId: 1, accountId: 1, categoryId: 2, type: "expense" as const, amountCents: 30000, occurredAt: new Date("2026-07-21T12:00:00.000Z") },
];

describe("cálculos financeiros", () => {
  it("aplica receitas e despesas aos saldos corretos de cada conta", () => {
    const balances = buildAccountBalances(accounts, transactions);

    expect(balances).toEqual([
      expect.objectContaining({ id: 1, balanceCents: 470000 }),
      expect.objectContaining({ id: 2, balanceCents: -42000 }),
    ]);
  });

  it("resume apenas as movimentações do período solicitado", () => {
    const result = summarizePeriod(
      accounts,
      transactions,
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-09-01T00:00:00.000Z"),
    );

    expect(result.incomeCents).toBe(450000);
    expect(result.expenseCents).toBe(117000);
    expect(result.cashflowCents).toBe(333000);
    expect(result.netWorthCents).toBe(428000);
  });

  it("agrupa despesas por categoria e calcula comparativos entre períodos", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = new Date("2026-09-01T00:00:00.000Z");
    const categorized = transactions.map(transaction => ({ ...transaction, categoryName: transaction.categoryId === 2 ? "Moradia" : "Outros", categoryColor: "#A78BFA" }));

    expect(buildCategoryTotals(categorized, start, end)).toEqual([
      { name: "Moradia", color: "#A78BFA", valueCents: 75000 },
      { name: "Outros", color: "#A78BFA", valueCents: 42000 },
    ]);
    expect(comparePeriods({ incomeCents: 450000, expenseCents: 117000, cashflowCents: 333000, netWorthCents: 428000 }, { incomeCents: 400000, expenseCents: 140000, cashflowCents: 260000, netWorthCents: 350000 })).toEqual({ incomeChangeCents: 50000, expenseChangeCents: -23000, cashflowChangeCents: 73000, netWorthChangeCents: 78000 });
  });
});
