import { createFileRoute } from "@tanstack/react-router";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/legal/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI — OPSQAI" },
      { name: "description", content: "How OPSQAI builds and operates AI features responsibly. Draft — pending final legal review." },
      { property: "og:url", content: "https://opsqai.de/legal/responsible-ai" },
      { property: "og:description", content: "How OPSQAI builds and operates AI features responsibly. Draft — pending final legal review." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/responsible-ai" }],
  }),
  component: () => (
    <>
      <h1>Responsible AI</h1>
      <DraftDisclaimer />
      <p>OPSQAI is designed around a single principle: an AI answer is only useful if it can be verified.</p>

      <h2>Source grounding</h2>
      <p>OPSQAI answers strictly from documents that have been retrieved from the customer's own knowledge base. When no source supports an answer, the model returns a refusal rather than a guess.</p>

      <h2>Citations</h2>
      <p>Every answer includes the source document, section and a verbatim excerpt, so end users and auditors can verify the answer against the original SOP.</p>

      <h2>Model providers</h2>
      <p>
        Inference is performed by third-party AI model providers under contract, routed through the
        <strong> Lovable AI Gateway</strong>. OPSQAI currently uses two providers, named here rather than
        grouped under a generic label:
      </p>
      <ul>
        <li>
          <strong>Google</strong> — Gemini models (<code>gemini-3-flash-preview</code> and
          <code> gemini-2.5-flash</code>) for chat and retrieval-augmented generation responses.
        </li>
        <li>
          <strong>OpenAI</strong> — <code>gpt-5-mini</code> for selected generation tasks,
          <code> gpt-4o-mini-tts</code> for text-to-speech, and <code>text-embedding-3-small</code> for
          document embeddings.
        </li>
      </ul>

      <h2>No training on customer data</h2>
      <p>
        Customer documents and questions are <strong>not</strong> used to train the foundation models of
        Google or OpenAI. This is a contractual commitment covering the models above and is separate from
        the international transfer basis under which those providers process personal data (see below and
        our <a href="/legal/privacy">Privacy Policy</a>).
      </p>

      <h2>International transfers to AI providers</h2>
      <p>
        Where personal data is processed by Google or OpenAI outside the EEA, transfers are safeguarded
        by <strong>Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an equivalent
        adequacy mechanism where one applies. This applies independently to each provider.
      </p>

      <h2>Human oversight</h2>
      <p>OPSQAI surfaces an internal request workflow when the AI cannot answer. Managers review these gaps and decide whether to publish an SOP or FAQ. Audit logs let admins review what was asked and what was answered.</p>

      <h2>Safety-critical use</h2>
      <p>OPSQAI is a decision-support tool. Customers must review AI output before acting on it in safety-critical contexts (forklift operation, hazardous goods, emergency procedures).</p>

      <h2>Bias &amp; language</h2>
      <p>OPSQAI supports English, German and Romanian. Outputs in any language are translated from the same underlying sources to keep meaning consistent. We monitor for translation drift and welcome reports at notify@opsqai.de.</p>
    </>
  ),
});
