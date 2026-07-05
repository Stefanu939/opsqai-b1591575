import { createFileRoute } from "@tanstack/react-router";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OPSQAI" },
      { name: "description", content: "How OPSQAI collects, uses and protects personal data. Draft — pending final legal review." },
      { property: "og:url", content: "https://opsqai.de/legal/privacy" },
      { property: "og:description", content: "How OPSQAI collects, uses and protects personal data. Draft — pending final legal review." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/privacy" }],
  }),
  component: () => (
    <>
      <h1>Privacy Policy</h1>
      <DraftDisclaimer />
      <p>Last updated: {new Date().getFullYear()}. This Privacy Policy explains how OPSQAI processes personal data when you use opsqai.de (the marketing site) and the OPSQAI application.</p>

      <h2>Who we are</h2>
      <p>OPSQAI provides an AI knowledge management platform for logistics and supply chain operations. Contact: notify@opsqai.de.</p>

      <h2>What we collect</h2>
      <ul>
        <li>Account data: name, work email, role, company, language preference.</li>
        <li>Content data: documents and FAQs uploaded by your administrators, and questions asked of the AI.</li>
        <li>Operational data: timestamps, audit logs, IP address for security purposes.</li>
        <li>Marketing site: minimal analytics on aggregate page visits; no advertising trackers.</li>
      </ul>

      <h2>Legal basis</h2>
      <ul>
        <li>Performance of contract (operating the service for your employer).</li>
        <li>Legitimate interest (security, fraud prevention, product improvement).</li>
        <li>Consent (optional analytics or marketing communications).</li>
      </ul>

      <h2>Sharing</h2>
      <p>We share data only with the subprocessors listed in our Trust Center, under contract, and as required by law. We do not sell personal data.</p>

      <h2>Hosting region</h2>
      <p>
        The OPSQAI application database is hosted on managed Supabase infrastructure in
        <strong> AWS eu-west-1 (Dublin, Ireland)</strong>. Static assets and edge requests are served from
        Cloudflare's global network; persistent storage of tenant data stays in the EU region above.
      </p>

      <h2>Retention</h2>
      <p>
        Account and content data are retained for the duration of the customer agreement.
        On termination, customer data is exported on request and then deleted within <strong>30 days after termination</strong>,
        unless a longer period is required by applicable law. Audit logs are retained for up to
        24 months. Database backups follow a rolling 30-day retention window on the managed platform.
        Server request/error logs use a short rolling retention (typically 14 days).
      </p>

      <h2>Your rights</h2>
      <p>Under the GDPR you have the right to access, rectify, erase, restrict, port or object to the processing of your personal data. Contact notify@opsqai.de to exercise these rights. You may also lodge a complaint with your local data protection authority.</p>

      <h2>International transfers</h2>
      <p>
        The OPSQAI application database is operated in the EU. Some subprocessors — in particular the
        AI model providers <strong>Google</strong> (Gemini models, used for chat and retrieval responses)
        and <strong>OpenAI</strong> (models used for embeddings, text-to-speech and selected generation
        tasks), both routed through the Lovable AI Gateway — may process personal data outside the EEA.
        Where personal data is transferred outside the EEA, transfers are safeguarded by the European
        Commission's <strong>Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an
        equivalent adequacy mechanism where one applies. Whether customer content may be used to train
        third-party foundation models is a separate legal question that is addressed independently under
        our Data Processing Agreement and Responsible AI page: customer content is not used to train
        Google's or OpenAI's foundation models under the terms of the Lovable AI Gateway.
      </p>

      <h2>Changes</h2>
      <p>We update this policy when our practices change. Material changes are notified to administrators in advance.</p>
    </>
  ),
});
