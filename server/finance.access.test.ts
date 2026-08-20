import { describe, expect, it } from "vitest";
import { resolveVisibleOwnerIds } from "./db";

describe("isolamento financeiro", () => {
  it("expõe exclusivamente o proprietário no modo individual", () => {
    expect(resolveVisibleOwnerIds({ userId: 42, context: "individual" })).toEqual([42]);
  });

  it("recusa a visão Nós dois sem um vínculo confirmado", () => {
    expect(() => resolveVisibleOwnerIds({ userId: 42, context: "together" })).toThrow("Crie ou aceite o vínculo");
    expect(() => resolveVisibleOwnerIds({ userId: 42, context: "together", householdId: 8, memberIds: [42] })).toThrow("segundo perfil");
  });

  it("consolida somente os dois perfis pertencentes ao vínculo", () => {
    expect(resolveVisibleOwnerIds({ userId: 42, context: "together", householdId: 8, memberIds: [42, 77] })).toEqual([42, 77]);
  });
});
