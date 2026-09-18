// Self-Hosted update status and policy.
//
// The Windows updater service stages every signed release and — when
// automatic updates are enabled — installs it inside the nightly maintenance
// window. This module surfaces that state to the application: current
// version, last check, staged release, the outcome notice of the last
// automatic installation, and the local update history.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { APP_VERSION } from "@/lib/app-version";

export interface SelfHostUpdatePolicy {
  automatic: boolean;
  channel: string;
  windowStartHour: number;
  windowEndHour: number;
}

export interface SelfHostUpdateStatus {
  selfHosted: boolean;
  currentVersion: string;
  policy: SelfHostUpdatePolicy;
  lastCheck: string | null;
  staged: { version: string; stagedAt: string | null; notes: string } | null;
  /** Newest release the Management Center offers for this installation. */
  available: {
    version: string;
    channel: string;
    notes: string;
    artifact: "exe" | "zip";
    url: string;
    discoveredAt: string;
  } | null;
  /** Live download / install progress reported by the updater service. */
  progress: {
    phase: "downloading" | "verified" | "installing" | "done" | "failed";
    version: string | null;
    received: number;
    total: number;
    error: string | null;
    at: string | null;
  } | null;
  notice: {
    at: string;
    version: string | null;
    outcome: string;
    automatic?: boolean;
  } | null;
  history: Array<{
    started_at?: string;
    finished_at?: string;
    from_version?: string;
    to_version?: string;
    outcome?: string;
    failed_step?: string;
  }>;
}

const DEFAULT_POLICY: SelfHostUpdatePolicy = {
  automatic: true,
  channel: "stable",
  windowStartHour: 2,
  windowEndHour: 4,
};

const EMPTY: SelfHostUpdateStatus = {
  selfHosted: false,
  currentVersion: APP_VERSION,
  policy: DEFAULT_POLICY,
  lastCheck: null,
  staged: null,
  available: null,
  progress: null,
  notice: null,
  history: [],
};

async function paths() {
  const { join } = await import("node:path");
  const dir = process.env["OPSQAI_CONFIG_DIR"];
  if (!dir) return null;
  const root = join(dir, "..");
  return {
    state: join(root, "updates", "state.json"),
    notice: join(root, "updates", "notice.json"),
    progress: join(root, "updates", "progress.json"),
    history: join(root, "logs", "update-history.jsonl"),
  };
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const { readFileSync } = await import("node:fs");
    return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as T;
  } catch {
    return null;
  }
}

function policyFrom(updates: Record<string, unknown> | undefined): SelfHostUpdatePolicy {
  const u = updates ?? {};
  const num = (v: unknown, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    automatic: u["automatic"] !== false,
    channel: typeof u["channel"] === "string" ? (u["channel"] as string) : "stable",
    windowStartHour: num(u["windowStartHour"], 2),
    windowEndHour: num(u["windowEndHour"], 4),
  };
}

export const getSelfHostUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<SelfHostUpdateStatus> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) return EMPTY;
    const p = await paths();
    if (!p) return { ...EMPTY, selfHosted: true };

    const { readSelfHostConfig } = await import("@/lib/selfhost-config.server");
    const cfg = readSelfHostConfig();
    const policy = policyFrom(cfg["updates"] as Record<string, unknown> | undefined);

    const state = await readJson<{
      lastCheck?: string;
      lastStaged?: { version: string; stagedAt?: string; notes?: string };
    }>(p.state);
    const notice = await readJson<SelfHostUpdateStatus["notice"]>(p.notice);
    const rawProgress = await readJson<Record<string, unknown>>(p.progress);
    const progress: SelfHostUpdateStatus["progress"] = rawProgress
      ? {
          phase: (["downloading", "verified", "installing", "done", "failed"] as const).includes(
            rawProgress["phase"] as never,
          )
            ? (rawProgress["phase"] as NonNullable<SelfHostUpdateStatus["progress"]>["phase"])
            : "downloading",
          version: typeof rawProgress["version"] === "string" ? rawProgress["version"] : null,
          received: Number(rawProgress["received"]) || 0,
          total: Number(rawProgress["total"]) || 0,
          error: typeof rawProgress["error"] === "string" ? rawProgress["error"] : null,
          at: typeof rawProgress["at"] === "string" ? rawProgress["at"] : null,
        }
      : null;

    // A download or installation whose process died (service restart, machine
    // asleep, connection dropped) leaves its last progress line behind. Without
    // this the page polls a frozen bar forever; with it the operator sees the
    // real state and can start again.
    if (progress && (progress.phase === "downloading" || progress.phase === "installing")) {
      const age = progress.at ? Date.now() - new Date(progress.at).getTime() : 0;
      const limit = progress.phase === "downloading" ? 3 * 60_000 : 30 * 60_000;
      if (age > limit) {
        progress.phase = "failed";
        progress.error =
          progress.error ??
          "The download stopped and no longer receives data. Start it again — already downloaded versions are kept.";
      }
    }

    let history: SelfHostUpdateStatus["history"] = [];
    try {
      const { readFileSync } = await import("node:fs");
      history = readFileSync(p.history, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .slice(-15)
        .reverse()
        .map((l) => {
          try {
            return JSON.parse(l) as SelfHostUpdateStatus["history"][number];
          } catch {
            return {};
          }
        });
    } catch {
      history = [];
    }

    const { readAvailableUpdate } = await import("@/lib/providers/selfhost/update-discovery.server");
    const avail = await readAvailableUpdate().catch(() => null);

    return {
      selfHosted: true,
      currentVersion: APP_VERSION,
      policy,
      lastCheck: state?.lastCheck ?? null,
      staged: state?.lastStaged
        ? {
            version: state.lastStaged.version,
            stagedAt: state.lastStaged.stagedAt ?? null,
            notes: state.lastStaged.notes ?? "",
          }
        : null,
      available: avail
        ? {
            version: avail.version,
            channel: avail.channel,
            notes: avail.notes,
            artifact: avail.artifact,
            url: avail.url,
            discoveredAt: avail.discoveredAt,
          }
        : null,
      progress,
      notice: notice ?? null,
      history,
    };
  });

export const setSelfHostUpdatePolicy = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        automatic: z.boolean(),
        channel: z.enum(["stable", "beta"]),
        windowStartHour: z.number().int().min(0).max(23),
        windowEndHour: z.number().int().min(0).max(23),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Automatic updates apply to Self-Hosted only.");
    const { readSelfHostConfig, writeSelfHostConfig } = await import(
      "@/lib/selfhost-config.server"
    );
    const cfg = readSelfHostConfig();
    const updates = { ...((cfg["updates"] as Record<string, unknown>) ?? {}) };
    updates["automatic"] = data.automatic;
    updates["channel"] = data.channel;
    updates["windowStartHour"] = data.windowStartHour;
    updates["windowEndHour"] = data.windowEndHour;
    updates["manifestUrl"] = `https://updates.opsqai.de/channel/${data.channel}/manifest.json`;
    cfg["updates"] = updates;
    writeSelfHostConfig(cfg);
    return { ok: true };
  });

/** Clear the "an update was installed" notice after the operator saw it. */
export const dismissSelfHostUpdateNotice = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    await requirePlatformAdmin(context);
    const p = await paths();
    if (p) {
      const { rmSync } = await import("node:fs");
      try {
        rmSync(p.notice, { force: true });
      } catch {
        /* nothing to clear */
      }
    }
    return { ok: true };
  });

/** Ask the Management Center right now whether a newer release exists. */
export const checkSelfHostUpdateNow = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(
    async ({
      context,
    }): Promise<{ ok: boolean; version?: string; notes?: string; reason?: string }> => {
      await requirePlatformAdmin(context);
      const { isSelfHosted } = await import("@/lib/platform/mode");
      if (!isSelfHosted()) throw new Error("Updates apply to Self-Hosted only.");
      const { readSelfHostConfig } = await import("@/lib/selfhost-config.server");
      const policy = policyFrom(readSelfHostConfig()["updates"] as Record<string, unknown>);
      const { checkForUpdateFromMc } = await import(
        "@/lib/providers/selfhost/update-discovery.server"
      );
      const result = await checkForUpdateFromMc(policy.channel === "beta" ? "beta" : "stable");
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, version: result.update.version, notes: result.update.notes };
    },
  );

/** Manual download / installation trigger picked up by the updater service. */
export const runSelfHostUpdateAction = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z.object({ action: z.enum(["download", "install"]), version: z.string().optional() }).parse(
      input,
    ),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Updates apply to Self-Hosted only.");
    const { writeUpdateCommand, writeUpdateProgress, downloadAvailableUpdate } = await import(
      "@/lib/providers/selfhost/update-discovery.server"
    );
    const ok = await writeUpdateCommand(data.action, data.version);
    if (!ok) throw new Error("Could not reach the local update folder.");

    if (data.action === "download") {
      // Show a progress bar right away instead of waiting for the updater
      // service poll, and download the package here so progress is real even
      // when that service is stopped.
      await writeUpdateProgress({
        phase: "downloading",
        version: data.version ?? null,
        received: 0,
        total: 0,
      });
      void downloadAvailableUpdate(data.version).catch(() => undefined);
    } else {
      await writeUpdateProgress({ phase: "installing", version: data.version ?? null });
    }
    return { ok: true };
  });

/**
 * Ask the updater service to restart the application services. Used after a
 * manual installation so the operator can be sure the new version is the one
 * actually running. The updater watches for this command every few seconds.
 */
export const restartSelfHostServices = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Restart applies to Self-Hosted only.");
    const { writeUpdateCommand } = await import(
      "@/lib/providers/selfhost/update-discovery.server"
    );
    const ok = await writeUpdateCommand("restart");
    if (!ok) throw new Error("Could not reach the local update folder.");
    return { ok: true };
  });

/**
 * Ask the updater service to reboot the Windows machine the installation runs
 * on. Offered right after an installation so the operator can be certain every
 * service and driver starts from the new version. The updater schedules the
 * reboot with a short delay so this response still reaches the browser.
 */
export const restartSelfHostMachine = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Restart applies to Self-Hosted only.");
    const { writeUpdateCommand } = await import(
      "@/lib/providers/selfhost/update-discovery.server"
    );
    const ok = await writeUpdateCommand("restart-machine");
    if (!ok) throw new Error("Could not reach the local update folder.");
    return { ok: true };
  });

/**
 * Install an update package the operator downloaded manually from the website.
 * The bytes are verified against the signed release descriptor before they are
 * staged, then the normal installation command runs.
 */
export const installSelfHostUpdateFromFile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filename: z.string().min(1).max(200),
        base64: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; version?: string; reason?: string }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Updates apply to Self-Hosted only.");
    const { stageUpdateFromFile, writeUpdateCommand } = await import(
      "@/lib/providers/selfhost/update-discovery.server"
    );
    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength === 0) return { ok: false, reason: "empty_file" };
    const staged = await stageUpdateFromFile(new Uint8Array(bytes), data.filename);
    if (!staged.ok) return { ok: false, reason: staged.reason };
    await writeUpdateCommand("install", staged.version);
    return { ok: true, version: staged.version };
  });

/** Read / write LAN peer distribution settings for this installation. */
export const getSelfHostPeerUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) return { serve: false, source: null, token: null };
    const { readPeerUpdateSettings } = await import(
      "@/lib/providers/selfhost/update-discovery.server"
    );
    return readPeerUpdateSettings();
  });

export const setSelfHostPeerUpdateSettings = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        serve: z.boolean(),
        source: z.string().trim().max(300).nullable(),
        token: z.string().trim().max(200).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await requirePlatformAdmin(context);
    const { isSelfHosted } = await import("@/lib/platform/mode");
    if (!isSelfHosted()) throw new Error("Updates apply to Self-Hosted only.");
    const { readSelfHostConfig, writeSelfHostConfig } = await import(
      "@/lib/selfhost-config.server"
    );
    const cfg = readSelfHostConfig();
    const updates = { ...((cfg["updates"] as Record<string, unknown>) ?? {}) };
    updates["peerServe"] = data.serve;
    updates["peerSource"] = data.source || null;
    updates["peerToken"] = data.token || null;
    cfg["updates"] = updates;
    writeSelfHostConfig(cfg);
    return { ok: true };
  });
