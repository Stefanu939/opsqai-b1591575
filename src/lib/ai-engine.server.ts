// Server-only helpers for the local AI engine (Self-Hosted).
//
// Realigning pgvector to the probed embedding dimension is a DDL operation, so
// it runs through the local Postgres connection rather than a repository.
import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured for this installation.");
  }
  pool = new Pool({ connectionString, max: 2, idleTimeoutMillis: 10_000 });
  return pool;
}

/**
 * Pin the install's embedding dimension and rebuild the vector column, index
 * and retrieval functions to match. Implemented by the
 * `public.kb_apply_embedding_dim(int)` migration function.
 */
export async function applyEmbeddingDimension(dim: number): Promise<void> {
  if (!Number.isInteger(dim) || dim <= 0) {
    throw new Error(`Invalid embedding dimension: ${dim}`);
  }
  const client = await getPool().connect();
  try {
    await client.query("SELECT public.kb_apply_embedding_dim($1)", [dim]);
  } finally {
    client.release();
  }
  process.env.OPSQAI_EMBEDDING_DIM = String(dim);
}
