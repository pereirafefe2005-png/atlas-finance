import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accounts,
  budgets,
  categories,
  goalContributions,
  goals,
  householdMembers,
  households,
  InsertUser,
  tags,
  transactionTags,
  transactions,
  users,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: user.lastSignedIn ?? new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function ensureDefaultCategories(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select({ id: categories.id }).from(categories).where(eq(categories.ownerId, ownerId)).limit(1);
  if (existing.length) return;
  await db.insert(categories).values([
    { ownerId, name: "Salário", kind: "income", color: "#34D399", icon: "briefcase" },
    { ownerId, name: "Investimentos", kind: "income", color: "#60A5FA", icon: "trending-up" },
    { ownerId, name: "Moradia", kind: "expense", color: "#F59E0B", icon: "home" },
    { ownerId, name: "Alimentação", kind: "expense", color: "#FB7185", icon: "utensils" },
    { ownerId, name: "Transporte", kind: "expense", color: "#38BDF8", icon: "car" },
    { ownerId, name: "Lazer", kind: "expense", color: "#A78BFA", icon: "sparkles" },
    { ownerId, name: "Saúde", kind: "expense", color: "#F87171", icon: "heart-pulse" },
    { ownerId, name: "Outros", kind: "expense", color: "#94A3B8", icon: "circle" },
  ]);
}

export async function getHouseholdForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db
    .select({ household: households, member: householdMembers })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return rows[0]?.household;
}

export async function getHouseholdMembers(householdId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db
    .select({ id: users.id, name: users.name, email: users.email, joinedAt: householdMembers.joinedAt })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, householdId));
}

export function resolveVisibleOwnerIds({ userId, context, householdId, memberIds }: { userId: number; context: "individual" | "together"; householdId?: number; memberIds?: number[] }) {
  if (context === "individual") return [userId];
  if (!householdId) throw new Error("Crie ou aceite o vínculo para usar a visão Nós dois.");
  if (!memberIds || memberIds.length !== 2) throw new Error("A visão Nós dois é ativada quando o segundo perfil entra no vínculo.");
  return memberIds;
}

export async function getVisibleOwnerIds(userId: number, context: "individual" | "together") {
  if (context === "individual") return resolveVisibleOwnerIds({ userId, context });
  const household = await getHouseholdForUser(userId);
  if (!household) return resolveVisibleOwnerIds({ userId, context });
  const members = await getHouseholdMembers(household.id);
  return resolveVisibleOwnerIds({ userId, context, householdId: household.id, memberIds: members.map(member => member.id) });
}

export async function listAccounts(ownerIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(accounts).where(and(inArray(accounts.ownerId, ownerIds), eq(accounts.isArchived, 0)));
}

export async function listCategories(ownerIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(categories).where(and(inArray(categories.ownerId, ownerIds), eq(categories.isArchived, 0)));
}

export async function listTags(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(tags).where(eq(tags.ownerId, ownerId));
}

export async function listTransactions(ownerIds: number[], limit = 250) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db
    .select({
      transaction: transactions,
      account: { name: accounts.name, color: accounts.color },
      category: { name: categories.name, color: categories.color },
      owner: { name: users.name },
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(users, eq(transactions.ownerId, users.id))
    .where(inArray(transactions.ownerId, ownerIds))
    .orderBy(desc(transactions.occurredAt), desc(transactions.id))
    .limit(limit);
}

export async function requireOwnedAccount(accountId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.ownerId, ownerId))).limit(1);
  if (!result[0]) throw new Error("Conta não encontrada ou sem permissão de acesso.");
  return result[0];
}

export async function requireOwnedCategory(categoryId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.select().from(categories).where(and(eq(categories.id, categoryId), eq(categories.ownerId, ownerId))).limit(1);
  if (!result[0]) throw new Error("Categoria não encontrada ou sem permissão de acesso.");
  return result[0];
}

export async function requireOwnedTransaction(transactionId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.select().from(transactions).where(and(eq(transactions.id, transactionId), eq(transactions.ownerId, ownerId))).limit(1);
  if (!result[0]) throw new Error("Transação não encontrada ou sem permissão de acesso.");
  return result[0];
}

export async function requireOwnedGoal(goalId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.select().from(goals).where(and(eq(goals.id, goalId), eq(goals.ownerId, ownerId))).limit(1);
  if (!result[0]) throw new Error("Meta não encontrada ou sem permissão de acesso.");
  return result[0];
}

export async function listBudgets(ownerId: number, monthKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db
    .select({ budget: budgets, category: { name: categories.name, color: categories.color } })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(eq(budgets.ownerId, ownerId), eq(budgets.monthKey, monthKey)));
}

export async function listGoals(ownerIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const goalRows = await db.select().from(goals).where(inArray(goals.ownerId, ownerIds)).orderBy(desc(goals.createdAt));
  if (!goalRows.length) return [];
  const contributionRows = await db.select().from(goalContributions).where(inArray(goalContributions.goalId, goalRows.map(goal => goal.id))).orderBy(desc(goalContributions.contributedAt));
  return goalRows.map(goal => ({ ...goal, contributions: contributionRows.filter(contribution => contribution.goalId === goal.id) }));
}

export async function replaceTransactionTags(transactionId: number, tagIds: number[], ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const uniqueTagIds = Array.from(new Set(tagIds));
  if (uniqueTagIds.length) {
    const ownedTags = await db.select({ id: tags.id }).from(tags).where(and(eq(tags.ownerId, ownerId), inArray(tags.id, uniqueTagIds)));
    if (ownedTags.length !== uniqueTagIds.length) throw new Error("Uma ou mais etiquetas não pertencem ao seu perfil.");
  }
  await db.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));
  if (uniqueTagIds.length) await db.insert(transactionTags).values(uniqueTagIds.map(tagId => ({ transactionId, tagId })));
}
