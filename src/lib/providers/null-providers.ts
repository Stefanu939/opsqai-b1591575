// Null / no-op provider implementations.
//
// Used as safe defaults in tests and in Cloud paths that don't need a
// particular capability (e.g. Cloud has no BackupService in v1 — the
// hosted infrastructure handles snapshots).

import { Capability } from "@/lib/platform";
import type {
  IBackupService,
  ISecretsCipher,
  ITelemetrySink,
  TelemetryLevel,
} from "./interfaces";

export class NullCipher implements ISecretsCipher {
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    return plaintext;
  }
  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    return ciphertext;
  }
  async verifyCanary(): Promise<boolean> {
    return true;
  }
}

export class NoopBackupService implements IBackupService {
  async snapshot() {
    return {
      id: "noop",
      createdAt: new Date().toISOString(),
      path: "",
      sizeBytes: 0,
    };
  }
  async restore(): Promise<void> {}
  async list() {
    return [];
  }
  async prune(): Promise<number> {
    return 0;
  }
  async verifyIntegrity(): Promise<boolean> {
    return true;
  }
}

export class NoopTelemetrySink implements ITelemetrySink {
  readonly capability = Capability.Telemetry;
  readonly name = "noop-telemetry";
  readonly level: TelemetryLevel = "disabled";
  async event(): Promise<void> {}
}
