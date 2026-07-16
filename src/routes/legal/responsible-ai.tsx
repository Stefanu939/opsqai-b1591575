import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI — OPSQAI" },
      {
        name: "description",
        content:
          "OPSQAI answers only from the customer's own knowledge base. The AI provider is chosen by the customer and runs on the customer's own server.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/responsible-ai" },
      {
        property: "og:description",
        content:
          "OPSQAI answers only from the customer's own knowledge base. The AI provider is chosen by the customer and runs on the customer's own server.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/responsible-ai" }],
  }),
  component: () => (
    <>
      <h1>Responsible AI</h1>
      <p>
        OPSQAI is designed around a single principle: an AI answer is only useful if it can be
        verified. The product ships as a self-hosted Windows application; the AI provider is
        chosen and operated by the customer.
      </p>

      <h2>Source grounding</h2>
      <p>
        OPSQAI answers strictly from documents that have been retrieved from the customer's own
        knowledge base by the local RAG worker. When no source supports an answer, the model is
        instructed to refuse rather than to guess.
      </p>

      <h2>Citations</h2>
      <p>
        Every answer includes the source document, section and a verbatim excerpt, so end users
        and auditors can verify the answer against the original SOP.
      </p>

      <h2>Model providers — chosen by the customer</h2>
      <p>
        Inference is performed by the AI provider the customer configures during the first-run
        wizard. Currently supported adapters:
      </p>
      <ul>
        <li><strong>OpenAI</strong> — customer's own API key.</li>
        <li><strong>Azure OpenAI</strong> — customer's own tenant, endpoint and deployment.</li>
        <li><strong>Ollama</strong> — fully local inference, no external calls.</li>
        <li><strong>OpenRouter</strong> or any OpenAI-compatible endpoint.</li>
      </ul>
      <p>
        OPSQAI itself is not an AI provider and does not proxy AI traffic. Any commitment about
        training on customer content (e.g. OpenAI's "no training on API data" default, or Azure
        OpenAI's contractual terms) applies through the customer's own contract with the chosen
        provider — not through OPSQAI.
      </p>

      <h2>Local-only option</h2>
      <p>
        Customers with strict data-residency requirements can run OPSQAI end-to-end on premises
        by selecting the Ollama adapter: embeddings, retrieval and generation stay on the
        customer's Windows Server, with no outbound AI traffic.
      </p>

      <h2>Human oversight</h2>
      <p>
        OPSQAI surfaces an internal request workflow when the AI cannot answer. Managers review
        these gaps and decide whether to publish an SOP or FAQ. The audit log records every
        question, retrieval and answer for later review by administrators.
      </p>

      <h2>Safety-critical use</h2>
      <p>
        OPSQAI is a decision-support tool. Customers must review AI output before acting on it in
        safety-critical contexts (forklift operation, hazardous goods, emergency procedures).
      </p>

      <h2>Bias and language</h2>
      <p>
        OPSQAI supports English, German and Romanian. Outputs in any language are translated from
        the same underlying sources to keep meaning consistent. We monitor for translation drift
        and welcome reports at <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.
      </p>
    </>
  ),
});
