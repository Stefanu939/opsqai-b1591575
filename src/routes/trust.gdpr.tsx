import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/gdpr")({
  head: () => ({ meta: [
    { title: "GDPR — OPSQAI Trust Center" },
    { name: "description", content: "How OPSQAI complies with EU GDPR: lawful basis, data subject rights, EU hosting, DPA and subprocessors." },
    { property: "og:title", content: "GDPR — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/gdpr" },
      { property: "og:description", content: "How OPSQAI complies with EU GDPR: lawful basis, data subject rights, EU hosting, DPA and subprocessors." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/gdpr" }],
  }),
  component: () => (
    <TrustTopic
      title="GDPR"
      intro="OPSQAI is operated from the EU and processes customer data under the EU General Data Protection Regulation (GDPR). This page summarizes our posture; the binding terms are in our DPA."
    >
      <h2>Roles</h2>
      <p>Our customers are the <strong>data controllers</strong>. OPSQAI acts as a <strong>data processor</strong> for the SOPs, FAQs, questions and user accounts that customers store in their tenant.</p>
      <h2>Hosting region</h2>
      <p>
        The OPSQAI application database is hosted on managed Supabase infrastructure in
        <strong> AWS eu-west-1 (Dublin, Ireland)</strong>. Edge requests may terminate at the closest
        Cloudflare point of presence, but persistent tenant storage stays in the EU region above.
      </p>
      <h2>Certification status</h2>
      <p>
        OPSQAI itself is <strong>not currently SOC 2 or ISO/IEC 27001 certified</strong>. Our infrastructure
        subprocessor Lovable is independently <strong>SOC 2 Type II</strong> and
        <strong> ISO/IEC 27001:2022</strong> certified (confirmed August 2025). Subprocessor certification
        reduces, but does not eliminate, OPSQAI's own responsibility as a data processor under Art. 28 GDPR.
      </p>
      <h2>International data transfers</h2>
      <p>
        Where personal data is processed outside the EEA — in particular by our AI model providers
        <strong> Google</strong> (Gemini models for chat / retrieval responses) and <strong>OpenAI</strong>
        (models for embeddings, text-to-speech and selected generation tasks), both routed through the
        Lovable AI Gateway — such transfers are safeguarded by the European Commission's
        <strong> Standard Contractual Clauses (SCCs) under Article 46 GDPR</strong>, or an equivalent
        adequacy mechanism where one applies. Whether customer content may be used to train third-party
        foundation models is a separate legal question, addressed independently on our{" "}
        <a href="/legal/responsible-ai">Responsible AI</a> page and in our DPA.
      </p>
      <h2>Data subject rights</h2>
      <ul>
        <li><strong>Access &amp; portability:</strong> Admins can export their tenant's data on request.</li>
        <li><strong>Erasure:</strong> Tenant deletion removes the company record and cascading rows.</li>
        <li><strong>Rectification:</strong> Users update their own profile; admins manage roles within the tenant.</li>
        <li><strong>Objection / restriction:</strong> Handled per the DPA, routed via the controller.</li>
      </ul>
      <h2>Legal documents</h2>
      <ul>
        <li>Data Processing Agreement (DPA) — available on request and as a public draft at <code>/legal/dpa</code>. Currently pending final legal review.</li>
        <li>Privacy Policy — <code>/legal/privacy</code>.</li>
        <li>Subprocessor list — see the main Trust Center page.</li>
      </ul>
      <h2>Contact</h2>
      <p>Privacy questions: <a href="mailto:notify@opsqai.de">notify@opsqai.de</a>.</p>
    </TrustTopic>
  ),
});
