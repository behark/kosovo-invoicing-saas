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

await pool.query("SELECT 1");
process.stdout.write("Seed is optional. Create data via the signup flow.\n");

await pool.end();
