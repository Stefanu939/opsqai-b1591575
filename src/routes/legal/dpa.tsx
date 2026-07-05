import { createFileRoute } from "@tanstack/react-router";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/legal/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing Agreement — OPSQAI" },
      { name: "description", content: "Summary of the OPSQAI Data Processing Agreement (DPA). Draft — pending final legal review." },
      { property: "og:url", content: "https://opsqai.de/legal/dpa" },
      { property: "og:description", content: "Summary of the OPSQAI Data Processing Agreement (DPA). Draft — pending final legal review." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/dpa" }],
  }),
  component: () => (
    <>
      <h1>Data Processing Agreement</h1>
      <DraftDisclaimer />
      <p>
        OPSQAI acts as a data processor when handling personal data on behalf of customer companies
        (the data controller). This page summarizes our DPA. The full executable DPA is available on
        request from <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.
      </p>

      <h2>Subject matter &amp; duration</h2>
      <p>Processing for the duration of the customer agreement, for the purpose of operating the OPSQAI AI knowledge platform.</p>

      <h2>Nature &amp; purpose</h2>
      <p>Storage, indexing and AI-assisted retrieval of customer documents and FAQs, and provision of an end-user chat interface.</p>

      <h2>Categories of data subjects</h2>
      <p>Customer employees and contractors with access to the OPSQAI application.</p>

      <h2>Categories of personal data</h2>
      <p>Account details (name, work email, role, company), usage data, and any personal data contained inside documents the customer chooses to upload.</p>

      <h2>Subprocessors</h2>
      <p>
        Listed and kept current in the <a href="/trust">Trust Center</a>. As of the last update, OPSQAI relies on the
        following subprocessors: Lovable Cloud (application database, authentication, storage, edge functions —
        provided on Supabase infrastructure in <strong>AWS eu-west-1 (Dublin, Ireland)</strong>);
        Cloudflare (edge runtime, DNS, DDoS protection);
        Google (Gemini large-language models used for chat and retrieval responses, routed through the Lovable AI Gateway);
        and OpenAI (models used for embeddings, text-to-speech and selected generation tasks, routed through the Lovable AI Gateway).
        Customers are notified of material changes.
      </p>

      <h2>Security measures</h2>
      <p>Encryption in transit and at rest, row-level isolation per tenant, role-based access control, append-only audit logging, MFA-protected production access, and regular backups.</p>

      <h2>Certification status</h2>
      <p>
        OPSQAI itself is <strong>not currently SOC 2 or ISO/IEC 27001 certified</strong>. Our infrastructure subprocessor
        Lovable is independently <strong>SOC 2 Type II</strong> and <strong>ISO/IEC 27001:2022</strong> certified
        (confirmed August 2025). Certification of a subprocessor reduces, but does not eliminate, OPSQAI's own
        responsibility as a data processor: we remain accountable to the controller under Art. 28 GDPR for the
        processing we carry out and for the diligent selection and oversight of our subprocessors.
      </p>

      <h2>International data transfers</h2>
      <p>
        Where personal data is processed outside the European Economic Area — for example, by Google or OpenAI as
        AI model providers when their inference is routed to non-EEA regions — such transfers are safeguarded by the
        European Commission's <strong>Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an
        equivalent adequacy mechanism where one applies. This transfer basis is a separate legal question from the
        commitment that customer content is not used to train third-party foundation models; both apply
        independently to Google and to OpenAI.
      </p>

      <h2>Data subject rights</h2>
      <p>OPSQAI assists the controller in responding to data subject access, rectification, deletion and portability requests.</p>

      <h2>Return &amp; deletion</h2>
      <p>
        On termination, customer data is exported on request and then deleted within <strong>30 days after termination</strong>,
        unless a longer period is required by applicable law. Backups age out within the platform's rolling
        30-day backup window after primary deletion. Aggregated, non-identifying operational metrics may be retained
        indefinitely.
      </p>
    </>
  ),
});
