// Management Center growth tools (cloud only, OPSQAI staff): CUI lookup,
// customer computer layout, relationship timeline and the official offer PDF.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { uuidString } from "@/lib/zod-uuid";
import type { PdfBlock } from "@/lib/generators/pdf.server";

/** Optional auto-complete from the public ANAF register. Manual entry stays the default. */
export const lookupCompanyByCui = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ cui: z.string().min(2).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    const cui = Number(data.cui.replace(/\D/g, ""));
    if (!cui) return { ok: false as const, error: "CUI invalid" };
    try {
      const res = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ cui, data: new Date().toISOString().slice(0, 10) }]),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return { ok: false as const, error: "Serviciul ANAF nu răspunde acum. Completează manual." };
      const json = (await res.json()) as {
        found?: Array<{ date_generale?: Record<string, unknown> }>;
      };
      const g = json.found?.[0]?.date_generale;
      if (!g) return { ok: false as const, error: "CUI negăsit în registrul ANAF." };
      return {
        ok: true as const,
        name: String(g["denumire"] ?? ""),
        address: String(g["adresa"] ?? ""),
        reg_com: String(g["nrRegCom"] ?? ""),
        phone: String(g["telefon"] ?? ""),
      };
    } catch {
      return { ok: false as const, error: "Serviciul ANAF nu răspunde acum. Completează manual." };
    }
  });

export type TopologyStation = {
  name: string;
  location: string | null;
  last_seen_at: string | null;
  active: boolean;
};

export type TopologyServer = {
  install_id: string;
  last_heartbeat_at: string | null;
  app_version: string | null;
  reported_status: string | null;
  ai_engine: string | null;
  stations: TopologyStation[] | null;
};

export const getCompanyTopology = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ install_ids: z.array(z.string().max(64)).max(50) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<TopologyServer[]> => {
    await requirePlatformAdmin(context as never);
    if (!data.install_ids.length) return [];
    const admin = await getCloudSupabaseAdmin("mc-topology");
    const { data: rows, error } = (await admin
      .from("selfhost_installations")
      .select("install_id, last_heartbeat_at, app_version, reported_status, topology")
      .in("install_id", data.install_ids)) as unknown as {
      data: Array<Record<string, unknown>> | null;
      error: { message: string } | null;
    };
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => {
      const t = (r as { topology?: { ai_engine?: string | null; stations?: TopologyStation[] } | null }).topology;
      return {
        install_id: r.install_id as string,
        last_heartbeat_at: (r.last_heartbeat_at as string) ?? null,
        app_version: (r.app_version as string) ?? null,
        reported_status: (r.reported_status as string) ?? null,
        ai_engine: t?.ai_engine ?? null,
        stations: t ? (t.stations ?? []) : null,
      };
    });
  });

export type TimelineEvent = { at: string; kind: string; title: string; detail?: string };

export const getCompanyTimeline = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: uuidString(),
        company_name: z.string().max(200),
        install_ids: z.array(z.string().max(64)).max(50),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<TimelineEvent[]> => {
    await requirePlatformAdmin(context as never);
    const admin = await getCloudSupabaseAdmin("mc-timeline");
    const events: TimelineEvent[] = [];

    const [{ data: company }, { data: leads }, { data: lics }, { data: tickets }, { data: installs }] =
      await Promise.all([
        admin.from("companies").select("created_at").eq("id", data.company_id).maybeSingle(),
        admin
          .from("crm_leads")
          .select("id, created_at, source, company_id, company_name")
          .or(`company_id.eq.${data.company_id},company_name.ilike.${data.company_name.replace(/[,()]/g, " ")}`)
          .limit(5),
        admin
          .from("licenses")
          .select("kind, module_key, seats, issued_at, created_at, revoked, expires_at")
          .ilike("company_name", data.company_name)
          .limit(50),
        admin
          .from("support_conversations")
          .select("subject, created_at, status")
          .eq("company_id", data.company_id)
          .order("created_at", { ascending: false })
          .limit(20),
        data.install_ids.length
          ? admin
              .from("selfhost_installations")
              .select("install_id, created_at, last_heartbeat_at, app_version")
              .in("install_id", data.install_ids)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
      ]);

    for (const l of leads ?? []) {
      events.push({ at: l.created_at as string, kind: "lead", title: "Prospect adăugat în CRM", detail: `Sursă: ${l.source ?? "—"}` });
    }
    const leadIds = (leads ?? []).map((l) => l.id as string);
    if (leadIds.length) {
      const [{ data: acts }, { data: offers }] = await Promise.all([
        admin.from("crm_activities").select("kind, subject, created_at, done_at").in("lead_id", leadIds).limit(50),
        admin.from("crm_offers").select("title, status, amount, currency, created_at").in("lead_id", leadIds).limit(20),
      ]);
      const kindRo: Record<string, string> = { call: "Apel", email: "Email", meeting: "Întâlnire / demo", note: "Notă", task: "Sarcină" };
      for (const a of acts ?? []) {
        events.push({ at: (a.done_at ?? a.created_at) as string, kind: "activity", title: kindRo[a.kind as string] ?? (a.kind as string), detail: (a.subject as string) ?? undefined });
      }
      for (const o of offers ?? []) {
        events.push({ at: o.created_at as string, kind: "offer", title: `Ofertă: ${o.title}`, detail: `${o.amount ?? "—"} ${o.currency} · ${o.status}` });
      }
    }
    if (company?.created_at) {
      events.push({ at: company.created_at as string, kind: "customer", title: "Devenit client OPSQAI" });
    }
    for (const l of lics ?? []) {
      events.push({
        at: (l.issued_at ?? l.created_at) as string,
        kind: "license",
        title: l.kind === "install" ? `Licență emisă (${l.seats ?? "—"} locuri)` : `Modul licențiat: ${l.module_key ?? "—"}`,
        detail: l.revoked ? "Revocată" : l.expires_at ? `Valabilă până la ${new Date(l.expires_at as string).toLocaleDateString("ro-RO")}` : undefined,
      });
    }
    for (const i of (installs ?? []) as Array<Record<string, unknown>>) {
      if (i["created_at"]) events.push({ at: i["created_at"] as string, kind: "install", title: "Server instalat și conectat", detail: String(i["install_id"]) });
      if (i["last_heartbeat_at"]) events.push({ at: i["last_heartbeat_at"] as string, kind: "heartbeat", title: "Ultimul semnal de la server", detail: `Versiune ${i["app_version"] ?? "—"}` });
    }
    for (const t of tickets ?? []) {
      events.push({ at: t.created_at as string, kind: "support", title: `Tichet suport: ${t.subject ?? "fără subiect"}`, detail: t.status as string });
    }
    return events.filter((e) => e.at).sort((a, b) => b.at.localeCompare(a.at));
  });

const OfferInput = z.object({
  customer: z.string().min(1).max(200),
  contact: z.string().max(200).optional().default(""),
  sender: z.string().max(100).optional().default("Echipa OPSQAI"),
  computers: z.number().int().min(1).max(500),
  workspaces: z.array(z.object({ label: z.string().max(80), monthly: z.number().min(0) })).max(10),
  setup: z.number().min(0),
  maintenance: z.number().min(0),
  monthly: z.number().min(0),
  annual: z.number().min(0),
  firstYear: z.number().min(0),
  perEmployeePerDay: z.number().min(0),
  employees: z.number().int().min(1),
  savings: z.object({ search: z.number(), onboarding: z.number(), total: z.number() }).nullable(),
  validDays: z.number().int().min(1).max(365).default(30),
});

// pdf-lib standard fonts have no ș/ț/ă — transliterate rather than drop letters.
const ro = (s: string) =>
  s.replace(/[ăâ]/g, "a").replace(/[ĂÂ]/g, "A").replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/[șş]/g, "s").replace(/[ȘŞ]/g, "S").replace(/[țţ]/g, "t").replace(/[ȚŢ]/g, "T")
    .replace(/€/g, "EUR");

const money = (n: number, d = 0) =>
  `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n)} EUR`;

export const renderOfferPdf = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => OfferInput.parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    const { generatePdf } = await import("@/lib/generators/pdf.server");
    const today = new Date();
    const valid = new Date(today.getTime() + data.validDays * 86_400_000);
    const T = (s: string) => ro(s);
    const bytes = await generatePdf({
      title: T(`Ofertă OPSQAI — ${data.customer}`),
      subtitle: T("Platformă operațională și academie internă, instalată 100% local"),
      author: T(data.sender),
      meta: {
        customerName: T(data.customer),
        workspaceName: "OPSQAI Self-Hosted",
        documentType: T("Ofertă comercială"),
        date: today.toLocaleDateString("ro-RO"),
        confidentiality: T("Confidențial"),
        brand: "OPSQAI",
      },
      blocks: [
        {
          type: "kpis",
          items: [
            { label: T("Implementare"), value: money(data.setup) },
            { label: T("Pe lună"), value: money(data.monthly) },
            { label: T("Primul an"), value: money(data.firstYear) },
            { label: T("Angajat / zi"), value: money(data.perEmployeePerDay, 2) },
          ],
        },
        { type: "h2", text: T("Pachet propus") },
        {
          type: "table",
          headers: [T("Element"), T("Detaliu"), T("Preț")],
          rows: [
            [T("Implementare și instalare"), T(`1 calculator principal + ${data.computers - 1} stații de lucru`), money(data.setup)],
            [T("Mentenanță și actualizări"), T("Suport, actualizări de securitate, versiuni noi"), `${money(data.maintenance)} / ${T("lună")}`],
            [T("OPSQAI Core"), T("Asistent AI pe procedurile firmei, FAQ, Academy cu teste și diplome"), T("inclus")],
            ...data.workspaces.map((w) => [T(`Workspace ${w.label}`), T("Modul operațional dedicat"), `${money(w.monthly)} / ${T("lună")}`]),
          ],
        },
        ...(data.savings
          ? ([
              { type: "h2", text: T("Estimare de rentabilitate") },
              {
                type: "table",
                headers: [T("Sursă de economie"), T("Estimare anuală")],
                rows: [
                  [T("Timp economisit la căutarea procedurilor"), money(data.savings.search)],
                  [T("Instruire mai rapidă a noilor angajați"), money(data.savings.onboarding)],
                  [T("Total estimat"), money(data.savings.total)],
                ],
              },
              {
                type: "callout",
                kind: "note",
                title: T("Cum am calculat"),
                text: T(`Estimarea folosește datele discutate cu dumneavoastră (${data.employees} angajați). Este o estimare orientativă, nu o garanție de rezultat.`),
              },
            ] as PdfBlock[])
          : []),
        {
          type: "callout",
          kind: "executive",
          title: T("Datele rămân la dumneavoastră"),
          text: T("OPSQAI rulează 100% pe infrastructura dumneavoastră locală. Documentele și datele nu părăsesc rețeaua firmei, iar OPSQAI nu are acces la ele. Dumneavoastră rămâneți operatorul datelor; OPSQAI oferă infrastructura tehnică care sprijină cerințele GDPR și DORA."),
        },
        { type: "h2", text: T("Pașii următori") },
        {
          type: "numbered",
          items: [
            T("Confirmarea ofertei și semnarea contractului."),
            T("Instalarea pe calculatorul principal (aprox. 1 zi) și conectarea stațiilor."),
            T("Încărcarea procedurilor și instruirea echipei."),
          ],
        },
        { type: "p", text: T(`Ofertă valabilă până la ${valid.toLocaleDateString("ro-RO")}. Prețurile nu includ TVA.`) },
        { type: "p", text: T(`Pregătit de ${data.sender} · opsqai.de`) },
      ],
    });
    return {
      filename: `Oferta-OPSQAI-${data.customer.replace(/[^\w-]+/g, "_").slice(0, 40)}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  });
