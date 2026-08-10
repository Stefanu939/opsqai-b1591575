// One parsing contract for OPSQAI config.json:
//   UTF-8 with BOM    -> accepted
//   UTF-8 without BOM -> accepted
//   malformed JSON    -> clear failure naming the file
import { describe, expect, it } from "vitest";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { loadConfig, readJsonFile } = require("../common/config.js") as any;

function tmpConfig(body: string) {
  const dir = mkdtempSync(join(tmpdir(), "opsqai-cfg-"));
  const path = join(dir, "config.json");
  writeFileSync(path, body, "utf8");
  return { dir, path };
}

const VALID = JSON.stringify({
  installId: "11111111-2222-3333-4444-555555555555",
  database: { mode: "embedded", embedded: { port: 55432, password: "keep-me" } },
});

describe("config.json parsing contract", () => {
  it("loads UTF-8 without a BOM", () => {
    const { dir, path } = tmpConfig(VALID);
    expect(loadConfig(path).installId).toBe("11111111-2222-3333-4444-555555555555");
    rmSync(dir, { recursive: true, force: true });
  });

  it("loads UTF-8 WITH a BOM (PowerShell/Notepad write one)", () => {
    const { dir, path } = tmpConfig(`\uFEFF${VALID}`);
    const cfg = loadConfig(path);
    expect(cfg.installId).toBe("11111111-2222-3333-4444-555555555555");
    expect(cfg.database.embedded.password).toBe("keep-me");
    rmSync(dir, { recursive: true, force: true });
  });

  it("preserves non-ASCII content instead of transcoding it", () => {
    const { dir, path } = tmpConfig(
      `\uFEFF${JSON.stringify({ company: { name: "Müller & Söhne — Ürün" } })}`,
    );
    expect(readJsonFile(path).company.name).toBe("Müller & Söhne — Ürün");
    rmSync(dir, { recursive: true, force: true });
  });

  it("still fails clearly on malformed JSON", () => {
    const { dir, path } = tmpConfig("{ not json");
    expect(() => loadConfig(path)).toThrow(/Invalid JSON in .*config\.json/);
    rmSync(dir, { recursive: true, force: true });
  });

  it("fails with an actionable message when the file is missing", () => {
    expect(() => loadConfig(join(tmpdir(), "nope-opsqai", "config.json"))).toThrow(
      /OPSQAI config not found at/,
    );
  });

  it("keeps config.json the only directly-parsed OPSQAI config in the Windows tree", () => {
    // Everything else must go through loadConfig()/readJsonFile(); this guards
    // against a new service re-introducing a BOM-fragile read.
    const root = join(import.meta.dirname, "..", "..");
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === "payload") continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(js|cjs|mjs)$/.test(entry.name)) continue;
        const src = readFileSync(full, "utf8");
        // A direct config read is only acceptable when it strips the BOM in the
        // same expression (migrate.mjs is staged standalone into app\\server and
        // cannot require ../common/config).
        const direct = src.match(
          /JSON\.parse\(\s*(?:fs\.)?readFileSync\([^)]*config(?:Path|\.json)[^;]*/g,
        );
        if (direct?.some((m) => !m.includes("\\uFEFF"))) {
          offenders.push(full.slice(root.length + 1));
        }
      }
    };
    walk(join(root, "services"));
    expect(offenders).toEqual([]);
  });
});

describe("WinSW service definitions", () => {
  const dir = join(import.meta.dirname, "..", "..", "winsw-configs");
  const needsConfig = [
    "OpsqaiDatabase.xml",
    "OpsqaiPlatform.xml",
    "OpsqaiWorker.xml",
    "OpsqaiUpdater.xml",
  ];

  it("passes OPSQAI_CONFIG to every service that loads OPSQAI config", () => {
    for (const file of needsConfig) {
      const xml = readFileSync(join(dir, file), "utf8");
      expect(xml, file).toContain(
        '<env name="OPSQAI_CONFIG"  value="%ProgramData%\\OPSQAI\\config\\config.json"/>',
      );
    }
  });

  it("keeps the database -> platform -> caddy dependency graph", () => {
    expect(readFileSync(join(dir, "OpsqaiPlatform.xml"), "utf8")).toContain(
      "<depend>OpsqaiDatabase</depend>",
    );
    expect(readFileSync(join(dir, "OpsqaiCaddy.xml"), "utf8")).toContain(
      "<depend>OpsqaiPlatform</depend>",
    );
  });
});
