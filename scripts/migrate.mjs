import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";

import { loadEnv } from "./env.mjs";

function shouldUseSsl(connectionString) {
  return connectionString.includes("sslmode=require");
}

await loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined
});

await pool.query(
  "CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
);

const migrationsDir = path.join(process.cwd(), "migrations");

const allFiles = await readdir(migrationsDir);
const files = allFiles.filter((f) => f.endsWith(".sql")).sort();

const appliedResult = await pool.query("SELECT id FROM schema_migrations");
const applied = new Set(appliedResult.rows.map((r) => r.id));

for (const file of files) {
  if (applied.has(file)) continue;

  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
    await client.query("COMMIT");
    process.stdout.write(`Applied ${file}\n`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
