import { readFile } from "node:fs/promises";
import path from "node:path";

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq === -1) return null;
  const key = trimmed.slice(0, eq).trim();
  const rawValue = trimmed.slice(eq + 1).trim();
  if (!key) return null;

  let value = rawValue;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

export async function loadEnv() {
  const cwd = process.cwd();
  const candidates = [".env.local", ".env"];

  for (const fileName of candidates) {
    const fullPath = path.join(cwd, fileName);

    try {
      const contents = await readFile(fullPath, "utf8");
      const lines = contents.split(/\r?\n/);

      for (const line of lines) {
        const parsed = parseLine(line);
        if (!parsed) continue;
        if (process.env[parsed.key] !== undefined) continue;
        process.env[parsed.key] = parsed.value;
      }
    } catch {
      continue;
    }
  }
}
