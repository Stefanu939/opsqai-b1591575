// Self-Hosted bootstrap.
//
// The single entry point for wiring OPSQAI Self-Hosted onto a running
// Windows host. Called once by the OpsqaiPlatform service after
// migrations finish. Reads config from environment variables populated
// by the installer + Credential Manager entries.
//
// This module is Node/Windows-only. It is `.server.ts` so it can never
// be pulled into a browser bundle by accident.

import { promises as fs } from "node:fs";
import { createPrivateKey, createPublicKey } from "node:crypto";
import { Pool } from "pg";

import {
  Capability,
  Edition,
  PlatformMode,
  bootstrapPlatform,
  defaultCapabilitiesFor,
  setActiveEdition,
} from "@/lib/platform";
import { createPgUserRepository } from "./pg-user-repository.server";
import { createPgProfileRepository } from "./pg-profile-repository.server";
import { createPgRoleRepository } from "./pg-role-repository.server";
import {
  registerAdminProfileRepositoryFactory,
  registerAdminRoleRepositoryFactory,
  registerProfileRepositoryFactory,
  registerRoleRepositoryFactory,
} from "@/lib/providers/registry";

import { createLocalAuthProvider } from "./local-auth.server";
import { createNtfsStorageProvider } from "./ntfs-storage.server";
import { createSmtpNotificationProvider } from "./smtp-notification.server";
import { createLocalLicensingProvider } from "./local-licensing.server";
import { createWindowsBackupService } from "./windows-backup.server";
import { createLocalTelemetrySink } from "./local-telemetry.server";
import {
  createAesGcmCipher,
  createDpapiCipher,
} from "./dpapi-cipher.server";
import { NoopBackupService, NoopTelemetrySink } from "@/lib/providers/null-providers";
import type { INotificationProvider } from "@/lib/providers/interfaces";

interface EnvSnapshot {
  DATABASE_URL: string;
  OPSQAI_INSTALL_ID: string;
  OPSQAI_STORAGE_LOCAL_PATH: string;
  OPSQAI_CONFIG_DIR: string;
  OPSQAI_BACKUP_DIR: string;
  OPSQAI_LOG_DIR: string;
  OPSQAI_PG_DUMP_PATH?: string;
  OPSQAI_JWT_PRIVATE_KEY_PATH: string;
  OPSQAI_JWT_PUBLIC_KEY_PATH: string;
  OPSQAI_LICENSE_PUBLIC_KEY_PATH: string;
  OPSQAI_LICENSE_FILE_PATH: string;
  OPSQAI_MASTER_KEY_B64?: string; // fallback cipher key
  OPSQAI_CIPHER_MODE: "dpapi" | "aes-gcm";
  OPSQAI_HEARTBEAT_URL?: string;
  OPSQAI_TELEMETRY_LEVEL: "disabled" | "anonymous" | "full";
  OPSQAI_EDITION: string;
  OPSQAI_SMTP_HOST?: string;
  OPSQAI_SMTP_PORT?: string;
  OPSQAI_SMTP_SECURE?: string;
  OPSQAI_SMTP_USER?: string;
  OPSQAI_SMTP_PASSWORD?: string;
  OPSQAI_SMTP_FROM?: string;
  OPSQAI_SMTP_FROM_NAME?: string;
}

function readEnv(): EnvSnapshot {
  const req = (k: keyof EnvSnapshot): string => {
    const v = process.env[k as string];
    if (!v) throw new Error(`Missing environment variable: ${k as string}`);
    return v;
  };
  const opt = (k: keyof EnvSnapshot): string | undefined =>
    process.env[k as string] || undefined;
  return {
    DATABASE_URL: req("DATABASE_URL"),
    OPSQAI_INSTALL_ID: req("OPSQAI_INSTALL_ID"),
    OPSQAI_STORAGE_LOCAL_PATH: req("OPSQAI_STORAGE_LOCAL_PATH"),
    OPSQAI_CONFIG_DIR: req("OPSQAI_CONFIG_DIR"),
    OPSQAI_BACKUP_DIR: req("OPSQAI_BACKUP_DIR"),
    OPSQAI_LOG_DIR: req("OPSQAI_LOG_DIR"),
    OPSQAI_PG_DUMP_PATH: opt("OPSQAI_PG_DUMP_PATH"),
    OPSQAI_JWT_PRIVATE_KEY_PATH: req("OPSQAI_JWT_PRIVATE_KEY_PATH"),
    OPSQAI_JWT_PUBLIC_KEY_PATH: req("OPSQAI_JWT_PUBLIC_KEY_PATH"),
    OPSQAI_LICENSE_PUBLIC_KEY_PATH: req("OPSQAI_LICENSE_PUBLIC_KEY_PATH"),
    OPSQAI_LICENSE_FILE_PATH: req("OPSQAI_LICENSE_FILE_PATH"),
    OPSQAI_MASTER_KEY_B64: opt("OPSQAI_MASTER_KEY_B64"),
    OPSQAI_CIPHER_MODE: (opt("OPSQAI_CIPHER_MODE") as "dpapi" | "aes-gcm") ?? "dpapi",
    OPSQAI_HEARTBEAT_URL: opt("OPSQAI_HEARTBEAT_URL"),
    OPSQAI_TELEMETRY_LEVEL:
      (opt("OPSQAI_TELEMETRY_LEVEL") as "disabled" | "anonymous" | "full") ?? "anonymous",
    OPSQAI_EDITION: opt("OPSQAI_EDITION") ?? "community",
    OPSQAI_SMTP_HOST: opt("OPSQAI_SMTP_HOST"),
    OPSQAI_SMTP_PORT: opt("OPSQAI_SMTP_PORT"),
    OPSQAI_SMTP_SECURE: opt("OPSQAI_SMTP_SECURE"),
    OPSQAI_SMTP_USER: opt("OPSQAI_SMTP_USER"),
    OPSQAI_SMTP_PASSWORD: opt("OPSQAI_SMTP_PASSWORD"),
    OPSQAI_SMTP_FROM: opt("OPSQAI_SMTP_FROM"),
    OPSQAI_SMTP_FROM_NAME: opt("OPSQAI_SMTP_FROM_NAME"),
  };
}

class NullNotificationProvider implements INotificationProvider {
  readonly capability = Capability.SMTP;
  readonly name = "opsqai.selfhost.no-smtp";
  async sendEmail(): Promise<void> {
    throw new Error("SMTP is not configured on this OPSQAI installation");
  }
  async sendTestEmail(): Promise<void> {
    throw new Error("SMTP is not configured on this OPSQAI installation");
  }
}

/**
 * Wire every Self-Hosted provider and register active capabilities.
 * Idempotent — safe to call again after config reload.
 */
export async function bootstrapSelfHosted(): Promise<void> {
  const env = readEnv();

  setActiveEdition(env.OPSQAI_EDITION as Edition);

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

  const [jwtPrivPem, jwtPubPem, licensePubPem] = await Promise.all([
    fs.readFile(env.OPSQAI_JWT_PRIVATE_KEY_PATH, "utf8"),
    fs.readFile(env.OPSQAI_JWT_PUBLIC_KEY_PATH, "utf8"),
    fs.readFile(env.OPSQAI_LICENSE_PUBLIC_KEY_PATH, "utf8"),
  ]);
  const jwtPrivate = createPrivateKey(jwtPrivPem);
  const jwtPublic = createPublicKey(jwtPubPem);
  const licensePublic = createPublicKey(licensePubPem);

  const cipher =
    env.OPSQAI_CIPHER_MODE === "aes-gcm"
      ? createAesGcmCipher({
          key: Buffer.from(
            env.OPSQAI_MASTER_KEY_B64 ?? (() => {
              throw new Error(
                "OPSQAI_MASTER_KEY_B64 is required when OPSQAI_CIPHER_MODE=aes-gcm",
              );
            })(),
            "base64",
          ),
        })
      : createDpapiCipher({
          entropy: Buffer.from("opsqai.dpapi.v1", "utf8"),
        });

  const users = createPgUserRepository({ pool });
  const auth = createLocalAuthProvider({
    pool,
    privateKey: jwtPrivate,
    publicKey: jwtPublic,
    keyId: "opsqai-jwt-v1",
  });
  const storage = createNtfsStorageProvider({ baseDir: env.OPSQAI_STORAGE_LOCAL_PATH });
  const notifications: INotificationProvider = env.OPSQAI_SMTP_HOST
    ? createSmtpNotificationProvider({
        host: env.OPSQAI_SMTP_HOST,
        port: Number(env.OPSQAI_SMTP_PORT ?? "587"),
        secure: env.OPSQAI_SMTP_SECURE === "true",
        username: env.OPSQAI_SMTP_USER,
        password: env.OPSQAI_SMTP_PASSWORD,
        fromAddress: env.OPSQAI_SMTP_FROM ?? "no-reply@opsqai.local",
        fromName: env.OPSQAI_SMTP_FROM_NAME,
      })
    : new NullNotificationProvider();
  const licensing = createLocalLicensingProvider({
    pool,
    licensePublicKey: licensePublic,
    licenseFilePath: env.OPSQAI_LICENSE_FILE_PATH,
    heartbeatUrl: env.OPSQAI_HEARTBEAT_URL,
  });
  const backup = env.OPSQAI_PG_DUMP_PATH
    ? createWindowsBackupService({
        pool,
        pgDumpPath: env.OPSQAI_PG_DUMP_PATH,
        databaseUrl: env.DATABASE_URL,
        storageBaseDir: env.OPSQAI_STORAGE_LOCAL_PATH,
        backupDir: env.OPSQAI_BACKUP_DIR,
      })
    : new NoopBackupService();
  const telemetry = createLocalTelemetrySink({
    logDir: env.OPSQAI_LOG_DIR,
    level: env.OPSQAI_TELEMETRY_LEVEL,
    installationId: env.OPSQAI_INSTALL_ID,
  });

  // Fall back to noop if telemetry level is disabled — keeps
  // capability advertising honest.
  const telemetryFinal =
    env.OPSQAI_TELEMETRY_LEVEL === "disabled" ? new NoopTelemetrySink() : telemetry;

  const caps = defaultCapabilitiesFor(PlatformMode.SelfHosted).filter((c) => {
    if (c === Capability.SMTP && !env.OPSQAI_SMTP_HOST) return false;
    if (c === Capability.Telemetry && env.OPSQAI_TELEMETRY_LEVEL === "disabled") return false;
    return true;
  });

  bootstrapPlatform({
    auth,
    users,
    storage,
    notifications,
    licensing,
    cipher,
    backup,
    telemetry: telemetryFinal,
    capabilities: caps,
  });
}
