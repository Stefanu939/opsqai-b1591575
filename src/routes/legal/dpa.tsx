import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/dpa")({
  head: () => ({ meta: [{ title: "Data Processing Agreement — OPSQAI" }, { name: "description", content: "Summary of the OPSQAI Data Processing Agreement (DPA)." },
      { property: "og:url", content: "https://opsqai.de/legal/dpa" },
      { property: "og:description", content: "Summary of the OPSQAI Data Processing Agreement (DPA)." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/dpa" }],
  }),
  component: () => (
    <>
      <h1>Data Processing Agreement</h1>
      <p>OPSQAI acts as a data processor when handling personal data on behalf of customer companies (the data controller). This page summarizes our DPA. The full executable DPA is available on request from <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.</p>

      <h2>Subject matter & duration</h2>
      <p>Processing for the duration of the customer agreement, for the purpose of operating the OPSQAI AI knowledge platform.</p>

      <h2>Nature & purpose</h2>
      <p>Storage, indexing and AI-assisted retrieval of customer documents and FAQs, and provision of an end-user chat interface.</p>

      <h2>Categories of data subjects</h2>
      <p>Customer employees and contractors with access to the OPSQAI application.</p>

      <h2>Categories of personal data</h2>
      <p>Account details (name, work email, role, company), usage data, and any personal data contained inside documents the customer chooses to upload.</p>

      <h2>Subprocessors</h2>
      <p>Listed and kept current in the <a href="/trust">Trust Center</a>. Customers are notified of material changes.</p>

      <h2>Security measures</h2>
      <p>Encryption in transit and at rest, row-level isolation per tenant, role-based access control, append-only audit logging, MFA-protected production access, and regular backups.</p>

      <h2>Data subject rights</h2>
      <p>OPSQAI assists the controller in responding to data subject access, rectification, deletion and portability requests.</p>

      <h2>Return & deletion</h2>
      <p>On termination, customer data is exported and deleted within a defined retention window, except where retention is required by law.</p>
    </>
  ),
});
