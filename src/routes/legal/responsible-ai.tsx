import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/responsible-ai")({
  head: () => ({ meta: [{ title: "Responsible AI — OPSQAI" }, { name: "description", content: "How OPSQAI builds and operates AI features responsibly." },
      { property: "og:url", content: "https://opsqai.de/legal/responsible-ai" },
      { property: "og:description", content: "How OPSQAI builds and operates AI features responsibly." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/responsible-ai" }],
  }),
  component: () => (
    <>
      <h1>Responsible AI</h1>
      <p>OPSQAI is designed around a single principle: an AI answer is only useful if it can be verified.</p>

      <h2>Source grounding</h2>
      <p>OPSQAI answers strictly from documents that have been retrieved from the customer's own knowledge base. When no source supports an answer, the model returns a refusal rather than a guess.</p>

      <h2>Citations</h2>
      <p>Every answer includes the source document, section and a verbatim excerpt, so end users and auditors can verify the answer against the original SOP.</p>

      <h2>No training on customer data</h2>
      <p>Customer documents and questions are not used to train third-party foundation models. Inference is performed by AI providers under contract via the Lovable AI Gateway.</p>

      <h2>Human oversight</h2>
      <p>OPSQAI surfaces an internal request workflow when the AI cannot answer. Managers review these gaps and decide whether to publish an SOP or FAQ. Audit logs let admins review what was asked and what was answered.</p>

      <h2>Safety-critical use</h2>
      <p>OPSQAI is a decision-support tool. Customers must review AI output before acting on it in safety-critical contexts (forklift operation, hazardous goods, emergency procedures).</p>

      <h2>Bias & language</h2>
      <p>OPSQAI supports English, German and Romanian. Outputs in any language are translated from the same underlying sources to keep meaning consistent. We monitor for translation drift and welcome reports at notify@opsqai.de.</p>
    </>
  ),
});
