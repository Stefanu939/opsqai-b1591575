import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/trust/responsible-ai")({
  head: () => ({ meta: [
    { title: "Responsible AI — OPSQAI Trust Center" },
    { name: "description", content: "OPSQAI answers strictly from retrieved customer documents, refuses when there is no source, and does not train foundation models on customer data." },
    { property: "og:title", content: "Responsible AI — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/responsible-ai" },
      { property: "og:description", content: "OPSQAI answers strictly from retrieved customer documents, refuses when there is no source, and does not train foundation models on customer data." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/responsible-ai" }],
  }),
  component: () => (
    <TrustTopic
      title="Responsible AI"
      intro="OPSQAI is a source-grounded assistant. The model is allowed to answer only from documents that belong to the asking user's tenant — and it must refuse when there is no matching source."
    >
      <DraftDisclaimer />
      <h2>Grounding</h2>
      <ul>
        <li>Every chat turn runs retrieval against the tenant's <code>document_chunks</code> first; the LLM only sees chunks scoped to that tenant.</li>
        <li>If retrieval does not return supporting sources, the system returns a localized refusal — never a guess.</li>
        <li>Sources are cited inline and persisted with each answer for review.</li>
      </ul>
      <h2>Model providers</h2>
      <p>
        Inference is performed by third-party AI model providers under contract, routed through the
        <strong> Lovable AI Gateway</strong>. OPSQAI currently uses two providers, listed here by name
        rather than under a generic "AI model providers" label:
      </p>
      <ul>
        <li><strong>Google</strong> — Gemini models (<code>gemini-3-flash-preview</code>, <code>gemini-2.5-flash</code>) for chat / retrieval-augmented generation responses.</li>
        <li><strong>OpenAI</strong> — <code>gpt-5-mini</code> for selected generation tasks, <code>gpt-4o-mini-tts</code> for text-to-speech, and <code>text-embedding-3-small</code> for document embeddings.</li>
      </ul>
      <h2>Training &amp; data use</h2>
      <ul>
        <li>Customer documents and questions are <strong>not</strong> used to train the foundation models of <strong>Google</strong> or <strong>OpenAI</strong> under the terms of the Lovable AI Gateway.</li>
        <li>OPSQAI does not fine-tune on customer content without an explicit, written opt-in.</li>
        <li>Prompts and responses pass through the AI gateway only for inference.</li>
      </ul>
      <h2>International transfers to AI providers</h2>
      <p>
        Where Google or OpenAI processes personal data outside the EEA, transfers are safeguarded by
        <strong> Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an equivalent
        adequacy mechanism where one applies. This transfer basis is a separate legal question from the
        no-training commitment above; both apply independently to each provider.
      </p>
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
