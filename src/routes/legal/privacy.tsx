import { createFileRoute } from "@tanstack/react-router";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OPSQAI" },
      {
        name: "description",
        content:
          "How OPSQAI collects, uses and protects personal data. Draft — pending final legal review.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/privacy" },
      {
        property: "og:description",
        content:
          "How OPSQAI collects, uses and protects personal data. Draft — pending final legal review.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/privacy" }],
  }),
  component: () => (
    <>
      <h1>Privacy Policy</h1>
      <DraftDisclaimer />
      <p>
        Last updated: {new Date().getFullYear()}. This Privacy Policy explains how OPSQAI processes
        personal data when you use opsqai.de (the marketing site) and the OPSQAI application.
      </p>

      <h2>Who we are</h2>
      <p>
        OPSQAI provides an AI knowledge management platform for logistics and supply chain
        operations. Contact: notify@opsqai.de.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account data: name, work email, role, company, language preference.</li>
        <li>
          Content data: documents and FAQs uploaded by your administrators, and questions asked of
          the AI.
        </li>
        <li>Operational data: timestamps, audit logs, IP address for security purposes.</li>
        <li>
          Marketing site: minimal analytics on aggregate page visits; no advertising trackers.
        </li>
      </ul>

      <h2>Legal basis</h2>
      <ul>
        <li>Performance of contract (operating the service for your employer).</li>
        <li>Legitimate interest (security, fraud prevention, product improvement).</li>
        <li>Consent (optional analytics or marketing communications).</li>
      </ul>

      <h2>Sharing &amp; subprocessors</h2>
      <p>
        We share data only with the subprocessors listed in our Trust Center, under contract, and as
        required by law. We do not sell personal data. OPSQAI's subprocessors are disclosed at three
        distinct certainty tiers:
      </p>
      <ul>
        <li>
          <strong>Cloudflare, Inc. (USA)</strong> — edge runtime, DNS, DDoS protection. ISO/IEC
          27001, ISO/IEC 27701, SOC 2 Type II and PCI DSS Level 1 certified. International transfers
          safeguarded by Standard Contractual Clauses (Art. 46 GDPR) or the EU-U.S. Data Privacy
          Framework, per Cloudflare's Data Processing Addendum, accepted by OPSQAI. Cloudflare is
          headquartered in the USA and traffic terminates at the closest Cloudflare point of
          presence.
        </li>
        <li>
          <strong>Lovable</strong> — application database (Supabase infrastructure in AWS eu-west-1,
          Dublin, Ireland), authentication, storage and AI gateway. Lovable holds SOC 2 Type II and
          ISO 27001:2022 certifications at the company level. Our current subscription is Lovable's
          Pro tier; Business-tier contractual DPA coverage is being confirmed and documentation will
          be provided upon request. This does not imply OPSQAI itself is certified.
        </li>
        <li>
          <strong>Google</strong> (<code>gemini-3-flash-preview</code>,{" "}
          <code>gemini-2.5-flash</code>) and
          <strong> OpenAI</strong> (<code>gpt-5-mini</code>, <code>gpt-4o-mini-tts</code>,
          <code> text-embedding-3-small</code>) — AI model providers, accessed indirectly. OPSQAI
          does not contract directly with Google or OpenAI; both are accessed via the Lovable AI
          Gateway under Lovable's own agreements with these providers. Customer content is not used
          to train foundation models, per Lovable's Gateway terms. International transfers
          safeguarded by Standard Contractual Clauses (Art. 46 GDPR) or an equivalent adequacy
          mechanism, applied independently to Google and to OpenAI.
        </li>
      </ul>

      <h2>Hosting region</h2>
      <p>
        The OPSQAI application database is hosted on managed Supabase infrastructure in
        <strong> AWS eu-west-1 (Dublin, Ireland)</strong>. Static assets and edge requests are
        served from Cloudflare's global network (Cloudflare, Inc. is headquartered in the USA — see
        the subprocessor list above); persistent storage of tenant data stays in the EU region
        above.
      </p>

      <h2>Retention</h2>
      <p>
        Account and content data are retained for the duration of the customer agreement. On
        termination the tenant enters a <strong>30-day grace window</strong> during which a full
        data export can be requested and termination can still be reversed by a Platform
        Administrator. After the grace window a scheduled database job (
        <code>purge_terminated_tenants</code>, daily via
        <code> pg_cron</code>) automatically and permanently deletes the tenant and all related rows
        (<code>ON DELETE CASCADE</code>). Audit-log entries are anonymized before archival — only
        module, action, resource, severity, success and event timestamp are kept under a hashed
        tenant label (no user IDs, no payloads). The anonymized audit archive is retained for a{" "}
        <strong>rolling 24 months</strong>, then purged. Database backups follow a rolling 30-day
        retention window on the managed platform. Server request/error logs use a short rolling
        retention (typically 14 days). Longer retention applies only where required by applicable
        law.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you have the right to access, rectify, erase, restrict, port or object to the
        processing of your personal data. Contact notify@opsqai.de to exercise these rights. You may
        also lodge a complaint with your local data protection authority.
      </p>

      <h2>International transfers &amp; AI model providers</h2>
      <p>
        The OPSQAI application database is operated in the EU. All AI calls are routed through the
        <strong> Lovable AI Gateway</strong>. The explicit models processing customer content are:
        <strong> Google Gemini</strong> — <code>gemini-3-flash-preview</code> and{" "}
        <code>gemini-2.5-flash</code>
        (chat / retrieval responses); <strong>OpenAI</strong> — <code>gpt-5-mini</code>{" "}
        (generation),
        <code> gpt-4o-mini-tts</code> (text-to-speech) and <code>text-embedding-3-small</code>{" "}
        (embeddings). These providers may process personal data outside the EEA; such transfers are
        safeguarded by the European Commission's{" "}
        <strong>Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an equivalent
        adequacy mechanism where one applies. Customer content is not used to train Google's or
        OpenAI's foundation models under the terms of the Lovable AI Gateway.
      </p>

      <h2>Changes</h2>
      <p>
        We update this policy when our practices change. Material changes are notified to
        administrators in advance.
      </p>
    </>
  ),
});
