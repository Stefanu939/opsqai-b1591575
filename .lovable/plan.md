# Fix NSIS packaging for the large Self-Hosted payload

## What is actually failing

`Internal compiler error #12345: error mmapping datablock to 33556560` comes from
NSIS's own compiler memory manager, not from the payload being invalid. `makensis.exe`
is a **32-bit** process, and with `SetCompressor /SOLID lzma` it must hold the entire
compressed data block in one growable **memory-mapped region**. The message is
makensis failing to grow that single mapping past ~32 MiB *increments* inside a 2 GB
user address space that is already fragmented by the LZMA solid dictionary.

Two properties of the current setup cause it:

1. `OPSQAI-Setup.nsi` line 26: `SetCompressor /SOLID lzma` — one contiguous datablock
   for the whole payload (app bundle + Node + PostgreSQL + pgvector + Caddy + WinSW +
   Electron Wizard + Electron Desktop Shell + `OllamaSetup.exe`).
2. `File /r "${PAYLOAD_DIR}\*.*"` — tens of thousands of files, all pushed into that
   single solid block, and LZMA is re-compressing content that is already compressed
   (`OllamaSetup.exe`, Electron archives, `.7z`/`.zip` vendor payloads).

Adding Ollama pushed the solid block over what the 32-bit compiler can map. Ollama
stays; the packaging changes.

## The fix: pre-compressed payload parts, stored (not solid-compressed) in NSIS

Compression moves out of makensis and into the build stage. makensis then only *stores*
a handful of large opaque blobs, so there is no giant solid datablock to memory-map.

```text
build.ps1 stage (unchanged)          new pack step                     NSIS
payload\app          ─┐
payload\runtime      ─┤                                        parts\*.7z stored
payload\pgsql        ─┼─►  7zr a -mx=5 per component  ─────►    (SetCompress off)
payload\wizard       ─┤     + SHA-256 per part                        │
payload\desktop-shell┤                                                ▼
payload\vendor\ollama┘                                    install: 7zr x → $INSTDIR
small files (services, winsw xml, assets, tools) stay as plain File /r
```

### Build script (`opsqai-windows/build/build.ps1`)

- Keep every existing staging step and every `Assert-Exists` guardrail exactly as is —
  they run against the staged tree **before** packing, so verification is unchanged.
- Stage `7zr.exe` (standalone 7-Zip extractor, ~600 KB) into `payload\tools\7zr.exe`
  the same way Node/Caddy/Ollama are staged, with a pinned SHA-256.
- New pack step after the guardrails: for each heavy component (`app`, `runtime`,
  `pgsql`, `caddy`, `wizard`, `desktop-shell`, `vendor`) create
  `build\parts\<name>.7z` and a matching `<name>.7z.sha256`, then remove that
  directory from the NSIS-visible payload root (moved, not deleted).
- `OllamaSetup.exe.sha256` is generated exactly as today, **before** packing, and
  travels inside `vendor.7z`, so the installer still verifies the bundled installer's
  hash before running it. Nothing about the Ollama contract changes.
- Emit a size report per part and a hard guard: fail the build if any single part
  exceeds 1.5 GB or the total stored payload exceeds 1.8 GB, with a message pointing
  at this document instead of letting makensis die with an internal error.
- Prefer a 64-bit `makensis.exe` when the runner has one (`NSIS\Bin\makensis.exe`),
  falling back to the current 32-bit paths. This is defence in depth, not the fix.

### NSIS script (`opsqai-windows/installer/nsis/OPSQAI-Setup.nsi`)

- `SetCompressor /SOLID lzma` → `SetCompressor /FINAL lzma` (non-solid), and
  `SetCompress off` around the `parts\*.7z` files so already-compressed blobs are
  stored verbatim.
- Add the parts and `7zr.exe` with explicit `File` lines, then extract each one with
  `nsExec::ExecToLog '"$INSTDIR\tools\7zr.exe" x -y -o$INSTDIR part.7z'`, printing
  progress via `DetailPrint` ("Extracting PostgreSQL…", "Extracting local AI engine…").
- Verify each part's SHA-256 during install before extraction, abort on mismatch.
- Delete the extracted `.7z` files from `$INSTDIR` afterwards so the installed
  footprint does not double.
- Extraction happens **before** the wizard launch and before service registration, so
  `$INSTDIR\wizard\OPSQAI-Wizard.exe`, `$INSTDIR\winsw\*`, `pgsql`, and
  `vendor\ollama\OllamaSetup.exe` all exist at the same paths as today. No service,
  bootstrap, updater, doctor, or desktop-shell path changes.
- Still one single user-facing `OPSQAI-Setup.exe`.

### Unchanged by design

- Ollama bundled, installed automatically, then `qwen2.5:7b`, `qwen2.5:3b`, `bge-m3`
  pulled by `services\bootstrap\ollama.cjs` during setup.
- PostgreSQL, pgvector, Caddy, Electron Wizard, Electron Desktop Shell all bundled.
- `verify-selfhost-migrations`, `verify-bundle`, `verify-ai-boundary`, payload
  guardrails and the minimum-payload-size check: all kept, none relaxed.
- No dependency changes, no `npm audit fix --force`.

## Verification

1. Local: `pwsh ./opsqai-windows/build/build.ps1 -Configuration Release` cannot run in
   this Linux sandbox, so the pack logic gets a unit test
   (`opsqai-windows/build/__tests__/pack-payload.test.ts`) covering part manifest
   generation, SHA-256 emission, and the size guards.
2. CI: push and re-run `.github/workflows/build-windows-installer.yml`, then read the
   `makensis` step output and confirm `OPSQAI-Setup.exe` is produced as an artifact.
3. Report the resulting installer size and per-part sizes.

## Acceptance

GitHub Actions completes `makensis` and publishes `OPSQAI-Setup.exe` with Ollama,
PostgreSQL, pgvector, Caddy, Wizard and Desktop Shell bundled.
