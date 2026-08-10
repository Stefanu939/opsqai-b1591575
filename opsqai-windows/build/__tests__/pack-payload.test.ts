import { describe, expect, it, vi } from "vitest";
// @ts-expect-error — plain .mjs build script, no type declarations.
import {
  MAX_PART_BYTES,
  MAX_TOTAL_STORED_BYTES,
  PACK_COMPONENTS,
  assertPartSizes,
  packPayload,
  planParts,
  renderPartsNsh,
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
    const runner = vi.fn().mockReturnValue({ status: 0 });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const h = harness();
    packPayload({
      payloadDir: "/payload",
      partsDir: "/build/parts",
      nshPath: "/nsis/parts.generated.nsh",
      archiver: "/tools/7zr.exe",
      stashDir: "/build/staged",
      deps: { ...h.deps, archive: undefined as never, run: runner },
    });
    expect(runner).toHaveBeenCalledWith(
      "/tools/7zr.exe",
      ["a", "-t7z", "-mx=5", "-mmt=on", "-y", "-r", "/build/parts/app.7z", "*"],
      { cwd: "/payload/app", stdio: "inherit" },
    );
  });
});
