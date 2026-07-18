import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireAuth } from "@/lib/providers/require-auth";
import { requireCustomerManagerAccess } from "@/lib/authorization";
import { z } from "zod";
import { FEATURE_CATALOG, COMPLIANCE_AREAS, SECURITY_AREAS } from "@/lib/feature-catalog";
import {
  TEMPLATES,
  buildContextFromProfile,
  CUSTOMER_PACKAGE_TEMPLATES,
  type TemplateKey,
  type CustomerContext,
} from "@/lib/customer-templates";
import {
  SUBSCRIPTION_PLANS,
  resolvePlan,
  type SubscriptionPlanKey,
} from "@/lib/subscription-plans";
import { OPSQAI_FACTS } from "@/lib/opsqai-facts";

const Uuid = z.string().uuid();
const CompanyOnly = z.object({ company_id: Uuid });

// ------- Profile -------

export const getCustomerProfile = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const [{ data: company }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("companies")
        .select("id, name, subscription_plan, subscription_status, max_users, active")
        .eq("id", data.company_id)
        .maybeSingle(),
      supabaseAdmin
        .from("customer_profiles")
        .select("*")
        .eq("company_id", data.company_id)
        .maybeSingle(),
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ProfilePatch.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { error } = await supabaseAdmin
      .from("customer_profiles")
      .upsert({ ...data }, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Features -------

export const listCustomerFeatures = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rows, error } = await supabaseAdmin
      .from("customer_features")
      .select("*")
      .eq("company_id", data.company_id);
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
  state: z.enum(["enabled", "disabled", "beta", "enterprise", "coming_soon"]),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertCustomerFeature = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => FeatureUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { error } = await supabaseAdmin
      .from("customer_features")
      .upsert(data, { onConflict: "company_id,feature_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Compliance -------

export const listCustomerCompliance = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rows, error } = await supabaseAdmin
      .from("customer_compliance")
      .select("*")
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const byArea = new Map((rows ?? []).map((r) => [r.area, r]));
    return COMPLIANCE_AREAS.map(
      (area) =>
        byArea.get(area) ?? {
          id: null,
          company_id: data.company_id,
          area,
          status: "pending",
          evidence: "",
          notes: "",
          owner: "",
          updated_at: null,
        },
    );
  });

const ComplianceUpsert = z.object({
  company_id: Uuid,
  area: z.string().min(1).max(80),
  status: z.enum(["not_applicable", "pending", "in_progress", "met", "exceeded"]),
  evidence: z.string().max(4000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  owner: z.string().max(200).optional().nullable(),
});

export const upsertCustomerCompliance = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ComplianceUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { error } = await supabaseAdmin
      .from("customer_compliance")
      .upsert(data, { onConflict: "company_id,area" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Security -------

export const listCustomerSecurity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rows, error } = await supabaseAdmin
      .from("customer_security")
      .select("*")
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const byArea = new Map((rows ?? []).map((r) => [r.area, r]));
    return SECURITY_AREAS.map(
      (area) =>
        byArea.get(area) ?? {
          id: null,
          company_id: data.company_id,
          area,
          summary: "",
          controls: {},
          notes: "",
          updated_at: null,
        },
    );
  });

const SecurityUpsert = z.object({
  company_id: Uuid,
  area: z.string().min(1).max(80),
  summary: z.string().max(4000).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  controls: z.record(z.string(), z.any()).optional(),
});

export const upsertCustomerSecurity = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => SecurityUpsert.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { error } = await supabaseAdmin
      .from("customer_security")
      .upsert(data, { onConflict: "company_id,area" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Health -------

export const customerHealth = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rpc, error } = await (supabaseAdmin as any).rpc("customer_health", {
      p_company: data.company_id,
    });
    if (error) throw new Error(error.message);
    return rpc ?? {};
  });

// ------- Timeline -------

export const listCustomerTimeline = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rows, error } = await supabaseAdmin
      .from("customer_timeline")
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => TimelineInsert.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { error } = await supabaseAdmin.from("customer_timeline").insert({
      ...data,
      created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ------- Documents -------

export const listCustomerDocuments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rows, error } = await supabaseAdmin
      .from("customer_documents")
      .select(
        "id, doc_type, title, status, category, needs_update, version, metadata, updated_at, created_at",
      )
      .eq("company_id", data.company_id)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: doc, error } = await supabaseAdmin
      .from("customer_documents")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const { data: versions } = await supabaseAdmin
      .from("customer_document_versions")
      .select("id, version, title, created_at, created_by")
      .eq("document_id", data.id)
      .order("version", { ascending: false });
    return { doc, versions: versions ?? [] };
  });

// ---- Deterministic input fingerprint (for "Needs Update" tracking) ----
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildGenerationInputs(companyName: string, profile: any, planKey: SubscriptionPlanKey) {
  const ctx = buildContextFromProfile(companyName, profile);
  const plan = SUBSCRIPTION_PLANS[planKey] ?? resolvePlan(planKey);
  return { ctx, plan };
}

/**
 * Grounded enrichment: takes the deterministic template skeleton and runs it
 * through Lovable AI Gateway with a STRICT system prompt that forbids
 * hallucination. If the gateway is unreachable or the key is missing, falls
 * back to the deterministic skeleton — never invents content.
 */
async function enrichWithAi(args: {
  skeleton: string;
  ctx: CustomerContext;
  plan: (typeof SUBSCRIPTION_PLANS)[SubscriptionPlanKey];
  templateLabel: string;
  templateCategory: string;
}): Promise<{ markdown: string; missing: string[]; usedAi: boolean }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    const missing = Array.from(args.skeleton.matchAll(/\*\*\[MISSING:\s*([^\]]+)\]\*\*/g)).map(
      (m) => m[1],
    );
    return { markdown: args.skeleton, missing, usedAi: false };
  }
  try {
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(key);
    const system = [
      "You are a senior management consultant from a tier-1 strategy firm (Deloitte / PwC / KPMG / Accenture / McKinsey), writing under the OPSQAI brand for an enterprise B2B audience in Germany.",
      "DELIVERABLE QUALITY BAR — must read as drafted by a senior consultant for the executive sponsor:",
      "- Confident, precise, executive tone. Every paragraph delivers value. No filler, no AI clichés, no marketing fluff.",
      "- Strong logical flow with tight paragraphs (3-6 lines). Use tables and bullet lists for structure.",
      "- Executive-grade vocabulary in English; localize to German B2B convention where natural.",
      "PREMIUM ENTERPRISE BLOCKS — use them where they add value (not as decoration):",
      "- KPI cards: ```::: kpis\\nLabel | Value | Sub\\n…\\n:::```",
      "- Callouts: `> [Recommendation] …`, `> [Risk] …`, `> [Opportunity] …`, `> [Key Takeaway] …`, `> [Best Practice] …`, `> [Executive Note] …`.",
      "- Horizontal rule `---` to separate major narrative pivots.",
      "OUTPUT FORMAT:",
      "- Do NOT include a cover page, document title or metadata header — those are auto-generated.",
      "- Start directly with the first H1 (e.g. `# Executive Summary`). Use H2 for subsections.",
      "ABSOLUTE GROUNDING RULES — non-negotiable:",
      "1. Use ONLY facts from the provided JSON sources: PROFILE, PLAN, OPSQAI_FACTS.",
      "2. NEVER invent company info, contacts, prices, features, dates, legal clauses or technical specs.",
      "3. If a field is missing, write **[MISSING: <field>]** verbatim — do not guess, do not paraphrase a guess.",
      "4. Keep the structure of the skeleton intact. You may rewrite prose for clarity and add concise paragraphs that contextualize existing facts.",
      "5. Preserve all markdown tables and bullet points. Do NOT remove sections.",
      "6. For Service Agreement / DPA / SLA / contracts: do not invent legal clauses or numerical SLAs. Mark missing items explicitly.",
      "7. Output ONLY the final markdown document — no commentary, no code fences, no meta text.",
    ].join("\n");
    const sources = {
      PROFILE: args.ctx,
      PLAN: args.plan,
      OPSQAI_FACTS,
      DOCUMENT: { label: args.templateLabel, category: args.templateCategory },
    };
    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      temperature: 0.2,
      system,
      prompt: `SOURCES (JSON):\n${JSON.stringify(sources, null, 2)}\n\nSKELETON:\n${args.skeleton}\n\nReturn the polished markdown.`,
    });
    const markdown = (text || "").trim() || args.skeleton;
    const missing = Array.from(markdown.matchAll(/\*\*\[MISSING:\s*([^\]]+)\]\*\*/g)).map(
      (m) => m[1],
    );
    return { markdown, missing, usedAi: true };
  } catch (err) {
    console.error("[customer-doc-gen] AI enrichment failed, using skeleton:", err);
    const missing = Array.from(args.skeleton.matchAll(/\*\*\[MISSING:\s*([^\]]+)\]\*\*/g)).map(
      (m) => m[1],
    );
    return { markdown: args.skeleton, missing, usedAi: false };
  }
}

const GenerateInput = z.object({
  company_id: Uuid,
  template: z.string().min(1),
  /** When provided, overwrites the existing doc in place and resets needs_update. */
  document_id: Uuid.optional(),
});

export const generateCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const tpl = TEMPLATES[data.template as TemplateKey];
    if (!tpl) throw new Error("Unknown template");
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const [{ data: company }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("companies").select("name").eq("id", data.company_id).maybeSingle(),
      supabaseAdmin
        .from("customer_profiles")
        .select("*")
        .eq("company_id", data.company_id)
        .maybeSingle(),
    ]);
    const planKey = ((profile as any)?.commercial?.subscriptionPlan ??
      "standard") as SubscriptionPlanKey;
    const { ctx, plan } = buildGenerationInputs(company?.name ?? "Customer", profile, planKey);
    const skeleton = tpl.build(ctx);
    const enriched = await enrichWithAi({
      skeleton,
      ctx,
      plan,
      templateLabel: tpl.label,
      templateCategory: tpl.category,
    });
    const input_hash = await sha256Hex(JSON.stringify({ tpl: tpl.key, ctx, plan }));
    const metadata = {
      template: tpl.key,
      category: tpl.category,
      missing_fields: enriched.missing,
      sources: ["customer_profile", "subscription_plan", "opsqai_facts", "template_skeleton"],
      ai_enriched: enriched.usedAi,
      generated_at: new Date().toISOString(),
    };

    if (data.document_id) {
      const { error } = await supabaseAdmin
        .from("customer_documents")
        .update({
          doc_type: tpl.key,
          title: `${tpl.label} – ${company?.name ?? "Customer"}`,
          category: tpl.category,
          markdown: enriched.markdown,
          metadata,
          input_hash,
          needs_update: false,
        })
        .eq("id", data.document_id);
      if (error) throw new Error(error.message);
      return { id: data.document_id };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("customer_documents")
      .insert({
        company_id: data.company_id,
        doc_type: tpl.key,
        title: `${tpl.label} – ${company?.name ?? "Customer"}`,
        category: tpl.category,
        status: "draft",
        markdown: enriched.markdown,
        metadata,
        input_hash,
        needs_update: false,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message || "Failed to create document");
    return { id: inserted.id };
  });

export const regenerateCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: doc } = await supabaseAdmin
      .from("customer_documents")
      .select("id, company_id, doc_type")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");
    // delegate to generateCustomerDocument with document_id (in-place update)
    return await generateCustomerDocument({
      data: { company_id: doc.company_id, template: doc.doc_type, document_id: doc.id },
    } as any);
  });

export const generateAllStandardDocuments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: profile } = await supabaseAdmin
      .from("customer_profiles")
      .select("commercial")
      .eq("company_id", data.company_id)
      .maybeSingle();
    const planKey = ((profile as any)?.commercial?.subscriptionPlan ??
      "standard") as SubscriptionPlanKey;
    const plan = SUBSCRIPTION_PLANS[planKey] ?? resolvePlan(planKey);
    const { data: existing } = await supabaseAdmin
      .from("customer_documents")
      .select("id, doc_type")
      .eq("company_id", data.company_id);
    const byType = new Map<string, string>((existing ?? []).map((d: any) => [d.doc_type, d.id]));
    const results: Array<{ template: string; id: string; updated: boolean }> = [];
    for (const tplKey of plan.recommendedTemplates) {
      if (!TEMPLATES[tplKey as TemplateKey]) continue;
      const existingId = byType.get(tplKey);
      const r = await generateCustomerDocument({
        data: { company_id: data.company_id, template: tplKey, document_id: existingId },
      } as any);
      results.push({ template: tplKey, id: r.id, updated: !!existingId });
    }
    return { count: results.length, results, plan: plan.key };
  });

/**
 * Generate Customer Package — the primary delivery action.
 * Generates the full enterprise package for the customer (all templates in
 * CUSTOMER_PACKAGE_TEMPLATES), regardless of plan. Existing docs of the same
 * template type are updated in place; missing ones are created. Returns a
 * summary the UI can show as a toast.
 */
export const generateCustomerPackage = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: existing } = await supabaseAdmin
      .from("customer_documents")
      .select("id, doc_type")
      .eq("company_id", data.company_id);
    const byType = new Map<string, string>((existing ?? []).map((d: any) => [d.doc_type, d.id]));
    const results: Array<{ template: string; id: string; updated: boolean }> = [];
    for (const tplKey of CUSTOMER_PACKAGE_TEMPLATES) {
      if (!TEMPLATES[tplKey]) continue;
      const existingId = byType.get(tplKey);
      try {
        const r = await generateCustomerDocument({
          data: { company_id: data.company_id, template: tplKey, document_id: existingId },
        } as any);
        results.push({ template: tplKey, id: r.id, updated: !!existingId });
      } catch (e) {
        console.error("[customer-package] template failed", tplKey, e);
      }
    }
    return { count: results.length, results };
  });

const DocPatch = z.object({
  id: Uuid,
  title: z.string().min(1).max(280).optional(),
  markdown: z.string().optional(),
  status: z.enum(["draft", "ready", "review", "approved", "sent", "archived"]).optional(),
  category: z
    .enum([
      "Commercial",
      "Contracts",
      "Implementation",
      "Training",
      "Security",
      "Compliance",
      "Technical",
      "Marketing",
      "Internal",
      "Generated",
      "Archive",
    ])
    .optional(),
});

export const updateCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => DocPatch.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { id, ...patch } = data;
    const { error } = await supabaseAdmin.from("customer_documents").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomerDocument = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { error } = await supabaseAdmin.from("customer_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAllCustomerDocuments = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => CompanyOnly.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: rows, error: selErr } = await supabaseAdmin
      .from("customer_documents")
      .select("id")
      .eq("company_id", data.company_id);
    if (selErr) throw new Error(selErr.message);
    const ids = (rows ?? []).map((r: any) => r.id);
    if (!ids.length) return { ok: true, deleted: 0 };
    const { error } = await supabaseAdmin
      .from("customer_documents")
      .delete()
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    // Best-effort: purge generated exports for this customer from storage.
    try {
      const { data: files } = await supabaseAdmin.storage
        .from("customer-exports")
        .list(data.company_id, { limit: 1000 });
      const paths: string[] = [];
      for (const docDir of files ?? []) {
        const { data: inner } = await supabaseAdmin.storage
          .from("customer-exports")
          .list(`${data.company_id}/${docDir.name}`, { limit: 1000 });
        for (const f of inner ?? []) paths.push(`${data.company_id}/${docDir.name}/${f.name}`);
      }
      if (paths.length) await supabaseAdmin.storage.from("customer-exports").remove(paths);
    } catch (e) {
      console.warn("[deleteAllCustomerDocuments] storage purge failed", e);
    }
    await supabaseAdmin.from("customer_timeline").insert({
      company_id: data.company_id,
      event_type: "documents_purged",
      title: `Deleted ${ids.length} generated documents`,
      payload: { count: ids.length },
      created_by: context.userId,
    });
    return { ok: true, deleted: ids.length };
  });

export const restoreCustomerDocumentVersion = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ document_id: Uuid, version_id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: ver, error } = await supabaseAdmin
      .from("customer_document_versions")
      .select("title, markdown, metadata")
      .eq("id", data.version_id)
      .maybeSingle();
    if (error || !ver) throw new Error(error?.message || "Version not found");
    const { error: uerr } = await supabaseAdmin
      .from("customer_documents")
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
    | { type: "numbered"; items: string[] }
    | { type: "table"; headers: string[]; rows: string[][] }
    | {
        type: "callout";
        kind?:
          | "recommendation"
          | "risk"
          | "opportunity"
          | "key-takeaway"
          | "best-practice"
          | "note"
          | "executive";
        title?: string;
        text: string;
      }
    | { type: "kpis"; items: Array<{ label: string; value: string; sub?: string }> }
    | { type: "divider" }
    | { type: "pagebreak" };

  type CalloutKind =
    | "recommendation"
    | "risk"
    | "opportunity"
    | "key-takeaway"
    | "best-practice"
    | "note"
    | "executive";
  const calloutMap: Record<string, CalloutKind> = {
    recommendation: "recommendation",
    recommendations: "recommendation",
    risk: "risk",
    risks: "risk",
    opportunity: "opportunity",
    opportunities: "opportunity",
    "key takeaway": "key-takeaway",
    "key-takeaway": "key-takeaway",
    takeaway: "key-takeaway",
    "best practice": "best-practice",
    "best-practice": "best-practice",
    note: "note",
    executive: "executive",
    "executive note": "executive",
  };

  // ---- Normalization: scrub placeholders, AI artefacts, duplicate blank lines.
  const normalized = (md ?? "")
    // [MISSING] / [MISSING: field] markers from older templates
    .replace(/\*\*\[MISSING(?::\s*[^\]]+)?\]\*\*/g, "Not configured")
    .replace(/\[MISSING(?::\s*[^\]]+)?\]/g, "Not configured")
    // [to be confirmed] AI placeholders
    .replace(/\[to\s+be\s+confirmed\]/gi, "Not configured")
    // strip stray code fences around the whole doc
    .replace(/^```(?:markdown|md)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    // collapse 3+ blank lines
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n");
  const lines = normalized.split(/\r?\n/);
  const blocks: Block[] = [];
  let buf: string[] = [];
  const flushP = () => {
    if (buf.length) {
      blocks.push({ type: "p", text: buf.join(" ") });
      buf = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    // Fenced callout: ::: kind ... :::  or ::: kind | Title ... :::
    const fenceOpen = ln.match(/^:::\s*(?:callout\s+)?([a-zA-Z][\w \-]*)(?:\s*\|\s*(.+))?\s*$/);
    if (fenceOpen) {
      flushP();
      const rawKind = fenceOpen[1].trim().toLowerCase();
      const title = fenceOpen[2]?.trim();
      const kind = calloutMap[rawKind] ?? "note";
      i++;
      const inner: string[] = [];
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        inner.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({
        type: "callout",
        kind,
        title,
        text: inner.join(" ").replace(/\s+/g, " ").trim(),
      });
      continue;
    }
    // KPI block: ::: kpis  rows of `Label | Value | Sub`
    if (/^:::\s*kpis?\s*$/i.test(ln)) {
      flushP();
      i++;
      const items: Array<{ label: string; value: string; sub?: string }> = [];
      while (i < lines.length && !/^:::\s*$/.test(lines[i])) {
        const row = lines[i].split("|").map((s) => s.trim());
        if (row[0] && row[1])
          items.push({ label: row[0], value: row[1], sub: row[2] || undefined });
        i++;
      }
      if (i < lines.length) i++;
      if (items.length) blocks.push({ type: "kpis", items });
      continue;
    }
    // Blockquote callout: > [Kind] text  (or > [Kind: Title] text)
    if (/^>\s*/.test(ln)) {
      flushP();
      const quoted: string[] = [];
      while (i < lines.length && /^>\s*/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      const joined = quoted.join(" ").trim();
      const tagMatch = joined.match(/^\[\s*([a-zA-Z][\w \-]*?)(?:\s*:\s*([^\]]+))?\s*\]\s*(.*)$/);
      if (tagMatch) {
        const rawKind = tagMatch[1].trim().toLowerCase();
        const kind = calloutMap[rawKind] ?? "note";
        const title = tagMatch[2]?.trim();
        blocks.push({ type: "callout", kind, title, text: tagMatch[3].trim() });
      } else {
        blocks.push({ type: "callout", kind: "note", text: joined });
      }
      continue;
    }
    // Horizontal rule -> divider
    if (/^\s*(---|\*\*\*|___)\s*$/.test(ln)) {
      flushP();
      blocks.push({ type: "divider" });
      i++;
      continue;
    }
    // Explicit page break
    if (/^\s*<pagebreak\s*\/?>/i.test(ln)) {
      flushP();
      blocks.push({ type: "pagebreak" });
      i++;
      continue;
    }
    if (/^#{1,3}\s+/.test(ln)) {
      flushP();
      const m = ln.match(/^(#{1,3})\s+(.*)$/)!;
      const lvl = m[1].length as 1 | 2 | 3;
      blocks.push({ type: `h${lvl}` as "h1" | "h2" | "h3", text: m[2] });
      i++;
    } else if (/^\s*\d+\.\s+/.test(ln)) {
      flushP();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "numbered", items });
    } else if (/^[-*]\s+/.test(ln)) {
      flushP();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "bullets", items });
    } else if (
      /\|/.test(ln) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+/.test(lines[i + 1]) &&
      /\|/.test(lines[i + 1])
    ) {
      flushP();
      // Robust table-cell splitter: tolerates missing leading/trailing pipes.
      const splitRow = (raw: string): string[] => {
        let s = raw.trim();
        if (s.startsWith("|")) s = s.slice(1);
        if (s.endsWith("|")) s = s.slice(0, -1);
        return s.split("|").map((c) => c.trim());
      };
      const headers = splitRow(ln);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
        const row = splitRow(lines[i]);
        // pad/truncate to header width
        while (row.length < headers.length) row.push("");
        if (row.length > headers.length) row.length = headers.length;
        rows.push(row);
        i++;
      }
      if (headers.length) blocks.push({ type: "table", headers, rows });
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => ExportInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: doc } = await supabaseAdmin
      .from("customer_documents")
      .select("id, company_id, title, markdown, version, doc_type")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", doc.company_id)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const subtitle = `${company?.name ?? ""} · v${doc.version} · ${today}`;
    const meta = {
      customerName: company?.name ?? "",
      workspaceName: company?.name ?? "",
      documentType:
        TEMPLATES[doc.doc_type as TemplateKey]?.label ?? doc.doc_type ?? "Enterprise Document",
      version: String(doc.version ?? "1.0"),
      date: today,
      confidentiality: "Confidential — for the named recipient only",
      brand: "OPSQAI",
      revision: `R${doc.version ?? 1}`,
    };
    let bytes: Uint8Array;
    let mime: string;
    let ext: string;
    if (data.format === "md") {
      bytes = new TextEncoder().encode(doc.markdown);
      mime = "text/markdown";
      ext = "md";
    } else if (data.format === "html") {
      const blocks = markdownToBlocks(doc.markdown);
      const esc = (s: string) =>
        s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
      const body = blocks
        .map((b) => {
          if (b.type === "p" || b.type === "h1" || b.type === "h2" || b.type === "h3")
            return `<${b.type}>${esc(b.text)}</${b.type}>`;
          if (b.type === "bullets")
            return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
          if (b.type === "numbered")
            return `<ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
          if (b.type === "table")
            return `<table><thead><tr>${b.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
          if (b.type === "callout")
            return `<aside class="callout c-${b.kind ?? "note"}"><div class="ctag">${esc((b.kind ?? "note").replace("-", " ").toUpperCase())}</div>${b.title ? `<h4>${esc(b.title)}</h4>` : ""}<p>${esc(b.text)}</p></aside>`;
          if (b.type === "kpis")
            return `<div class="kpis">${b.items.map((k) => `<div class="kpi"><div class="kpi-label">${esc(k.label)}</div><div class="kpi-value">${esc(k.value)}</div>${k.sub ? `<div class="kpi-sub">${esc(k.sub)}</div>` : ""}</div>`).join("")}</div>`;
          if (b.type === "divider") return `<hr/>`;
          return "";
        })
        .join("\n");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
        :root{--ink:#0F1729;--sub:#4B5772;--brand:#3358D4;--brand2:#5B7CE6;--teal:#0E9F92;--amber:#C98A2B;--red:#C93F3F;--line:#E4E7EC;--panel:#F7F8FA}
        body{font-family:Inter,system-ui,sans-serif;max-width:820px;margin:0 auto;padding:48px 32px;color:var(--ink);line-height:1.6;background:#fff}
        header.cover{padding:48px 0 32px;border-bottom:3px solid var(--brand);margin-bottom:48px}
        header.cover .brand{font-weight:700;color:var(--brand);letter-spacing:.04em}
        header.cover h1{font-family:'Space Grotesk',Inter,sans-serif;font-size:42px;margin:24px 0 8px;line-height:1.1}
        header.cover .meta{color:var(--sub);font-size:13px;margin-top:24px;display:grid;grid-template-columns:160px 1fr;row-gap:6px}
        header.cover .meta b{color:var(--sub);font-size:11px;letter-spacing:.08em}
        h1,h2,h3,h4{font-family:'Space Grotesk',Inter,sans-serif;color:var(--ink)}
        h1{font-size:26px;border-bottom:2px solid var(--brand);padding-bottom:8px;margin-top:48px}
        h2{font-size:19px;color:var(--ink);margin-top:32px}
        h3{font-size:15px;color:var(--sub);text-transform:uppercase;letter-spacing:.04em;margin-top:24px}
        table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14px}
        th,td{border:1px solid var(--line);padding:10px 12px;text-align:left}
        th{background:#EDEFF4;font-weight:600}
        tbody tr:nth-child(odd){background:var(--panel)}
        .callout{background:var(--panel);border-left:4px solid var(--sub);padding:14px 18px;margin:18px 0;border-radius:4px}
        .callout .ctag{font-size:11px;font-weight:700;letter-spacing:.08em;color:var(--sub);margin-bottom:6px}
        .callout h4{margin:0 0 6px}
        .callout p{margin:0;color:var(--ink)}
        .c-recommendation{border-color:var(--brand)} .c-recommendation .ctag{color:var(--brand)}
        .c-risk{border-color:var(--red)} .c-risk .ctag{color:var(--red)}
        .c-opportunity,.c-best-practice{border-color:var(--teal)} .c-opportunity .ctag,.c-best-practice .ctag{color:var(--teal)}
        .c-key-takeaway{border-color:var(--brand2)} .c-key-takeaway .ctag{color:var(--brand2)}
        .c-executive{border-color:var(--ink)} .c-executive .ctag{color:var(--ink)}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:20px 0}
        .kpi{background:#fff;border:1px solid var(--line);border-top:3px solid var(--brand);padding:16px;border-radius:6px}
        .kpi-label{font-size:10px;font-weight:700;letter-spacing:.08em;color:var(--sub)}
        .kpi-value{font-family:'Space Grotesk',Inter,sans-serif;font-size:26px;font-weight:700;margin-top:6px}
        .kpi-sub{font-size:11px;color:var(--sub);margin-top:4px}
        hr{border:none;border-top:1px solid var(--line);margin:24px 0}
        footer{margin-top:64px;border-top:1px solid var(--line);padding-top:14px;font-size:11px;color:var(--sub);display:flex;justify-content:space-between}
      </style></head><body>
        <header class="cover">
          <div class="brand">${esc(meta.brand)} · ${esc(meta.customerName)}</div>
          <h1>${esc(doc.title)}</h1>
          <div style="color:var(--sub);font-size:13px">${esc(meta.documentType)}</div>
          <div class="meta">
            <b>PREPARED FOR</b><span>${esc(meta.customerName || "—")}</span>
            <b>WORKSPACE</b><span>${esc(meta.workspaceName || "—")}</span>
            <b>VERSION</b><span>v${esc(meta.version)} · ${esc(meta.revision)}</span>
            <b>DATE</b><span>${esc(meta.date)}</span>
            <b>CONFIDENTIALITY</b><span><em>${esc(meta.confidentiality)}</em></span>
          </div>
        </header>
        ${body}
        <footer><span>${esc(meta.confidentiality)}</span><span>${esc(meta.brand)} · ${esc(meta.documentType)} · v${esc(meta.version)}</span></footer>
      </body></html>`;
      bytes = new TextEncoder().encode(html);
      mime = "text/html";
      ext = "html";
    } else if (data.format === "docx") {
      const { generateDocx } = await import("@/lib/generators/docx.server");
      bytes = await generateDocx({
        title: doc.title,
        subtitle,
        author: "OPSQAI",
        blocks: markdownToBlocks(doc.markdown) as any,
        meta,
      });
      mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      ext = "docx";
    } else {
      const { generatePdf } = await import("@/lib/generators/pdf.server");
      bytes = await generatePdf({
        title: doc.title,
        subtitle,
        author: "OPSQAI",
        blocks: markdownToBlocks(doc.markdown) as any,
        meta,
      });
      mime = "application/pdf";
      ext = "pdf";
    }

    const safe = doc.title.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
    const path = `${doc.company_id}/${doc.id}/${Date.now()}_v${doc.version}_${safe}.${ext}`;
    const upload = await supabaseAdmin.storage.from("customer-exports").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);
    const signed = await supabaseAdmin.storage.from("customer-exports").createSignedUrl(path, 600);
    if (signed.error || !signed.data)
      throw new Error(signed.error?.message || "Failed to sign URL");
    await supabaseAdmin.from("customer_timeline").insert({
      company_id: doc.company_id,
      event_type: "document_exported",
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

// ---- Bulk PDF download (folder / all) ----

function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000;
  let bin = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

const DownloadInput = z.object({
  company_id: Uuid,
  category: z.string().min(1).max(80).optional(),
});

export const downloadCustomerDocumentsZip = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => DownloadInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireCustomerManagerAccess(context);
    const supabaseAdmin = await getCloudSupabaseAdmin("customers");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", data.company_id)
      .maybeSingle();
    const { data: docs, error } = await supabaseAdmin
      .from("customer_documents")
      .select("id, title, markdown, metadata, version, doc_type")
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    const filtered = (docs ?? []).filter(
      (d: any) =>
        !data.category || ((d.metadata as any)?.category ?? "Custom Documents") === data.category,
    );
    if (filtered.length === 0) throw new Error("No documents to download");

    const { generatePdf } = await import("@/lib/generators/pdf.server");
    const { zipSync, strToU8 } = await import("fflate");
    const files: Record<string, Uint8Array> = {};
    const today = new Date().toISOString().slice(0, 10);
    for (const d of filtered) {
      const blocks = markdownToBlocks(d.markdown ?? "");
      const docType =
        TEMPLATES[d.doc_type as TemplateKey]?.label ?? d.doc_type ?? "Enterprise Document";
      const pdf = await generatePdf({
        title: d.title,
        subtitle: `${company?.name ?? ""} · v${d.version}`,
        author: "OPSQAI",
        blocks: blocks as any,
        meta: {
          customerName: company?.name ?? "",
          workspaceName: company?.name ?? "",
          documentType: docType,
          version: String(d.version ?? "1.0"),
          date: today,
          confidentiality: "Confidential — for the named recipient only",
          brand: "OPSQAI",
          revision: `R${d.version ?? 1}`,
        },
      });
      const folder = ((d.metadata as any)?.category ?? "Custom Documents").replace(
        /[^\w -]+/g,
        "_",
      );
      const safe = String(d.title)
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .slice(0, 80);
      files[`${folder}/${safe}.pdf`] = pdf;
    }
    files["README.txt"] = strToU8(
      `OPSQAI Customer Documents Export\nCompany: ${company?.name ?? ""}\nGenerated: ${new Date().toISOString()}\nDocuments: ${filtered.length}\n`,
    );
    const zipped = zipSync(files, { level: 6 });
    const safeName = (company?.name ?? "customer").replace(/[^a-zA-Z0-9._-]+/g, "_");
    const filename = data.category
      ? `${safeName}_${data.category.replace(/\s+/g, "_")}.zip`
      : `${safeName}_all_documents.zip`;
    return {
      base64: bytesToBase64(zipped),
      mime: "application/zip",
      filename,
      count: filtered.length,
    };
  });

// Helper used by API route to build a context block for the AI writing assistant.
export async function loadCustomerContextForAi(
  companyId: string,
): Promise<CustomerContext & { _systemBlock: string }> {
  const supabaseAdmin = await getCloudSupabaseAdmin("customers");
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
