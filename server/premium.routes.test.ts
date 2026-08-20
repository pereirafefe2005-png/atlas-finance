import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getVisibleOwnerIds: vi.fn(),
  listAccounts: vi.fn(),
  listTransactions: vi.fn(),
  requireOwnedAccount: vi.fn(),
  requireOwnedCategory: vi.fn(),
  requireOwnedTransaction: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { premiumRouter } from "./premiumRouter";

const caller = () => premiumRouter.createCaller({ user: { id: 1, email: "teste@atlas.local" }, req: {}, res: {} } as never);

function writeDatabase(writes: unknown[]) {
  return {
    insert: () => ({
      values: (value: unknown) => {
        writes.push(value);
        return { onDuplicateKeyUpdate: async () => undefined };
      },
    }),
  };
}

describe("procedimentos premium", () => {
  beforeEach(() => vi.clearAllMocks());

  it("importa e exporta CSV respeitando a conta do proprietário e os limites de entrada", async () => {
    const writes: unknown[] = [];
    dbMocks.getDb.mockResolvedValue(writeDatabase(writes));
    dbMocks.requireOwnedAccount.mockResolvedValue(undefined);
    dbMocks.requireOwnedCategory.mockResolvedValue(undefined);
    dbMocks.getVisibleOwnerIds.mockResolvedValue([1]);
    dbMocks.listTransactions.mockResolvedValue([{ transaction: { id: 99, description: "Salário" } }]);

    await expect(caller().importExport.importTransactions({ accountId: 10, rows: [{ type: "income", amountCents: 250000, description: "Salário", occurredAt: new Date("2026-01-05") }] })).resolves.toEqual({ imported: 1 });
    await expect(caller().importExport.exportTransactions({ context: "individual" })).resolves.toEqual([{ transaction: { id: 99, description: "Salário" } }]);
    await expect(caller().importExport.importTransactions({ accountId: 10, rows: [{ type: "expense", amountCents: 0, description: "Inválido", occurredAt: new Date() }] })).rejects.toBeTruthy();

    expect(dbMocks.requireOwnedAccount).toHaveBeenCalledWith(10, 1);
    expect(dbMocks.listTransactions).toHaveBeenCalledWith([1], 10_000);
    expect(writes).toHaveLength(1);
  });

  it("aplica regra de categoria e grava dívida e posição de investimento manuais", async () => {
    const writes: unknown[] = [];
    const rulesDb = {
      ...writeDatabase(writes),
      select: () => ({ from: () => ({ where: () => ({ orderBy: async () => [{ matcher: "mercado", categoryId: 8, isActive: 1 }] }) }) }),
    };
    dbMocks.getDb.mockResolvedValue(rulesDb);
    dbMocks.requireOwnedAccount.mockResolvedValue(undefined);

    await expect(caller().categorization.suggest({ description: "Mercado da esquina" })).resolves.toEqual({ categoryId: 8 });
    await expect(caller().debts.create({ name: "Cartão", balanceCents: 500000, annualRateBps: 18000, minimumPaymentCents: 40000, dueDay: 10 })).resolves.toEqual({ success: true });
    await expect(caller().holdings.upsert({ accountId: 4, symbol: "etf11", name: "ETF local", assetClass: "etf", quantityMicros: 2_000_000, averageCostCents: 10000, currentPriceCents: 10500 })).resolves.toEqual({ success: true });

    expect(writes).toHaveLength(2);
    expect(dbMocks.requireOwnedAccount).toHaveBeenCalledWith(4, 1);
  });

  it("recusa regras, dívidas e posições inválidas antes de persistir", async () => {
    const writes: unknown[] = [];
    dbMocks.getDb.mockResolvedValue(writeDatabase(writes));

    await expect(caller().categorization.create({ matcher: "x", categoryId: 8, priority: 10 })).rejects.toBeTruthy();
    await expect(caller().debts.create({ name: "", balanceCents: 0, annualRateBps: 0, minimumPaymentCents: 0, dueDay: 0 })).rejects.toBeTruthy();
    await expect(caller().holdings.upsert({ accountId: 0, symbol: "", name: "", assetClass: "etf", quantityMicros: 0, averageCostCents: -1, currentPriceCents: -1 })).rejects.toBeTruthy();

    expect(writes).toHaveLength(0);
    expect(dbMocks.requireOwnedAccount).not.toHaveBeenCalled();
    expect(dbMocks.requireOwnedCategory).not.toHaveBeenCalled();
  });
});
