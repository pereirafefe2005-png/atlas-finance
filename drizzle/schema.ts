import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const financePreferences = mysqlTable(
  "financePreferences",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    onboardingCompleted: int("onboardingCompleted").default(0).notNull(),
    completedAt: timestamp("completedAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("finance_preferences_owner_unique").on(table.ownerId)],
);

export const households = mysqlTable(
  "households",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    inviteCode: varchar("inviteCode", { length: 48 }).notNull().unique(),
    createdByUserId: int("createdByUserId").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("households_created_by_idx").on(table.createdByUserId)],
);

export const householdMembers = mysqlTable(
  "householdMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    householdId: int("householdId").notNull().references(() => households.id, { onDelete: "cascade" }),
    userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("household_member_unique").on(table.householdId, table.userId),
    index("household_members_user_idx").on(table.userId),
  ],
);

export const accounts = mysqlTable(
  "accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    institution: varchar("institution", { length: 120 }),
    type: mysqlEnum("type", ["checking", "savings", "credit_card", "investment", "cash", "other"]).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    openingBalanceCents: int("openingBalanceCents").default(0).notNull(),
    color: varchar("color", { length: 9 }).default("#8B5CF6").notNull(),
    icon: varchar("icon", { length: 32 }).default("wallet").notNull(),
    isArchived: int("isArchived").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("accounts_owner_idx").on(table.ownerId)],
);

export const categories = mysqlTable(
  "categories",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    kind: mysqlEnum("kind", ["income", "expense"]).notNull(),
    color: varchar("color", { length: 9 }).default("#8B5CF6").notNull(),
    icon: varchar("icon", { length: 32 }).default("circle").notNull(),
    isArchived: int("isArchived").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("category_owner_name_kind_unique").on(table.ownerId, table.name, table.kind),
    index("categories_owner_idx").on(table.ownerId),
  ],
);

export const tags = mysqlTable(
  "tags",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 48 }).notNull(),
    color: varchar("color", { length: 9 }).default("#64748B").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("tag_owner_name_unique").on(table.ownerId, table.name)],
);

export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: int("accountId").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    type: mysqlEnum("type", ["income", "expense"]).notNull(),
    amountCents: int("amountCents").notNull(),
    description: varchar("description", { length: 280 }).notNull(),
    notes: text("notes"),
    occurredAt: timestamp("occurredAt").notNull(),
    attachmentKey: varchar("attachmentKey", { length: 512 }),
    attachmentUrl: varchar("attachmentUrl", { length: 1024 }),
    isReviewed: int("isReviewed").default(0).notNull(),
    transferGroupId: varchar("transferGroupId", { length: 48 }),
    splitGroupId: varchar("splitGroupId", { length: 48 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("transactions_owner_date_idx").on(table.ownerId, table.occurredAt),
    index("transactions_account_idx").on(table.accountId),
    index("transactions_category_idx").on(table.categoryId),
    index("transactions_transfer_group_idx").on(table.transferGroupId),
  ],
);

export const transactionSplits = mysqlTable(
  "transactionSplits",
  {
    id: int("id").autoincrement().primaryKey(),
    transactionId: int("transactionId").notNull().references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    amountCents: int("amountCents").notNull(),
    note: varchar("note", { length: 280 }),
  },
  table => [index("transaction_splits_transaction_idx").on(table.transactionId)],
);

export const recurringRules = mysqlTable(
  "recurringRules",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: int("accountId").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: int("categoryId").references(() => categories.id, { onDelete: "set null" }),
    type: mysqlEnum("type", ["income", "expense"]).notNull(),
    description: varchar("description", { length: 280 }).notNull(),
    amountCents: int("amountCents").notNull(),
    cadence: mysqlEnum("cadence", ["weekly", "monthly", "yearly"]).default("monthly").notNull(),
    nextOccurrence: timestamp("nextOccurrence").notNull(),
    endAt: timestamp("endAt"),
    isActive: int("isActive").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("recurring_rules_owner_next_idx").on(table.ownerId, table.nextOccurrence)],
);

export const categorizationRules = mysqlTable(
  "categorizationRules",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    matcher: varchar("matcher", { length: 120 }).notNull(),
    categoryId: int("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
    priority: int("priority").default(100).notNull(),
    isActive: int("isActive").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("categorization_rule_owner_matcher_unique").on(table.ownerId, table.matcher)],
);

export const transactionTags = mysqlTable(
  "transactionTags",
  {
    transactionId: int("transactionId").notNull().references(() => transactions.id, { onDelete: "cascade" }),
    tagId: int("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  table => [uniqueIndex("transaction_tag_unique").on(table.transactionId, table.tagId)],
);

export const budgets = mysqlTable(
  "budgets",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    categoryId: int("categoryId").notNull().references(() => categories.id, { onDelete: "cascade" }),
    monthKey: varchar("monthKey", { length: 7 }).notNull(),
    limitCents: int("limitCents").notNull(),
    alertThreshold: int("alertThreshold").default(80).notNull(),
    rolloverCents: int("rolloverCents").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("budget_owner_category_month_unique").on(table.ownerId, table.categoryId, table.monthKey),
    index("budgets_owner_month_idx").on(table.ownerId, table.monthKey),
  ],
);

export const debts = mysqlTable(
  "debts",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    balanceCents: int("balanceCents").notNull(),
    annualRateBps: int("annualRateBps").default(0).notNull(),
    minimumPaymentCents: int("minimumPaymentCents").default(0).notNull(),
    dueDay: int("dueDay"),
    status: mysqlEnum("status", ["active", "paid", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("debts_owner_status_idx").on(table.ownerId, table.status)],
);

export const investmentHoldings = mysqlTable(
  "investmentHoldings",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    accountId: int("accountId").notNull().references(() => accounts.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 24 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    assetClass: mysqlEnum("assetClass", ["stock", "etf", "fund", "bond", "crypto", "cash", "other"]).default("other").notNull(),
    quantityMicros: int("quantityMicros").notNull(),
    averageCostCents: int("averageCostCents").notNull(),
    currentPriceCents: int("currentPriceCents").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("holding_owner_account_symbol_unique").on(table.ownerId, table.accountId, table.symbol)],
);

export const goals = mysqlTable(
  "goals",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    targetCents: int("targetCents").notNull(),
    targetDate: timestamp("targetDate"),
    color: varchar("color", { length: 9 }).default("#A78BFA").notNull(),
    status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("goals_owner_status_idx").on(table.ownerId, table.status)],
);

export const goalContributions = mysqlTable(
  "goalContributions",
  {
    id: int("id").autoincrement().primaryKey(),
    goalId: int("goalId").notNull().references(() => goals.id, { onDelete: "cascade" }),
    ownerId: int("ownerId").notNull().references(() => users.id, { onDelete: "cascade" }),
    amountCents: int("amountCents").notNull(),
    note: varchar("note", { length: 280 }),
    contributedAt: timestamp("contributedAt").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("goal_contributions_goal_idx").on(table.goalId)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
