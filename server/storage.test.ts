import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { storageGet, storagePut } from "./storage";

let temporaryDirectory = "";

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = "";
  }
  delete process.env.UPLOAD_DIR;
});

describe("armazenamento local", () => {
  it("persiste anexos sob um diretório seguro e retorna URL local", async () => {
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "atlas-upload-"));
    process.env.UPLOAD_DIR = temporaryDirectory;

    const uploaded = await storagePut("receipts/../comprovante junho.pdf", "conteúdo protegido", "application/pdf");
    const saved = await readFile(path.join(temporaryDirectory, uploaded.key), "utf8");
    const resolved = await storageGet(uploaded.key);

    expect(uploaded.key).not.toContain("..");
    expect(uploaded.url).toMatch(/^\/uploads\//);
    expect(saved).toBe("conteúdo protegido");
    expect(resolved.url).toBe(uploaded.url);
  });
});
