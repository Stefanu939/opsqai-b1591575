// OPSQAI Core — Operations PDF reports (server only).
// Self-Hosted user exports are PDF only; no spreadsheet output.

import { generatePdf, type PdfBlock } from "@/lib/generators/pdf.server";
import type { CoreAnalytics, CoreIncidentDetail } from "./types";

const money = (value: number, currency: string) =>
  `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value)} ${currency}`;

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");

export async function renderIncidentPdf(
  detail: CoreIncidentDetail,
  options: { showCosts: boolean },
): Promise<string> {
  const i = detail.incident;
  const rc = detail.rootCause;
  const blocks: PdfBlock[] = [
    {
      type: "kpis",
      items: [
        { label: "Reference", value: i.ref ?? "—" },
        { label: "Type", value: i.kind },
        { label: "Status", value: i.status },
        ...(options.showCosts
          ? [{ label: "Direct cost", value: money(i.cost_amount, i.currency) }]
          : []),
      ],
    },
    { type: "h2", text: "Incident record" },
    {
      type: "table",
      headers: ["Field", "Value"],
      rows: [
        ["Title", i.title],
        ["Occurred", new Date(i.occurred_at).toLocaleString("en-GB")],
        ["Department", i.department_name ?? "—"],
        ["Location", i.location ?? "—"],
        ["Involved", [i.involved_person, i.involved_role].filter(Boolean).join(" — ") || "—"],
        ["Frequency / month", String(i.frequency_per_month)],
        ["Downtime (min)", String(i.lost_minutes)],
      ],
    },
    ...(i.description ? ([{ type: "p", text: i.description }] as PdfBlock[]) : []),
    { type: "h2", text: "Related knowledge" },
    detail.links.length
      ? {
          type: "table",
          headers: ["Relation", "Procedure / FAQ", "Note"],
          rows: detail.links.map((l) => [l.link_type, l.target_title ?? "—", l.note ?? ""]),
        }
      : { type: "p", text: "No procedure or FAQ has been linked to this incident." },
  ];

  if (rc) {
    blocks.push(
      { type: "h2", text: "Root cause analysis" },
      {
        type: "table",
        headers: ["Field", "Finding"],
        rows: [
          ["Problem", rc.problem ?? "—"],
          ["Immediate cause", rc.immediate_cause ?? "—"],
          ["Root cause", rc.root_cause ?? "—"],
          ["Procedure violated", rc.sop_violation ?? "—"],
          ["Process failure", rc.process_failure ?? "—"],
          ["Lean classification", rc.lean_class ?? "—"],
          ...(options.showCosts
            ? [["Annualised impact", money(rc.financial_impact, i.currency)]]
            : []),
        ],
      },
      { type: "h3", text: "5 Why" },
      {
        type: "numbered",
        items: rc.why_steps.length
          ? rc.why_steps.map((s) => `${s.question} — ${s.supported ? s.answer : "UNKNOWN"}`)
          : ["Not analysed yet."],
      },
    );
    if (rc.unsupported.length) {
      blocks.push({
        type: "callout",
        kind: "risk",
        title: "Not covered by the knowledge base",
        text: rc.unsupported.join(" · "),
      });
    }
    if (rc.sources.length) {
      blocks.push({
        type: "p",
        text: `Sources: ${rc.sources.map((s) => s.title).join("; ")}`,
      });
    }
  }

  blocks.push(
    { type: "h2", text: "Corrective and preventive actions" },
    detail.actions.length
      ? {
          type: "table",
          headers: ["Type", "Action", "Owner", "Due", "Status"],
          rows: detail.actions.map((a) => [
            a.kind,
            a.title,
            a.owner_name ?? "—",
            a.due_date ?? "—",
            a.status,
          ]),
        }
      : { type: "p", text: "No actions recorded yet." },
  );

  const bytes = await generatePdf({
    title: `Incident ${i.ref ?? ""} — ${i.title}`,
    subtitle: "OPSQAI Core — Operational Intelligence",
    blocks,
    meta: {
      documentType: "Incident report",
      date: new Date().toLocaleDateString("en-GB"),
      confidentiality: "Internal",
      brand: "OPSQAI",
    },
  });
  return b64(bytes);
}

export async function renderAnalyticsPdf(
  stats: CoreAnalytics,
  options: { showCosts: boolean },
): Promise<string> {
  const t = stats.totals;
  const blocks: PdfBlock[] = [
    {
      type: "kpis",
      items: [
        { label: "Incidents", value: String(t.incidents) },
        ...(options.showCosts
          ? [
              { label: "Direct cost", value: money(t.cost, stats.currency) },
              { label: "Annualised impact", value: money(t.annualImpact, stats.currency) },
            ]
          : []),
        { label: "Downtime (min)", value: String(t.lostMinutes) },
        { label: "Open actions", value: `${t.openActions} (${t.overdueActions} overdue)` },
        { label: "Open knowledge gaps", value: String(t.openGaps) },
        {
          label: "Answer quality",
          value: t.answerQuality === null ? "—" : `${t.answerQuality}%`,
        },
      ],
    },
    { type: "h2", text: "By department" },
    {
      type: "table",
      headers: options.showCosts ? ["Department", "Incidents", "Cost"] : ["Department", "Incidents"],
      rows: stats.byDepartment.map((r) =>
        options.showCosts
          ? [r.label, String(r.incidents), money(r.cost, stats.currency)]
          : [r.label, String(r.incidents)],
      ),
    },
    { type: "h2", text: "By type" },
    {
      type: "table",
      headers: ["Type", "Incidents"],
      rows: stats.byKind.map((r) => [r.label, String(r.incidents)]),
    },
    { type: "h2", text: "Top root causes" },
    stats.topRootCauses.length
      ? {
          type: "table",
          headers: ["Root cause", "Incidents"],
          rows: stats.topRootCauses.map((r) => [r.label, String(r.incidents)]),
        }
      : { type: "p", text: "No analyses recorded yet." },
    { type: "h2", text: "Most violated procedures" },
    stats.topViolatedSops.length
      ? {
          type: "table",
          headers: ["Procedure", "Incidents"],
          rows: stats.topViolatedSops.map((r) => [r.label, String(r.incidents)]),
        }
      : { type: "p", text: "No procedure violations linked yet." },
    { type: "h2", text: "Trend (last 12 months)" },
    {
      type: "table",
      headers: ["Month", "Incidents"],
      rows: stats.trend.map((r) => [r.month, String(r.incidents)]),
    },
  ];

  const bytes = await generatePdf({
    title: "Operations intelligence report",
    subtitle: "OPSQAI Core — incidents, root causes, actions",
    blocks,
    meta: {
      documentType: "Operations report",
      date: new Date().toLocaleDateString("en-GB"),
      confidentiality: "Internal",
      brand: "OPSQAI",
    },
  });
  return b64(bytes);
}
