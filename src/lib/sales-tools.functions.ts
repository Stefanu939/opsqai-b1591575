// Sales tools for the Management Center (cloud only — OPSQAI staff):
// 1. Client-specific PDFs (executive one-pager, IT security & GDPR sheet).
// 2. Follow-up Radar (overdue / due / stale CRM leads).
// 3. Call debrief: a human-approved write of a call summary into the CRM.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";

const DAY = 86_400_000;
// pdf-lib standard fonts are WinAnsi: strip Romanian comma/breve diacritics.
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export type SalesDocKind = "onepager" | "security";

export const generateSalesDoc = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        kind: z.enum(["onepager", "security"]),
        company_name: z.string().min(1).max(200),
        cui: z.string().max(20).nullish(),
        contact_name: z.string().max(120).nullish(),
        industry: z.string().max(120).nullish(),
        employees: z.number().int().min(0).max(1_000_000).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    const { generatePdf } = await import("@/lib/generators/pdf.server");
    type Blocks = NonNullable<Parameters<typeof generatePdf>[0]["blocks"]>;
    const firm = plain(data.company_name);
    const date = new Date().toISOString().slice(0, 10);
    const transport = /transport|logist|curier|4941|5229|5210/i.test(data.industry ?? "");
    const users = data.employees && data.employees > 0 ? data.employees : 50;
    const saasYear = users * 30 * 12; // illustrative SaaS benchmark, labelled as such

    let title: string;
    let blocks: Blocks;
    if (data.kind === "onepager") {
      title = `OPSQAI pentru ${firm}`;
      blocks = [
        { type: "callout", kind: "executive", title: "Pe scurt", text: plain(`OPSQAI este o platforma AI instalata pe serverul ${data.company_name}: procedurile interne, documentele si instruirea angajatilor devin raspunsuri clare, cu sursa citata, fara ca datele sa paraseasca firma.`) },
        { type: "h2", text: "Ce rezolva" },
        { type: "bullets", items: [
          "Angajatii gasesc procedura corecta in cateva secunde, cu trimitere la documentul sursa.",
          "Academie de instruire cu teste scurte si certificate verificabile.",
          transport ? "Workspace Transport: documente soferi, flota si termene intr-un singur loc." : "Workspace-uri dedicate (Transport, HR) activate doar cand aveti nevoie.",
          "Audit intern: cine a citit, cine a promovat instruirea, ce documente expira.",
        ] },
        { type: "h2", text: "De ce Self-Hosted" },
        { type: "bullets", items: [
          "AI-ul ruleaza local, pe serverul firmei. Fara trimitere de date catre servicii cloud externe.",
          "Licenta unica de implementare in loc de abonament per utilizator care creste lunar.",
          "Firma ramane operatorul datelor (Data Controller); OPSQAI nu are acces la continut.",
        ] },
        { type: "kpis", items: [
          { label: "Implementare", value: "de la 12.000 EUR", sub: "o singura data" },
          { label: "Mentenanta", value: "de la 500 EUR", sub: "pe luna" },
          { label: "Workspace", value: "de la 400 EUR", sub: "pe luna" },
        ] },
        { type: "callout", kind: "note", title: "Comparatie orientativa", text: `Un instrument SaaS tipic la ~30 EUR/utilizator/luna pentru ${users} utilizatori costa ~${saasYear.toLocaleString("ro-RO")} EUR pe an, in fiecare an. Valoare estimativa, nu oferta.` },
        { type: "h2", text: "Pasul urmator" },
        { type: "p", text: "Pilot pe procedurile interne ale unui departament, apoi extindere. Oferta exacta se calculeaza pe numarul real de statii si module." },
      ];
    } else {
      title = `Fisa de securitate IT si GDPR - ${firm}`;
      blocks = [
        { type: "callout", kind: "executive", title: "Rezumat pentru IT / DPO", text: "OPSQAI Self-Hosted ruleaza integral in reteaua clientului. Modelul AI, baza de date si documentele raman pe serverul firmei." },
        { type: "h2", text: "Arhitectura" },
        { type: "table", headers: ["Componenta", "Unde ruleaza", "Observatii"], rows: [
          ["Aplicatie web", "Server client (Windows)", "Acces din retea interna, HTTPS cu CA local"],
          ["Baza de date", "Server client", "Nu se replica in afara firmei"],
          ["Motor AI", "Server client (local)", "Gateway local pe loopback, fara API cloud"],
          ["Statii de lucru", "PC-uri client", "Asociate serverului prin cod unic, certificat fixat"],
        ] },
        { type: "h2", text: "Ce comunica in afara firmei" },
        { type: "bullets", items: [
          "Doar verificarea licentei si telemetrie agregata (numere: versiune, nr. utilizatori, stare).",
          "Niciun document, intrebare, raspuns AI sau date personale ale angajatilor.",
          "Actualizarile se instaleaza doar cu aprobarea administratorului.",
        ] },
        { type: "h2", text: "Control si audit" },
        { type: "bullets", items: [
          "Roluri si permisiuni per utilizator; conturile sunt create doar de administratorul firmei.",
          "Jurnal de audit pentru acces, instruiri si modificari de documente.",
          "Backup controlat de client; datele pot fi exportate sau sterse oricand.",
        ] },
        { type: "h2", text: "GDPR" },
        { type: "p", text: `${firm} ramane operatorul datelor (Data Controller). OPSQAI nu prelucreaza continutul firmei si nu are acces de la distanta fara acordul explicit al clientului.` },
        { type: "callout", kind: "note", title: "Important", text: "OPSQAI nu este certificat ISO sau DORA. Platforma sprijina procedurile interne ale clientului; conformitatea ramane responsabilitatea organizatiei." },
      ];
    }

    const bytes = await generatePdf({
      title,
      subtitle: plain([data.cui ? `CUI ${data.cui}` : null, data.contact_name ? `In atentia: ${data.contact_name}` : null, date].filter(Boolean).join(" | ")),
      blocks,
      meta: { customerName: firm, documentType: data.kind === "onepager" ? "One-Pager" : "Security sheet", brand: "OPSQAI", date, confidentiality: "Pentru client" },
    });
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const slug = firm.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    return { filename: `opsqai-${data.kind}-${slug}.pdf`, base64: btoa(binary) };
  });

// ── Follow-up Radar ─────────────────────────────────────────────────

export type FollowUp = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  stage: string;
  next_action_at: string | null;
  last_activity_at: string;
  urgency: "overdue" | "today" | "week" | "stale";
  reason: string;
};

export const listFollowUps = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }): Promise<FollowUp[]> => {
    await requirePlatformAdmin(context as never);
    const admin = await getCloudSupabaseAdmin("follow-up");
    const { data, error } = await admin
      .from("crm_leads")
      .select("id, company_name, contact_name, phone, email, stage, status, next_action_at, last_activity_at")
      .eq("status", "open")
      .limit(500);
    if (error) throw new Error(error.message);
    const now = Date.now();
    const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
    const out: FollowUp[] = [];
    for (const l of data ?? []) {
      const next = l.next_action_at ? Date.parse(l.next_action_at) : null;
      const idle = Math.floor((now - Date.parse(l.last_activity_at)) / DAY);
      let urgency: FollowUp["urgency"] | null = null;
      let reason = "";
      if (next !== null && next < now - 3_600_000) { urgency = "overdue"; reason = `Termen depășit de ${Math.max(1, Math.floor((now - next) / DAY))} zile`; }
      else if (next !== null && next <= endToday.getTime()) { urgency = "today"; reason = "De contactat azi"; }
      else if (next !== null && next <= now + 7 * DAY) { urgency = "week"; reason = `Programat ${new Date(next).toLocaleDateString("ro-RO")}`; }
      else if (["demo", "pilot", "offer", "qualified"].includes(l.stage) && idle >= 3) { urgency = "stale"; reason = `Fără contact de ${idle} zile (${l.stage})`; }
      if (urgency) out.push({ ...l, urgency, reason } as FollowUp);
    }
    const rank = { overdue: 0, today: 1, stale: 2, week: 3 };
    return out.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
  });

// ── Call debrief (human-approved CRM write) ─────────────────────────

const STAGES = ["new", "qualified", "demo", "pilot", "offer", "won", "lost"] as const;

export const applyCallDebrief = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        lead_id: z.string().uuid().nullish(),
        company_name: z.string().min(1).max(200),
        summary: z.string().min(1).max(4000),
        stage: z.enum(STAGES).nullish(),
        next_action_at: z.string().max(40).nullish(),
        contact_name: z.string().max(120).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    const userId = (context as unknown as { userId: string }).userId;
    const admin = await getCloudSupabaseAdmin("crm");
    let leadId = data.lead_id ?? null;
    if (!leadId) {
      const { data: found } = await admin
        .from("crm_leads").select("id").ilike("company_name", data.company_name.trim()).limit(1).maybeSingle();
      leadId = (found?.id as string | undefined) ?? null;
    }
    let created = false;
    if (!leadId) {
      const { data: row, error } = await admin
        .from("crm_leads")
        .insert({ company_name: data.company_name, contact_name: data.contact_name ?? null, source: "kai", stage: data.stage ?? "new", status: "open", currency: "EUR", products: [], language: "ro", owner_user_id: userId, last_activity_at: new Date().toISOString() } as never)
        .select("id").single();
      if (error) throw new Error(error.message);
      leadId = row.id as string;
      created = true;
    }
    const next = data.next_action_at && !Number.isNaN(Date.parse(data.next_action_at)) ? new Date(data.next_action_at).toISOString() : null;
    const patch: Record<string, unknown> = { last_activity_at: new Date().toISOString() };
    if (data.stage) { patch.stage = data.stage; patch.status = data.stage === "won" ? "won" : data.stage === "lost" ? "lost" : "open"; }
    if (next) patch.next_action_at = next;
    const { error: upErr } = await admin.from("crm_leads").update(patch as never).eq("id", leadId);
    if (upErr) throw new Error(upErr.message);
    await admin.from("crm_activities").insert({ lead_id: leadId, kind: "call", subject: "Debrief apel (Kai)", body: data.summary, owner_user_id: userId } as never);
    if (next) await admin.from("crm_activities").insert({ lead_id: leadId, kind: "task", subject: "Follow-up", body: data.summary.slice(0, 300), due_at: next, owner_user_id: userId } as never);
    await admin.from("crm_lead_events").insert({ lead_id: leadId, kind: "activity", detail: `debrief${data.stage ? ` → ${data.stage}` : ""}`, actor_user_id: userId } as never);
    return { lead_id: leadId, created };
  });

// ── Client analysis (Kai) ────────────────────────────────────────────────
export type ClientAnalysis = {
  profile: string;
  pains: string[];
  angle: string;
  questions: string[];
  objections: { q: string; a: string }[];
  tone: "protocol" | "distant" | "friendly" | "generic";
  pilotGoal: string;
  modules: string[];
};

export const analyzeClient = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company: z.string().min(1).max(200),
        industry: z.string().max(120).nullish(),
        contact: z.string().max(120).nullish(),
        role: z.string().max(120).nullish(),
        employees: z.number().int().min(0).max(1_000_000).nullish(),
        notes: z.string().max(3000).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<ClientAnalysis> => {
    await requirePlatformAdmin(context as never);
    const { generateAiJson } = await import("@/lib/ai-provider.server");
    const raw = await generateAiJson({
      role: "chat",
      system: `Ești consultant senior de vânzări B2B pentru OPSQAI (platformă AI self-hosted: Core = asistent pe documente interne cu surse citate + Academy cu lecții și teste; HR; Transport; module custom). Datele rămân pe serverul clientului; clientul e operatorul datelor. Nu pretinde certificări ISO/DORA. Nu menționa prețuri: oferta este un pilot GRATUIT de 30 de zile pe un departament. Nu inventa cifre despre firmă; formulează ca ipoteze ("probabil", "de verificat"). Scrie în română corectă, cu diacritice.
Răspunde STRICT JSON:
{"profile":"2-3 propoziții, profil operațional dedus","pains":["3-4 dureri probabile"],"angle":"unghiul de deschidere, o propoziție","questions":["5-8 întrebări de diagnostic"],"objections":[{"q":"obiecție anticipată","a":"răspuns"}],"tone":"protocol|distant|friendly|generic","pilotGoal":"obiectiv măsurabil pentru pilot","modules":["Core","HR","Transport","Custom" relevante]}`,
      prompt: JSON.stringify(data),
      maxOutputTokens: 1800,
    });
    const j = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as Partial<ClientAnalysis>;
    const arr = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").slice(0, 8) : []);
    const tones = ["protocol", "distant", "friendly", "generic"] as const;
    return {
      profile: String(j.profile ?? ""),
      pains: arr(j.pains),
      angle: String(j.angle ?? ""),
      questions: arr(j.questions),
      objections: Array.isArray(j.objections)
        ? j.objections.filter((o) => o && typeof o.q === "string" && typeof o.a === "string").slice(0, 5)
        : [],
      tone: tones.includes(j.tone as never) ? (j.tone as ClientAnalysis["tone"]) : "generic",
      pilotGoal: String(j.pilotGoal ?? ""),
      modules: arr(j.modules),
    };
  });
