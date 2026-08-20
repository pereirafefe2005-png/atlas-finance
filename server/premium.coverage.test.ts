import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { advanceRecurringDate, calculateDebtMonths } from "./premiumRouter";

const premiumSource = readFileSync(resolve(import.meta.dirname, "premiumRouter.ts"), "utf8");

describe("capacidades premium priorizadas", () => {
  it("calcula recorrência e prazo de dívida para o planejamento", () => {
    expect(advanceRecurringDate(new Date("2026-01-15T00:00:00Z"), "monthly").toISOString()).toContain("2026-02-15");
    expect(calculateDebtMonths(12_000, 0, 1_000)).toBe(12);
    expect(calculateDebtMonths(10_000, 20_000, 100)).toBeNull();
  });

  it("mantém rotas explícitas para os módulos de planejamento priorizados", () => {
    [
      "recurring: router",
      "review: router",
      "transfers: router",
      "splits: router",
      "budgetPlan: router",
      "forecast: protectedProcedure",
      "categorization: router",
      "importExport: router",
      "debts: router",
      "holdings: router",
    ].forEach(capability => expect(premiumSource).toContain(capability));

    expect(premiumSource).toContain("requireOwnedAccount");
    expect(premiumSource).toContain("requireOwnedCategory");
    expect(premiumSource).toContain("max(1000)");
    expect(premiumSource).toContain("availableToAssignCents");
  });
});
