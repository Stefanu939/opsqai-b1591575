// OpsqaiUpdater — polls a signed update manifest, verifies its Ed25519
// signature against a pinned public key, downloads the matching MSI/EXE,
// verifies the artifact hash + signature, and stages it for the next
// reboot to apply.
//
// Trust model:
//   - Manifest is a JSON document served over HTTPS from updates.opsqai.de.
//   - Manifest signature is Ed25519 over the canonical JSON bytes
//     (JSON.stringify with sorted keys — see canonicalize()).
//   - Public key is pinned at build time in payload/updater/pubkey.pem
//     (installed to %ProgramFiles%\OPSQAI\updater\pubkey.pem).
//   - Artifact hash (sha256) MUST match the manifest before we accept.
//   - Artifact itself must be Authenticode-signed by our EV cert; that
//     check is delegated to Windows when the user launches the MSI.
//
// Applying: the updater stages every release, and — when the installation
// enables automatic updates (config.updates.automatic, default true) — it
// applies the staged release itself inside the configured nightly
// maintenance window (config.updates.windowStartHour/windowEndHour,
// default 02:00–04:00 local time). apply.js snapshots, installs, migrates,
// health-probes and rolls back on failure; the outcome is written to
// %ProgramData%\OPSQAI\updates\notice.json so the application can tell the
// operator what happened. Outside the window, or with automatic updates
// switched off, the release simply stays staged for a manual apply.

"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");
const { loadConfig, programData, programFiles } = require("../common/config");

const cfg = loadConfig();
const POLL_MS = 30 * 60 * 1000; // 30 min — needed to catch the maintenance window
const NOTICE = programData("updates", "notice.json");
const APPLY_LOCK = programData("updates", "apply.lock");
const STAGE_DIR = programData("updates", "staged");
const STATE = programData("updates", "state.json");
const AVAILABLE = programData("updates", "available.json");
const COMMAND = programData("updates", "command.json");
const PUBKEY = programFiles("updater", "pubkey.pem");

const CURRENT_VERSION = cfg.version || "1.0.0";

function log(m) {
  console.log(`[updater] ${m}`);
}
function warn(m) {
  console.warn(`[updater] ${m}`);
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return { lastCheck: null, lastStaged: null };
  }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
}

// Deterministic JSON: recursively sort object keys so the signer and
// verifier agree on the exact bytes to sign, independent of insertion order.
function canonicalize(v) {
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  if (v && typeof v === "object") {
    return (
      "{" +
      Object.keys(v)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonicalize(v[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(v);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

function download(url, dest, expectedSha256) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + ".part";
    const out = fs.createWriteStream(tmp);
    const hash = crypto.createHash("sha256");
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.on("data", (c) => hash.update(c));
        res.pipe(out);
        out.on("finish", () => {
          out.close();
          const got = hash.digest("hex");
          if (got !== expectedSha256.toLowerCase()) {
            fs.unlinkSync(tmp);
            return reject(new Error(`sha256 mismatch (want ${expectedSha256}, got ${got})`));
          }
          fs.renameSync(tmp, dest);
          resolve(dest);
        });
      })
      .on("error", reject);
  });
}

function verifyManifest(manifest) {
  const { signature, ...rest } = manifest;
  if (!signature) throw new Error("manifest missing signature");
  if (!fs.existsSync(PUBKEY)) throw new Error(`pinned public key missing at ${PUBKEY}`);
  const pub = crypto.createPublicKey(fs.readFileSync(PUBKEY, "utf8"));
  const bytes = Buffer.from(canonicalize(rest), "utf8");
  const sig = Buffer.from(signature, "base64");
  const ok = crypto.verify(null, bytes, pub, sig); // Ed25519: algo must be null
  if (!ok) throw new Error("manifest signature invalid");
}

function autoPolicy() {
  const u = cfg.updates || {};
  return {
    automatic: u.automatic !== false,
    startHour: Number.isFinite(+u.windowStartHour) ? +u.windowStartHour : 2,
    endHour: Number.isFinite(+u.windowEndHour) ? +u.windowEndHour : 4,
  };
}

function inWindow(policy, now = new Date()) {
  const h = now.getHours();
  const { startHour: a, endHour: b } = policy;
  return a <= b ? h >= a && h < b : h >= a || h < b; // window may wrap midnight
}

function writeNotice(notice) {
  try {
    fs.mkdirSync(path.dirname(NOTICE), { recursive: true });
    fs.writeFileSync(NOTICE, JSON.stringify(notice, null, 2));
  } catch (e) {
    warn(`cannot write notice: ${e.message}`);
  }
}

/** Run apply.js in-process; it owns snapshots, rollback and history. */
async function applyStaged(state) {
  if (fs.existsSync(APPLY_LOCK)) {
    log("an apply is already running — skipping");
    return;
  }
  const version = state.lastStaged?.version;
  log(`maintenance window: applying ${version} automatically`);
  writeNotice({
    at: new Date().toISOString(),
    version,
    outcome: "running",
    automatic: true,
  });
  let outcome = "success";
  try {
    const apply = require("./apply");
    await apply.main();
    if (process.exitCode && process.exitCode !== 0) outcome = "failed";
  } catch (e) {
    warn(`automatic apply failed: ${e.message}`);
    outcome = "failed";
  }
  process.exitCode = 0;
  writeNotice({
    at: new Date().toISOString(),
    version,
    outcome,
    automatic: true,
    fromVersion: CURRENT_VERSION,
  });
  state.lastApply = { version, outcome, at: new Date().toISOString() };
  saveState(state);
}

function isNewer(remote, current) {
  const p = (v) => v.split(/[.\-+]/).map((x) => (isNaN(+x) ? x : +x));
  const a = p(remote),
    b = p(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0,
      y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/** Management Center descriptor written by the application after a verified
 * update check. Preferred over the legacy CDN manifest; the app already
 * verified its Ed25519 signature against the pinned license key. */
function readAvailable() {
  try {
    const v = JSON.parse(fs.readFileSync(AVAILABLE, "utf8"));
    if (!v || !v.version || !v.url) return null;
    return v;
  } catch {
    return null;
  }
}

/** Manual instruction from the application (Download / Install now). */
function takeCommand() {
  try {
    const c = JSON.parse(fs.readFileSync(COMMAND, "utf8"));
    fs.unlinkSync(COMMAND);
    return c && c.action ? c : null;
  } catch {
    return null;
  }
}

async function stageRelease(state, rel, source) {
  if (!isNewer(rel.version, CURRENT_VERSION)) {
    log(`up to date (current ${CURRENT_VERSION}, latest ${rel.version})`);
    return false;
  }
  if (state.lastStaged?.version === rel.version && fs.existsSync(state.lastStaged.path || "")) {
    log(`${rel.version} already staged at ${state.lastStaged.path}`);
    return true;
  }
  const ext = rel.artifact === "zip" ? "zip" : "exe";
  const dest = path.join(STAGE_DIR, `OPSQAI-Setup-${rel.version}.${ext}`);
  log(`downloading ${rel.version} (${source})`);
  await download(rel.url, dest, rel.sha256);
  state.lastStaged = {
    version: rel.version,
    path: dest,
    artifact: ext,
    source,
    stagedAt: new Date().toISOString(),
    notes: rel.notes || "",
  };
  log(`staged ${rel.version} -> ${dest}`);
  writeNotice({
    at: new Date().toISOString(),
    version: rel.version,
    outcome: "staged",
    notes: rel.notes || "",
    automatic: autoPolicy().automatic,
  });
  return true;
}

async function pollOnce() {
  const state = loadState();
  state.lastCheck = new Date().toISOString();
  const command = takeCommand();

  // 1) Management Center (source of truth).
  const mc = readAvailable();
  if (mc) {
    try {
      await stageRelease(state, mc, "management-center");
      saveState(state);
      const policy = autoPolicy();
      const shouldApply =
        state.lastStaged &&
        isNewer(state.lastStaged.version, CURRENT_VERSION) &&
        state.lastStaged.artifact !== "zip" &&
        state.lastApply?.version !== state.lastStaged.version &&
        (command?.action === "install" || (policy.automatic && inWindow(policy)));
      if (shouldApply) await applyStaged(state);
      return;
    } catch (e) {
      warn(`management center update failed: ${e.message}; falling back to manifest`);
    }
  }

  // 2) Legacy signed CDN manifest (isolated installations).
  try {
    const manifest = await fetchJson(cfg.updates.manifestUrl);
    verifyManifest(manifest);

    const channel = cfg.updates.channel || "stable";
    const rel = manifest.channels?.[channel];
    if (!rel) {
      log(`no release for channel ${channel}`);
      saveState(state);
      return;
    }

    if (!isNewer(rel.version, CURRENT_VERSION)) {
      log(`up to date (current ${CURRENT_VERSION}, latest ${rel.version})`);
      saveState(state);
      return;
    }
    if (state.lastStaged?.version === rel.version) {
      log(`${rel.version} already staged at ${state.lastStaged.path}`);
      saveState(state);
      return;
    }

    log(`downloading ${rel.version} from ${rel.url}`);
    const dest = path.join(STAGE_DIR, `OPSQAI-Setup-${rel.version}.exe`);
    await download(rel.url, dest, rel.sha256);
    state.lastStaged = {
      version: rel.version,
      path: dest,
      stagedAt: new Date().toISOString(),
      notes: rel.notes || "",
    };
    log(`staged ${rel.version} -> ${dest}`);
    writeNotice({
      at: new Date().toISOString(),
      version: rel.version,
      outcome: "staged",
      notes: rel.notes || "",
      automatic: autoPolicy().automatic,
    });
  } catch (e) {
    warn(`poll failed: ${e.message}`);
  }
  saveState(state);

  // Automatic installation inside the maintenance window.
  const policy = autoPolicy();
  if (
    (policy.automatic || command?.action === "install") &&
    state.lastStaged &&
    isNewer(state.lastStaged.version, CURRENT_VERSION) &&
    state.lastApply?.version !== state.lastStaged.version &&
    (command?.action === "install" || inWindow(policy))
  ) {
    await applyStaged(state);
  }
}

module.exports = { _internal: { autoPolicy, inWindow, isNewer, readAvailable, takeCommand } };

if (require.main === module) {
  pollOnce();
  setInterval(pollOnce, POLL_MS);
}
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(0));
