import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/responsible-ai")({
  head: () => ({ meta: [
    { title: "Responsible AI — OPSQAI Trust Center" },
    { name: "description", content: "OPSQAI answers strictly from retrieved customer documents, refuses when there is no source, and does not train foundation models on customer data." },
    { property: "og:title", content: "Responsible AI — OPSQAI Trust Center" },
  ]}),
  component: () => (
    <TrustTopic
      title="Responsible AI"
      intro="OPSQAI is a source-grounded assistant. The model is allowed to answer only from documents that belong to the asking user's tenant — and it must refuse when there is no matching source."
    >
      <h2>Grounding</h2>
      <ul>
        <li>Every chat turn runs retrieval against the tenant's <code>document_chunks</code> first; the LLM only sees chunks scoped to that tenant.</li>
        <li>If retrieval does not return supporting sources, the system returns a localized refusal — never a guess.</li>
        <li>Sources are cited inline and persisted with each answer for review.</li>
      </ul>
      <h2>Training & data use</h2>
      <ul>
        <li>Customer documents and questions are <strong>not</strong> used to train third-party foundation models.</li>
        <li>OPSQAI does not fine-tune on customer content without an explicit, written opt-in.</li>
        <li>Prompts and responses pass through the AI gateway only for inference.</li>
      </ul>
      <h2>Safety guardrails</h2>
      <ul>
        <li>Strict role separation: the model cannot read or modify database rows directly; it only sees retrieved text.</li>
        <li>Numerical reasoning is grounded in the source text (e.g. SOP time limits) rather than inferred.</li>
        <li>Localized refusal strings in English, German and Romanian, with explicit "create an internal request" escalation.</li>
      </ul>
      <h2>Human oversight</h2>
      <p>Managers and admins can review answers, sources and questions in the audit log, promote good answers to FAQs, and supply missing SOPs.</p>
    </TrustTopic>
  ),
});
