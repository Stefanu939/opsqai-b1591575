// Local IAuthProvider for OPSQAI Self-Hosted.
//
// - Passwords: argon2id (via PgUserRepository)
// - Access tokens: EdDSA (Ed25519) JWT, short-lived (15 min)
// - Refresh tokens: opaque random 32-byte token, stored as SHA-256 hash,
//   rotated on every refresh, tracked per session for revocation.
// - Password reset: SHA-256-hashed token, single-use, 30 min TTL.
//
// No Supabase, no HS256, no anonymous access. Windows-native.

import { createHash, randomBytes, type KeyObject } from "node:crypto";
import type { Pool } from "pg";

import type {
  AuthenticatedContext,
  IAuthProvider,
  SignInInput,
  SignInResult,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

import { signJwtEd25519, verifyJwtEd25519 } from "./jwt-ed25519.server";
import { createPgUserRepository } from "./pg-user-repository.server";

const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60; // 30 days
const PASSWORD_RESET_TTL_SEC = 30 * 60;
const JWT_ISSUER = "opsqai-selfhost";
const JWT_AUDIENCE = "opsqai-app";

export interface LocalAuthDeps {
  pool: Pool;
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId?: string; // written as `kid` header for future key rotation
  now?: () => Date; // injectable for tests
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createLocalAuthProvider(deps: LocalAuthDeps): IAuthProvider {
  const { pool, privateKey, publicKey, keyId } = deps;
  const now = deps.now ?? (() => new Date());
  const users = createPgUserRepository({ pool });

  async function issueSession(userId: string, email: string): Promise<SignInResult> {
    const issuedAt = now();
    const accessExp = Math.floor(issuedAt.getTime() / 1000) + ACCESS_TOKEN_TTL_SEC;
    const refreshExp = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);

    const {
      rows: [sessionRow],
    } = await pool.query(
      `INSERT INTO public.sessions (user_id, expires_at)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, refreshExp],
    );
    const sessionId = sessionRow.id as string;

    const refreshToken = newOpaqueToken();
    await pool.query(
      `INSERT INTO public.refresh_tokens (session_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [sessionId, sha256Hex(refreshToken), refreshExp],
    );

    // Look up roles to embed into the token.
    const { rows: roleRows } = await pool.query(
      "SELECT role FROM public.user_roles WHERE user_id = $1",
      [userId],
    );
    const roles = roleRows.map((r: { role: string }) => r.role);

    const accessToken = signJwtEd25519(
      {
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        sub: userId,
        email,
        roles,
        sid: sessionId,
        exp: accessExp,
      },
      privateKey,
      { kid: keyId },
    );

    return {
      accessToken,
      refreshToken,
      expiresAt: accessExp,
      user: { userId, email, claims: { roles, sid: sessionId } },
    };
  }

  const provider: IAuthProvider = {
    capability: Capability.Authentication,
    name: "opsqai.selfhost.local-auth",

    async signIn(input: SignInInput): Promise<SignInResult> {
      const email = input.email.trim().toLowerCase();
      const user = await users.findByEmail(email);
      if (!user || user.disabled) {
        // Still run a dummy verify to keep timing constant.
        await users.verifyPassword("00000000-0000-0000-0000-000000000000", input.password);
        throw new Error("invalid_credentials");
      }
      const ok = await users.verifyPassword(user.id, input.password);
      if (!ok) throw new Error("invalid_credentials");

      await pool.query("UPDATE public.users SET last_login_at = now() WHERE id = $1", [
        user.id,
      ]);
      await pool.query(
        `INSERT INTO public.audit_log (actor_id, action, target)
         VALUES ($1, 'auth.signin', $2)`,
        [user.id, user.email],
      );
      return issueSession(user.id, user.email);
    },

    async signOut(refreshToken: string): Promise<void> {
      const tokenHash = sha256Hex(refreshToken);
      const { rows } = await pool.query(
        `SELECT session_id FROM public.refresh_tokens WHERE token_hash = $1`,
        [tokenHash],
      );
      const sid = rows[0]?.session_id as string | undefined;
      if (!sid) return;
      await pool.query(
        `UPDATE public.sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
        [sid],
      );
      await pool.query(`DELETE FROM public.refresh_tokens WHERE session_id = $1`, [sid]);
    },

    async refresh(refreshToken: string): Promise<SignInResult> {
      const tokenHash = sha256Hex(refreshToken);
      const { rows } = await pool.query(
        `SELECT rt.id AS rt_id, rt.session_id, rt.expires_at, rt.consumed_at,
                s.revoked_at, s.user_id, u.email, u.disabled
           FROM public.refresh_tokens rt
           JOIN public.sessions s ON s.id = rt.session_id
           JOIN public.users u ON u.id = s.user_id
          WHERE rt.token_hash = $1`,
        [tokenHash],
      );
      const row = rows[0];
      if (!row) throw new Error("invalid_refresh_token");
      if (row.consumed_at) throw new Error("refresh_token_reused");
      if (row.revoked_at) throw new Error("session_revoked");
      if (row.disabled) throw new Error("user_disabled");
      if (new Date(row.expires_at).getTime() < now().getTime()) {
        throw new Error("refresh_token_expired");
      }

      // Rotate: consume old, mint new. Old session is reused so revocation
      // of the session still cascades to all rotated refresh tokens.
      await pool.query(`UPDATE public.refresh_tokens SET consumed_at = now() WHERE id = $1`, [
        row.rt_id,
      ]);

      const accessExp = Math.floor(now().getTime() / 1000) + ACCESS_TOKEN_TTL_SEC;
      const newRefreshToken = newOpaqueToken();
      const newRefreshExp = new Date(now().getTime() + REFRESH_TOKEN_TTL_SEC * 1000);
      await pool.query(
        `INSERT INTO public.refresh_tokens (session_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [row.session_id, sha256Hex(newRefreshToken), newRefreshExp],
      );

      const { rows: roleRows } = await pool.query(
        "SELECT role FROM public.user_roles WHERE user_id = $1",
        [row.user_id],
      );
      const roles = roleRows.map((r: { role: string }) => r.role);

      const accessToken = signJwtEd25519(
        {
          iss: JWT_ISSUER,
          aud: JWT_AUDIENCE,
          sub: row.user_id,
          email: row.email,
          roles,
          sid: row.session_id,
          exp: accessExp,
        },
        privateKey,
        { kid: keyId },
      );

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: accessExp,
        user: {
          userId: row.user_id,
          email: row.email,
          claims: { roles, sid: row.session_id },
        },
      };
    },

    async requestPasswordReset(email: string): Promise<void> {
      const user = await users.findByEmail(email.trim().toLowerCase());
      if (!user || user.disabled) return; // Do not reveal existence.
      const token = newOpaqueToken();
      const expiresAt = new Date(now().getTime() + PASSWORD_RESET_TTL_SEC * 1000);
      await pool.query(
        `INSERT INTO public.password_resets (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, sha256Hex(token), expiresAt],
      );
      // The token is returned via a side channel (SMTP provider or Windows
      // Event Log for air-gapped installs). Callers of requestPasswordReset
      // are responsible for wiring the delivery. We deliberately do not
      // return the plaintext token here.
    },

    async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
      const tokenHash = sha256Hex(token);
      const { rows } = await pool.query(
        `SELECT id, user_id, expires_at, consumed_at
           FROM public.password_resets
          WHERE token_hash = $1`,
        [tokenHash],
      );
      const row = rows[0];
      if (!row) throw new Error("invalid_reset_token");
      if (row.consumed_at) throw new Error("reset_token_consumed");
      if (new Date(row.expires_at).getTime() < now().getTime()) {
        throw new Error("reset_token_expired");
      }
      await users.setPassword(row.user_id, newPassword);
      await pool.query(
        `UPDATE public.password_resets SET consumed_at = now() WHERE id = $1`,
        [row.id],
      );
      // Revoke all existing sessions for the user.
      await pool.query(
        `UPDATE public.sessions SET revoked_at = now()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [row.user_id],
      );
      await pool.query(
        `DELETE FROM public.refresh_tokens rt
          USING public.sessions s
          WHERE rt.session_id = s.id AND s.user_id = $1`,
        [row.user_id],
      );
      await pool.query(
        `INSERT INTO public.audit_log (actor_id, action) VALUES ($1, 'auth.password_reset')`,
        [row.user_id],
      );
    },

    async verifyAccessToken(token: string): Promise<AuthenticatedContext> {
      const { claims } = verifyJwtEd25519(token, publicKey, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      if (typeof claims.sub !== "string") throw new Error("Invalid token: no sub");

      const sid = typeof claims.sid === "string" ? claims.sid : null;
      if (sid) {
        const { rows } = await pool.query(
          `SELECT revoked_at FROM public.sessions WHERE id = $1`,
          [sid],
        );
        if (!rows[0]) throw new Error("session_not_found");
        if (rows[0].revoked_at) throw new Error("session_revoked");
      }

      return {
        userId: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
        claims: claims as Record<string, unknown>,
      };
    },

    async getDataContext(_token: string): Promise<unknown> {
      // Wave C bridge: Self-Hosted has no Supabase client. Any server
      // function whose body still calls `context.supabase.from(...)`
      // hasn't been migrated to a repository yet. Return a proxy that
      // throws with a clear diagnostic so partial migration surfaces
      // as a runtime error rather than silent corruption. Wave C.2
      // replaces every consumer with `getXRepository()` calls, after
      // which this proxy is unreachable.
      const notMigrated = () => {
        throw new Error(
          "Self-Hosted: this feature still uses the Supabase data " +
            "client and has not been migrated to a repository yet " +
            "(Wave C.2). Do not call it from Self-Hosted code paths.",
        );
      };
      return new Proxy(
        {},
        {
          get: notMigrated,
          apply: notMigrated,
        },
      );
    },
  };

  return provider;
}
