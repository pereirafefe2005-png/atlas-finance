import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "../..");
const source = (path: string) => readFileSync(resolve(project, path), "utf8");

describe("linha de base de acessibilidade", () => {
  it("declara idioma, descrição e foco visível para navegação por teclado", () => {
    const html = source("client/index.html");
    const css = source("client/src/index.css");

    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('name="description"');
    expect(css).toContain(":focus-visible");
    expect(css).toContain("outline: 2px solid");
  });

  it("mantém rótulos associados aos formulários e ações de ícone descritivas", () => {
    const accounts = source("client/src/pages/Accounts.tsx");
    const transactions = source("client/src/components/TransactionDialog.tsx");

    expect(accounts).toContain("<label");
    expect(accounts).toContain("aria-label={`Editar ${account.name}`}");
    expect(accounts).toContain("aria-label={`Arquivar ${account.name}`}");
    expect(transactions).toContain("<label");
  });
});
