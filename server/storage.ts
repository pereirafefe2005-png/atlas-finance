import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadRoot = () => process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

function safeKey(key: string) {
  return key
    .replace(/[^a-zA-Z0-9._/-]/g, "_")
    .split("/")
    .filter(segment => segment && segment !== "." && segment !== "..")
    .join("/");
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, _contentType?: string): Promise<{ key: string; url: string }> {
  const key = `${safeKey(relKey).replace(/\.[^/.]+$/, "")}_${crypto.randomUUID().slice(0, 8)}${path.extname(relKey)}`;
  const filePath = path.resolve(uploadRoot(), key);
  if (!filePath.startsWith(path.resolve(uploadRoot()))) throw new Error("Caminho de arquivo inválido.");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
  return { key, url: `/uploads/${encodeURIComponent(key).replace(/%2F/g, "/")}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = safeKey(relKey);
  return { key, url: `/uploads/${encodeURIComponent(key).replace(/%2F/g, "/")}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  return (await storageGet(relKey)).url;
}
