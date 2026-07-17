// Windows-native IBackupService for OPSQAI Self-Hosted.
//
// Runs `pg_dump.exe` against the embedded (or external) PostgreSQL,
// pipes the output into a compressed archive under
// %ProgramData%\OPSQAI\backups\, and records each snapshot in the
// `platform_snapshots` table for the installer's Backup / Restore UI.
//
// Snapshots ALSO include the storage/ directory (NTFS) — pg_dump is not
// enough on its own because file bytes live outside Postgres.

import { spawn } from "node:child_process";
import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import type { Pool } from "pg";

import type { BackupSnapshot, IBackupService } from "@/lib/providers/interfaces";

export interface WindowsBackupDeps {
  pool: Pool;
  /** Path to `pg_dump.exe`. Installer discovers this from the bundled PG. */
  pgDumpPath: string;
  /** Fully-qualified DSN passed to pg_dump (no need to escape). */
  databaseUrl: string;
  /** Storage base dir (mirrors NtfsStorageDeps.baseDir). */
  storageBaseDir: string;
  /** Where snapshots are written, default `%ProgramData%\\OPSQAI\\backups`. */
  backupDir: string;
  /** Path to a working tar executable — Windows 10+ ships `tar.exe`. */
  tarPath?: string;
}

async function runProcess(exe: string, args: string[], env?: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, { env: { ...process.env, ...env }, windowsHide: true });
    const errChunks: Buffer[] = [];
    child.stderr.on("data", (c: Buffer) => errChunks.push(c));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${exe} exit ${code}: ${Buffer.concat(errChunks).toString()}`));
      } else {
        resolve();
      }
    });
  });
}

export function createWindowsBackupService(deps: WindowsBackupDeps): IBackupService {
  const tar = deps.tarPath ?? "tar.exe";

  async function ensureTables(): Promise<void> {
    await deps.pool.query(`
      CREATE TABLE IF NOT EXISTS public.platform_snapshots (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        path         TEXT NOT NULL,
        size_bytes   BIGINT NOT NULL,
        detail       JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `);
  }

  return {
    async snapshot(): Promise<BackupSnapshot> {
      await ensureTables();
      await fs.mkdir(deps.backupDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const dumpPath = path.resolve(deps.backupDir, `db-${stamp}.dump`);
      const archivePath = path.resolve(deps.backupDir, `opsqai-${stamp}.tar.gz`);

      // 1. pg_dump → custom format (compact, restore-friendly).
      await new Promise<void>((resolve, reject) => {
        const child = spawn(
          deps.pgDumpPath,
          ["--format=custom", "--file", dumpPath, deps.databaseUrl],
          { windowsHide: true },
        );
        const err: Buffer[] = [];
        child.stderr.on("data", (c) => err.push(c));
        child.on("error", reject);
        child.on("close", (code) => {
          if (code !== 0) reject(new Error(`pg_dump exit ${code}: ${Buffer.concat(err)}`));
          else resolve();
        });
      });

      // 2. Bundle db dump + storage tree into one .tar.gz.
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

      // 3. Drop the intermediate dump — the archive contains it.
      await fs.rm(dumpPath, { force: true });

      const st = await fs.stat(archivePath);
      const { rows } = await deps.pool.query(
        `INSERT INTO public.platform_snapshots (path, size_bytes)
         VALUES ($1, $2)
         RETURNING id, created_at`,
        [archivePath, st.size],
      );
      return {
        id: rows[0].id as string,
        createdAt: (rows[0].created_at as Date).toISOString(),
        path: archivePath,
        sizeBytes: st.size,
      };
    },

    async restore(id: string): Promise<void> {
      await ensureTables();
      const { rows } = await deps.pool.query(
        "SELECT path FROM public.platform_snapshots WHERE id = $1",
        [id],
      );
      const archive = rows[0]?.path as string | undefined;
      if (!archive) throw new Error(`Snapshot ${id} not found`);
      // Restore is an installer-only, service-stopped operation. We
      // deliberately DO NOT run pg_restore from within the running app —
      // it must be invoked by the Windows service under maintenance mode.
      // This method surfaces the archive path; the updater does the work.
      throw new Error(
        `Restore of snapshot ${id} must be run by the OpsqaiUpdater service ` +
          `against ${archive} while the OpsqaiPlatform service is stopped.`,
      );
    },

    async list(): Promise<BackupSnapshot[]> {
      await ensureTables();
      const { rows } = await deps.pool.query(
        "SELECT id, created_at, path, size_bytes FROM public.platform_snapshots ORDER BY created_at DESC",
      );
      return rows.map((r) => ({
        id: r.id as string,
        createdAt: (r.created_at as Date).toISOString(),
        path: r.path as string,
        sizeBytes: Number(r.size_bytes),
      }));
    },

    async prune(retainDays: number): Promise<number> {
      await ensureTables();
      const { rows } = await deps.pool.query(
        `DELETE FROM public.platform_snapshots
          WHERE created_at < now() - ($1::TEXT || ' days')::INTERVAL
        RETURNING path`,
        [String(retainDays)],
      );
      let removed = 0;
      for (const row of rows) {
        try {
          await fs.rm(row.path as string, { force: true });
          removed++;
        } catch {
          // Missing file — count the row as pruned regardless.
          removed++;
        }
      }
      return removed;
    },
  };
}

// Silence "unused" warning for helper reserved for future granular ops.
void runProcess;
