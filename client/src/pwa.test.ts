import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = resolve(import.meta.dirname, "../..");
const source = (file: string) => readFileSync(resolve(project, file), "utf8");

describe("PWA portátil", () => {
  it("declara manifesto instalável, service worker e registro no cliente", () => {
    const manifest = source("client/public/manifest.webmanifest");
    const worker = source("client/public/service-worker.js");
    const main = source("client/src/main.tsx");

    expect(manifest).toContain('"display": "standalone"');
    expect(manifest).toContain('"src": "/atlas-mark.svg"');
    expect(worker).toContain('self.addEventListener("install"');
    expect(worker).toContain('self.addEventListener("fetch"');
    expect(main).toContain('serviceWorker.register("/service-worker.js")');
  });
});
