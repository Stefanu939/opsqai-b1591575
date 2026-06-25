import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";

export const Route = createFileRoute("/trust/gdpr")({
  head: () => ({ meta: [
    { title: "GDPR — OPSQAI Trust Center" },
    { name: "description", content: "How OPSQAI complies with EU GDPR: lawful basis, data subject rights, EU hosting, DPA and subprocessors." },
    { property: "og:title", content: "GDPR — OPSQAI Trust Center" },
  ]}),
  component: () => (
    <TrustTopic
      title="GDPR"
      intro="OPSQAI is operated from the EU and processes customer data under the EU General Data Protection Regulation (GDPR). This page summarizes our posture; the binding terms are in our DPA."
    >
      <h2>Roles</h2>
      <p>Our customers are the <strong>data controllers</strong>. OPSQAI acts as a <strong>data processor</strong> for the SOPs, FAQs, questions and user accounts that customers store in their tenant.</p>
      <h2>Hosting region</h2>
      <p>Application data is stored on managed EU infrastructure. Edge requests may terminate at the closest point of presence but persistent storage stays in the EU.</p>
      <h2>Data subject rights</h2>
      <ul>
        <li><strong>Access & portability:</strong> Admins can export their tenant's data on request.</li>
        <li><strong>Erasure:</strong> Tenant deletion removes the company record and cascading rows.</li>
        <li><strong>Rectification:</strong> Users update their own profile; admins manage roles within the tenant.</li>
        <li><strong>Objection / restriction:</strong> Handled per the DPA, routed via the controller.</li>
      </ul>
      <h2>Legal documents</h2>
      <ul>
        <li>Data Processing Agreement (DPA) — available on request and as a public draft at <code>/legal/dpa</code>.</li>
        <li>Privacy Policy — <code>/legal/privacy</code>.</li>
        <li>Subprocessor list — see the main Trust Center page.</li>
      </ul>
      <h2>Contact</h2>
      <p>Privacy questions: <a href="mailto:privacy@opsqai.eu">privacy@opsqai.eu</a>.</p>
    </TrustTopic>
  ),
});
