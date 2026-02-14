import { Pool, type PoolClient, type QueryResultRow } from "pg";

type GlobalWithPool = typeof globalThis & {
  __dbPool?: Pool;
};

const globalForDb = globalThis as GlobalWithPool;

function shouldUseSsl(connectionString: string): boolean {
  return connectionString.includes("sslmode=require");
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!globalForDb.__dbPool) {
    globalForDb.__dbPool = new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined
    });
  }

  return globalForDb.__dbPool;
}

export async function dbQuery<T extends QueryResultRow>(
  text: string,
  params: readonly unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, [...params]);
  return result.rows;
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
