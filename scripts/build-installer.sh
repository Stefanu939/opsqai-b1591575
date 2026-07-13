#!/usr/bin/env bash
# Build the cross-platform installer binaries shipped inside every generated
# OPSQAI installation ZIP. Reproducible: -trimpath + stripped ldflags.
#
# Requires: Go 1.22+.
# Output: installer/dist/{install.exe, install-macos, install-linux}
#
# TODO(release-signing):
#   - install.exe: sign with Authenticode (`signtool sign /tr ... install.exe`)
#   - install-macos: codesign + notarize (`codesign --sign ...`; `xcrun notarytool submit`)
# Both require customer-managed certificates, out of scope for RC.

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v go >/dev/null 2>&1; then
  echo "build-installer.sh: 'go' is not installed. Install Go 1.22+ from https://go.dev/dl/." >&2
  exit 1
fi

OUT="installer/dist"
mkdir -p "$OUT"

LDFLAGS='-s -w -buildid='
FLAGS=(-trimpath -ldflags "$LDFLAGS")

echo "[build-installer] Windows amd64 -> $OUT/install.exe"
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build "${FLAGS[@]}" -o "$OUT/install.exe" ./installer

echo "[build-installer] macOS amd64"
GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build "${FLAGS[@]}" -o "$OUT/install-macos-amd64" ./installer
echo "[build-installer] macOS arm64"
GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build "${FLAGS[@]}" -o "$OUT/install-macos-arm64" ./installer

if command -v lipo >/dev/null 2>&1; then
  echo "[build-installer] Fusing universal macOS binary -> $OUT/install-macos"
  lipo -create "$OUT/install-macos-amd64" "$OUT/install-macos-arm64" -output "$OUT/install-macos"
  rm "$OUT/install-macos-amd64" "$OUT/install-macos-arm64"
else
  # lipo is macOS-only; on Linux CI keep the amd64 slice as the shipped file
  # and warn — the release job MUST run on macOS to produce a universal binary.
  echo "[build-installer] WARN: 'lipo' not available — shipping amd64-only macOS binary." >&2
  mv "$OUT/install-macos-amd64" "$OUT/install-macos"
  rm -f "$OUT/install-macos-arm64"
fi

echo "[build-installer] Linux amd64 -> $OUT/install-linux"
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build "${FLAGS[@]}" -o "$OUT/install-linux" ./installer

chmod +x "$OUT/install-macos" "$OUT/install-linux"

echo "[build-installer] Done."
ls -la "$OUT"

echo "[build-installer] Binaries are ready in $OUT. Upload them to Lovable Assets before publishing a new installer ZIP."
