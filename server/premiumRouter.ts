import { nanoid } from "nanoid";
import { and, asc, desc, eq, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { accounts, budgets, categorizationRules, categories, debts, investmentHoldings, recurringRules, transactionSplits, transactions } from "../drizzle/schema";
import { getDb, getVisibleOwnerIds, listAccounts, listTransactions, requireOwnedAccount, requireOwnedCategory, requireOwnedTransaction } from "./db";
import { protectedProcedure, router } from "./_core/trpc";

const contextSchema = z.object({ context: z.enum(["individual", "together"]).default("individual") });
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const moneySchema = z.number().int().positive().max(999_999_999);
const dateSchema = z.coerce.date();
const recurrenceSchema = z.object({
  accountId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable(),
  type: z.enum(["income", "expense"]),
  description: z.string().trim().min(1).max(280),
  amountCents: moneySchema,
  cadence: z.enum(["weekly", "monthly", "yearly"]),
  nextOccurrence: dateSchema,
  endAt: dateSchema.nullable().optional(),
});

function monthDates(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(Date.UTC(year!, month! - 1, 1));
  const end = new Date(Date.UTC(year!, month!, 1));
  return { start, end };
}

export function advanceRecurringDate(current: Date, cadence: "weekly" | "monthly" | "yearly") {
  const date = new Date(current);
  if (cadence === "weekly") date.setUTCDate(date.getUTCDate() + 7);
  if (cadence === "monthly") date.setUTCMonth(date.getUTCMonth() + 1);
  if (cadence === "yearly") date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date;
}

export function calculateDebtMonths(balanceCents: number, annualRateBps: number, paymentCents: number) {
  if (balanceCents <= 0) return 0;
  if (paymentCents <= 0) return null;
  const monthlyRate = annualRateBps / 10_000 / 12;
  if (monthlyRate === 0) return Math.ceil(balanceCents / paymentCents);
  const interest = balanceCents * monthlyRate;
  if (paymentCents <= interest) return null;
  return Math.ceil(Math.log(paymentCents / (paymentCents - interest)) / Math.log(1 + monthlyRate));
}

export const premiumRouter = router({
  recurring: router({
    list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      return db.select().from(recurringRules).where(and(inArray(recurringRules.ownerId, ownerIds), eq(recurringRules.isActive, 1))).orderBy(asc(recurringRules.nextOccurrence));
    }),
    create: protectedProcedure.input(recurrenceSchema).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await requireOwnedAccount(input.accountId, ctx.user.id);
      if (input.categoryId) await requireOwnedCategory(input.categoryId, ctx.user.id);
      await db.insert(recurringRules).values({ ...input, ownerId: ctx.user.id, endAt: input.endAt ?? null });
      return { success: true };
    }),
    toggle: protectedProcedure.input(z.object({ id: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const rule = await db.select().from(recurringRules).where(and(eq(recurringRules.id, input.id), eq(recurringRules.ownerId, ctx.user.id))).limit(1);
      if (!rule[0]) throw new Error("Recorrência não encontrada.");
      await db.update(recurringRules).set({ isActive: input.isActive ? 1 : 0 }).where(eq(recurringRules.id, input.id));
      return { success: true };
    }),
    post: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const rule = await db.select().from(recurringRules).where(and(eq(recurringRules.id, input.id), eq(recurringRules.ownerId, ctx.user.id), eq(recurringRules.isActive, 1))).limit(1);
      if (!rule[0]) throw new Error("Recorrência ativa não encontrada.");
      const current = rule[0];
      await db.insert(transactions).values({ ownerId: ctx.user.id, accountId: current.accountId, categoryId: current.categoryId, type: current.type, amountCents: current.amountCents, description: current.description, occurredAt: current.nextOccurrence, isReviewed: 1 });
      const next = advanceRecurringDate(current.nextOccurrence, current.cadence);
      const shouldStop = current.endAt && next > current.endAt;
      await db.update(recurringRules).set({ nextOccurrence: next, isActive: shouldStop ? 0 : 1 }).where(eq(recurringRules.id, current.id));
      return { success: true };
    }),
  }),
  review: router({
    list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      return db.select().from(transactions).where(and(inArray(transactions.ownerId, ownerIds), eq(transactions.isReviewed, 0))).orderBy(desc(transactions.occurredAt)).limit(100);
    }),
    mark: protectedProcedure.input(z.object({ id: z.number().int().positive(), isReviewed: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await requireOwnedTransaction(input.id, ctx.user.id);
      await db.update(transactions).set({ isReviewed: input.isReviewed ? 1 : 0 }).where(eq(transactions.id, input.id));
      return { success: true };
    }),
  }),
  transfers: router({
    create: protectedProcedure.input(z.object({ fromAccountId: z.number().int().positive(), toAccountId: z.number().int().positive(), amountCents: moneySchema, description: z.string().trim().min(1).max(280), occurredAt: dateSchema })).mutation(async ({ ctx, input }) => {
      if (input.fromAccountId === input.toAccountId) throw new Error("Escolha duas contas diferentes.");
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await Promise.all([requireOwnedAccount(input.fromAccountId, ctx.user.id), requireOwnedAccount(input.toAccountId, ctx.user.id)]);
      const groupId = nanoid(18);
      await db.insert(transactions).values([
        { ownerId: ctx.user.id, accountId: input.fromAccountId, categoryId: null, type: "expense", amountCents: input.amountCents, description: input.description, occurredAt: input.occurredAt, isReviewed: 1, transferGroupId: groupId },
        { ownerId: ctx.user.id, accountId: input.toAccountId, categoryId: null, type: "income", amountCents: input.amountCents, description: input.description, occurredAt: input.occurredAt, isReviewed: 1, transferGroupId: groupId },
      ]);
      return { success: true };
    }),
  }),
  splits: router({
    create: protectedProcedure.input(z.object({ accountId: z.number().int().positive(), type: z.enum(["income", "expense"]), description: z.string().trim().min(1).max(280), occurredAt: dateSchema, splits: z.array(z.object({ categoryId: z.number().int().positive().nullable(), amountCents: moneySchema, note: z.string().trim().max(280).optional() })).min(2).max(20) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await requireOwnedAccount(input.accountId, ctx.user.id);
      await Promise.all(input.splits.filter(split => split.categoryId).map(split => requireOwnedCategory(split.categoryId!, ctx.user.id)));
      const amountCents = input.splits.reduce((sum, split) => sum + split.amountCents, 0);
      const splitGroupId = nanoid(18);
      const [result] = await db.insert(transactions).values({ ownerId: ctx.user.id, accountId: input.accountId, categoryId: null, type: input.type, amountCents, description: input.description, occurredAt: input.occurredAt, isReviewed: 1, splitGroupId });
      await db.insert(transactionSplits).values(input.splits.map(split => ({ transactionId: Number(result.insertId), categoryId: split.categoryId, amountCents: split.amountCents, note: split.note || null })));
      return { success: true };
    }),
  }),
  budgetPlan: router({
    summary: protectedProcedure.input(z.object({ monthKey: monthSchema })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const { start, end } = monthDates(input.monthKey);
      const [entries, allocated] = await Promise.all([
        db.select().from(transactions).where(and(eq(transactions.ownerId, ctx.user.id), lte(transactions.occurredAt, end))),
        db.select().from(budgets).where(and(eq(budgets.ownerId, ctx.user.id), eq(budgets.monthKey, input.monthKey))),
      ]);
      const incomeCents = entries.filter(entry => entry.type === "income" && entry.occurredAt >= start && entry.occurredAt < end).reduce((sum, entry) => sum + entry.amountCents, 0);
      const allocatedCents = allocated.reduce((sum, budget) => sum + budget.limitCents + budget.rolloverCents, 0);
      return { incomeCents, allocatedCents, availableToAssignCents: incomeCents - allocatedCents, budgetCount: allocated.length };
    }),
    rollover: protectedProcedure.input(z.object({ id: z.number().int().positive(), rolloverCents: z.number().int().min(-999_999_999).max(999_999_999) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await db.update(budgets).set({ rolloverCents: input.rolloverCents }).where(and(eq(budgets.id, input.id), eq(budgets.ownerId, ctx.user.id)));
      return { success: true };
    }),
  }),
  forecast: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new Error("Banco de dados indisponível.");
    const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + 30);
    const [rules, accountRows, entryRows] = await Promise.all([
      db.select().from(recurringRules).where(and(inArray(recurringRules.ownerId, ownerIds), eq(recurringRules.isActive, 1), lte(recurringRules.nextOccurrence, until))).orderBy(asc(recurringRules.nextOccurrence)),
      listAccounts(ownerIds),
      listTransactions(ownerIds, 5000),
    ]);
    const balanceByAccount = new Map(accountRows.map(account => [account.id, account.openingBalanceCents]));
    entryRows.forEach(row => balanceByAccount.set(row.transaction.accountId, (balanceByAccount.get(row.transaction.accountId) ?? 0) + (row.transaction.type === "income" ? row.transaction.amountCents : -row.transaction.amountCents)));
    const balanceCents = Array.from(balanceByAccount.values()).reduce((sum, value) => sum + value, 0);
    const scheduledIncomeCents = rules.filter(rule => rule.type === "income").reduce((sum, rule) => sum + rule.amountCents, 0);
    const scheduledExpenseCents = rules.filter(rule => rule.type === "expense").reduce((sum, rule) => sum + rule.amountCents, 0);
    return { balanceCents, scheduledIncomeCents, scheduledExpenseCents, projectedBalanceCents: balanceCents + scheduledIncomeCents - scheduledExpenseCents, upcoming: rules };
  }),
  categorization: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      return db.select().from(categorizationRules).where(eq(categorizationRules.ownerId, ctx.user.id)).orderBy(asc(categorizationRules.priority));
    }),
    create: protectedProcedure.input(z.object({ matcher: z.string().trim().min(2).max(120), categoryId: z.number().int().positive(), priority: z.number().int().min(1).max(999).default(100) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await requireOwnedCategory(input.categoryId, ctx.user.id);
      await db.insert(categorizationRules).values({ ...input, ownerId: ctx.user.id, matcher: input.matcher.toLowerCase() }).onDuplicateKeyUpdate({ set: { categoryId: input.categoryId, priority: input.priority, isActive: 1 } });
      return { success: true };
    }),
    suggest: protectedProcedure.input(z.object({ description: z.string().trim().min(1).max(280) })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const rules = await db.select().from(categorizationRules).where(and(eq(categorizationRules.ownerId, ctx.user.id), eq(categorizationRules.isActive, 1))).orderBy(asc(categorizationRules.priority));
      const match = rules.find(rule => input.description.toLowerCase().includes(rule.matcher));
      return { categoryId: match?.categoryId ?? null };
    }),
  }),
  importExport: router({
    exportTransactions: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      return listTransactions(ownerIds, 10_000);
    }),
    importTransactions: protectedProcedure.input(z.object({ accountId: z.number().int().positive(), rows: z.array(z.object({ type: z.enum(["income", "expense"]), amountCents: moneySchema, description: z.string().trim().min(1).max(280), occurredAt: dateSchema, categoryId: z.number().int().positive().nullable().optional() })).min(1).max(1000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await requireOwnedAccount(input.accountId, ctx.user.id);
      await Promise.all(input.rows.filter(row => row.categoryId).map(row => requireOwnedCategory(row.categoryId!, ctx.user.id)));
      await db.insert(transactions).values(input.rows.map(row => ({ ownerId: ctx.user.id, accountId: input.accountId, categoryId: row.categoryId ?? null, type: row.type, amountCents: row.amountCents, description: row.description, occurredAt: row.occurredAt, isReviewed: 0 })));
      return { imported: input.rows.length };
    }),
  }),
  debts: router({
    list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      const rows = await db.select().from(debts).where(and(inArray(debts.ownerId, ownerIds), eq(debts.status, "active"))).orderBy(desc(debts.annualRateBps));
      return rows.map(debt => ({ ...debt, monthsAtMinimum: calculateDebtMonths(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents) }));
    }),
    create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), balanceCents: moneySchema, annualRateBps: z.number().int().min(0).max(100_000), minimumPaymentCents: z.number().int().min(0).max(999_999_999), dueDay: z.number().int().min(1).max(31).nullable().optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await db.insert(debts).values({ ...input, ownerId: ctx.user.id, dueDay: input.dueDay ?? null });
      return { success: true };
    }),
  }),
  holdings: router({
    list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      const rows = await db.select().from(investmentHoldings).where(inArray(investmentHoldings.ownerId, ownerIds));
      return rows.map(holding => ({ ...holding, marketValueCents: Math.round((holding.quantityMicros / 1_000_000) * holding.currentPriceCents), costValueCents: Math.round((holding.quantityMicros / 1_000_000) * holding.averageCostCents) }));
    }),
    upsert: protectedProcedure.input(z.object({ accountId: z.number().int().positive(), symbol: z.string().trim().min(1).max(24), name: z.string().trim().min(1).max(120), assetClass: z.enum(["stock", "etf", "fund", "bond", "crypto", "cash", "other"]), quantityMicros: z.number().int().positive(), averageCostCents: z.number().int().min(0), currentPriceCents: z.number().int().min(0) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Banco de dados indisponível.");
      await requireOwnedAccount(input.accountId, ctx.user.id);
      const normalizedSymbol = input.symbol.toUpperCase();
      await db.insert(investmentHoldings).values({ ...input, ownerId: ctx.user.id, symbol: normalizedSymbol }).onDuplicateKeyUpdate({ set: { name: input.name, assetClass: input.assetClass, quantityMicros: input.quantityMicros, averageCostCents: input.averageCostCents, currentPriceCents: input.currentPriceCents } });
      return { success: true };
    }),
  }),
});
