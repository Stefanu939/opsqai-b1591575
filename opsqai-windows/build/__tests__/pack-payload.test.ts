import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-expect-error — plain .mjs build script, no type declarations.
import {
  MAX_PART_BYTES,
  MAX_TOTAL_STORED_BYTES,
  PACK_COMPONENTS,
  assertPartSizes,
  packPayload,
  planParts,
  renderPartsNsh,
  verifyArchiveRoot,
} from "../pack-payload.mjs";

const ALL_DIRS = (PACK_COMPONENTS as { dir: string }[]).map((c) => c.dir);

/** In-memory fs double: the packer only needs existence + move/rm/size/hash. */
function harness(present: string[] = ALL_DIRS) {
  const dirs = new Set(present.map((d) => `/payload/${d}`));
  const written = new Map<string, string>();
  const archived: string[] = [];
  const removed: string[] = [];
  const moved: [string, string][] = [];
  const sizes = new Map<string, number>();

  const deps = {
    exists: (p: string) => dirs.has(p) || written.has(p),
    mkdir: (p: string) => dirs.add(p),
    rm: (p: string) => {
      dirs.delete(p);
      written.delete(p);
      removed.push(p);
    },
    move: (from: string, to: string) => {
      dirs.delete(from);
      dirs.add(to);
      moved.push([from, to]);
    },
    size: (p: string) => sizes.get(p) ?? 10 * 1024 * 1024,
    hash: (p: string) => `sha-${p.split("/").pop()}`,
    write: (p: string, body: string) => written.set(p, body),
    archive: ({ target, source }: { target: string; source: string }) => {
      archived.push(`${source} -> ${target}`);
      written.set(target, "7z");
      return target;
    },
    // Structure validation is exercised on its own below; the fs double has no
    // real archives to list.
    verify: () => 1,
  };

  return { deps, written, archived, removed, moved, sizes, dirs };
}

const run = (h: ReturnType<typeof harness>, flags = {}) =>
  packPayload({
    payloadDir: "/payload",
    partsDir: "/build/parts",
    nshPath: "/nsis/parts.generated.nsh",
    archiver: "/tools/7zr.exe",
    stashDir: "/build/staged",
    flags,
    deps: h.deps,
  });

describe("pack-payload", () => {
  it("packs every heavy component and nothing else", () => {
    const h = harness();
    const manifest = run(h);
    expect(manifest.parts.map((p: { name: string }) => p.name)).toEqual([
      "app",
      "runtime",
      "winsw",
      "caddy",
      "wizard",
      "desktop-shell",
      "pgsql",
      "vendor",
    ]);
    // Small dirs (services, tools with 7zr.exe, updater, assets) are never packed.
    expect(ALL_DIRS).not.toContain("tools");
    expect(ALL_DIRS).not.toContain("services");
    expect(h.archived).toHaveLength(8);
  });

  it("moves packed trees into the stash so NSIS never ships them twice", () => {
    const h = harness();
    run(h);
    expect(h.moved).toContainEqual(["/payload/pgsql", "/build/staged/pgsql"]);
    expect(h.moved).toContainEqual(["/payload/vendor", "/build/staged/vendor"]);
    expect(h.dirs.has("/payload/vendor")).toBe(false);
  });

  it("restores stashed components from a previous build before packing", () => {
    const h = harness([]); // nothing staged in payload...
    h.dirs.add("/build/staged/app");
    h.dirs.add("/build/staged/runtime");
    h.dirs.add("/build/staged/winsw");
    h.dirs.add("/build/staged/caddy");
    h.dirs.add("/build/staged/wizard");
    h.dirs.add("/build/staged/desktop-shell");
    h.dirs.add("/build/staged/pgsql");
    h.dirs.add("/build/staged/vendor");
    const manifest = run(h);
    expect(manifest.parts).toHaveLength(8);
    expect(h.moved[0]).toEqual(["/build/staged/app", "/payload/app"]);
  });

  it("writes a SHA-256 sidecar per part plus a manifest", () => {
    const h = harness();
    run(h);
    expect(h.written.get("/build/parts/vendor.7z.sha256")).toBe("sha-vendor.7z\n");
    const manifest = JSON.parse(h.written.get("/build/parts/parts.manifest.json")!);
    expect(manifest.parts.every((p: { sha256: string }) => p.sha256.length > 0)).toBe(true);
  });

  it("fails when a required component was never staged", () => {
    const h = harness(ALL_DIRS.filter((d) => d !== "pgsql"));
    expect(() => run(h)).toThrow(/required payload component "pgsql" is missing/);
  });

  it("allows optional components to be absent for dev builds", () => {
    const h = harness(ALL_DIRS.filter((d) => d !== "pgsql" && d !== "vendor"));
    const manifest = run(h, { skipPostgres: true, skipOllama: true });
    expect(manifest.parts.map((p: { name: string }) => p.name)).not.toContain("vendor");
    expect(manifest.parts).toHaveLength(6);
  });

  it("keeps Ollama required for a normal (non-skipped) build", () => {
    const h = harness(ALL_DIRS.filter((d) => d !== "vendor"));
    expect(() => run(h)).toThrow(/"vendor" is missing/);
  });

  it("rejects an oversized single part before makensis can crash", () => {
    expect(() =>
      assertPartSizes([{ file: "vendor.7z", bytes: MAX_PART_BYTES + 1 }]),
    ).toThrow(/exceeds the .* NSIS-safe limit/);
  });

  it("rejects an oversized stored total before makensis can crash", () => {
    const half = Math.floor(MAX_TOTAL_STORED_BYTES / 2) + 1;
    expect(() =>
      assertPartSizes([
        { file: "a.7z", bytes: half },
        { file: "b.7z", bytes: half },
      ]),
    ).toThrow(/NSIS-safe total/);
  });

  it("accepts a payload inside the limits", () => {
    const total = assertPartSizes([
      { file: "a.7z", bytes: 800 * 1024 * 1024 },
      { file: "b.7z", bytes: 400 * 1024 * 1024 },
    ]);
    expect(total).toBe(1200 * 1024 * 1024);
  });

  it("propagates the size guard through packPayload", () => {
    const h = harness();
    h.sizes.set("/build/parts/vendor.7z", MAX_PART_BYTES + 1);
    expect(() => run(h)).toThrow(/NSIS-safe limit/);
  });

  it("emits an NSIS include that stores parts uncompressed and verifies them", () => {
    const nsh = renderPartsNsh({
      partsDir: "C:\\src\\build\\parts",
      parts: [{ file: "vendor.7z", sha256: "abc123", label: "local AI engine (Ollama)" }],
    });
    expect(nsh).toContain("!define OPSQAI_PARTS_GENERATED");
    expect(nsh).toContain("SetCompress off");
    expect(nsh).toContain('File "C:\\src\\build\\parts\\vendor.7z"');
    expect(nsh).toContain(
      '!insertmacro OPSQAI_EXTRACT_PART "vendor.7z" "abc123" "local AI engine (Ollama)"',
    );
    // Stored archives must not stay behind in $INSTDIR.
    expect(nsh).toContain('RMDir /r "$INSTDIR\\parts"');
  });

  it("plans nothing to pack from an empty payload", () => {
    expect(() => planParts({ payloadDir: "/payload", exists: () => false, flags: {} })).toThrow();
    expect(
      planParts({
        payloadDir: "/payload",
        exists: (p: string) => !p.endsWith("pgsql") && !p.endsWith("vendor"),
        flags: { skipPostgres: true, skipOllama: true },
      }),
    ).toHaveLength(6);
  });

  it("invokes the archiver with deterministic 7z flags", () => {
    const h = harness();
    // Real `archive` impl, faked process runner: the archive appears on disk
    // exactly as 7zr would leave it.
    const runner = vi.fn((_bin: string, args: string[]) => {
      if (args[0] === "a") {
        h.written.set(args[args.length - 2]!, "7z");
        return { status: 0 };
      }
      // `l -ba -slt <target>` — emit a listing rooted at the component dir.
      const dir = args[args.length - 1]!.split("/").pop()!.replace(/\.7z$/, "");
      return { status: 0, stdout: `Path = ${dir}\nPath = ${dir}/content.bin\n` };
    });
    packPayload({
      payloadDir: "/payload",
      partsDir: "/build/parts",
      nshPath: "/nsis/parts.generated.nsh",
      archiver: "/tools/7zr.exe",
      stashDir: "/build/staged",
      deps: { ...h.deps, archive: undefined as never, verify: undefined as never, run: runner },
    });
    // The archive MUST be created from the payload parent with the component
    // directory as the argument, so the archive root is `app/…` and NSIS
    // extraction into $INSTDIR reproduces $INSTDIR\app\server\….
    expect(runner).toHaveBeenCalledWith(
      "/tools/7zr.exe",
      ["a", "-t7z", "-mx=5", "-mmt=on", "-y", "/build/parts/app.7z", "app"],
      { cwd: "/payload", stdio: "inherit" },
    );
  });

  // Regression (CI: `app.7z ... also has pgsql\pgAdmin 4\...\app`): with `-r`,
  // 7-Zip treats the bare `app` argument as a *name pattern* and walks the whole
  // cwd tree, so a sibling component's nested `app` directory (pgAdmin ships
  // one) lands at the archive ROOT as `pgsql/...`. Verified against real 7-Zip.
  it("never passes -r (which recurses from the payload parent into siblings)", () => {
    const h = harness();
    const calls: string[][] = [];
    const runner = vi.fn((_bin: string, args: string[]) => {
      calls.push(args);
      if (args[0] === "a") {
        h.written.set(args[args.length - 2]!, "7z");
        return { status: 0 };
      }
      const dir = args[args.length - 1]!.split("/").pop()!.replace(/\.7z$/, "");
      return { status: 0, stdout: `Path = ${dir}\nPath = ${dir}/content.bin\n` };
    });
    packPayload({
      payloadDir: "/payload",
      partsDir: "/build/parts",
      nshPath: "/nsis/parts.generated.nsh",
      archiver: "/tools/7zr.exe",
      stashDir: "/build/staged",
      deps: { ...h.deps, archive: undefined as never, verify: undefined as never, run: runner },
    });
    const addCalls = calls.filter((a) => a[0] === "a");
    expect(addCalls).toHaveLength(8);
    for (const args of addCalls) {
      expect(args).not.toContain("-r");
      expect(args.some((a) => a.startsWith("-r"))).toBe(false);
      // The component directory is the LAST argument and is a bare relative
      // name resolved against cwd=payloadDir — never a glob and never `..`.
      const dir = args[args.length - 1]!;
      expect(dir).not.toContain("*");
      expect(dir).not.toContain("..");
      expect(dir).toBe(dir.replace(/^[\\/]+/, ""));
    }
  });

});

describe("archive structure validation", () => {
  const listing = (paths: string[]) => ({
    status: 0,
    stdout: paths.map((p) => `Path = ${p}\nSize = 1\n`).join(""),
  });

  it("accepts an archive whose single root is the component directory", () => {
    const count = verifyArchiveRoot({
      archiver: "7zr",
      target: "/parts/app.7z",
      dir: "app",
      run: () => listing(["app", "app/server", "app/server/migrate.mjs"]),
    });
    expect(count).toBe(3);
  });

  it("accepts Windows backslash listings", () => {
    expect(
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/pgsql.7z",
        dir: "pgsql",
        run: () => listing(["pgsql\\bin\\psql.exe", "pgsql\\lib\\vector.dll"]),
      }),
    ).toBe(2);
  });

  // Nested directories that happen to REPEAT a component name are legitimate
  // payload content (pgAdmin ships resources/app) and must stay valid as long as
  // the first path segment is the component itself.
  it("accepts deeply nested directories that reuse component names", () => {
    const paths = [
      "app",
      "app/server/migrate.mjs",
      "app/pgsql/pgAdmin 4/runtime/resources/app",
      "app/pgsql/pgAdmin 4/runtime/resources/app/index.js",
      "app/runtime/node/node.exe",
      "app/vendor/wizard/desktop-shell/caddy/winsw/app",
    ];
    expect(
      verifyArchiveRoot({ archiver: "7zr", target: "/parts/app.7z", dir: "app", run: () => listing(paths) }),
    ).toBe(paths.length);
  });

  it("rejects app.7z when a sibling component leaks in at the archive root", () => {
    // Exactly what real 7-Zip produced with `-r`: the sibling pgsql tree's own
    // nested `app` directory matched the name pattern and was stored at root.
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/app.7z",
        dir: "app",
        run: () =>
          listing([
            "app",
            "app/server/migrate.mjs",
            "pgsql/pgAdmin 4/runtime/resources/app",
            "pgsql/pgAdmin 4/runtime/resources/app/main.js",
          ]),
      }),
    ).toThrow(/must contain exactly one top-level directory "app\/"[\s\S]*pgsql/);
  });

  it("rejects a wrong-root archive even when it has exactly one root", () => {
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/desktop-shell.7z",
        dir: "desktop-shell",
        run: () => listing(["wizard", "wizard/main.cjs"]),
      }),
    ).toThrow(/exactly one top-level directory "desktop-shell\/"/);
  });

  it("rejects a near-miss prefix that is not a real path segment", () => {
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/app.7z",
        dir: "app",
        run: () => listing(["app-backup/server.js"]),
      }),
    ).toThrow(/exactly one top-level directory "app\/"/);
  });

  it("enforces the invariant for every packed component", () => {
    for (const { dir } of PACK_COMPONENTS as { dir: string }[]) {
      expect(
        verifyArchiveRoot({
          archiver: "7zr",
          target: `/parts/${dir}.7z`,
          dir,
          run: () => listing([dir, `${dir}/nested/${dir}/file.bin`]),
        }),
      ).toBe(2);
      expect(() =>
        verifyArchiveRoot({
          archiver: "7zr",
          target: `/parts/${dir}.7z`,
          dir,
          run: () => listing([`${dir}/ok.bin`, "stray/at/root.bin"]),
        }),
      ).toThrow(new RegExp(`exactly one top-level directory "${dir}/"`));
    }
  });

  it("rejects a flat archive that would explode into $INSTDIR", () => {
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/runtime.7z",
        dir: "runtime",
        run: () => listing(["node", "node/node.exe"]),
      }),
    ).toThrow(/must contain exactly one top-level directory "runtime\/"/);
  });

  it("rejects a fully flat archive of loose files", () => {
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/wizard.7z",
        dir: "wizard",
        run: () => listing(["main.cjs", "package.json", "renderer/wizard.js"]),
      }),
    ).toThrow(/exactly one top-level directory "wizard\/"/);
  });



  it("rejects a flat archive that would explode into $INSTDIR", () => {
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/runtime.7z",
        dir: "runtime",
        run: () => listing(["node", "node/node.exe"]),
      }),
    ).toThrow(/must contain exactly one top-level directory "runtime\/"/);
  });

  it("rejects an empty archive", () => {
    expect(() =>
      verifyArchiveRoot({ archiver: "7zr", target: "/parts/app.7z", dir: "app", run: () => listing([]) }),
    ).toThrow(/contains no entries/);
  });

  it("fails the build when the listing command errors", () => {
    expect(() =>
      verifyArchiveRoot({
        archiver: "7zr",
        target: "/parts/app.7z",
        dir: "app",
        run: () => ({ status: 2, stdout: "" }),
      }),
    ).toThrow(/could not list/);
  });

  it("propagates structure validation through packPayload", () => {
    const h = harness();
    expect(() =>
      packPayload({
        payloadDir: "/payload",
        partsDir: "/build/parts",
        nshPath: "/nsis/parts.generated.nsh",
        archiver: "/tools/7zr.exe",
        stashDir: "/build/staged",
        deps: {
          ...h.deps,
          verify: undefined as never,
          run: (_bin: string, args: string[]) =>
            args[0] === "a" ? { status: 0 } : { status: 0, stdout: "Path = server\n" },
        },
      }),
    ).toThrow(/exactly one top-level directory "app\/"/);
  });
});

describe("pack-payload CLI entrypoint", () => {
  // Regression: the entrypoint guard used to compare import.meta.url against
  // `file://${process.argv[1]}`, which never matches a Windows drive path, so
  // CI ran the packer, got exit 0, and packed nothing.
  it("packs and writes both outputs when run as a child process", () => {
    const tmp = mkdtempSync(join(tmpdir(), "opsqai-pack-"));
    const payload = join(tmp, "payload");
    for (const dir of ALL_DIRS) {
      mkdirSync(join(payload, dir), { recursive: true });
      writeFileSync(join(payload, dir, "content.bin"), dir);
    }
    // Fake archiver: 7z-compatible enough for the packer (create the target).
    const archiver = join(tmp, "fake7z.mjs");
    writeFileSync(
      archiver,
      [
        "import{writeFileSync}from'node:fs';",
        "const a=process.argv.slice(2);",
        "if(a[0]==='a'){writeFileSync(a[a.length-2],'archive');}",
        "else{const d=a[a.length-1].split(/[\\\\/]/).pop().replace(/\\.7z$/,'');",
        "process.stdout.write('Path = '+d+'\\nPath = '+d+'/content.bin\\n');}",
      ].join(""),
    );
    const shim = join(tmp, process.platform === "win32" ? "fake7z.cmd" : "fake7z.sh");
    writeFileSync(
      shim,
      process.platform === "win32"
        ? `@echo off\r\nnode "${archiver}" %*\r\n`
        : `#!/bin/sh\nexec node "${archiver}" "$@"\n`,
      { mode: 0o755 },
    );

    const partsDir = join(tmp, "parts");
    const nsh = join(tmp, "parts.generated.nsh");
    const result = spawnSync(
      process.execPath,
      [
        join(import.meta.dirname, "..", "pack-payload.mjs"),
        "--payload", payload,
        "--parts", partsDir,
        "--nsh", nsh,
        "--archiver", shim,
      ],
      { encoding: "utf8" },
    );

    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(existsSync(nsh)).toBe(true);
    expect(existsSync(join(partsDir, "parts.manifest.json"))).toBe(true);
    expect(readFileSync(nsh, "utf8")).toContain("OPSQAI_EXTRACT_PARTS");
    expect(result.stdout).toContain("app.7z");

    rmSync(tmp, { recursive: true, force: true });
  });
});
