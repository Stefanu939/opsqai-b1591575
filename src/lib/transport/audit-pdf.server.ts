// OPSQAI Transport — periodic audit report rendering (server only).
//
// pdf-lib is pure JavaScript, so the same code path works on the Self-Hosted
// Node runtime. One A4 report per audit run, for compliance filing.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { CheckResult, WeeklyCheck } from "./types";

/** Helvetica is WinAnsi-only: fold Romanian/German diacritics it cannot draw. */
function ascii(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢ]/g, "T")
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/[–—]/g, "-");
}

const OUTCOME_LABEL: Record<CheckResult["outcome"], string> = {
  pending: "Pending",
  ok: "OK",
  issue: "Issue",
  not_applicable: "N/A",
};

function day(value: string | null): string {
  if (!value) return "-";
  return String(value).slice(0, 10);
}

export async function renderAuditReportPdf(input: {
  check: WeeklyCheck;
  results: CheckResult[];
  companyName?: string | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const M = 40;
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const W = PAGE_W - M * 2;
  const ink = rgb(0.09, 0.11, 0.12);
  const muted = rgb(0.38, 0.41, 0.42);
  const line = rgb(0.75, 0.77, 0.77);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed > M) return;
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - M;
  };

  const text = (
    value: string,
    x: number,
    size = 9.5,
    useBold = false,
    color = ink,
  ) => {
    page.drawText(ascii(value), { x, y, size, font: useBold ? bold : font, color });
  };

  const wrap = (value: string, x: number, width: number, size = 9) => {
    const words = ascii(value).split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > width) {
        newPageIfNeeded(size + 4);
        text(current, x, size, false, muted);
        y -= size + 3;
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) {
      newPageIfNeeded(size + 4);
      text(current, x, size, false, muted);
      y -= size + 3;
    }
  };

  const rule = () => {
    page.drawLine({
      start: { x: M, y },
      end: { x: M + W, y },
      thickness: 0.6,
      color: line,
    });
    y -= 12;
  };

  text("Transport audit report", M, 18, true);
  y -= 22;
  text(input.companyName ? String(input.companyName) : "OPSQAI Transport", M, 10, false, muted);
  y -= 18;

  const counts = {
    ok: input.results.filter((r) => r.outcome === "ok").length,
    issue: input.results.filter((r) => r.outcome === "issue").length,
    na: input.results.filter((r) => r.outcome === "not_applicable").length,
    pending: input.results.filter((r) => r.outcome === "pending").length,
  };

  const meta: Array<[string, string]> = [
    ["Period start", day(input.check.period_start)],
    ["Due", day(input.check.due_on)],
    ["Status", input.check.status],
    ["Completed", day(input.check.completed_at)],
    ["Performed by", input.check.ran_by_name ?? "-"],
    [
      "Result",
      `${counts.ok} OK · ${counts.issue} issues · ${counts.na} N/A · ${counts.pending} pending`,
    ],
  ];
  for (const [label, value] of meta) {
    newPageIfNeeded(16);
    text(label, M, 9, true);
    text(value, M + 130, 9);
    y -= 14;
  }
  y -= 4;
  rule();

  text("Checklist", M, 12, true);
  y -= 18;

  for (const result of input.results) {
    newPageIfNeeded(30);
    text(OUTCOME_LABEL[result.outcome], M, 9, true);
    text(result.item_label, M + 70, 9.5);
    y -= 13;
    if (result.note) wrap(`Note: ${result.note}`, M + 70, W - 70, 8.5);
    const links: string[] = [];
    if (result.incident_id) links.push(`Incident ${result.incident_id.slice(0, 8)}`);
    if (result.request_id) links.push(`Request ${result.request_id.slice(0, 8)}`);
    if (links.length) {
      newPageIfNeeded(14);
      text(links.join(" · "), M + 70, 8.5, false, muted);
      y -= 12;
    }
    y -= 4;
  }

  if (input.check.summary) {
    y -= 8;
    rule();
    text("Summary", M, 12, true);
    y -= 16;
    wrap(input.check.summary, M, W, 9);
  }

  newPageIfNeeded(30);
  y -= 10;
  text(`Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`, M, 8, false, muted);

  return doc.save();
}
