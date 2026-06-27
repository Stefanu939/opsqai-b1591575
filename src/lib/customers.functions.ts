/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireCustomerManagerAccess } from "@/lib/authorization";
import { z } from "zod";
import { FEATURE_CATALOG, COMPLIANCE_AREAS, SECURITY_AREAS } from "@/lib/feature-catalog";
import { TEMPLATES, buildContextFromProfile, type TemplateKey, type CustomerContext } from "@/lib/customer-templates";
import { SUBSCRIPTION_PLANS, resolvePlan, type SubscriptionPlanKey } from "@/lib/subscription-plans";
import { OPSQAI_FACTS } from "@/lib/opsqai-facts";

const Uuid = z.string().uuid();
const CompanyOnly = z.object({ company_id: Uuid });


// ------- Profile -------

export const getCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: company }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("companies").select("id, name, subscription_plan, subscription_status, max_users, active").eq("id", data.company_id).maybeSingle(),
      supabaseAdmin.from("customer_profiles").select("*").eq("company_id", data.company_id).maybeSingle(),
    ]);
    return { company, profile };
  });

const ProfilePatch = z.object({
  company_id: Uuid,
  contract_status: z.string().max(80).optional(),
  renewal_date: z.string().nullable().optional(),
  onboarding_pct: z.number().int().min(0).max(100).optional(),
  general: z.record(z.string(), z.any()).optional(),
  commercial: z.record(z.string(), z.any()).optional(),
  implementation: z.record(z.string(), z.any()).optional(),
  ai_config: z.record(z.string(), z.any()).optional(),
  sla: z.record(z.string(), z.any()).optional(),
  branding: z.record(z.string(), z.any()).optional(),
  integrations: z.record(z.string(), z.any()).optional(),
  account_manager_id: Uuid.nullable().optional(),
});

export const upsertCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfilePatch.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_profiles")
      .upsert({ ...data }, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Features -------

export const listCustomerFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("customer_features").select("*").eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const byKey = new Map((rows ?? []).map((r) => [r.feature_key, r]));
    return FEATURE_CATALOG.map((f) => {
      const row = byKey.get(f.key);
      return {
        feature_key: f.key,
        label: f.label,
        category: f.category,
        state: (row?.state ?? f.defaultState) as string,
        notes: row?.notes ?? "",
        persisted: !!row,
      };
    });
  });

const FeatureUpsert = z.object({
  company_id: Uuid,
  feature_key: z.string().min(1).max(80),
  state: z.enum(["enabled","disabled","beta","enterprise","coming_soon"]),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertCustomerFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FeatureUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_features")
      .upsert(data, { onConflict: "company_id,feature_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Compliance -------

export const listCustomerCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("customer_compliance").select("*").eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const byArea = new Map((rows ?? []).map((r) => [r.area, r]));
    return COMPLIANCE_AREAS.map((area) => byArea.get(area) ?? {
      id: null, company_id: data.company_id, area, status: "pending",
      evidence: "", notes: "", owner: "", updated_at: null,
    });
  });

const ComplianceUpsert = z.object({
  company_id: Uuid,
  area: z.string().min(1).max(80),
  status: z.enum(["not_applicable","pending","in_progress","met","exceeded"]),
  evidence: z.string().max(4000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  owner: z.string().max(200).optional().nullable(),
});

export const upsertCustomerCompliance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ComplianceUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_compliance")
      .upsert(data, { onConflict: "company_id,area" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Security -------

export const listCustomerSecurity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("customer_security").select("*").eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const byArea = new Map((rows ?? []).map((r) => [r.area, r]));
    return SECURITY_AREAS.map((area) => byArea.get(area) ?? {
      id: null, company_id: data.company_id, area, summary: "", controls: {}, notes: "", updated_at: null,
    });
  });

const SecurityUpsert = z.object({
  company_id: Uuid,
  area: z.string().min(1).max(80),
  summary: z.string().max(4000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  controls: z.record(z.string(), z.any()).optional(),
});

export const upsertCustomerSecurity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SecurityUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_security")
      .upsert(data, { onConflict: "company_id,area" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Health -------

export const customerHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rpc, error } = await (supabaseAdmin as any).rpc("customer_health", { p_company: data.company_id });
    if (error) throw new Error(error.message);
    return rpc ?? {};
  });

// ------- Timeline -------

export const listCustomerTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("customer_timeline")
      .select("id, event_type, title, payload, occurred_at, created_by")
      .eq("company_id", data.company_id)
      .order("occurred_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const TimelineInsert = z.object({
  company_id: Uuid,
  event_type: z.string().min(1).max(80),
  title: z.string().min(1).max(280),
  payload: z.record(z.string(), z.any()).optional(),
});

export const addCustomerTimelineEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TimelineInsert.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_timeline").insert({
      ...data, created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Documents -------

export const listCustomerDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.from("customer_documents")
      .select("id, doc_type, title, status, version, updated_at, created_at")
      .eq("company_id", data.company_id)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc, error } = await supabaseAdmin.from("customer_documents").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    const { data: versions } = await supabaseAdmin.from("customer_document_versions")
      .select("id, version, title, created_at, created_by")
      .eq("document_id", data.id).order("version", { ascending: false });
    return { doc, versions: versions ?? [] };
  });

export const generateCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: Uuid, template: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const tpl = TEMPLATES[data.template as TemplateKey];
    if (!tpl) throw new Error("Unknown template");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: company }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("companies").select("name").eq("id", data.company_id).maybeSingle(),
      supabaseAdmin.from("customer_profiles").select("*").eq("company_id", data.company_id).maybeSingle(),
    ]);
    const ctx = buildContextFromProfile(company?.name ?? "Customer", profile as any);
    const markdown = tpl.build(ctx);
    const { data: inserted, error } = await supabaseAdmin.from("customer_documents").insert({
      company_id: data.company_id,
      doc_type: tpl.key,
      title: `${tpl.label} – ${company?.name ?? "Customer"}`,
      status: "draft",
      markdown,
      metadata: { template: tpl.key, category: tpl.category },
      created_by: context.userId,
    }).select("id").single();
    if (error || !inserted) throw new Error(error?.message || "Failed to create document");
    return { id: inserted.id };
  });

const DocPatch = z.object({
  id: Uuid,
  title: z.string().min(1).max(280).optional(),
  markdown: z.string().optional(),
  status: z.enum(["draft","review","approved","sent","archived"]).optional(),
});

export const updateCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DocPatch.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("customer_documents").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("customer_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const restoreCustomerDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ document_id: Uuid, version_id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ver, error } = await supabaseAdmin.from("customer_document_versions")
      .select("title, markdown, metadata").eq("id", data.version_id).maybeSingle();
    if (error || !ver) throw new Error(error?.message || "Version not found");
    const { error: uerr } = await supabaseAdmin.from("customer_documents")
      .update({ title: ver.title, markdown: ver.markdown, metadata: ver.metadata })
      .eq("id", data.document_id);
    if (uerr) throw new Error(uerr.message);
    return { ok: true };
  });

// ------- Export (DOCX / PDF / MD / HTML) -------

function markdownToBlocks(md: string) {
  type Block =
    | { type: "h1" | "h2" | "h3" | "p"; text: string }
    | { type: "bullets"; items: string[] }
    | { type: "table"; headers: string[]; rows: string[][] };
  const lines = md.split(/\r?\n/);
  const blocks: Block[] = [];
  let buf: string[] = [];
  const flushP = () => { if (buf.length) { blocks.push({ type: "p", text: buf.join(" ") }); buf = []; } };
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (/^#{1,3}\s+/.test(ln)) {
      flushP();
      const m = ln.match(/^(#{1,3})\s+(.*)$/)!;
      const lvl = m[1].length as 1 | 2 | 3;
      blocks.push({ type: (`h${lvl}` as "h1" | "h2" | "h3"), text: m[2] });
      i++;
    } else if (/^[-*]\s+/.test(ln)) {
      flushP();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, "")); i++;
      }
      blocks.push({ type: "bullets", items });
    } else if (/^\s*\|/.test(ln) && i + 1 < lines.length && /^\s*\|\s*-+/.test(lines[i+1])) {
      flushP();
      const headers = ln.split("|").map((c) => c.trim()).filter((c, idx, a) => idx > 0 && idx < a.length - 1);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const row = lines[i].split("|").map((c) => c.trim()).filter((c, idx, a) => idx > 0 && idx < a.length - 1);
        rows.push(row); i++;
      }
      blocks.push({ type: "table", headers, rows });
    } else if (ln.trim() === "") {
      flushP();
      i++;
    } else {
      buf.push(ln);
      i++;
    }
  }
  flushP();
  return blocks;
}

const ExportInput = z.object({
  id: Uuid,
  format: z.enum(["docx", "pdf", "md", "html"]),
});

export const exportCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExportInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin.from("customer_documents")
      .select("id, company_id, title, markdown, version, doc_type").eq("id", data.id).maybeSingle();
    if (!doc) throw new Error("Document not found");
    const { data: company } = await supabaseAdmin.from("companies").select("name").eq("id", doc.company_id).maybeSingle();
    const subtitle = `${company?.name ?? ""} · v${doc.version} · ${new Date().toISOString().slice(0,10)}`;
    let bytes: Uint8Array;
    let mime: string;
    let ext: string;
    if (data.format === "md") {
      bytes = new TextEncoder().encode(doc.markdown);
      mime = "text/markdown"; ext = "md";
    } else if (data.format === "html") {
      const blocks = markdownToBlocks(doc.markdown);
      const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
      const body = blocks.map((b) => {
        if (b.type === "p") return `<p>${esc(b.text)}</p>`;
        if (b.type === "bullets") return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
        if (b.type === "table") return `<table><thead><tr>${b.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        return `<${b.type}>${esc(b.text)}</${b.type}>`;
      }).join("\n");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>body{font-family:Inter,system-ui,sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#0F172A;line-height:1.55}h1,h2,h3{font-family:'Space Grotesk',Inter,sans-serif;color:#0F172A}h1{border-bottom:2px solid #2563EB;padding-bottom:8px}h2{color:#2563EB;margin-top:32px}table{border-collapse:collapse;width:100%;margin:12px 0}th,td{border:1px solid #e2e8f0;padding:8px 12px;text-align:left;font-size:14px}th{background:#f8fafc}footer{margin-top:48px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:12px;color:#64748b}</style></head><body><header><small>OPSQAI · ${esc(subtitle)}</small></header>${body}<footer>Generated by OPSQAI Customer Workspace Manager.</footer></body></html>`;
      bytes = new TextEncoder().encode(html);
      mime = "text/html"; ext = "html";
    } else if (data.format === "docx") {
      const { generateDocx } = await import("@/lib/generators/docx.server");
      bytes = await generateDocx({
        title: doc.title, subtitle, author: "OPSQAI",
        blocks: markdownToBlocks(doc.markdown) as any,
      });
      mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"; ext = "docx";
    } else {
      const { generatePdf } = await import("@/lib/generators/pdf.server");
      const blocks = markdownToBlocks(doc.markdown);
      const sections: { heading?: string; paragraphs: string[] }[] = [];
      let current: { heading?: string; paragraphs: string[] } = { heading: undefined, paragraphs: [] };
      for (const b of blocks) {
        if (b.type === "h1" || b.type === "h2" || b.type === "h3") {
          if (current.heading || current.paragraphs.length) sections.push(current);
          current = { heading: b.text, paragraphs: [] };
        } else if (b.type === "p") current.paragraphs.push(b.text);
        else if (b.type === "bullets") current.paragraphs.push(b.items.map((i) => `• ${i}`).join("\n"));
        else if (b.type === "table") {
          current.paragraphs.push([b.headers.join(" | "), ...b.rows.map((r) => r.join(" | "))].join("\n"));
        }
      }
      if (current.heading || current.paragraphs.length) sections.push(current);
      bytes = await generatePdf({ title: doc.title, subtitle, author: "OPSQAI", sections });
      mime = "application/pdf"; ext = "pdf";
    }

    const safe = doc.title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    const path = `${doc.company_id}/${doc.id}/${Date.now()}_v${doc.version}_${safe}.${ext}`;
    const upload = await supabaseAdmin.storage.from("customer-exports").upload(path, bytes, {
      contentType: mime, upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);
    const signed = await supabaseAdmin.storage.from("customer-exports").createSignedUrl(path, 600);
    if (signed.error || !signed.data) throw new Error(signed.error?.message || "Failed to sign URL");
    await supabaseAdmin.from("customer_timeline").insert({
      company_id: doc.company_id, event_type: "document_exported",
      title: `Exported ${doc.title} (${ext.toUpperCase()})`,
      payload: { document_id: doc.id, format: ext, path },
      created_by: context.userId,
    });
    // Return inline base64 so the client can build a Blob URL on its own origin
    // (avoids ad-blockers that block requests to *.supabase.co).
    let base64 = "";
    {
      const chunk = 0x8000;
      let bin = "";
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      base64 = btoa(bin);
    }
    const filename = `${safe || "document"}.${ext}`;
    return { url: signed.data.signedUrl, path, mime, base64, filename };
  });


// Helper used by API route to build a context block for the AI writing assistant.
export async function loadCustomerContextForAi(companyId: string): Promise<CustomerContext & { _systemBlock: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: company }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("companies").select("name").eq("id", companyId).maybeSingle(),
    supabaseAdmin.from("customer_profiles").select("*").eq("company_id", companyId).maybeSingle(),
  ]);
  const ctx = buildContextFromProfile(company?.name ?? "Customer", profile as any);
  const _systemBlock = Object.entries(ctx)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return { ...ctx, _systemBlock };
}
