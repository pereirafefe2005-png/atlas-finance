import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./db", () => ({ getDb }));

import { authenticateLocalUser, hashPassword, registerLocalUser } from "./localAuth";

type StoredUser = {
  id: number;
  openId: string;
  name: string;
  email: string;
  passwordHash: string;
  loginMethod: string;
  role: "user";
  lastSignedIn: Date;
  createdAt: Date;
  updatedAt: Date;
};

function createDatabase(selections: Array<StoredUser[]>) {
  let inserted: StoredUser | undefined;
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => selections.shift() ?? (inserted ? [inserted] : []) }) }) }),
    insert: () => ({ values: async (value: Omit<StoredUser, "id" | "createdAt" | "updatedAt">) => {
      inserted = { ...value, id: 7, createdAt: new Date(), updatedAt: new Date() };
      return { insertId: 7 };
    } }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  };
  return { db, getInserted: () => inserted };
}

describe("fluxos de acesso local", () => {
  beforeEach(() => vi.clearAllMocks());

  it("cadastra um perfil normalizando o e-mail e mantendo somente o hash da senha", async () => {
    const fake = createDatabase([[]]);
    getDb.mockResolvedValue(fake.db);

    const user = await registerLocalUser({ name: "Ana", email: " ANA@EXEMPLO.COM ", password: "senha-segura-123" });
    const inserted = fake.getInserted();

    expect(user.email).toBe("ana@exemplo.com");
    expect(inserted?.email).toBe("ana@exemplo.com");
    expect(inserted?.passwordHash).toMatch(/^scrypt\$/);
    expect(inserted?.passwordHash).not.toContain("senha-segura-123");
  });

  it("recusa cadastro quando o e-mail já existe", async () => {
    const existing = { id: 2, openId: "local_existing", name: "Ana", email: "ana@exemplo.com", passwordHash: await hashPassword("senha"), loginMethod: "password", role: "user" as const, lastSignedIn: new Date(), createdAt: new Date(), updatedAt: new Date() };
    const fake = createDatabase([[existing]]);
    getDb.mockResolvedValue(fake.db);

    await expect(registerLocalUser({ name: "Ana", email: "ana@exemplo.com", password: "senha-nova-123" })).rejects.toThrow("já está cadastrado");
  });

  it("autentica a credencial correta e recusa senha inválida", async () => {
    const user = { id: 3, openId: "local_login", name: "Bruno", email: "bruno@exemplo.com", passwordHash: await hashPassword("senha-correta-123"), loginMethod: "password", role: "user" as const, lastSignedIn: new Date(), createdAt: new Date(), updatedAt: new Date() };
    const fake = createDatabase([[user], [user]]);
    getDb.mockResolvedValue(fake.db);

    await expect(authenticateLocalUser(" BRUNO@EXEMPLO.COM ", "senha-correta-123")).resolves.toMatchObject({ id: 3, email: "bruno@exemplo.com" });
    await expect(authenticateLocalUser("bruno@exemplo.com", "incorreta")).rejects.toThrow("inválidos");
  });
});
