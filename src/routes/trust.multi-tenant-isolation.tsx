import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/trust/multi-tenant-isolation")({
  head: () => ({ meta: [
    { title: "Multi-Tenant Isolation — OPSQAI Trust Center" },
    { name: "description", content: "Every record in OPSQAI is scoped by company_id and enforced with PostgreSQL row-level security." },
    { property: "og:title", content: "Multi-Tenant Isolation — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/multi-tenant-isolation" },
      { property: "og:description", content: "Every record in OPSQAI is scoped by company_id and enforced with PostgreSQL row-level security." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/multi-tenant-isolation" }],
  }),
  component: () => (
    <TrustTopic
      title="Multi-Tenant Isolation"
      intro="OPSQAI is a shared multi-tenant SaaS. Every customer (tenant) is represented by a row in the companies table, and every other record carries a company_id foreign key."
    >
      <DraftDisclaimer />
      <h2>How isolation is enforced</h2>
      <ul>
        <li><strong>Schema:</strong> <code>profiles</code>, <code>user_roles</code>, <code>threads</code>, <code>messages</code>, <code>knowledge_documents</code>, <code>document_chunks</code>, <code>faqs</code>, <code>internal_requests</code> and <code>audit_log</code> all carry <code>company_id</code>.</li>
        <li><strong>Row-level security:</strong> Each table has RLS policies that restrict reads and writes to <code>company_id = public.current_company_id()</code>. The helper is a SECURITY DEFINER function that resolves the active company for the calling user.</li>
        <li><strong>Storage:</strong> Knowledge-base files live under a per-tenant prefix in the <code>knowledge-docs</code> bucket. Storage policies require a matching <code>knowledge_documents</code> row in the same company.</li>
        <li><strong>AI retrieval:</strong> The chat endpoint filters embeddings by <code>company_id</code> before any LLM call; the model can never see another tenant's chunks.</li>
      </ul>
      <h2>Platform admins</h2>
      <p>A small platform super-admin role exists for OPSQAI operations. It is recorded in a separate table, scoped by the <code>is_platform_admin()</code> helper and audited. Platform admins can switch into a tenant workspace explicitly; this is logged.</p>
      <h2>Privilege escalation</h2>
      <p>A restrictive INSERT policy on <code>user_roles</code> prevents users from granting themselves additional roles. Role mutations are routed through admin-only server functions.</p>
      <h2>Testing</h2>
      <p>Cross-tenant access attempts are blocked at the database, not just the API. We rely on Postgres to refuse the read rather than trusting application code alone.</p>
    </TrustTopic>
  ),
});
