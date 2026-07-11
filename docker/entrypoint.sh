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

exec "$@"
