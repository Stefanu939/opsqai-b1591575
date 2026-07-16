import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing — OPSQAI Self-Hosted" },
      {
        name: "description",
        content:
          "How OPSQAI's self-hosted deployment model maps to GDPR Art. 28. Customer content stays on the customer's own Windows Server.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/dpa" },
      {
        property: "og:description",
        content:
          "How OPSQAI's self-hosted deployment model maps to GDPR Art. 28. Customer content stays on the customer's own Windows Server.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/dpa" }],
  }),
  component: () => (
    <>
      <h1>Data Processing — Self-Hosted Deployment</h1>
      <p>
        OPSQAI is delivered as a <strong>Windows-native, self-hosted product</strong>. This page
        explains why the classic Art. 28 GDPR processor DPA does not describe the bulk of a
        customer's OPSQAI deployment, and what limited processing OPSQAI performs on opsqai.de.
        The counterpart signed contractual documents are available on request from{" "}
        <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.
      </p>

      <h2>1. The self-hosted instance — customer premises</h2>
      <p>
        The OPSQAI application (Caddy, Platform, Worker, Portable PostgreSQL, Updater — each
        running as a native Windows service) is installed on the customer's own dedicated Windows
        Server. All customer content — uploaded documents, embeddings, chunks, questions and
        answers, end-user accounts, audit logs, object storage, database backups — resides in{" "}
        <code>C:\ProgramData\OPSQAI\</code> (or an equivalent path chosen by the customer) on that
        server. Neither OPSQAI nor opsqai.de receives, stores, indexes, or otherwise accesses that
        content.
      </p>
      <p>
        For that scope the customer acts as both <strong>controller and processor</strong> under
        its own security and IT governance policies. OPSQAI provides the software, documentation,
        and updates; it does not operate the instance and has no standing access to it. There is
        therefore no personal-data processing to describe under Art. 28 GDPR for the self-hosted
        instance.
      </p>

      <h2>2. AI provider — chosen by the customer</h2>
      <p>
        The customer selects and pays for the AI provider used by the self-hosted instance —{" "}
        <strong>OpenAI, Azure OpenAI, Ollama (local), OpenRouter</strong> or any
        OpenAI-compatible endpoint. API keys are entered into the first-run wizard and stored
        encrypted on the customer's own server. OPSQAI does not act as an intermediary and does
        not have access to those keys or to the traffic between the self-hosted instance and the
        chosen provider. Any DPA / SCC arrangement with the AI provider is between the customer
        and that provider directly.
      </p>

      <h2>3. Licence heartbeat — the only outbound call to OPSQAI</h2>
      <p>
        The Updater service periodically calls the OPSQAI Management Center to validate the
        Ed25519-signed licence and to check for signed update manifests. The heartbeat request
        contains: licence identifier, product build, and timestamp. It contains{" "}
        <strong>no customer content, no end-user identifiers, no usage counters keyed to a
        person</strong>. This falls under legitimate interest (Art. 6(1)(f) GDPR) for software
        anti-piracy and update integrity, not under Art. 28.
      </p>

      <h2>4. opsqai.de and the Customer Portal — narrow Art. 28 scope</h2>
      <p>
        There is one context in which OPSQAI does process personal data on behalf of a customer:
        the <strong>Customer Portal</strong>, where designated customer contacts sign in to
        download the installer, retrieve their signed licence, and open support tickets. The
        limited processor role covers only:
      </p>
      <ul>
        <li>Contact-account data (name, work email, role, company) of the designated contacts.</li>
        <li>Support / contact-form correspondence.</li>
        <li>
          Server access logs for those requests (IP, user-agent, timestamp — 14-day rolling
          retention).
        </li>
      </ul>
      <p>
        A written Art. 28 addendum covering this narrow scope is available on request. Security
        measures for opsqai.de: TLS 1.2+ in transit, encryption at rest on the managed database,
        role-scoped access, MFA-protected admin access, and time-boxed access logs.
      </p>

      <h2>5. Subprocessors of opsqai.de</h2>
      <p>
        opsqai.de is hosted on managed infrastructure in the European Economic Area. The current
        list of infrastructure subprocessors used by the marketing site and Customer Portal is
        available on request; customers on active agreements are notified in writing at least 30
        days before any material change. <strong>None of these subprocessors receive customer
        content processed by the self-hosted instance</strong>, because that content never leaves
        the customer's premises.
      </p>

      <h2>6. International transfers</h2>
      <p>
        Where a subprocessor of opsqai.de processes personal data outside the EEA, transfers are
        safeguarded by Standard Contractual Clauses under Art. 46 GDPR or an equivalent adequacy
        mechanism. This does not apply to AI providers — those are contracted directly by the
        customer.
      </p>

      <h2>7. Data subject rights and assistance</h2>
      <p>
        For data held on opsqai.de OPSQAI responds directly to data-subject requests. For data
        held inside a self-hosted instance the customer is responsible; OPSQAI provides
        documentation and reasonable technical assistance through the Customer Portal.
      </p>

      <h2>8. Return and deletion</h2>
      <ul>
        <li>
          <strong>Self-hosted instance:</strong> data is deleted by the customer on their own
          server (uninstall workflow removes the services and, at the customer's option,{" "}
          <code>C:\ProgramData\OPSQAI\</code>). OPSQAI has no data to return or delete.
        </li>
        <li>
          <strong>opsqai.de:</strong> on termination of the customer agreement, Customer Portal
          accounts and associated correspondence are deleted within 30 days, except where a legal
          retention obligation applies. Server logs age out via the 14-day rolling window.
        </li>
      </ul>

      <h2>9. Certification status</h2>
      <p>
        OPSQAI is <strong>not currently SOC 2 or ISO/IEC 27001 certified</strong>. We rely on the
        certifications of the underlying managed hosting used by opsqai.de and on the security
        practices documented in the <a href="/security">Security</a> page and the{" "}
        <a href="/documentation/security">Security Documentation</a>. Certification of a hosting
        provider does not extend certification to OPSQAI itself.
      </p>
    </>
  ),
});
