import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { users, type User } from "../drizzle/schema";
import { getDb } from "./db";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function secret() {
  const value = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres.");
  return new TextEncoder().encode(value);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${digest.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, digest] = storedHash.split("$");
  if (scheme !== "scrypt" || !salt || !digest) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expected = Buffer.from(digest, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function registerLocalUser(input: { name: string; email: string; password: string }): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const email = normalizeEmail(input.email);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) throw new Error("Este e-mail já está cadastrado. Entre com sua senha ou recupere o acesso.");
  const openId = `local_${createHash("sha256").update(email).digest("hex").slice(0, 56)}`;
  const passwordHash = await hashPassword(input.password);
  await db.insert(users).values({ openId, name: input.name.trim(), email, passwordHash, loginMethod: "password", role: "user", lastSignedIn: new Date() });
  const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  if (!created[0]) throw new Error("Não foi possível criar o perfil.");
  return created[0];
}

export async function authenticateLocalUser(emailInput: string, password: string): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const email = normalizeEmail(emailInput);
  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("E-mail ou senha inválidos.");
  }
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return { ...user, lastSignedIn: new Date() };
}

export async function createSession(user: User) {
  return new SignJWT({ email: user.email ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function getSessionUser(token?: string): Promise<User | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.sub);
    if (!Number.isInteger(id)) return null;
    const db = await getDb();
    if (!db) return null;
    const found = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return found[0] ?? null;
  } catch {
    return null;
  }
}

export function sessionMaxAgeMs() {
  return SESSION_TTL_SECONDS * 1000;
}
