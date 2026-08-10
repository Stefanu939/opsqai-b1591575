# Windows installer packaging (payload parts)

## Why parts exist

`makensis.exe` is a 32-bit process. With `SetCompressor /SOLID lzma` it keeps the entire compressed
data block in one growable memory-mapped region. Once the Self-Hosted payload grew large enough
(app + Node runtime + PostgreSQL + pgvector + Caddy + WinSW + Electron wizard + Electron desktop
shell + `OllamaSetup.exe`), growing that mapping fails:

```text
Internal compiler error #12345: error mmapping datablock to 33556560
```

So compression moved **out** of makensis. `opsqai-windows/build/pack-payload.mjs` pre-compresses each
heavy component into its own `.7z` part; NSIS merely **stores** those opaque blobs
(`SetCompressor /FINAL lzma` plus `SetCompress off` around the parts). No solid datablock, no giant
mapping, still one single `OPSQAI-Setup.exe`.

```text
build.ps1 staging                pack step                       NSIS
payload\app          ─┐
payload\runtime      ─┤                                  parts\*.7z stored verbatim
payload\pgsql        ─┼─►  7z a -mx=5 per component ──►   + SHA-256 per part
payload\caddy        ─┤     + parts.generated.nsh                │
payload\winsw        ─┤     + parts.manifest.json                ▼
payload\wizard       ─┤                             install: verify sha256,
payload\desktop-shell┤                                      7zr x → $INSTDIR
payload\vendor       ─┘
small files (services, tools\7zr.exe, winsw-configs, updater key, assets) stay plain File /r
```

Packed components are **moved** out of the NSIS-visible payload root into `build\staged` after
archiving, so `File /r payload\*.*` does not also ship the uncompressed tree. The stash is restored
on the next run so repeat builds do not re-download gigabytes of runtimes.

## Guardrails

- `MAX_PART_BYTES` — 1.5 GB per part.
- `MAX_TOTAL_STORED_BYTES` — 1.8 GB stored total.

Exceeding either fails the build with an actionable message instead of letting makensis die with an
internal compiler error. Split the offending component (see below) rather than raising the limits.

`build.ps1` additionally asserts that the packer wrote **both** `build\parts\parts.manifest.json` and
`installer\nsis\parts.generated.nsh`. A packer that exits 0 without producing them is a hard failure:
that exact silent-skip happened once because the CLI entrypoint guard compared `import.meta.url`
against a hand-built `file://${process.argv[1]}` string, which never matches a Windows drive path.
Any new build script entrypoint must use `pathToFileURL(process.argv[1]).href`.

## Adding a component

1. Stage it into `opsqai-windows\payload\<dir>` in `build.ps1`, with a pinned SHA-256 for any
   download, and keep an `Assert-Exists` guardrail on the staged tree.
2. Add an entry to `PACK_COMPONENTS` in `pack-payload.mjs`:
   `{ name, dir, label, optional?: "skipFlag" }`. `label` is what the installer prints while
   extracting ("Extracting PostgreSQL…").
3. Nothing to change in `OPSQAI-Setup.nsi` — the generated include drives both storing and
   extraction.

## Splitting a component that is too large

Stage it as two sibling directories (for example `pgsql-bin` and `pgsql-share`) and register both in
`PACK_COMPONENTS`. Both extract into `$INSTDIR` at the same relative paths, so the installed layout
is unchanged.

## Local verification

```sh
bunx vitest run opsqai-windows/build/__tests__/pack-payload.test.ts
```

The full build itself only runs on Windows (`pwsh ./opsqai-windows/build/build.ps1 -Configuration Release`).

## Installed layout contract

Each `.7z` part is extracted straight into `$INSTDIR`, so **the archive root
defines the installed layout**. Every part must contain exactly one top-level
entry — its component directory (`app/`, `runtime/`, `pgsql/`, `caddy/`,
`winsw/`, `wizard/`, `desktop-shell/`, `vendor/`). Archiving a component's
*contents* produced `$INSTDIR\server`, `$INSTDIR\node`, `$INSTDIR\bin` instead of
`$INSTDIR\app\server`, `$INSTDIR\runtime\node`, `$INSTDIR\pgsql\bin`, and every
service then failed to start. `pack-payload.mjs` enforces this via
`verifyArchiveRoot`, `build.ps1` asserts every non-skipped component produced a
part, and `verify-install-layout.ps1` re-checks it on the installed machine.

## Acceptance on a clean machine

After `OPSQAI-Setup.exe` finishes:

```powershell
powershell -ExecutionPolicy Bypass -File opsqai-windows\build\verify-install-layout.ps1
# restart the services (or re-run Setup), then:
powershell -ExecutionPolicy Bypass -File opsqai-windows\build\verify-install-layout.ps1 -Rerun
```

The first pass asserts directory layout, BOM-safe `config.json` with a UUID
`installId`, PostgreSQL listening on 55432, the `opsqai` database and all
migrations applied, the seeded owner account, the platform answering
`/health` (distinguishing *not listening* from *listening but unhealthy*),
`install_id` propagation into the app process, Caddy on `https://localhost`, and
no service restart loops. `-Rerun` compares against the baseline it wrote to
prove an upgrade preserved `installId`, the embedded PostgreSQL password, the
data directory and existing rows. Trusting the local Caddy CA is best-effort: a
failure only causes a browser certificate warning and never aborts install.
