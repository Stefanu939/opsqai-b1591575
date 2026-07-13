import { createFileRoute } from "@tanstack/react-router";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/legal/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing Agreement — OPSQAI" },
      {
        name: "description",
        content:
          "Summary of the OPSQAI Data Processing Agreement (DPA). Draft — pending final legal review.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/dpa" },
      {
        property: "og:description",
        content:
          "Summary of the OPSQAI Data Processing Agreement (DPA). Draft — pending final legal review.",
      },
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
      <p>
        Processing for the duration of the customer agreement, for the purpose of operating the
        OPSQAI AI knowledge platform.
      </p>

      <h2>Nature &amp; purpose</h2>
      <p>
        Storage, indexing and AI-assisted retrieval of customer documents and FAQs, and provision of
        an end-user chat interface.
      </p>

      <h2>Categories of data subjects</h2>
      <p>Customer employees and contractors with access to the OPSQAI application.</p>

      <h2>Categories of personal data</h2>
      <p>
        Account details (name, work email, role, company), usage data, and any personal data
        contained inside documents the customer chooses to upload.
      </p>

      <h2>Subprocessors</h2>
      <p>
        The current list is kept up to date in the <a href="/trust">Trust Center</a>. OPSQAI's
        subprocessors differ materially in the level of contractual certainty and independent
        assurance OPSQAI can attest to. We disclose them here at three distinct certainty tiers:
      </p>
      <ul>
        <li>
          <strong>Cloudflare, Inc. (USA)</strong> — edge runtime, DNS, DDoS protection.
          <strong>
            {" "}
            ISO/IEC 27001, ISO/IEC 27701, SOC 2 Type II and PCI DSS Level 1 certified.
          </strong>
          International transfers safeguarded by Standard Contractual Clauses (Art. 46 GDPR) or the
          EU-U.S. Data Privacy Framework, per Cloudflare's Data Processing Addendum, accepted by
          OPSQAI. Cloudflare is headquartered in the USA (San Francisco); traffic terminates at the
          closest Cloudflare point of presence and is not guaranteed to stay in the EU at the edge
          layer.
        </li>
        <li>
          <strong>Lovable</strong> — application database (Supabase infrastructure in AWS eu-west-1,
          Dublin, Ireland), authentication, storage, edge functions and the AI gateway. Lovable
          holds
          <strong> SOC 2 Type II</strong> and <strong>ISO 27001:2022</strong> certifications at the
          company level. Our current subscription is <strong>Lovable's Pro tier</strong>;
          <strong> Business-tier contractual DPA coverage is being confirmed</strong> and
          documentation will be provided upon request. This does not imply OPSQAI itself is
          certified.
        </li>
        <li>
          <strong>Google</strong> (<code>gemini-3-flash-preview</code>,{" "}
          <code>gemini-2.5-flash</code>) and
          <strong> OpenAI</strong> (<code>gpt-5-mini</code>, <code>gpt-4o-mini-tts</code>,
          <code> text-embedding-3-small</code>) — AI model providers.
          <strong> OPSQAI does not contract directly with Google or OpenAI;</strong> both are
          accessed via the Lovable AI Gateway under Lovable's own agreements with these providers.
          Customer content is not used to train foundation models, per Lovable's Gateway terms.
          International transfers are safeguarded by Standard Contractual Clauses (Art. 46 GDPR) or
          an equivalent adequacy mechanism, applied independently to Google and to OpenAI.
        </li>
      </ul>
      <p>Customers are notified in advance of material changes to this list.</p>

      <h2>Security measures</h2>
      <p>
        Encryption in transit and at rest, row-level isolation per tenant, role-based access
        control, append-only audit logging, MFA-protected production access, and regular backups.
      </p>

      <h2>Certification status</h2>
      <p>
        OPSQAI itself is <strong>not currently SOC 2 or ISO/IEC 27001 certified</strong>. Our
        infrastructure subprocessor's platform (<strong>Lovable</strong>) holds{" "}
        <strong>SOC 2 Type II</strong> and
        <strong> ISO 27001:2022</strong> certifications at the company level. Our current
        subscription is
        <strong> Lovable's Pro tier</strong>;{" "}
        <strong>Business-tier contractual coverage is being confirmed</strong>
        and the relevant documentation will be provided upon request. Certification of a
        subprocessor reduces, but does not eliminate, OPSQAI's own responsibility as a data
        processor: we remain accountable to the controller under Art. 28 GDPR for the processing we
        carry out and for the diligent selection and oversight of our subprocessors.
      </p>

      <h2>AI model stack (explicit models)</h2>
      <p>
        All AI calls are routed through the Lovable AI Gateway. The models processed on customer
        content are:
        <strong> Google Gemini</strong> — <code>gemini-3-flash-preview</code> and{" "}
        <code>gemini-2.5-flash</code>
        (chat / retrieval responses); <strong>OpenAI</strong> — <code>gpt-5-mini</code>{" "}
        (generation),
        <code> gpt-4o-mini-tts</code> (text-to-speech) and <code>text-embedding-3-small</code>{" "}
        (embeddings). Customer content is not used to train these foundation models under the terms
        of the Lovable AI Gateway.
      </p>

      <h2>International data transfers</h2>
      <p>
        Where personal data is processed outside the European Economic Area — for example, by Google
        or OpenAI as AI model providers when their inference is routed to non-EEA regions — such
        transfers are safeguarded by the European Commission's{" "}
        <strong>Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an equivalent
        adequacy mechanism where one applies. This transfer basis is a separate legal question from
        the commitment that customer content is not used to train third-party foundation models;
        both apply independently to Google and to OpenAI.
      </p>

      <h2>Data subject rights</h2>
      <p>
        OPSQAI assists the controller in responding to data subject access, rectification, deletion
        and portability requests.
      </p>

      <h2>Return &amp; deletion</h2>
      <p>
        On termination the tenant enters a <strong>30-day grace window</strong> during which the
        customer may request a full data export and termination can be reversed by a Platform
        Administrator. After the grace window, a scheduled database job (
        <code>purge_terminated_tenants</code>, executed daily via <code>pg_cron</code>) permanently
        deletes the tenant record; all related rows are removed by
        <code> ON DELETE CASCADE</code>. Audit-log entries are anonymized and moved to a separate
        archive (<code>audit_log_terminated_archive</code>) — module, action, resource, severity,
        success and event timestamp only, under a hashed tenant label (no user IDs, no payloads).
        The anonymized archive is retained for a <strong>rolling 24 months</strong>, after which it
        is purged. Backups age out within the managed platform's rolling 30-day backup window after
        primary deletion. Longer retention applies only where required by applicable law;
        aggregated, non-identifying operational metrics may be retained indefinitely.
      </p>
    </>
  ),
});
