// Kai — the Management Center assistant (OPSQAI staff only, cloud only).
// Reads a compact snapshot of MC data, optionally looks up CUIs in the public
// ANAF register, and answers in Romanian with suggested one-click actions.
// Kai proposes actions; an explicit human click or spoken/typed approval
// executes the immutable proposal through the existing authorized handlers.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { cuiFromText, isValidCui, nameMatches } from "@/lib/cui";

export type KaiAction =
  | { type: "open"; label: string; to: string; id?: string }
  | { type: "whatsapp"; label: string; phone?: string; text: string }
  | { type: "email"; label: string; email?: string; subject: string; body: string }
  | { type: "call"; label: string; phone: string }
  | { type: "pricing"; label: string; company_name: string; contact_name?: string; employees?: number; workstations?: number; workspaces?: string[] }
  | { type: "onboard"; label: string; company_name: string; cui?: string; contact_name?: string; phone?: string; email?: string; lead_id?: string }
  | { type: "time_off"; label: string; starts_on: string; ends_on: string; reason?: string }
  | { type: "calendar"; label: string; title: string; starts_at: string; ends_at?: string; kind?: "meeting" | "deadline"; description?: string; location?: string }
  | { type: "task"; label: string; title: string; due_at: string; description?: string }
  | { type: "team_email"; label: string; to: string[]; subject: string; body: string }
  | { type: "doc"; label: string; kind: "onepager" | "security"; company_name: string; cui?: string; contact_name?: string; industry?: string; employees?: number }
  | { type: "debrief"; label: string; company_name: string; lead_id?: string; summary: string; stage?: string; next_action_at?: string; contact_name?: string }
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
        mode: z.enum(["chat", "car"]).optional(),
        localTime: z.string().max(80).optional(),
        coords: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }): Promise<KaiReply> => {
    await requirePlatformAdmin(context as never);
    const superadmin = await isSuperadmin(context as never);
    const admin = await getCloudSupabaseAdmin("kai");
    const now = Date.now();
    const team = superadmin
      ? ((await admin.auth.admin.listUsers({ perPage: 200 })).data?.users ?? [])
          .filter((u) => u.email && isTeamAddress(u.email))
          .map((u) => ({ full_name: (u.user_metadata?.full_name as string | undefined) ?? null, email: u.email! }))
      : [];

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
        .select("id, company_name, contact_name, phone, email, stage, status, next_action_at, value_amount, last_activity_at, notes")
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
      `PROSPECȚI CRM: lead_id | nume | CUI (din note, verificat) | contact | telefon | email | etapă | status | următoarea acțiune | ultima activitate | valoare`,
      ...(leads.data ?? []).map(
        (l) => `${l.id} | ${l.company_name} | ${cuiFromText(l.notes) ?? "—"} | ${l.contact_name ?? "—"} | ${l.phone ?? "—"} | ${l.email ?? "—"} | ${l.stage} | ${l.status} | ${fmt(l.next_action_at)} | ${fmt(l.last_activity_at)} | ${l.value_amount ?? "—"}`,
      ),
      ...(superadmin
        ? [`ECHIPA OPSQAI (singurii destinatari permiși pentru team_email): nume | email`, ...team.map((t) => `${t.full_name ?? "—"} | ${t.email}`)]
        : []),
    ].join("\n");

    const last = data.messages[data.messages.length - 1].content;

    // Ambient context for small talk: local time and current weather (public Open-Meteo, no key).
    let ambient = `\nAMBIANȚĂ: ora locală a utilizatorului: ${data.localTime ?? new Date(now).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}.`;
    if (data.coords && /(vreme|vremea|ploua|plouă|grade|temperatur|frig|cald|soare|ninge|umbrel|weather|bun[ăa] (dimineața|ziua|seara)|salut|neața)/i.test(last)) {
      try {
        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${data.coords.lat}&longitude=${data.coords.lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=1&timezone=auto`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (w.ok) ambient += ` VREMEA ACUM [Meteo]: ${JSON.stringify(await w.json())} (weather_code WMO: 0 senin, 1-3 parțial noros, 45/48 ceață, 51-67 ploaie, 71-77 ninsoare, 80-82 averse, 95+ furtună).`;
      } catch {
        ambient += " VREMEA: indisponibilă acum.";
      }
    }
    const { generateAiJson, AiCapabilityError } = await import("@/lib/ai-provider.server");

    // Web research: when asked to find companies, Kai plans searches, reads
    // the results and pulls CUIs out of them for ANAF verification.
    let webBlock = "";
    const foundCuis: string[] = [];
    const webContext = new Map<string, string>();
    const offTopic = /(cod(uri)? de reducere|cupon|voucher|discount|reduceri la|nike|adidas|zara|emag|horoscop|rețet|retet|meci|pariu)/i.test(last);
    if (!offTopic && /\b(caut|găseș|gases|găsi|gasi|research|cercet|prospect|firme|companii|listă|lista|find|search)/i.test(last)) {
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
            "\nREZULTATE CĂUTARE WEB [Web] (tocmai efectuată; folosește doar ce apare aici):\n" +
            results.map((r) => `- ${r.title} | ${r.url} | ${r.snippet.slice(0, 1500)}`).join("\n");
          for (const r of results) {
            const text = `${r.title} ${r.snippet}`;
            const add = (c: string, at: number) => {
              if (!isValidCui(c)) return;
              foundCuis.push(c);
              // Keep the text right around the number: the company name must appear there.
              webContext.set(c, `${webContext.get(c) ?? ""} ${r.title} ${text.slice(Math.max(0, at - 160), at + 60)}`);
            };
            for (const m of text.matchAll(/\b(?:CUI|CIF|cod fiscal)[:\s]*(?:RO)?\s?(\d{2,10})\b/gi)) add(m[1], m.index ?? 0);
            for (const m of text.matchAll(/\|\s*(?:RO)?(\d{4,10})\s*\|\s*[JFC]\d/g)) add(m[1], m.index ?? 0);
          }
        }
      } catch (e) {
        console.error("[kai] web research", e);
        webBlock = "\nCĂUTARE WEB: indisponibilă acum. Spune asta utilizatorului.";
      }
    }

    // ANAF lookups for CUIs in the message or found on the web. Only codes
    // with a valid control digit are queried; a code found on the web is
    // kept only when the ANAF name also appears next to it on that page.
    const typed = (last.match(/\b(?:RO)?\d{2,10}\b/gi) ?? []).map((c) => c.replace(/\D/g, "")).filter((c) => c.length >= 4 && isValidCui(c));
    const cuis = Array.from(new Set([...typed, ...foundCuis])).slice(0, 8);
    let anafBlock = "";
    if (cuis.length) {
      const { anafLookup } = await import("@/lib/anaf.server");
      const results = await Promise.all(cuis.map((c) => anafLookup(c)));
      const lines: string[] = [];
      results.forEach((r, i) => {
        const c = cuis[i];
        const fromWeb = !typed.includes(c);
        if (!r.ok) {
          if (!fromWeb) lines.push(`CUI ${c}: ${r.error}`);
          return;
        }
        if (fromWeb && !nameMatches(r.name, webContext.get(c) ?? "")) return; // number belonged to another firm
        lines.push(
          JSON.stringify({
            cui: r.cui, nume: r.name, adresa: r.address, telefon: r.phone, reg_com: r.reg_com,
            caen: r.caen, activitate: r.caen_name, judet: r.county, oras: r.city,
            tva: r.vat_payer, inactiva: r.inactive, radiata: r.deregistered, financiar: r.financials,
          }),
        );
      });
      if (lines.length) anafBlock = "\nDATE ANAF [ANAF] (publice, tocmai interogate, CUI verificat):\n" + lines.join("\n");
    }

    const system = `Ești Kai, asistentul personal al echipei OPSQAI în Management Center — în stilul lui JARVIS: un valet digital rafinat, formal și impecabil politicos, cu un umor sec, discret și elegant. Te adresezi cu „domnule ${(data.senderName || "Ștefan").split(" ")[0]}” (sau pe nume), folosești „dumneavoastră”, formulări alese („Desigur.”, „Cu plăcere.”, „Dacă îmi permiteți o observație…”), dar rămâi scurt și eficient — eleganța nu înseamnă vorbărie. Scrii în română corectă cu diacritice (sau în limba în care ți se scrie).
PERSONALITATE & CONVERSAȚIE DE LOBBY:
- Poți face conversație scurtă și plăcută: saluți în funcție de ora din AMBIANȚĂ, spui cât e ceasul, comentezi vremea DOAR din VREMEA ACUM [Meteo] (dacă lipsește, spui elegant că nu aveți acces la fereastră momentan / că trebuie permisă locația). Nu inventa temperaturi.
- O glumă fină din când în când e binevenită; niciodată vulgar, niciodată în dauna informației.
- ETICHETĂ STRICTĂ — DOAR AFACERI OPSQAI: ajuți cu clienți, CRM, vânzări, licențe, servere, calendar, concedii, taskuri, echipă, documente OPSQAI, econometrie/business. Refuzi politicos, cu umor sec și fără să faci căutarea, cereri personale sau de consum: coduri de reducere, cumpărături (ex. Nike), horoscop, rețete, bârfe, jocuri, teme personale fără legătură cu firma. Exemplu: „Mă tem că protocoalele mele nu acoperă vânătoarea de cupoane pentru adidași, domnule. Pot însă să vă arăt ce follow-up-uri vă așteaptă azi.” Apoi propui ceva util.
${data.mode === "car" ? "- MOD MAȘINĂ: răspunzi în maximum 2–3 propoziții scurte, fără liste, fără tabele, fără linkuri; cifrele rotunjite. O acțiune propusă poate fi confirmată verbal: utilizatorul spune explicit «Confirm» și ținta/acțiunea. Nu îi cere să atingă ecranul. Nu anunța succes până când aplicația furnizează rezultatul real." : ""}
OPSQAI vinde o platformă AI on-premise (Self-Hosted, pe Windows) pentru proceduri interne și academie de instruire. Prețuri: implementare de la 12.000 € o singură dată, mentenanță de la 500 €/lună, fiecare workspace (Transport, HR etc.) de la 400 €/lună.
Reguli:
- Răspunzi DOAR pe baza datelor de mai jos. Nu inventa clienți, cifre sau contacte. Dacă nu ai datele, spune clar și propune pasul următor.
- REGULĂ DE AUR — surse: fiecare informație importantă (nume, cifră, dată, contact, CUI) poartă o etichetă de sursă imediat după ea: [DB] pentru datele din Management Center (clienți, licențe, servere, CRM), [ANAF] pentru datele din registrul ANAF, [Web] pentru ce vine din căutarea pe internet (adaugă și linkul), [Meteo] pentru vreme, [Estimare] pentru orice presupunere sau calcul aproximativ făcut de tine. Dacă nu poți atribui o sursă, nu afirma informația — spune că nu ai date și propune cum se obțin.
- Propui acțiuni, aplicația le execută numai după o confirmare explicită prin buton, voce sau text. Nu afirma succesul înainte de rezultatul real din conversație. Nu poți emite direct licențe: pentru a transforma o firmă în client propui "onboard" (înrolarea în 3 pași cu datele precompletate); omul finalizează acolo. Nu repropunе o acțiune deja finalizată decât dacă omul cere explicit una nouă. Dacă aprobarea este ambiguă sau schimbă datele, cere clarificare.
- Când utilizatorul cere preț / ofertă / cost pentru o firmă, propui acțiunea "pricing" cu datele firmei (angajați din ANAF/DB, workspace Transport dacă CAEN e de transport). Nu calculezi tu prețul în text.
- Când prezinți o listă de firme, pui câte o acțiune "add_lead" separată pentru FIECARE firmă (cu company_name completat).
- Când ți se cere one-pager / prezentare / fișă de securitate / GDPR pentru o firmă, propui acțiunea "doc" (kind "onepager" sau "security"). PDF-ul e generat din șablon aprobat; nu îi inventa conținutul în text.
- Când ți se cere ce follow-up-uri sunt de făcut, folosește PROSPECȚI CRM (status open): termen depășit, azi, sau etape demo/pilot/offer fără activitate de 3+ zile. Pentru fiecare propui "whatsapp"/"call"/"email" cu un mesaj scurt de revenire.
- DEBRIEF: când utilizatorul îți povestește un apel/întâlnire, extragi firma, rezumatul structurat (ce s-a discutat, nr. stații, ce a cerut clientul), etapa nouă dacă reiese clar, și data următoarei acțiuni (ISO, calculată față de data de azi). Propui acțiunea "debrief" (cu lead_id din CRM dacă firma există). Nu spui că ai salvat — omul confirmă butonul. Dacă clientul a cerut un document, propui și "doc".
- ONBOARD din CRM: dacă firma există în PROSPECȚI CRM, pui în "onboard" lead_id-ul, CUI-ul din coloana CUI și contactul/telefonul/emailul din CRM — formularul în 3 pași se completează automat din ANAF.
- CUI: folosești DOAR CUI-uri din coloana CUI a CRM sau din DATE ANAF. Nu scrii niciodată un CUI văzut doar pe web sau dedus. Dacă nu ai CUI verificat, lași câmpul "cui" gol și spui că trebuie verificat.
- CONCEDIU: când utilizatorul cere concediu pentru el, propui "time_off" (starts_on/ends_on YYYY-MM-DD, calculate față de data de azi). Concediul se înregistrează pe contul celui care apasă butonul.
- ȘEDINȚE: când ți se cere o ședință/întâlnire în calendar, propui "calendar" (starts_at YYYY-MM-DDTHH:mm ora României, ends_at implicit +1h).
- TASK: când ți se cere un task / reminder / „să nu uit”, propui "task" cu due_at YYYY-MM-DDTHH:mm.
- EMAIL INTERN: ${superadmin ? `poți propune "team_email" DOAR către adrese @${TEAM_DOMAIN} din ECHIPA OPSQAI. Niciodată către clienți sau alte domenii — pentru clienți folosești "email" (se deschide în aplicația de mail, omul trimite).` : `utilizatorul curent NU este superadmin, deci nu propui "team_email"; spune că doar un superadmin poate trimite emailuri interne prin Kai.`}
- Nu trimiți nimic fără confirmare explicită. Acțiunile "email" și "whatsapp" deschid aplicația utilizatorului; nu sunt o trimitere automată. Doar "team_email" poate trimite după confirmarea unui superadmin, exclusiv către echipa OPSQAI.
- Nu spui niciodată că OPSQAI e certificat ISO/DORA; clientul rămâne operatorul datelor.
- Poți face research pe internet: când ți se cere să cauți firme, primești mai jos REZULTATE CĂUTARE WEB și DATE ANAF verificate. Prezintă firmele găsite (nume, CUI, oraș, angajați, cifră de afaceri, de ce se potrivesc), citează sursa (link) și propune pentru fiecare „Adaugă în CRM”. Nu inventa CUI-uri: dacă un CUI nu e confirmat de ANAF, spune că trebuie verificat.
- Pentru CUI-urile cu date ANAF spui dacă firma pare potrivită (angajați, cifră de afaceri, CAEN) și propui un mesaj de prima abordare.
- Expeditorul mesajelor se numește ${data.senderName || "Ștefan"}.
Pagina curentă: ${data.page ?? "—"}.

Răspunde STRICT cu JSON valid, fără alt text:
{"reply":"text în markdown simplu (liste scurte, **bold**)","actions":[...]}
Acțiuni permise (maxim 12, doar când sunt utile):
{"type":"open","label":"...","to":"<una din paginile: ${ALLOWED_PAGES.join(", ")} sau /management/companies/$id>","id":"<id client, doar pentru fișă>"}
{"type":"whatsapp","label":"...","phone":"...","text":"mesajul complet"}
{"type":"email","label":"...","email":"...","subject":"...","body":"..."}
{"type":"call","label":"...","phone":"..."}
{"type":"onboard","label":"Înrolează <firma> (3 pași)","company_name":"...","cui":"<doar verificat>","contact_name":"...","phone":"...","email":"...","lead_id":"<din CRM, dacă există>"}
{"type":"time_off","label":"Setează concediu 15–20 nov","starts_on":"YYYY-MM-DD","ends_on":"YYYY-MM-DD","reason":"..."}
{"type":"calendar","label":"Adaugă ședința în calendar","title":"...","starts_at":"YYYY-MM-DDTHH:mm","ends_at":"YYYY-MM-DDTHH:mm","kind":"meeting","description":"...","location":"..."}
{"type":"task","label":"Adaugă task","title":"...","due_at":"YYYY-MM-DDTHH:mm","description":"..."}${superadmin ? `
{"type":"team_email","label":"Trimite email echipei","to":["nume@${TEAM_DOMAIN}"],"subject":"...","body":"text simplu"}` : ""}
{"type":"pricing","label":"Vezi prețul pentru <firma>","company_name":"...","contact_name":"...","employees":<nr angajați din ANAF/DB, opțional>,"workstations":<aprox. angajați/10>,"workspaces":["opsqai_transport"|"opsqai_hr"]}
{"type":"add_lead","label":"Adaugă <firma> în CRM","company_name":"...","contact_name":"...","phone":"...","email":"...","notes":"CUI, CAEN, angajați, cifră de afaceri"}
{"type":"doc","label":"Descarcă fișa de securitate pentru <firma>","kind":"onepager"|"security","company_name":"...","cui":"...","contact_name":"...","industry":"CAEN/activitate","employees":<nr>}
{"type":"debrief","label":"Salvează debrief în CRM pentru <firma>","company_name":"...","lead_id":"<lead_id din CRM, dacă există>","summary":"rezumat structurat","stage":"new|qualified|demo|pilot|offer|won|lost (opțional)","next_action_at":"YYYY-MM-DDTHH:mm (opțional)","contact_name":"..."}

DATE MANAGEMENT CENTER [DB]:
${snapshot}${webBlock}${anafBlock}${ambient}`;

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
    return parseKai(raw, superadmin);
  });

const TEAM_DOMAIN = "opsqai.de";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/** True only for the platform owner or an explicit superadmin role. */
async function isSuperadmin(context: { supabase: unknown; userId: string }) {
  const { getActorRoles } = await import("@/lib/authorization");
  const r = await getActorRoles(context.supabase, context.userId);
  return r.isPlatformOwner || r.roles.some((x) => x === "superadmin" || x === "platform_owner");
}

export function isTeamAddress(email: string) {
  return new RegExp(`^[^@\\s]+@${TEAM_DOMAIN.replace(".", "\\.")}$`, "i").test(email.trim());
}

function parseKai(raw: string, superadmin = false): KaiReply {
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
        if (x.type === "pricing") return typeof x.company_name === "string" && x.company_name.length > 0;
        if (x.type === "onboard") {
          if (typeof x.cui === "string" && !isValidCui(x.cui)) delete x.cui; // never pass an unverifiable CUI
          return typeof x.company_name === "string" && x.company_name.length > 0;
        }
        if (x.type === "time_off") return typeof x.starts_on === "string" && DATE_RE.test(x.starts_on) && typeof x.ends_on === "string" && DATE_RE.test(x.ends_on) && x.ends_on >= x.starts_on;
        if (x.type === "calendar") return typeof x.title === "string" && x.title.length > 0 && typeof x.starts_at === "string" && DT_RE.test(x.starts_at);
        if (x.type === "task") return typeof x.title === "string" && x.title.length > 0 && typeof x.due_at === "string" && DT_RE.test(x.due_at);
        if (x.type === "team_email") {
          if (!superadmin || !Array.isArray(x.to) || typeof x.subject !== "string" || typeof x.body !== "string") return false;
          x.to = (x.to as unknown[]).filter((e): e is string => typeof e === "string" && isTeamAddress(e)).slice(0, 20);
          return (x.to as string[]).length > 0;
        }
        if (x.type === "add_lead") return typeof x.company_name === "string" && x.company_name.length > 0;
        if (x.type === "doc") return (x.kind === "onepager" || x.kind === "security") && typeof x.company_name === "string" && x.company_name.length > 0;
        if (x.type === "debrief") return typeof x.company_name === "string" && x.company_name.length > 0 && typeof x.summary === "string" && x.summary.length > 0;
        return false;
      })
      .slice(0, 12);
    return { reply: String(j.reply ?? "").trim() || "…", actions };
  } catch {
    return { reply: raw.trim() || "Nu am putut formula un răspuns.", actions: [] };
  }
}

// ---------- Audit trail: requested by Kai → approved by human → executed ----------

export const logKaiAction = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        requested_at: z.string().max(40),
        action_type: z.string().max(40),
        label: z.string().max(200),
        target: z.string().max(300).nullish(),
        detail: z.record(z.string(), z.unknown()).default({}),
        status: z.enum(["executed", "failed"]),
        error: z.string().max(500).nullish(),
        conversation_id: z.string().max(60).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    const ctx = context as unknown as { userId: string; claims?: { email?: string } };
    const admin = await getCloudSupabaseAdmin("kai-audit");
    const now = new Date().toISOString();
    const { error } = await admin.from("kai_action_log").insert({
      requested_by: "Kai",
      requested_at: data.requested_at,
      approved_by: ctx.userId,
      approved_by_email: ctx.claims?.email ?? null,
      approved_at: now,
      executed_at: data.status === "executed" ? now : null,
      status: data.status,
      action_type: data.action_type,
      label: data.label,
      target: data.target ?? null,
      detail: data.detail as never,
      error: data.error ?? null,
      conversation_id: data.conversation_id ?? null,
    } as never);
    if (error) console.error("[kai-audit]", error.message);
    return { ok: !error };
  });

export const listKaiActions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context as never);
    const admin = await getCloudSupabaseAdmin("kai-audit");
    const { data, error } = await admin
      .from("kai_action_log")
      .select("id, requested_by, requested_at, approved_by_email, approved_at, executed_at, status, action_type, label, target, error")
      .order("approved_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{
      id: string; requested_by: string; requested_at: string; approved_by_email: string | null;
      approved_at: string; executed_at: string | null; status: string; action_type: string;
      label: string; target: string | null; error: string | null;
    }>;
  });

// ---------- Internal team email (superadmin only, @opsqai.de only) ----------

export const sendTeamEmail = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        to: z.array(z.string().email()).min(1).max(20),
        subject: z.string().trim().min(1).max(200),
        body: z.string().trim().min(1).max(8000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    if (!(await isSuperadmin(context as never))) throw new Error("Doar un superadmin poate trimite emailuri interne prin Kai.");
    const bad = data.to.filter((e) => !isTeamAddress(e));
    if (bad.length) throw new Error(`Kai trimite doar către echipa OPSQAI (@${TEAM_DOMAIN}). Refuzat: ${bad.join(", ")}`);
    const ctx = context as unknown as { claims?: { email?: string } };
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const sent: string[] = [];
    const failed: string[] = [];
    for (const to of data.to) {
      try {
        const r = await sendTemplateEmail("team-message", to, {
          templateData: { subject: data.subject, body: data.body, sender: ctx.claims?.email ?? "OPSQAI" },
          replyTo: ctx.claims?.email,
        });
        (r.sent ? sent : failed).push(to);
      } catch (e) {
        console.error("[kai-team-email]", e);
        failed.push(to);
      }
    }
    return { sent, failed };
  });
