import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  insertValues: vi.fn(),
  onDuplicateKeyUpdate: vi.fn(),
  requireOwnedAccount: vi.fn(),
  requireOwnedCategory: vi.fn(),
  requireOwnedGoal: vi.fn(),
}));

vi.mock("./db", () => ({
  ensureDefaultCategories: vi.fn(),
  getDb: mocks.getDb,
  getHouseholdForUser: vi.fn(),
  getHouseholdMembers: vi.fn(),
  getVisibleOwnerIds: vi.fn(),
  listAccounts: vi.fn(),
  listBudgets: vi.fn(),
  listCategories: vi.fn(),
  listGoals: vi.fn(),
  listTags: vi.fn(),
  listTransactions: vi.fn(),
  replaceTransactionTags: vi.fn(),
  requireOwnedAccount: mocks.requireOwnedAccount,
  requireOwnedCategory: mocks.requireOwnedCategory,
  requireOwnedGoal: mocks.requireOwnedGoal,
  requireOwnedTransaction: vi.fn(),
}));

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: { id: 42, openId: "owner-42", name: "Owner", email: "owner@example.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("operações financeiras críticas", () => {
  beforeEach(() => {
    mocks.onDuplicateKeyUpdate.mockReset().mockResolvedValue([{ insertId: 9 }]);
    mocks.insertValues.mockReset().mockReturnValue({ onDuplicateKeyUpdate: mocks.onDuplicateKeyUpdate });
    mocks.getDb.mockReset().mockResolvedValue({ insert: () => ({ values: mocks.insertValues }) });
    mocks.requireOwnedAccount.mockReset().mockResolvedValue({ id: 5, ownerId: 42 });
    mocks.requireOwnedCategory.mockReset().mockResolvedValue({ id: 3, ownerId: 42 });
    mocks.requireOwnedGoal.mockReset().mockResolvedValue({ id: 7, ownerId: 42 });
  });

  it("atribui uma nova meta ao usuário autenticado", async () => {
    const result = await appRouter.createCaller(createContext()).finance.goals.create({ name: "Reserva", targetCents: 100000, targetDate: null, color: "#A78BFA" });

    expect(result).toEqual({ success: true });
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 42, name: "Reserva", targetCents: 100000 }));
  });

  it("não cria transação quando a conta não pertence ao usuário autenticado", async () => {
    mocks.requireOwnedAccount.mockRejectedValueOnce(new Error("Conta não encontrada ou sem permissão de acesso."));

    await expect(appRouter.createCaller(createContext()).finance.transactions.create({ accountId: 5, categoryId: null, type: "expense", amountCents: 4900, description: "Compra", occurredAt: new Date("2026-08-20T12:00:00.000Z"), tagIds: [] })).rejects.toThrow("sem permissão");
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("persiste a conclusão do onboarding somente no perfil autenticado", async () => {
    const result = await appRouter.createCaller(createContext()).finance.preferences.completeOnboarding({ currency: "BRL" });

    expect(result).toEqual({ success: true });
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 42, currency: "BRL", onboardingCompleted: 1 }));
    expect(mocks.onDuplicateKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({ set: expect.objectContaining({ currency: "BRL", onboardingCompleted: 1 }) }));
  });
});
