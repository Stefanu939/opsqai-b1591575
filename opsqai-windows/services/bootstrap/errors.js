// OPSQAI stable bootstrap error codes.
//
// Every bootstrap failure surface (log line, wizard UI, installation_state.last_error)
// uses one of these codes. The underlying SQLSTATE / message may change between
// PostgreSQL versions; the OPSQAI-E**** code is the stable identifier customers
// quote to support and docs anchor.
//
// KEEP IN SYNC with docs/administrator-guide/15-troubleshooting.md.

"use strict";

const CODES = {
  "OPSQAI-E1001": {
    category: "migrate",
    title: "Database migration failed",
    docsAnchor: "opsqai-e1001",
  },
  "OPSQAI-E1002": {
    category: "migrate",
    title: "Post-migration health probe failed",
    docsAnchor: "opsqai-e1002",
  },
  "OPSQAI-E1101": {
    category: "database",
    title: "Database unreachable",
    docsAnchor: "opsqai-e1101",
  },
  "OPSQAI-E1102": {
    category: "database",
    title: "Embedded PostgreSQL failed to start",
    docsAnchor: "opsqai-e1102",
  },
  "OPSQAI-E1201": {
    category: "seed",
    title: "Administrator seed failed",
    docsAnchor: "opsqai-e1201",
  },
  "OPSQAI-E1301": {
    category: "services",
    title: "OPSQAI services failed to start",
    docsAnchor: "opsqai-e1301",
  },
  "OPSQAI-E1901": {
    category: "unknown",
    title: "Bootstrap failed",
    docsAnchor: "opsqai-e1901",
  },
};

// Categories that should NEVER suggest a database reset — those are
// transient service/port issues, not schema corruption.
const TRANSIENT_CATEGORIES = new Set(["database", "services"]);

function describe(code) {
  return CODES[code] || CODES["OPSQAI-E1901"];
}

function isTransient(code) {
  return TRANSIENT_CATEGORIES.has(describe(code).category);
}

/**
 * Emit a structured single-line FAIL marker to stdout.
 * Format:
 *   [<component>] FAIL code=OPSQAI-EXXXX [key=value ...] message="..."
 * The wizard renderer parses this line to render the failure card.
 */
function formatFail(component, code, fields = {}) {
  const parts = [`[${component}] FAIL`, `code=${code}`];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null || v === "") continue;
    if (k === "message") continue;
    parts.push(`${k}=${JSON.stringify(String(v))}`);
  }
  if (fields.message) {
    parts.push(`message=${JSON.stringify(String(fields.message))}`);
  }
  return parts.join(" ");
}

/**
 * Parse a FAIL marker line back into structured fields.
 * Returns null when the line is not a FAIL marker.
 */
function parseFail(line) {
  const m = /\[(\w+)\]\s+FAIL\s+(.*)$/.exec(String(line || ""));
  if (!m) return null;
  const component = m[1];
  const rest = m[2];
  const fields = {};
  const re = /(\w+)=("(?:[^"\\]|\\.)*"|\S+)/g;
  let match;
  while ((match = re.exec(rest)) !== null) {
    let v = match[2];
    if (v.startsWith('"') && v.endsWith('"')) {
      try {
        v = JSON.parse(v);
      } catch {
        v = v.slice(1, -1);
      }
    }
    fields[match[1]] = v;
  }
  return { component, ...fields };
}

module.exports = { CODES, describe, isTransient, formatFail, parseFail };
