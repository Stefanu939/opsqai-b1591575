#!/bin/sh
# OPSQAI Self-Hosted entrypoint (Phase 5).
#
# Runs sanity checks, prints the installer_version, and hands off to the app
# server. All secrets stay in env vars — this script never logs them.

set -eu

echo "[opsqai] starting"
echo "[opsqai] mode=${OPSQAI_MODE:-cloud}"
echo "[opsqai] installer_version=${INSTALLER_VERSION:-unknown}"
echo "[opsqai] install_id=${OPSQAI_INSTALL_ID:-<unset>}"

# Fail fast if the operator forgot to set the install identifier on a
# self-hosted deployment. Cloud mode has no install_id.
if [ "${OPSQAI_MODE:-cloud}" = "selfhost" ] && [ -z "${OPSQAI_INSTALL_ID:-}" ]; then
  echo "[opsqai] ERROR: OPSQAI_INSTALL_ID is required in selfhost mode." >&2
  exit 1
fi

# Source runtime secrets written by the first-run wizard (Phase 5).
# The file is chmod 600, owned by the container's runtime user, and lives
# on the customer-owned data volume (so backups pick it up alongside the
# database — see docs/security-documentation/07-backup-security.md).
#
# Contents are shell-safe KEY='value' pairs and MUST NOT be logged. If the
# file is missing (fresh install before the wizard has run) we continue
# silently; the wizard populates it before the first real workload.
SECRETS_FILE="${OPSQAI_SECRETS_ENV_PATH:-/var/lib/opsqai/secrets.env}"
if [ -r "$SECRETS_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$SECRETS_FILE"
  set +a
  echo "[opsqai] loaded runtime secrets from $SECRETS_FILE"
else
  echo "[opsqai] no runtime secrets file at $SECRETS_FILE (first-run wizard not yet completed?)"
fi

exec "$@"

