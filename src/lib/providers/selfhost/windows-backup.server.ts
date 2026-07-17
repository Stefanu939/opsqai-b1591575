// Windows-native IBackupService for OPSQAI Self-Hosted.
//
// Phase 6 responsibilities:
//   - snapshot()          pg_dump + storage tree -> single .tar.gz,
//                         SHA-256 the archive, insert a row with
//                         optional { tag, kind }.
//   - list()              return every snapshot, newest first.
//   - prune(days)         drop rows + files older than N days,
//                         except those marked kind='pre-update'
//                         (those are pruned by the updater's own
//                         retention logic in `services/updater/apply.js`).
//   - restore(id)         surface the archive path — the actual
//                         restore is orchestrated by
//                         `services/backup/restore.js` under a
//                         stopped OpsqaiPlatform. Doing it in-process
//                         would DROP-and-CREATE the database we're
//                         currently connected to.
//   - verifyIntegrity(id) recompute SHA-256; update verified_at on match.

import { spawn } from "node:child_process";
import { promises as fs, createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import type { Pool } from "pg";

import type {
  BackupSnapshot,
  IBackupService,
  SnapshotOptions,
} from "@/lib/providers/interfaces";

export interface WindowsBackupDeps {
  pool: Pool;
  pgDumpPath: string;
  databaseUrl: string;
  storageBaseDir: string;
  backupDir: string;
  tarPath?: string;
}

async function sha256File(filePath: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (c) => hash.update(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

async function runProcess(
  exe: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, {
      env: { ...process.env, ...env },
      windowsHide: true,
    });
    const errChunks: Buffer[] = [];
    child.stderr.on("data", (c: Buffer) => errChunks.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`${exe} exit ${code}: ${Buffer.concat(errChunks).toString()}`),
        );
      } else {
        resolve();
      }
    });
  });
}

function rowToSnapshot(r: Record<string, unknown>): BackupSnapshot {
  return {
    id: r.id as string,
    createdAt: (r.created_at as Date).toISOString(),
    path: r.path as string,
    sizeBytes: Number(r.size_bytes),
    sha256: (r.sha256 as string | null) ?? undefined,
    tag: (r.tag as string | null) ?? undefined,
    kind: (r.kind as string | null) ?? undefined,
    verifiedAt: r.verified_at ? (r.verified_at as Date).toISOString() : undefined,
  };
}

export function createWindowsBackupService(deps: WindowsBackupDeps): IBackupService {
  const tar = deps.tarPath ?? "tar.exe";

  async function ensureTables(): Promise<void> {
    // Idempotent — mirrors migration 0005 for dev/test environments that
    // haven't run migrations yet.
    await deps.pool.query(`
      CREATE TABLE IF NOT EXISTS public.platform_snapshots (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        path         TEXT NOT NULL,
        size_bytes   BIGINT NOT NULL,
        detail       JSONB NOT NULL DEFAULT '{}'::JSONB,
        sha256       TEXT,
        verified_at  TIMESTAMPTZ,
        tag          TEXT,
        kind         TEXT NOT NULL DEFAULT 'manual'
      )
    `);
  }

  return {
    async snapshot(options?: SnapshotOptions): Promise<BackupSnapshot> {
      await ensureTables();
      await fs.mkdir(deps.backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const dumpPath = path.resolve(deps.backupDir, `db-${stamp}.dump`);
      const archivePath = path.resolve(deps.backupDir, `opsqai-${stamp}.tar.gz`);

      // 1. pg_dump → custom format.
      await runProcess(deps.pgDumpPath, [
        "--format=custom",
        "--file",
        dumpPath,
        deps.databaseUrl,
      ]);

      // 2. Bundle dump + storage tree.
      await runProcess(tar, [
        "-czf",
        archivePath,
        "-C",
        deps.backupDir,
        path.basename(dumpPath),
        "-C",
        path.dirname(deps.storageBaseDir),
        path.basename(deps.storageBaseDir),
      ]);
      await fs.rm(dumpPath, { force: true });

      const st = await fs.stat(archivePath);
      const digest = await sha256File(archivePath);

      const { rows } = await deps.pool.query(
        `INSERT INTO public.platform_snapshots
           (path, size_bytes, sha256, tag, kind, verified_at)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING id, created_at, path, size_bytes, sha256, tag, kind, verified_at`,
        [
          archivePath,
          st.size,
          digest,
          options?.tag ?? null,
          options?.kind ?? "manual",
        ],
      );
      return rowToSnapshot(rows[0]);
    },

    async restore(id: string): Promise<void> {
      await ensureTables();
      const { rows } = await deps.pool.query(
        "SELECT path FROM public.platform_snapshots WHERE id = $1",
        [id],
      );
      const archive = rows[0]?.path as string | undefined;
      if (!archive) throw new Error(`Snapshot ${id} not found`);
      throw new Error(
        `In-process restore is unsafe while the platform is running. ` +
          `Run:  opsqai backup restore ${id}   (services/backup/restore.js). ` +
          `Archive: ${archive}`,
      );
    },

    async list(): Promise<BackupSnapshot[]> {
      await ensureTables();
      const { rows } = await deps.pool.query(
        `SELECT id, created_at, path, size_bytes, sha256, tag, kind, verified_at
           FROM public.platform_snapshots
          ORDER BY created_at DESC`,
      );
      return rows.map(rowToSnapshot);
    },

    async prune(retainDays: number): Promise<number> {
      await ensureTables();
      // Never auto-prune pre-update snapshots — those are owned by the
      // updater's own 7-day retention window in apply.js.
      const { rows } = await deps.pool.query(
        `DELETE FROM public.platform_snapshots
           WHERE created_at < now() - ($1::TEXT || ' days')::INTERVAL
             AND kind <> 'pre-update'
         RETURNING path`,
        [String(retainDays)],
      );
      let removed = 0;
      for (const row of rows) {
        try {
          await fs.rm(row.path as string, { force: true });
        } catch {
          /* file may already be gone */
        }
        removed++;
      }
      return removed;
    },

    async verifyIntegrity(id: string): Promise<boolean> {
      await ensureTables();
      const { rows } = await deps.pool.query(
        "SELECT path, sha256 FROM public.platform_snapshots WHERE id = $1",
        [id],
      );
      if (!rows[0]) throw new Error(`Snapshot ${id} not found`);
      const filePath = rows[0].path as string;
      const stored = rows[0].sha256 as string | null;
      if (!stored) return false;
      const actual = await sha256File(filePath);
      const ok = actual.toLowerCase() === stored.toLowerCase();
      if (ok) {
        await deps.pool.query(
          "UPDATE public.platform_snapshots SET verified_at = now() WHERE id = $1",
          [id],
        );
      }
      return ok;
    },
  };
}
