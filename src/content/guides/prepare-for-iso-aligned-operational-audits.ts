import type { Guide } from "./_types";

export const guide: Guide = {
  slug: "prepare-for-iso-aligned-operational-audits",
  title: "How to Prepare for ISO-Aligned Operational Audits",
  description:
    "A pragmatic prep guide for ISO 9001 / 27001-aligned operational audits when AI is in the answer path.",
  keywords: "ISO 9001 audit, ISO 27001 audit, AI audit preparation, operational audit",
  datePublished: "2026-07-02",
  author: { name: "OPSQAI Editorial", role: "Compliance" },
  readingMinutes: 11,
  lede: "ISO auditors do not have opinions about AI. They have opinions about controls. If the AI system's controls map to the standard's clauses, the audit is manageable.",
  steps: [
    {
      name: "Map every AI touchpoint to a control",
      text: "For each place AI produces an operational answer, name the control that governs it: input validation, retrieval scope, refusal criteria, logging, access control. If a touchpoint has no control, close it or restrict it.",
    },
    {
      name: "Freeze document versions for the audit period",
      text: "Auditors will ask what the SOP said on a specific date. Version retention must exceed the audit lookback window. OPSQAI keeps every published version indefinitely by default.",
    },
    {
      name: "Prepare the reconstruction demo",
      text: "Practise reconstructing a single interaction end-to-end: operator identity, prompt, retrieved passages with versions, AI response, timestamp. The auditor may ask for two or three samples — you should be able to produce them in minutes.",
    },
    {
      name: "Document the refusal criteria",
      text: "ISO 9001 clause 8.5.1 wants controlled outputs. Refusal is a controlled output. Write it down: when does the AI refuse, what happens next, who owns the resulting gap ticket.",
    },
    {
      name: "Confirm data flow diagrams reflect reality",
      text: "AI features move data in ways diagrams often miss. Update the DFDs to show retrieval, prompt storage, and log retention. Auditors will ask.",
    },
  ],
  relatedLandingPages: ["/trust/iso-27001-roadmap", "/trust/audit-logs"],
};
