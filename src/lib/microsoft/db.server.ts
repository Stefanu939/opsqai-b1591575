// Local PostgreSQL access for the Microsoft 365 features (Self-Hosted only).
import { Pool, type QueryResultRow } from "pg";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Microsoft 365 integration is available on Self-Hosted only.");
  pool = new Pool({ connectionString, types: pgDateTypes, max: 3, idleTimeoutMillis: 30_000 });
  return pool;
}

export async function mq<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await getPool().query<T>(sql, params);
  return res.rows;
}
