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
// The updater NEVER auto-applies. It only stages. The Service Manager
// utility (or the admin) triggers the apply step during a maintenance
// window. This keeps the update flow auditable and prevents surprise
// restarts on a running production system.

'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { loadConfig, programData, programFiles } = require('../common/config');

const cfg = loadConfig();
const POLL_MS   = 6 * 60 * 60 * 1000; // 6h
const STAGE_DIR = programData('updates', 'staged');
const STATE     = programData('updates', 'state.json');
const PUBKEY    = programFiles('updater', 'pubkey.pem');

const CURRENT_VERSION = cfg.version || '1.0.0';

function log(m) { console.log(`[updater] ${m}`); }
function warn(m) { console.warn(`[updater] ${m}`); }

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); }
  catch { return { lastCheck: null, lastStaged: null }; }
}
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
}

// Deterministic JSON: recursively sort object keys so the signer and
// verifier agree on the exact bytes to sign, independent of insertion order.
function canonicalize(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) =>
      JSON.stringify(k) + ':' + canonicalize(v[k])
    ).join(',') + '}';
  }
  return JSON.stringify(v);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function download(url, dest, expectedSha256) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.part';
    const out = fs.createWriteStream(tmp);
    const hash = crypto.createHash('sha256');
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.on('data', (c) => hash.update(c));
      res.pipe(out);
      out.on('finish', () => {
        out.close();
        const got = hash.digest('hex');
        if (got !== expectedSha256.toLowerCase()) {
          fs.unlinkSync(tmp);
          return reject(new Error(`sha256 mismatch (want ${expectedSha256}, got ${got})`));
        }
        fs.renameSync(tmp, dest);
        resolve(dest);
      });
    }).on('error', reject);
  });
}

function verifyManifest(manifest) {
  const { signature, ...rest } = manifest;
  if (!signature) throw new Error('manifest missing signature');
  if (!fs.existsSync(PUBKEY)) throw new Error(`pinned public key missing at ${PUBKEY}`);
  const pub = crypto.createPublicKey(fs.readFileSync(PUBKEY, 'utf8'));
  const bytes = Buffer.from(canonicalize(rest), 'utf8');
  const sig = Buffer.from(signature, 'base64');
  const ok = crypto.verify(null, bytes, pub, sig); // Ed25519: algo must be null
  if (!ok) throw new Error('manifest signature invalid');
}

function isNewer(remote, current) {
  const p = (v) => v.split(/[.\-+]/).map((x) => (isNaN(+x) ? x : +x));
  const a = p(remote), b = p(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

async function pollOnce() {
  const state = loadState();
  state.lastCheck = new Date().toISOString();
  try {
    const manifest = await fetchJson(cfg.updates.manifestUrl);
    verifyManifest(manifest);

    const channel = cfg.updates.channel || 'stable';
    const rel = manifest.channels?.[channel];
    if (!rel) { log(`no release for channel ${channel}`); saveState(state); return; }

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
    state.lastStaged = { version: rel.version, path: dest, stagedAt: new Date().toISOString(), notes: rel.notes || '' };
    log(`staged ${rel.version} -> ${dest} (apply via Service Manager)`);
  } catch (e) {
    warn(`poll failed: ${e.message}`);
  }
  saveState(state);
}

pollOnce();
setInterval(pollOnce, POLL_MS);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
