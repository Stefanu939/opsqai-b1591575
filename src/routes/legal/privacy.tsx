import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — OPSQAI" },
      {
        name: "description",
        content:
          "How OPSQAI processes personal data on opsqai.de. OPSQAI is a Windows-native self-hosted product — customer content stays on the customer's own server.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/privacy" },
      {
        property: "og:description",
        content:
          "How OPSQAI processes personal data on opsqai.de. OPSQAI is a Windows-native self-hosted product — customer content stays on the customer's own server.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/privacy" }],
  }),
  component: () => (
    <>
      <h1>Privacy Policy</h1>
      <p>
        Last updated: {new Date().getFullYear()}. This Privacy Policy explains how OPSQAI processes
        personal data on <strong>opsqai.de</strong> (the marketing website and the Customer Portal
        used by our customers' designated contacts to download the installer and manage their
        licence).
      </p>

      <h2>Deployment model — what this policy does not cover</h2>
      <p>
        OPSQAI is a <strong>Windows-native, self-hosted product</strong>. Once a customer installs
        OPSQAI on their own dedicated Windows Server, all customer content — documents, SOPs,
        embeddings, chat questions and answers, audit logs — is processed and stored entirely on
        the customer's own machines, using the AI provider the customer configures with their own
        keys. <strong>None of that data is transmitted to OPSQAI or to opsqai.de.</strong> The
        customer is the sole controller and processor of that data on their premises. This policy
        therefore only covers the limited personal data we process on opsqai.de.
      </p>

      <h2>Who we are</h2>
      <p>
        The operator of opsqai.de is identified in the <a href="/legal/impressum">Impressum</a>.
        Contact for privacy matters: <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.
      </p>

      <h2>What we collect on opsqai.de</h2>
      <ul>
        <li>
          <strong>Customer Portal account</strong> — for the customer contacts we designate at
          contract signature: work email address and hashed password (managed via our
          authentication provider), plus their name and role at the customer company.
        </li>
        <li>
          <strong>Contact-form messages</strong> — if you write to us via the contact form or by
          email: your name, work email, company and the content of your message. Used to reply and
          for pre-sales / support correspondence.
        </li>
        <li>
          <strong>Minimal server logs</strong> — for each HTTP request: timestamp, IP address, HTTP
          method, path, response status and user-agent. Used strictly for security, abuse
          prevention and incident investigation.
        </li>
      </ul>

      <h2>What we do NOT collect</h2>
      <ul>
        <li>
          <strong>No web analytics</strong> — no Google Analytics, Plausible, PostHog, Matomo or
          equivalent. opsqai.de has no analytics vendor embedded.
        </li>
        <li>
          <strong>No advertising or marketing trackers</strong> — no Meta Pixel, LinkedIn Insight
          Tag, Google Ads, retargeting pixels, or newsletter open/click tracking.
        </li>
        <li>
          <strong>No product telemetry from the self-hosted instance</strong> — the OPSQAI software
          running on the customer's Windows Server does not send usage telemetry to us. The only
          outbound call to our infrastructure is a periodic licence heartbeat to the Management
          Center, which carries the licence identifier and heartbeat timestamp; no customer content
          and no end-user identifiers.
        </li>
        <li>
          <strong>No AI subprocessing by OPSQAI</strong> — opsqai.de does not use AI. The AI
          provider used by the self-hosted product is chosen and paid for by the customer, under
          the customer's own agreement with that provider.
        </li>
      </ul>

      <h2>Legal basis (GDPR Art. 6)</h2>
      <ul>
        <li>
          <strong>Performance of contract (Art. 6(1)(b))</strong> — to operate the Customer Portal
          for our contractual counterparties.
        </li>
        <li>
          <strong>Legitimate interest (Art. 6(1)(f))</strong> — security logging and responding to
          pre-sales enquiries.
        </li>
      </ul>

      <h2>Retention</h2>
      <ul>
        <li>Customer Portal accounts: for the duration of the customer agreement.</li>
        <li>
          Contact-form messages: up to 24 months after the last correspondence, then deleted,
          unless a subsequent commercial relationship justifies longer retention.
        </li>
        <li>Server logs: rolling 14 days, then automatically overwritten.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you have the right to access, rectify, erase, restrict, port or object to
        the processing of your personal data, and to withdraw consent where processing is based on
        consent. Contact <a href="mailto:notify@opsqai.de">notify@opsqai.de</a> to exercise these
        rights. You may also lodge a complaint with your local data protection authority.
      </p>

      <h2>International transfers</h2>
      <p>
        Personal data collected on opsqai.de is processed within the European Economic Area.
        Where a subprocessor of the marketing site (for example, the email service used to reply
        to your contact-form message) processes data outside the EEA, transfers are safeguarded by
        Standard Contractual Clauses under Article 46 GDPR or an equivalent adequacy mechanism.
      </p>

      <h2>Changes</h2>
      <p>
        We update this policy when our practices change. Material changes will be announced on
        this page with an updated date.
      </p>
    </>
  ),
});
