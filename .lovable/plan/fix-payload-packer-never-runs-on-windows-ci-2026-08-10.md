# Fix: payload packer never runs on Windows CI

## What the log actually shows

The build reached the pack step, printed `Packing payload parts with C:\Program Files\7-Zip\7z.exe ...`,
and then produced **no packer output at all** — no per-part sizes, no error — before failing on:

```text
Missing generated NSIS parts include at ...\installer\nsis\parts.generated.nsh
```

`pack-payload.mjs` exited 0 without doing anything, so `$LASTEXITCODE -ne 0` did not trip and the
`Assert-Exists` guard caught it one line later.

## Root cause

The entrypoint guard at the bottom of `opsqai-windows/build/pack-payload.mjs`:

```js
if (import.meta.url === `file://${process.argv[1]}`) main();
```

On Windows `process.argv[1]` is a drive path (`D:\a\...\build\pack-payload.mjs`) while
`import.meta.url` is `file:///D:/a/.../build/pack-payload.mjs`. The strings never match, so `main()`
is never called: the module loads, defines its exports, and exits cleanly. This is why the unit tests
pass (they import the exported functions directly) while CI silently skips all packing.

## The fix

1. `opsqai-windows/build/pack-payload.mjs`
   - Compare against `pathToFileURL(process.argv[1]).href` from `node:url` instead of a hand-built
     `file://` string, so the guard is correct on Windows and POSIX alike.
2. `opsqai-windows/build/build.ps1`
   - Make the pack step fail loudly rather than relying on a downstream file check: after invoking
     the packer, verify the parts manifest and the generated `.nsh` both exist and report which one
     is missing. Keep the existing `$LASTEXITCODE` check.
3. `docs/engineering/windows-installer-packaging.md`
   - Create the document the packer's oversize errors already point at: why parts exist, the size
     guardrails, and how to add or split a component.
4. `opsqai-windows/build/__tests__/pack-payload.test.ts`
   - Add a regression test that runs `pack-payload.mjs` as a real child process against a temp
     payload with a fake archiver, asserting the `.nsh` and manifest are written. This is what the
     current suite cannot catch, because it never executes the CLI entrypoint.

Nothing about the packaging strategy, Ollama bundling, guardrails, or NSIS script changes — the
strategy was correct, it just never executed.

## Verification

- `bunx vitest run opsqai-windows/build/__tests__/pack-payload.test.ts` — new CLI test fails before
  the fix, passes after.
- Re-run the `Build Windows installer` workflow and confirm the packer prints the per-part size table
  followed by `makensis` completing and uploading `OPSQAI-Setup.exe`.
