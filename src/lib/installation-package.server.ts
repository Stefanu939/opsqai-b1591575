// Server-only: assemble the installation package (ZIP) for a self-hosted
// customer. Contents:
//   - docker-compose.yml            (installer_version baked in)
//   - .env.template                 (OPSQAI_INSTALL_ID pre-filled; secrets = __CHANGE_ME__)
//   - activation-bundle.json        (Ed25519-signed, from license-activation-core)
//   - entrypoint.sh                 (auto-generates infra secrets on first boot)
//   - README.md                     (quick start + install_id printed)
//   - CHECKSUMS.sha256              (sha256 of every file above)
//
// AD-009 compliance: MC ships ONLY OPSQAI_INSTALL_ID and the signed bundle.
// POSTGRES_PASSWORD / MINIO_ROOT_PASSWORD stay as placeholders — first boot
// generates strong random values and writes them to a customer-owned volume.

import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
import type { ActivationBundle } from "@/lib/license-activation.functions";
import installExeAsset from "@/assets/install-exe.asset.json";
import installMacosAsset from "@/assets/install-macos.asset.json";
import installLinuxAsset from "@/assets/install-linux.asset.json";

// Installer binaries live in Lovable Assets (CDN) because they exceed the
// per-file repo limit. Fetched once per Worker instance and cached — the
// generated ZIP embeds them verbatim.
const binaryCache = new Map<string, Uint8Array>();

async function resolveOrigin(): Promise<string | null> {
  if (typeof process !== "undefined" && process.env?.OPSQAI_ASSET_ORIGIN) {
    return process.env.OPSQAI_ASSET_ORIGIN;
  }
  // Derive origin from the active server request (Cloudflare Worker).
  // Dynamic import: unavailable / throws outside a request (Vitest, module-eval).
  try {
    const mod = (await import("@tanstack/react-start/server")) as {
      getRequestUrl?: () => URL;
      getRequestHost?: () => string;
    };
    if (mod.getRequestUrl) {
      return mod.getRequestUrl().origin;
    }
    if (mod.getRequestHost) {
      return `https://${mod.getRequestHost()}`;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchAsset(url: string, localFallback: string): Promise<Uint8Array> {
  const cached = binaryCache.get(url);
  if (cached) return cached;

  const isAbsolute = url.startsWith("http://") || url.startsWith("https://");
  const origin = isAbsolute ? null : await resolveOrigin();

  if (isAbsolute || origin) {
    const fullUrl = isAbsolute ? url : `${origin}${url}`;
    try {
      const res = await fetch(fullUrl);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      binaryCache.set(url, bytes);
      return bytes;
    } catch (fetchErr) {
      try {
        const { readFileSync } = await import("node:fs");
        const bytes = new Uint8Array(readFileSync(localFallback));
        binaryCache.set(url, bytes);
        return bytes;
      } catch {
        throw new Error(`Failed to fetch installer asset ${fullUrl}: ${(fetchErr as Error).message}`);
      }
    }
  }

  // No origin (Vitest / local Node): read pre-built binary directly.
  try {
    const { readFileSync } = await import("node:fs");
    const bytes = new Uint8Array(readFileSync(localFallback));
    binaryCache.set(url, bytes);
    return bytes;
  } catch (err) {
    throw new Error(
      `Failed to load installer asset ${url}: no request origin and local fallback ${localFallback} unavailable (${(err as Error).message})`,
    );
  }
}


const DOCKER_COMPOSE_TEMPLATE = `# OPSQAI Self-Hosted — generated for install_id {{INSTALL_ID}}
# Installer version: {{INSTALLER_VERSION}}
# Generated at: {{GENERATED_AT}}
#
# This file is a reference topology. See docs/administrator-guide for the
# full installation guide.

services:
  opsqai:
    image: opsqai/app:{{INSTALLER_VERSION}}
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_started
    environment:
      OPSQAI_MODE: selfhost
      INSTALLER_VERSION: {{INSTALLER_VERSION}}
      OPSQAI_INSTALL_ID: \${OPSQAI_INSTALL_ID}
      DATABASE_URL: postgres://opsqai:\${POSTGRES_PASSWORD}@postgres:5432/opsqai
      S3_ENDPOINT: http://minio:9000
      S3_ACCESS_KEY: \${MINIO_ROOT_USER}
      S3_SECRET_KEY: \${MINIO_ROOT_PASSWORD}
      S3_BUCKET: opsqai
      AI_PROVIDER: \${AI_PROVIDER:-lovable}
      OPSQAI_LICENSE_SERVER_URL: \${OPSQAI_LICENSE_SERVER_URL}
      OPSQAI_PUBLIC_URL: \${OPSQAI_PUBLIC_URL}
    ports:
      - "\${OPSQAI_PORT:-3000}:3000"
    networks: [opsqai-net]

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: opsqai
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: opsqai
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U opsqai -d opsqai"]
      interval: 10s
      timeout: 5s
      retries: 6
    networks: [opsqai-net]

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: \${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: \${MINIO_ROOT_PASSWORD}
    volumes:
      - minio-data:/data
    networks: [opsqai-net]

volumes:
  postgres-data:
  minio-data:

networks:
  opsqai-net:
    driver: bridge
`;

const ENV_TEMPLATE = `# OPSQAI Self-Hosted — environment for install_id {{INSTALL_ID}}
#
# OPSQAI_INSTALL_ID and OPSQAI_LICENSE_SERVER_URL are pre-filled and MUST
# NOT be changed — they anchor your license and updates.
#
# Every value marked __CHANGE_ME__ MUST be replaced before first boot, or
# entrypoint.sh will generate a strong random value on your behalf and
# store it locally.

# ── Identity (do not change) ──────────────────────────────────────────
OPSQAI_INSTALL_ID={{INSTALL_ID}}
INSTALLER_VERSION={{INSTALLER_VERSION}}
OPSQAI_LICENSE_SERVER_URL={{LICENSE_SERVER_URL}}

# ── Networking ────────────────────────────────────────────────────────
OPSQAI_PORT=3000
OPSQAI_PUBLIC_URL=https://opsqai.example.com

# ── Database ──────────────────────────────────────────────────────────
POSTGRES_PASSWORD=__CHANGE_ME__

# ── Object storage (MinIO) ────────────────────────────────────────────
MINIO_ROOT_USER=opsqai
MINIO_ROOT_PASSWORD=__CHANGE_ME__

# ── AI provider (optional) ────────────────────────────────────────────
AI_PROVIDER=lovable
`;

const ENTRYPOINT_SH = `#!/usr/bin/env sh
# OPSQAI Self-Hosted entrypoint.
# On first boot, generates strong random values for any secret still set
# to __CHANGE_ME__ and writes the resolved values back to /data/env.local
# so subsequent boots stay stable.

set -eu

STATE_DIR="\${OPSQAI_STATE_DIR:-/data}"
mkdir -p "$STATE_DIR"
LOCAL_ENV="$STATE_DIR/env.local"

if [ -f "$LOCAL_ENV" ]; then
  # shellcheck disable=SC1090
  . "$LOCAL_ENV"
fi

gen() { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \\n'; }

for var in POSTGRES_PASSWORD MINIO_ROOT_PASSWORD; do
  val="$(eval echo \\$$var)"
  if [ -z "$val" ] || [ "$val" = "__CHANGE_ME__" ]; then
    new="$(gen)"
    export "$var=$new"
    echo "$var=$new" >> "$LOCAL_ENV"
    echo "opsqai: generated $var and stored in $LOCAL_ENV"
  fi
done

exec "$@"
`;

const INSTALL_SH = `#!/usr/bin/env bash
# OPSQAI Self-Hosted host-side installer.
# Runs ON THE HOST (not inside the container). Distinct from entrypoint.sh
# which runs automatically inside the app container on every boot.
#
# Usage:
#   ./install.sh              Fresh install (default)
#   ./install.sh --restore    Restore from a backup archive (DR runbook 5.5.4)
#   ./install.sh --help
#
# Safe to re-run: prerequisite check + .env copy are idempotent.

set -euo pipefail

MODE="install"
for arg in "$@"; do
  case "$arg" in
    --restore) MODE="restore" ;;
    --help|-h)
      cat <<'EOF'
OPSQAI Self-Hosted installer

  ./install.sh              Fresh install: checks prerequisites, seeds .env
                            from .env.template, starts the stack, waits for
                            the app to report healthy, then prints the URL
                            to open the Setup Wizard.
  ./install.sh --restore    Disaster-recovery mode: prompts for a backup
                            archive path and follows the DR runbook (5.5.4)
                            instead of writing a fresh .env / starting a new
                            stack. Does NOT overwrite an existing .env.
EOF
      exit 0
      ;;
    *)
      echo "install.sh: unknown argument: $arg" >&2
      echo "Run './install.sh --help' for usage." >&2
      exit 2
      ;;
  esac
done

log()  { printf '\\033[1;34m[opsqai]\\033[0m %s\\n' "$*"; }
warn() { printf '\\033[1;33m[opsqai]\\033[0m %s\\n' "$*" >&2; }
err()  { printf '\\033[1;31m[opsqai]\\033[0m %s\\n' "$*" >&2; }

check_prereqs() {
  local missing=0
  if ! command -v docker >/dev/null 2>&1; then
    err "docker is not installed or not on PATH."
    err "Install Docker Engine: https://docs.docker.com/engine/install/"
    missing=1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    err "The Docker Compose plugin (v2) is not available."
    err "Install it: https://docs.docker.com/compose/install/linux/"
    err "On Debian/Ubuntu: 'sudo apt-get install docker-compose-plugin'."
    missing=1
  fi
  if [ "$missing" -ne 0 ]; then
    err "Fix the prerequisites above and re-run './install.sh'."
    exit 1
  fi
  log "Prerequisites OK (docker + compose plugin present)."
}

seed_env() {
  if [ -f .env ]; then
    log ".env already exists — leaving it untouched (idempotent)."
    return
  fi
  if [ ! -f .env.template ]; then
    err ".env.template is missing from this directory."
    err "Are you running install.sh from inside the extracted ZIP?"
    exit 1
  fi
  cp .env.template .env
  log "Copied .env.template -> .env. Review and edit OPSQAI_PUBLIC_URL before opening the Setup Wizard."
}

wait_healthy() {
  local port url tries=60
  port="\${OPSQAI_PORT:-3000}"
  url="http://localhost:\${port}/health"
  log "Waiting for the app to report healthy at \${url} ..."
  for i in $(seq 1 "$tries"); do
    if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
      log "App is healthy after \${i} check(s)."
      return 0
    fi
    sleep 2
  done
  err "App did not report healthy after \$((tries * 2))s."
  err "Inspect logs with: docker compose logs --tail=200 opsqai"
  exit 1
}

print_wizard_url() {
  local public_url
  # shellcheck disable=SC1091
  public_url="$(grep -E '^OPSQAI_PUBLIC_URL=' .env | head -n1 | cut -d= -f2- || true)"
  if [ -z "\${public_url:-}" ] || [ "\${public_url}" = "https://opsqai.example.com" ]; then
    public_url="http://localhost:\${OPSQAI_PORT:-3000}"
  fi
  log ""
  log "Setup complete. Open this URL in a browser to begin the Setup Wizard:"
  log ""
  log "    \${public_url}/first-run"
  log ""
}

restore_flow() {
  log "OPSQAI restore mode — following DR runbook 5.5.4."
  log "Prerequisites: existing .env pointing at the SAME install_id as the backup."
  if [ ! -f .env ]; then
    err "No .env found. Restore must run against an existing installation directory."
    err "For a fresh install use './install.sh' (without --restore)."
    exit 1
  fi
  read -r -p "Path to backup archive (.tar.zst): " archive
  if [ ! -f "$archive" ]; then
    err "File not found: $archive"
    exit 1
  fi
  log "Stopping stack ..."
  docker compose down
  log "Restoring $archive — see docs/engineering/runbooks/dr-verify-v1.0.0.md for the full procedure."
  log "This installer defers the actual volume rehydration to 'opsqai restore', which knows how to"
  log "unpack Config (including secrets.env), Database and Storage scopes into the correct volumes."
  docker compose run --rm opsqai opsqai restore --archive "$archive"
  log "Starting stack ..."
  docker compose up -d
  wait_healthy
  log "Restore complete. Run 'docker compose exec opsqai opsqai doctor' to verify."
}

check_prereqs

if [ "$MODE" = "restore" ]; then
  restore_flow
  exit 0
fi

seed_env
log "Starting stack with 'docker compose up -d' ..."
docker compose up -d
wait_healthy
print_wizard_url
`;

function renderReadme(input: {
  install_id: string;
  installer_version: string;
  generated_at: string;
  company_name: string;
}): string {
  return `# OPSQAI Self-Hosted Installation Package

Install ID: **${input.install_id}**
Customer: ${input.company_name}
Installer version: ${input.installer_version}
Generated: ${input.generated_at}

## What is in this ZIP

| File | Purpose |
| ---- | ------- |
| \`install.exe\` | Windows host installer — double-click to run |
| \`install-macos\` | macOS host installer (universal) — \`chmod +x install-macos && ./install-macos\` |
| \`install-linux\` | Linux host installer — \`chmod +x install-linux && ./install-linux\` |
| \`install.sh\` | POSIX shell fallback for headless / SSH-only hosts |
| \`docker-compose.yml\` | Reference topology (opsqai + postgres + minio) |
| \`.env.template\` | Copied to \`.env\` by the installer; secrets marked \`__CHANGE_ME__\` |
| \`activation-bundle.json\` | Ed25519-signed license bundle — install & module tokens + CRL |
| \`entrypoint.sh\` | Runs inside the container; auto-generates infra secrets on first boot |
| \`CHECKSUMS.sha256\` | Verify integrity before running any installer |

## Quick start

1. Extract this ZIP on the target host and \`cd\` into it.
2. \`sha256sum -c CHECKSUMS.sha256\` — every line must say \`OK\`.
3. Run the installer for your OS:
   - **Windows**: double-click \`install.exe\`
   - **macOS**: \`chmod +x install-macos && ./install-macos\`
   - **Linux**: \`chmod +x install-linux && ./install-linux\`
   - **Headless / SSH**: \`chmod +x install.sh && ./install.sh\`

   Every installer checks Docker prerequisites, copies \`.env.template\` to
   \`.env\` (only if missing — idempotent), runs \`docker compose up -d\`,
   waits for the app to report healthy, and prints (and opens) the URL for
   the Setup Wizard.
4. Paste \`activation-bundle.json\` when the wizard asks for it.

To restore from a backup instead of a fresh install, pass \`--restore\` to
whichever installer you are running (matches DR runbook 5.5.4).


## Support

Full guide: docs/administrator-guide/02-installation.md
Disaster-recovery runbook: docs/engineering/runbooks/dr-verify-v1.0.0.md
`;
}

function sha256Hex(bytes: Uint8Array): string {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return createHash("sha256").update(buf).digest("hex");
}

export interface BuildPackageInput {
  install_id: string;
  installer_version: string;
  company_name: string;
  bundle: ActivationBundle;
  license_server_url: string;
}

export interface BuiltPackage {
  bytes: Uint8Array;
  checksum_sha256: string;
  file_name: string;
}

/** Deterministic assembly of the installation ZIP. */
export async function assembleInstallationPackage(input: BuildPackageInput): Promise<BuiltPackage> {
  const generatedAt = new Date().toISOString();

  const substitutions = (s: string): string =>
    s
      .replaceAll("{{INSTALL_ID}}", input.install_id)
      .replaceAll("{{INSTALLER_VERSION}}", input.installer_version)
      .replaceAll("{{LICENSE_SERVER_URL}}", input.license_server_url)
      .replaceAll("{{GENERATED_AT}}", generatedAt);

  // Native installer binaries live in Lovable Assets (too large for the
  // repo). Fetched in parallel and cached per-Worker-instance.
  const [installExe, installMacos, installLinux] = await Promise.all([
    fetchAsset(installExeAsset.url, "installer/dist/install.exe"),
    fetchAsset(installMacosAsset.url, "installer/dist/install-macos"),
    fetchAsset(installLinuxAsset.url, "installer/dist/install-linux"),
  ]);

  const files: Record<string, Uint8Array> = {
    "install.sh": strToU8(INSTALL_SH),
    "install.exe": installExe,
    "install-macos": installMacos,
    "install-linux": installLinux,
    "docker-compose.yml": strToU8(substitutions(DOCKER_COMPOSE_TEMPLATE)),
    ".env.template": strToU8(substitutions(ENV_TEMPLATE)),
    "entrypoint.sh": strToU8(ENTRYPOINT_SH),
    "activation-bundle.json": strToU8(JSON.stringify(input.bundle, null, 2)),
    "README.md": strToU8(
      renderReadme({
        install_id: input.install_id,
        installer_version: input.installer_version,
        generated_at: generatedAt,
        company_name: input.company_name,
      }),
    ),
  };

  // Deterministic CHECKSUMS.sha256 (files sorted by name)
  const names = Object.keys(files).sort();
  const checksums = names
    .map((n) => `${sha256Hex(files[n])}  ${n}`)
    .join("\n") + "\n";
  files["CHECKSUMS.sha256"] = strToU8(checksums);

  const bytes = zipSync(files, { level: 6 });
  const checksum_sha256 = sha256Hex(bytes);
  const file_name = `opsqai-${input.installer_version}-${input.install_id}.zip`;
  return { bytes, checksum_sha256, file_name };
}

