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
| \`docker-compose.yml\` | Reference topology (opsqai + postgres + minio) |
| \`.env.template\` | Copy to \`.env\` and fill secrets marked \`__CHANGE_ME__\` |
| \`activation-bundle.json\` | Ed25519-signed license bundle — install & module tokens + CRL |
| \`entrypoint.sh\` | Auto-generates infra secrets on first boot |
| \`CHECKSUMS.sha256\` | Verify integrity before running \`docker compose up\` |

## Quick start

1. Extract this ZIP on the target host and \`cd\` into it.
2. \`cp .env.template .env\` and edit \`OPSQAI_PUBLIC_URL\`.
   You may leave \`POSTGRES_PASSWORD\` / \`MINIO_ROOT_PASSWORD\` as
   \`__CHANGE_ME__\` — the entrypoint will generate strong values on first
   boot and persist them to a customer-owned volume.
3. \`sha256sum -c CHECKSUMS.sha256\` — every line must say \`OK\`.
4. \`docker compose up -d\`.
5. Open \`OPSQAI_PUBLIC_URL\` and run through the Setup Wizard. Paste
   \`activation-bundle.json\` when asked.

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
export function assembleInstallationPackage(input: BuildPackageInput): BuiltPackage {
  const generatedAt = new Date().toISOString();

  const substitutions = (s: string): string =>
    s
      .replaceAll("{{INSTALL_ID}}", input.install_id)
      .replaceAll("{{INSTALLER_VERSION}}", input.installer_version)
      .replaceAll("{{LICENSE_SERVER_URL}}", input.license_server_url)
      .replaceAll("{{GENERATED_AT}}", generatedAt);

  const files: Record<string, Uint8Array> = {
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
