import { describe, expect, it } from "vitest";
import { jwtVerify } from "jose";
import { createSession, hashPassword, verifyPassword } from "./localAuth";

describe("autenticação local", () => {
  it("cria hashes com sal aleatório e valida apenas a senha correta", async () => {
    const first = await hashPassword("senha-local-segura-123");
    const second = await hashPassword("senha-local-segura-123");
    expect(first).not.toBe(second);
    await expect(verifyPassword("senha-local-segura-123", first)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", first)).resolves.toBe(false);
  });

  it("assina uma sessão válida com a chave de ambiente configurada", async () => {
    const configuredSecret = process.env.SESSION_SECRET;
    expect(configuredSecret).toBeTruthy();
    expect(configuredSecret!.length).toBeGreaterThanOrEqual(32);

    const token = await createSession({ id: 42, email: "sessao@atlas.local" } as never);
    const verification = await jwtVerify(token, new TextEncoder().encode(configuredSecret));

    expect(verification.payload.sub).toBe("42");
  });
});
