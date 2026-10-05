// Kai — the Management Center assistant (OPSQAI staff only, cloud only).
// Reads a compact snapshot of MC data, optionally looks up CUIs in the public
// ANAF register, and answers in Romanian with suggested one-click actions.
// Kai never sends messages or changes data on its own: every action is a
// button the human presses.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";

export type KaiAction =
  | { type: "open"; label: string; to: string; id?: string }
  | { type: "whatsapp"; label: string; phone?: string; text: string }
  | { type: "email"; label: string; email?: string; subject: string; body: string }
  | { type: "call"; label: string; phone: string }
  | {
      type: "add_lead";
      label: string;
      company_name: string;
      contact_name?: string;
      phone?: string;
      email?: string;
      notes?: string;
    };

export type KaiReply = { reply: string; actions: KaiAction[] };

const ALLOWED_PAGES = [
  "/management", "/management/calendar", "/management/crm", "/management/sales",
  "/management/pricing", "/management/onboarding", "/management/customers",
  "/management/installations", "/management/licenses", "/management/releases",
  "/management/support", "/management/activity", "/management/usage", "/management/team",
];

const DAY = 86_400_000;

export const askKai = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        messages: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .min(1)
          .max(30),
        page: z.string().max(200).optional(),
        senderName: z.string().max(80).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<KaiReply> => {
    await requirePlatformAdmin(context as never);
    const admin = await getCloudSupabaseAdmin("kai");
    const now = Date.now();

    const [companies, licenses, installs, leads] = await Promise.all([
      admin.from("companies").select("id, name, subscription_status, business_type, install_id, created_at").limit(300),
      admin
        .from("licenses")
        .select("install_id, company_name, contact_email, seats, expires_at, maintenance_expires_at, revoked, suspended")
        .eq("kind", "install")
        .limit(300),
      admin.from("license_installs").select("install_id, last_heartbeat_at, app_version, user_count").limit(300),
      admin
        .from("crm_leads")
        .select("id, company_name, contact_name, phone, email, stage, status, next_action_at, value_amount, last_activity_at")
        .order("updated_at", { ascending: false })
        .limit(150),
    ]);

    const fmt = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");
    const daysTo = (iso: string | null) => (iso ? Math.round((Date.parse(iso) - now) / DAY) : null);
    const licByInstall = new Map((licenses.data ?? []).map((l) => [l.install_id, l]));
    const compByInstall = new Map((companies.data ?? []).filter((c) => c.install_id).map((c) => [c.install_id!, c]));

    const snapshot = [
      `Data de azi: ${new Date(now).toISOString().slice(0, 10)}`,
      `CLIENȚI (${companies.data?.length ?? 0}): id | nume | status | industrie`,
      ...(companies.data ?? []).map((c) => `${c.id} | ${c.name} | ${c.subscription_status} | ${c.business_type ?? "—"}`),
      `LICENȚE: firmă | email | locuri | expiră (zile) | mentenanță până | stare`,
      ...(licenses.data ?? []).map(
        (l) =>
          `${l.company_name} | ${l.contact_email ?? "—"} | ${l.seats ?? "—"} | ${fmt(l.expires_at)} (${daysTo(l.expires_at) ?? "—"}) | ${fmt(l.maintenance_expires_at)} | ${l.revoked ? "revocată" : l.suspended ? "suspendată" : "activă"}`,
      ),
      `SERVERE SELF-HOSTED: firmă | versiune | ultimul semnal | ore de la semnal | utilizatori`,
      ...(installs.data ?? []).map((i) => {
        const h = i.last_heartbeat_at ? Math.round((now - Date.parse(i.last_heartbeat_at)) / 3_600_000) : null;
        const name = licByInstall.get(i.install_id)?.company_name ?? compByInstall.get(i.install_id)?.name ?? i.install_id.slice(0, 10);
        return `${name} | ${i.app_version ?? "—"} | ${fmt(i.last_heartbeat_at)} | ${h ?? "niciodată"} | ${i.user_count ?? "—"}`;
      }),
      `PROSPECȚI CRM: nume | contact | telefon | email | etapă | următoarea acțiune | valoare`,
      ...(leads.data ?? []).map(
        (l) => `${l.company_name} | ${l.contact_name ?? "—"} | ${l.phone ?? "—"} | ${l.email ?? "—"} | ${l.stage} | ${fmt(l.next_action_at)} | ${l.value_amount ?? "—"}`,
      ),
    ].join("\n");

    const last = data.messages[data.messages.length - 1].content;
    const { generateAiJson, AiCapabilityError } = await import("@/lib/ai-provider.server");

    // Web research: when asked to find companies, Kai plans searches, reads
    // the results and pulls CUIs out of them for ANAF verification.
    let webBlock = "";
    const foundCuis: string[] = [];
    if (/\b(caut|găseș|gases|găsi|gasi|research|cercet|prospect|firme|companii|listă|lista|find|search)/i.test(last)) {
      try {
        const planRaw = await generateAiJson({
          role: "chat-fast",
          system:
            'Generezi interogări de căutare web pentru a găsi firme românești reale și CUI-urile lor. Răspunde STRICT JSON: {"queries":["..."]} cu 2-3 interogări în română. Include o interogare cu "CUI" și una țintită pe site-uri de registru (listafirme.ro, termene.ro, risco.ro).',
          prompt: last,
          maxOutputTokens: 300,
        });
        const plan = JSON.parse(planRaw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as { queries?: unknown };
        const queries = (Array.isArray(plan.queries) ? plan.queries : [])
          .filter((q): q is string => typeof q === "string" && q.length > 2)
          .slice(0, 3);
        if (queries.length) {
          const { webSearch } = await import("@/lib/web-search.server");
          const results = await webSearch(queries);
          webBlock =
            "\nREZULTATE CĂUTARE WEB (tocmai efectuată; folosește doar ce apare aici):\n" +
            results.map((r) => `- ${r.title} | ${r.url} | ${r.snippet.slice(0, 400)}`).join("\n");
          for (const r of results) {
            for (const m of `${r.title} ${r.snippet}`.matchAll(/\b(?:CUI|CIF|cod fiscal)[:\s]*(?:RO)?\s?(\d{6,10})\b/gi)) {
              foundCuis.push(m[1]);
            }
          }
        }
      } catch (e) {
        console.error("[kai] web research", e);
        webBlock = "\nCĂUTARE WEB: indisponibilă acum. Spune asta utilizatorului.";
      }
    }

    // ANAF lookups for CUIs in the message or found on the web.
    const cuis = Array.from(
      new Set([...(last.match(/\b(?:RO)?\d{6,10}\b/gi) ?? []).map((c) => c.replace(/\D/g, "")), ...foundCuis]),
    ).slice(0, 6);
    let anafBlock = "";
    if (cuis.length) {
      const { anafLookup } = await import("@/lib/anaf.server");
      const results = await Promise.all(cuis.map((c) => anafLookup(c)));
      anafBlock =
        "\nDATE ANAF (publice, tocmai interogate):\n" +
        results
          .map((r, i) =>
            r.ok
              ? JSON.stringify({
                  cui: r.cui, nume: r.name, adresa: r.address, telefon: r.phone, reg_com: r.reg_com,
                  caen: r.caen, activitate: r.caen_name, judet: r.county, oras: r.city,
                  tva: r.vat_payer, inactiva: r.inactive, radiata: r.deregistered, financiar: r.financials,
                })
              : `CUI ${cuis[i]}: ${r.error}`,
          )
          .join("\n");
    }

    const system = `Ești Kai, asistentul echipei OPSQAI în Management Center. Vorbești ca un coleg prietenos, scurt și concret, în română corectă cu diacritice (sau în limba în care ți se scrie).
OPSQAI vinde o platformă AI on-premise (Self-Hosted, pe Windows) pentru proceduri interne și academie de instruire. Prețuri: implementare de la 12.000 € o singură dată, mentenanță de la 500 €/lună, fiecare workspace (Transport, HR etc.) de la 400 €/lună.
Reguli:
- Răspunzi DOAR pe baza datelor de mai jos. Nu inventa clienți, cifre sau contacte. Dacă nu ai datele, spune clar și propune pasul următor.
- Nu trimiți nimic singur. Pentru mesaje propui butoane pe care omul le apasă.
- Nu spui niciodată că OPSQAI e certificat ISO/DORA; clientul rămâne operatorul datelor.
- Poți face research pe internet: când ți se cere să cauți firme, primești mai jos REZULTATE CĂUTARE WEB și DATE ANAF verificate. Prezintă firmele găsite (nume, CUI, oraș, angajați, cifră de afaceri, de ce se potrivesc), citează sursa (link) și propune pentru fiecare „Adaugă în CRM”. Nu inventa CUI-uri: dacă un CUI nu e confirmat de ANAF, spune că trebuie verificat.
- Pentru CUI-urile cu date ANAF spui dacă firma pare potrivită (angajați, cifră de afaceri, CAEN) și propui un mesaj de prima abordare.
- Expeditorul mesajelor se numește ${data.senderName || "Ștefan"}.
Pagina curentă: ${data.page ?? "—"}.

Răspunde STRICT cu JSON valid, fără alt text:
{"reply":"text în markdown simplu (liste scurte, **bold**)","actions":[...]}
Acțiuni permise (maxim 5, doar când sunt utile):
{"type":"open","label":"...","to":"<una din paginile: ${ALLOWED_PAGES.join(", ")} sau /management/companies/$id>","id":"<id client, doar pentru fișă>"}
{"type":"whatsapp","label":"...","phone":"...","text":"mesajul complet"}
{"type":"email","label":"...","email":"...","subject":"...","body":"..."}
{"type":"call","label":"...","phone":"..."}
{"type":"add_lead","label":"Adaugă în CRM","company_name":"...","contact_name":"...","phone":"...","email":"...","notes":"CUI, CAEN, angajați, cifră de afaceri"}

DATE MANAGEMENT CENTER:
${snapshot}${webBlock}${anafBlock}`;

    let raw = "";
    try {
      raw = await generateAiJson({
        role: "chat",
        system,
        messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.3,
        maxOutputTokens: 2500,
      });
    } catch (e) {
      if (e instanceof AiCapabilityError) {
        return { reply: "Motorul AI nu este disponibil acum. Încearcă din nou peste puțin timp.", actions: [] };
      }
      console.error("[kai]", e);
      return { reply: "Nu am putut răspunde acum. Mai încearcă o dată.", actions: [] };
    }
    return parseKai(raw);
  });

function parseKai(raw: string): KaiReply {
  const m = raw.match(/\{[\s\S]*\}/);
  try {
    const j = JSON.parse(m ? m[0] : raw) as { reply?: unknown; actions?: unknown };
    const actions = (Array.isArray(j.actions) ? j.actions : [])
      .filter((a): a is KaiAction => {
        if (!a || typeof a !== "object") return false;
        const x = a as Record<string, unknown>;
        if (typeof x.label !== "string") return false;
        if (x.type === "open") {
          const to = String(x.to ?? "");
          return ALLOWED_PAGES.includes(to) || (to === "/management/companies/$id" && typeof x.id === "string");
        }
        if (x.type === "whatsapp") return typeof x.text === "string";
        if (x.type === "email") return typeof x.subject === "string" && typeof x.body === "string";
        if (x.type === "call") return typeof x.phone === "string" && x.phone.length > 3;
        if (x.type === "add_lead") return typeof x.company_name === "string" && x.company_name.length > 0;
        return false;
      })
      .slice(0, 5);
    return { reply: String(j.reply ?? "").trim() || "…", actions };
  } catch {
    return { reply: raw.trim() || "Nu am putut formula un răspuns.", actions: [] };
  }
}
