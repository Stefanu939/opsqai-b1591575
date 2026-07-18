// Self-Hosted IAuthAdminProvider — administrator user CRUD backed by
// public.users. Passwords hashed with argon2id (same params as the sign-in
// path). Temporary passwords (`mustChangePassword=true`) flip the
// `users.must_change_password` flag; the sign-in flow reads it and
// forces a password change before issuing a session token that can
// reach protected routes.
//
// Email invitation is deliberately not supported yet — see the class
// comment on `supportsEmailInvite`. Administrators create Self-Hosted
// users with a temporary password today; the full token+email+accept
// flow is a future feature.

import argon2 from "argon2";
import type { Pool } from "pg";

import type {
  AdminCreateUserInput,
  AdminInviteUserInput,
  AdminUserRecord,
  IAuthAdminProvider,
  UserId,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 64 * 1024,
  timeCost: 3,
  parallelism: 1,
} as const;

export interface PgAuthAdminDeps {
  pool: Pool;
}

export function createPgAuthAdminProvider(deps: PgAuthAdminDeps): IAuthAdminProvider {
  const { pool } = deps;

  async function hashPassword(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON2ID_OPTIONS);
  }

  return {
    capability: Capability.Authentication,
    name: "opsqai.selfhost.pg-auth-admin",
    /**
     * Self-Hosted does not implement the email-invitation flow yet. The
     * token, email template, SMTP delivery, and public acceptance route
     * are a future feature; admins create users with a temporary
     * password (mustChangePassword=true) today.
     */
    supportsEmailInvite: false,

    async createUser(input: AdminCreateUserInput) {
      const passwordHash = await hashPassword(input.password);
      const { rows } = await pool.query<{ id: string }>(
        `INSERT INTO public.users (email, password_hash, must_change_password, disabled)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id`,
        [
          input.email.toLowerCase(),
          passwordHash,
          !!input.mustChangePassword,
        ],
      );
      const id = rows[0].id;
      // welcomeEmail is intentionally not sent here — SMTP + template
      // wiring lives outside auth. Admins hand-off the temp password
      // to the new user out-of-band.
      return { id };
    },

    async inviteByEmail(_input: AdminInviteUserInput): Promise<{ id: UserId }> {
      throw new Error(
        "Self-Hosted: email invitations are not yet supported. Create the " +
          "user with a temporary password (mustChangePassword=true) instead.",
      );
    },

    async deleteUser(userId: UserId) {
      // public.user_roles and public.sessions FK-cascade off public.users.
      const { rowCount } = await pool.query(
        "DELETE FROM public.users WHERE id = $1",
        [userId],
      );
      if (!rowCount) throw new Error("user not found");
    },

    async updatePassword(userId, newPassword, opts) {
      const passwordHash = await hashPassword(newPassword);
      await pool.query(
        `UPDATE public.users
            SET password_hash = $1,
                must_change_password = $2
          WHERE id = $3`,
        [passwordHash, !!opts?.mustChangePassword, userId],
      );
      // Revoke every active session so the new password takes effect.
      await pool.query(
        `UPDATE public.sessions SET revoked_at = now()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [userId],
      );
    },

    async setDisabled(userId, disabled) {
      await pool.query(
        "UPDATE public.users SET disabled = $1 WHERE id = $2",
        [disabled, userId],
      );
      if (disabled) {
        await pool.query(
          `UPDATE public.sessions SET revoked_at = now()
            WHERE user_id = $1 AND revoked_at IS NULL`,
          [userId],
        );
      }
    },

    async listUsers(): Promise<AdminUserRecord[]> {
      const { rows } = await pool.query<{
        id: string;
        email: string | null;
        last_sign_in_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, email, last_sign_in_at, created_at
           FROM public.users
          ORDER BY created_at DESC`,
      );
      return rows.map((r) => ({
        id: r.id,
        email: r.email ?? "",
        lastSignInAt: r.last_sign_in_at ? r.last_sign_in_at.toISOString() : null,
        createdAt: r.created_at.toISOString(),
      }));
    },

    async findUserAuthMeta(userId) {
      const { rows } = await pool.query<{
        id: string;
        email: string | null;
        last_sign_in_at: Date | null;
        created_at: Date;
      }>(
        `SELECT id, email, last_sign_in_at, created_at
           FROM public.users WHERE id = $1`,
        [userId],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        id: r.id,
        email: r.email ?? "",
        lastSignInAt: r.last_sign_in_at ? r.last_sign_in_at.toISOString() : null,
        createdAt: r.created_at.toISOString(),
      };
    },
  };
}
