import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { accounts, budgets, categories, financePreferences, goalContributions, goals, householdMembers, households, tags, transactions } from "../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { authenticateLocalUser, createSession, registerLocalUser, sessionMaxAgeMs } from "./localAuth";
import {
  ensureDefaultCategories,
  getDb,
  getHouseholdForUser,
  getHouseholdMembers,
  getVisibleOwnerIds,
  listAccounts,
  listBudgets,
  listCategories,
  listGoals,
  listTags,
  listTransactions,
  replaceTransactionTags,
  requireOwnedAccount,
  requireOwnedCategory,
  requireOwnedGoal,
  requireOwnedTransaction,
} from "./db";
import { buildAccountBalances, buildCategoryTotals, monthRange, previousMonthRange, summarizePeriod, type AccountSnapshot, type TransactionSnapshot } from "./finance";
import { storagePut } from "./storage";
import { premiumRouter } from "./premiumRouter";

const contextSchema = z.object({ context: z.enum(["individual", "together"]).default("individual") });
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe o mês no formato AAAA-MM.");
const dateSchema = z.coerce.date();
const moneySchema = z.number().int().positive().max(999_999_999, "O valor excede o limite permitido.");

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function asSnapshots(rows: Awaited<ReturnType<typeof listTransactions>>): TransactionSnapshot[] {
  return rows.map(row => ({
    id: row.transaction.id,
    ownerId: row.transaction.ownerId,
    accountId: row.transaction.accountId,
    categoryId: row.transaction.categoryId,
    type: row.transaction.type,
    amountCents: row.transaction.amountCents,
    occurredAt: row.transaction.occurredAt,
    categoryName: row.category?.name ?? null,
    categoryColor: row.category?.color ?? null,
    accountName: row.account.name,
    ownerName: row.owner.name,
  }));
}

function asAccounts(rows: Awaited<ReturnType<typeof listAccounts>>): AccountSnapshot[] {
  return rows.map(account => ({
    id: account.id,
    name: account.name,
    type: account.type,
    openingBalanceCents: account.openingBalanceCents,
    color: account.color,
  }));
}

export const appRouter = router({
  premium: premiumRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash: _passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(100), email: z.string().email().max(320), password: z.string().min(12).max(200) })).mutation(async ({ ctx, input }) => {
      const user = await registerLocalUser(input);
      const token = await createSession(user);
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: sessionMaxAgeMs() });
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
    login: publicProcedure.input(z.object({ email: z.string().email().max(320), password: z.string().min(1).max(200) })).mutation(async ({ ctx, input }) => {
      const user = await authenticateLocalUser(input.email, input.password);
      const token = await createSession(user);
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: sessionMaxAgeMs() });
      const { passwordHash: _passwordHash, ...safeUser } = user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  finance: router({
    bootstrap: protectedProcedure.mutation(async ({ ctx }) => {
      await ensureDefaultCategories(ctx.user.id);
      return { success: true };
    }),
    household: router({
      status: protectedProcedure.query(async ({ ctx }) => {
        const household = await getHouseholdForUser(ctx.user.id);
        if (!household) return { household: null, members: [], complete: false };
        const members = await getHouseholdMembers(household.id);
        return { household, members, complete: members.length === 2 };
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string().trim().min(2).max(120) }))
        .mutation(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
          if (await getHouseholdForUser(ctx.user.id)) badRequest("Seu perfil já participa de um espaço compartilhado.");
          const inviteCode = nanoid(18);
          const [result] = await db.insert(households).values({ name: input.name, inviteCode, createdByUserId: ctx.user.id });
          await db.insert(householdMembers).values({ householdId: Number(result.insertId), userId: ctx.user.id });
          return { inviteCode };
        }),
      join: protectedProcedure
        .input(z.object({ inviteCode: z.string().trim().min(8).max(48) }))
        .mutation(async ({ ctx, input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
          if (await getHouseholdForUser(ctx.user.id)) badRequest("Seu perfil já participa de um espaço compartilhado.");
          const found = await db.select().from(households).where(eq(households.inviteCode, input.inviteCode)).limit(1);
          if (!found[0]) badRequest("Convite não encontrado.");
          const members = await getHouseholdMembers(found[0].id);
          if (members.length >= 2) badRequest("Este espaço já atingiu o limite de dois participantes.");
          await db.insert(householdMembers).values({ householdId: found[0].id, userId: ctx.user.id });
          return { success: true };
      }),
    }),
    preferences: router({
      get: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const existing = await db.select().from(financePreferences).where(eq(financePreferences.ownerId, ctx.user.id)).limit(1);
        return { currency: existing[0]?.currency ?? "BRL", onboardingCompleted: Boolean(existing[0]?.onboardingCompleted) };
      }),
      completeOnboarding: protectedProcedure.input(z.object({ currency: z.literal("BRL") })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const completedAt = new Date();
        await db.insert(financePreferences).values({ ownerId: ctx.user.id, currency: input.currency, onboardingCompleted: 1, completedAt }).onDuplicateKeyUpdate({ set: { currency: input.currency, onboardingCompleted: 1, completedAt } });
        return { success: true };
      }),
    }),
    dashboard: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      const [accountRows, transactionRows] = await Promise.all([listAccounts(ownerIds), listTransactions(ownerIds, 1200)]);
      const accountSnapshots = asAccounts(accountRows);
      const transactionSnapshots = asSnapshots(transactionRows);
      const now = new Date();
      const current = monthRange(now);
      const previous = previousMonthRange(now);
      const summary = summarizePeriod(accountSnapshots, transactionSnapshots, current.start, current.end);
      const previousSummary = summarizePeriod(accountSnapshots, transactionSnapshots, previous.start, previous.end);
      const variationBase = Math.max(Math.abs(previousSummary.netWorthCents), 1);
      const variationPercent = Math.round(((summary.netWorthCents - previousSummary.netWorthCents) / variationBase) * 1000) / 10;
      const spending = new Map<string, { name: string; color: string; valueCents: number }>();
      transactionSnapshots
        .filter(transaction => transaction.type === "expense" && transaction.occurredAt >= current.start && transaction.occurredAt < current.end)
        .forEach(transaction => {
          const key = transaction.categoryName ?? "Sem categoria";
          const currentValue = spending.get(key) ?? { name: key, color: transaction.categoryColor ?? "#64748B", valueCents: 0 };
          currentValue.valueCents += transaction.amountCents;
          spending.set(key, currentValue);
        });
      const recent = transactionRows.slice(0, 7).map(row => ({ ...row.transaction, accountName: row.account.name, categoryName: row.category?.name ?? null, categoryColor: row.category?.color ?? null, ownerName: row.owner.name }));
      return {
        summary: { ...summary, variationPercent },
        expensesByCategory: Array.from(spending.values()).sort((a, b) => b.valueCents - a.valueCents).slice(0, 6),
        recent,
        accountBalances: summary.accountBalances,
      };
    }),
    accounts: router({
      list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
        const owners = await getVisibleOwnerIds(ctx.user.id, input.context);
        const [accountRows, transactionRows] = await Promise.all([listAccounts(owners), listTransactions(owners, 4000)]);
        const balances = buildAccountBalances(asAccounts(accountRows), asSnapshots(transactionRows));
        return balances.map(balance => ({ ...balance, ownerId: accountRows.find(account => account.id === balance.id)?.ownerId }));
      }),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), institution: z.string().trim().max(120).optional(), type: z.enum(["checking", "savings", "credit_card", "investment", "cash", "other"]), openingBalanceCents: z.number().int().min(-999_999_999).max(999_999_999), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#8B5CF6") })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        await db.insert(accounts).values({ ...input, institution: input.institution || null, ownerId: ctx.user.id, currency: "BRL", icon: "wallet" });
        return { success: true };
      }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(1).max(120), institution: z.string().trim().max(120).optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), openingBalanceCents: z.number().int().min(-999_999_999).max(999_999_999) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedAccount(input.id, ctx.user.id);
        await db.update(accounts).set({ name: input.name, institution: input.institution || null, color: input.color, openingBalanceCents: input.openingBalanceCents }).where(eq(accounts.id, input.id));
        return { success: true };
      }),
      archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedAccount(input.id, ctx.user.id);
        await db.update(accounts).set({ isArchived: 1 }).where(eq(accounts.id, input.id));
        return { success: true };
      }),
    }),
    categories: router({
      list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => listCategories(await getVisibleOwnerIds(ctx.user.id, input.context))),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(80), kind: z.enum(["income", "expense"]), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#8B5CF6") })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(categories).values({ ...input, ownerId: ctx.user.id, icon: "circle" });
        return { success: true };
      }),
    }),
    tags: router({
      list: protectedProcedure.query(({ ctx }) => listTags(ctx.user.id)),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(48), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#64748B") })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(tags).values({ ...input, ownerId: ctx.user.id });
        return { success: true };
      }),
    }),
    transactions: router({
      list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => listTransactions(await getVisibleOwnerIds(ctx.user.id, input.context))),
      create: protectedProcedure.input(z.object({ accountId: z.number().int().positive(), categoryId: z.number().int().positive().nullable(), type: z.enum(["income", "expense"]), amountCents: moneySchema, description: z.string().trim().min(1).max(280), notes: z.string().trim().max(4000).optional(), occurredAt: dateSchema, tagIds: z.array(z.number().int().positive()).max(20).default([]), attachmentKey: z.string().max(512).optional(), attachmentUrl: z.string().max(1024).optional() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedAccount(input.accountId, ctx.user.id);
        if (input.categoryId) await requireOwnedCategory(input.categoryId, ctx.user.id);
        const [result] = await db.insert(transactions).values({ ...input, ownerId: ctx.user.id, notes: input.notes || null, attachmentKey: input.attachmentKey || null, attachmentUrl: input.attachmentUrl || null });
        await replaceTransactionTags(Number(result.insertId), input.tagIds, ctx.user.id);
        return { success: true };
      }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), accountId: z.number().int().positive(), categoryId: z.number().int().positive().nullable(), type: z.enum(["income", "expense"]), amountCents: moneySchema, description: z.string().trim().min(1).max(280), notes: z.string().trim().max(4000).optional(), occurredAt: dateSchema, tagIds: z.array(z.number().int().positive()).max(20).default([]), attachmentKey: z.string().max(512).nullable().optional(), attachmentUrl: z.string().max(1024).nullable().optional() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedTransaction(input.id, ctx.user.id);
        await requireOwnedAccount(input.accountId, ctx.user.id);
        if (input.categoryId) await requireOwnedCategory(input.categoryId, ctx.user.id);
        await db.update(transactions).set({ accountId: input.accountId, categoryId: input.categoryId, type: input.type, amountCents: input.amountCents, description: input.description, notes: input.notes || null, occurredAt: input.occurredAt, attachmentKey: input.attachmentKey || null, attachmentUrl: input.attachmentUrl || null }).where(eq(transactions.id, input.id));
        await replaceTransactionTags(input.id, input.tagIds, ctx.user.id);
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedTransaction(input.id, ctx.user.id);
        await db.delete(transactions).where(eq(transactions.id, input.id));
        return { success: true };
      }),
    }),
    attachment: router({
      upload: protectedProcedure.input(z.object({ fileName: z.string().trim().min(1).max(120), mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]), base64: z.string().min(1).max(7_000_000) })).mutation(async ({ ctx, input }) => {
        const bytes = Buffer.from(input.base64, "base64");
        if (!bytes.length || bytes.length > 5_000_000) badRequest("O anexo deve ter no máximo 5 MB.");
        const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const stored = await storagePut(`finance/${ctx.user.id}/attachments/${safeName}`, bytes, input.mimeType);
        return stored;
      }),
    }),
    budgets: router({
      list: protectedProcedure.input(z.object({ monthKey: monthSchema })).query(({ ctx, input }) => listBudgets(ctx.user.id, input.monthKey)),
      upsert: protectedProcedure.input(z.object({ categoryId: z.number().int().positive(), monthKey: monthSchema, limitCents: moneySchema, alertThreshold: z.number().int().min(1).max(100).default(80) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedCategory(input.categoryId, ctx.user.id);
        const existing = await db.select().from(budgets).where(and(eq(budgets.ownerId, ctx.user.id), eq(budgets.categoryId, input.categoryId), eq(budgets.monthKey, input.monthKey))).limit(1);
        if (existing[0]) await db.update(budgets).set({ limitCents: input.limitCents, alertThreshold: input.alertThreshold }).where(eq(budgets.id, existing[0].id));
        else await db.insert(budgets).values({ ...input, ownerId: ctx.user.id });
        return { success: true };
      }),
      delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.delete(budgets).where(and(eq(budgets.id, input.id), eq(budgets.ownerId, ctx.user.id)));
        return { success: true };
      }),
    }),
    goals: router({
      list: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => listGoals(await getVisibleOwnerIds(ctx.user.id, input.context))),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(120), targetCents: moneySchema, targetDate: dateSchema.nullable().optional(), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#A78BFA") })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.insert(goals).values({ ...input, targetDate: input.targetDate ?? null, ownerId: ctx.user.id });
        return { success: true };
      }),
      contribute: protectedProcedure.input(z.object({ goalId: z.number().int().positive(), amountCents: moneySchema, note: z.string().trim().max(280).optional(), contributedAt: dateSchema.default(() => new Date()) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedGoal(input.goalId, ctx.user.id);
        await db.insert(goalContributions).values({ ...input, ownerId: ctx.user.id, note: input.note || null });
        return { success: true };
      }),
      archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await requireOwnedGoal(input.id, ctx.user.id);
        await db.update(goals).set({ status: "archived" }).where(eq(goals.id, input.id));
        return { success: true };
      }),
    }),
    reports: protectedProcedure.input(contextSchema).query(async ({ ctx, input }) => {
      const ownerIds = await getVisibleOwnerIds(ctx.user.id, input.context);
      const [accountRows, transactionRows] = await Promise.all([listAccounts(ownerIds), listTransactions(ownerIds, 5000)]);
      const accountSnapshots = asAccounts(accountRows);
      const transactionSnapshots = asSnapshots(transactionRows);
      const today = new Date();
      const monthly = Array.from({ length: 6 }, (_, offset) => {
        const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (5 - offset), 1));
        const range = monthRange(date);
        const result = summarizePeriod(accountSnapshots, transactionSnapshots, range.start, range.end);
        return { key: range.key, incomeCents: result.incomeCents, expenseCents: result.expenseCents, cashflowCents: result.cashflowCents, netWorthCents: result.netWorthCents };
      });
      const { start, end } = monthRange(today);
      return { monthly, categoryTotals: buildCategoryTotals(transactionSnapshots, start, end) };
    }),
  }),
});

export type AppRouter = typeof appRouter;
