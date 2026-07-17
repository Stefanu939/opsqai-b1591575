// PostgreSQL-backed IUserRepository for OPSQAI Self-Hosted.
//
// Connects to the local Windows PostgreSQL cluster as the `opsqai` role
// via connection pool. Passwords are hashed with argon2id (memoryCost
// 64 MiB, timeCost 3, parallelism 1) — a modern, side-channel-resistant
// KDF. NEVER bcrypt / scrypt / SHA-family / HS256-derived hashes.
//
// Server-only, Node-only.

import argon2 from "argon2";
import type { Pool } from "pg";

import type {
  IUserRepository,
  UserId,
  UserRecord,
} from "@/lib/providers/interfaces";

const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024, // KiB → 64 MiB
  timeCost: 3,
  parallelism: 1,
} as const;

function mapRow(row: {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: Date;
  disabled: boolean;
}): UserRecord {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name,
    createdAt: row.created_at.toISOString(),
    disabled: row.disabled,
  };
}

export interface PgUserRepositoryDeps {
  pool: Pool;
}

export function createPgUserRepository(deps: PgUserRepositoryDeps): IUserRepository & {
  verifyPassword(userId: UserId, password: string): Promise<boolean>;
  setPassword(userId: UserId, newPassword: string): Promise<void>;
} {
  const { pool } = deps;

  async function hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2ID_OPTIONS);
  }

  return {
    async findById(id) {
      const { rows } = await pool.query(
        "SELECT id, email, display_name, created_at, disabled FROM public.users WHERE id = $1",
        [id],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async findByEmail(email) {
      const { rows } = await pool.query(
        "SELECT id, email, display_name, created_at, disabled FROM public.users WHERE email = $1",
        [email],
      );
      return rows[0] ? mapRow(rows[0]) : null;
    },

    async createFirstAdmin(input) {
      // Refuse when any user already exists — the installer's first-run
      // handshake is the only place this may be called.
      const existing = await pool.query("SELECT 1 FROM public.users LIMIT 1");
      if (existing.rowCount && existing.rowCount > 0) {
        throw new Error("createFirstAdmin: users table already populated");
      }
      const passwordHash = await hashPassword(input.password);
      const { rows } = await pool.query(
        `INSERT INTO public.users (email, display_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, created_at, disabled`,
        [input.email, input.displayName, passwordHash],
      );
      await pool.query(
        "INSERT INTO public.user_roles (user_id, role) VALUES ($1, 'admin')",
        [rows[0].id],
      );
      return mapRow(rows[0]);
    },

    async disable(id) {
      await pool.query("UPDATE public.users SET disabled = TRUE WHERE id = $1", [id]);
    },

    async verifyPassword(userId, password) {
      const { rows } = await pool.query(
        "SELECT password_hash FROM public.users WHERE id = $1 AND disabled = FALSE",
        [userId],
      );
      const hash = rows[0]?.password_hash as string | undefined;
      if (!hash) {
        // Constant-time-ish: still run an argon2 verify against a dummy
        // hash so timing does not reveal missing accounts.
        await argon2
          .verify(
            "$argon2id$v=19$m=65536,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$" +
              "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            password,
          )
          .catch(() => false);
        return false;
      }
      return argon2.verify(hash, password);
    },

    async setPassword(userId, newPassword) {
      const passwordHash = await hashPassword(newPassword);
      await pool.query("UPDATE public.users SET password_hash = $1 WHERE id = $2", [
        passwordHash,
        userId,
      ]);
    },
  };
}
