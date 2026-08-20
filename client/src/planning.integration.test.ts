import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "pages/Planning.tsx"), "utf8");

describe("integração da central Planejamento", () => {
  it("consulta e altera cada módulo premium prioritário pela camada tRPC", () => {
    [
      "trpc.premium.recurring.list.useQuery",
      "trpc.premium.forecast.useQuery",
      "trpc.premium.review.list.useQuery",
      "trpc.premium.budgetPlan.summary.useQuery",
      "trpc.premium.debts.list.useQuery",
      "trpc.premium.holdings.list.useQuery",
      "trpc.premium.categorization.list.useQuery",
      "trpc.premium.importExport.exportTransactions.useQuery",
      "trpc.premium.importExport.importTransactions.useMutation",
      "trpc.premium.transfers.create.useMutation",
      "trpc.premium.splits.create.useMutation",
      "trpc.premium.categorization.create.useMutation",
      "trpc.premium.debts.create.useMutation",
      "trpc.premium.holdings.upsert.useMutation",
    ].forEach(call => expect(source).toContain(call));

    expect(source).toContain("value={formatCurrency(budgetPlan.data?.availableToAssignCents ?? 0)}");
    expect(source).toContain("accept=\".csv,text/csv\"");
    expect(source).toContain("Nós dois");
  });
});
