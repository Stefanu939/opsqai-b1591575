// Client-safe outreach helpers for the Management Center: one-click
// WhatsApp / email / phone links, sales scripts, objection replies and
// password generation. No network calls — everything opens the user's own
// apps, so sending always stays a human action.

export type Industry = "transport" | "production" | "finance";

export const INDUSTRY_LABELS: Record<Industry, string> = {
  transport: "Transport & Logistică",
  production: "Producție / Industrie",
  finance: "Financiar / Enterprise",
};

/** Normalise a phone number for wa.me / tel: (Romanian local → +40). */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("0") && !p.startsWith("+")) p = "+40" + p.slice(1);
  return p;
}

export function whatsappUrl(phone: string | null | undefined, text: string) {
  const n = normalizePhone(phone).replace("+", "");
  const q = `text=${encodeURIComponent(text)}`;
  return n ? `https://wa.me/${n}?${q}` : `https://wa.me/?${q}`;
}

export function mailtoUrl(email: string | null | undefined, subject: string, body: string) {
  return `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function telUrl(phone: string | null | undefined) {
  const n = normalizePhone(phone);
  return n ? `tel:${n}` : "";
}

export type Vars = { name?: string; company?: string; sender?: string; time?: string };

function fill(t: string, v: Vars) {
  return t
    .replaceAll("{name}", v.name?.trim() || "[Nume]")
    .replaceAll("{company}", v.company?.trim() || "[Firmă]")
    .replaceAll("{sender}", v.sender?.trim() || "Ștefan")
    .replaceAll("{time}", v.time?.trim() || "[ora]");
}

const WA: Record<Industry | "followup", string> = {
  transport:
    "Bună ziua, {name}! Sunt {sender} de la OPSQAI. Vă scriu pentru că sprijinim companiile de transport să reducă erorile de dispecerat și timpul pierdut cu instruirea șoferilor pe proceduri interne. Sistemul nostru AI rulează direct pe calculatoarele firmei (fără cloud) și răspunde instant angajaților din documentele dumneavoastră. Aveți deschidere pentru un demo scurt de 10-15 minute săptămâna aceasta?",
  production:
    "Bună ziua, {name}! Vă contactez din partea OPSQAI. Am dezvoltat o platformă internă de proceduri și instruire automată (cu teste și diplome) care rulează 100% on-premise, pe serverele locale ale companiei, păstrând toate datele complet confidențiale. Când ați avea 10 minute pentru o scurtă prezentare online?",
  finance:
    "Bună ziua, {name}! Sunt {sender} de la OPSQAI. Ajutăm echipele din zona financiară să găsească instant procedurile interne (creditare, audit, conformitate) și să instruiască angajații noi — totul instalat local, fără ca datele să părăsească rețeaua firmei (sprijin tehnic pentru cerințele GDPR / DORA). Ați avea 15 minute pentru un demo săptămâna aceasta?",
  followup:
    "Bună ziua, {name}! Conform discuției noastre de adineauri, vă trimit fișa tehnică și de conformitate OPSQAI (1 pagină). Așa cum am stabilit, ne auzim la ora {time} pentru demo-ul scurt. O zi excelentă!",
};

export function whatsappTemplate(kind: Industry | "followup", v: Vars) {
  return fill(WA[kind], v);
}

export function coldEmail(v: Vars) {
  return {
    subject: fill("Optimizare proceduri interne și instruire {company} (100% local, fără cloud)", v),
    body: fill(
      `Bună ziua, {name},

Vă contactez direct deoarece sprijinim companiile din România să reducă timpul alocat căutării de proceduri interne și instruirii noilor angajați.

OPSQAI este o platformă de asistență operațională și academie internă cu o particularitate importantă: rulează 100% instalată pe serverul dumneavoastră, fără ca datele confidențiale să părăsească rețeaua firmei.

Ați fi deschis pentru o discuție scurtă de 10-15 minute marți sau joi, ca să vă arăt cum funcționează practic pe documentele dumneavoastră?

Cu stimă,
{sender} | OPSQAI
opsqai.de`,
      v,
    ),
  };
}

export const CALL_OPENING =
  "Bună ziua, {name}! Mă numesc {sender} de la OPSQAI. Știu că sunteți prins, așa că voi fi foarte scurt: lucrăm cu companii ca {company} pentru a reduce timpul pierdut de angajați căutând proceduri și documente interne. Am 30 de secunde să vă spun despre ce este vorba?";

export const CALL_PITCH =
  "Am dezvoltat un sistem de proceduri și academie internă care rulează 100% instalat pe calculatoarele dumneavoastră, fără date trimise în cloud. Angajații primesc răspunsuri instant strict din regulamentele firmei, iar noii veniți sunt instruiți și testați automat, cu diplome interne. Nu vă propun o vânzare acum — doar un demo de 15 minute, să vedeți dacă are sens pentru firmă. Cum arată programul dumneavoastră joi?";

export const fillScript = fill;

export const OBJECTIONS: { q: string; a: string }[] = [
  {
    q: "„Avem deja ChatGPT”",
    a: "ChatGPT este un instrument public: datele firmei pleacă pe servere externe și uneori inventează răspunsuri. OPSQAI e instalat fizic la dumneavoastră și răspunde strict din documentele interne, cu trimitere la sursă.",
  },
  {
    q: "„Datele nu au voie să iasă din firmă / GDPR / DORA”",
    a: "Exact pentru asta existăm. OPSQAI rulează pe serverul din biroul dumneavoastră, noi nu avem acces la date. Vă oferim infrastructura tehnică; dumneavoastră rămâneți operatorul datelor.",
  },
  {
    q: "„Cât costă?”",
    a: "Depinde de câte calculatoare și module folosiți, fără costuri ascunse per angajat. Se amortizează din timpul economisit la instruire și din greșelile evitate. În 15 minute de demo vă arăt cifrele pentru structura dumneavoastră.",
  },
  {
    q: "„Trimiteți-mi pe email”",
    a: "Sigur, vă trimit chiar acum fișa de o pagină pe WhatsApp sau email. Ca să știu ce vă interesează mai mult: procedurile operaționale sau instruirea și testarea echipei?",
  },
  {
    q: "„Nu avem timp acum”",
    a: "Înțeleg perfect. Tocmai de aceea demo-ul durează 15 minute. Vă e mai comod marți sau joi dimineață?",
  },
  {
    q: "„Avem deja un sistem de documente”",
    a: "Foarte bine — OPSQAI nu îl înlocuiește, ci îl face util: citește documentele existente și răspunde angajaților la întrebări în câteva secunde, plus instruire cu teste.",
  },
];

/** Readable random password: 12 chars, mixed case, digits and a symbol. */
export function generatePassword(len = 12) {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const sym = "!#$%&*?";
  const all = lower + upper + digits + sym;
  const rnd = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % n;
  };
  const pick = (s: string) => s[rnd(s.length)];
  const chars = [pick(lower), pick(upper), pick(digits), pick(sym)];
  while (chars.length < len) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function passwordStrength(p: string): { score: 0 | 1 | 2 | 3; label: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const score = (p.length < 8 ? 0 : Math.min(3, s - 1)) as 0 | 1 | 2 | 3;
  return { score, label: ["Prea scurtă", "Slabă", "Medie", "Sigură"][score] };
}

// ── Tone-aware generation ────────────────────────────────────────────────
// The same message, adapted to the person on the other side. Pricing is
// never pitched up front: every tone leads to the free 30-day pilot.

export type Tone = "protocol" | "distant" | "friendly" | "generic";

export const TONES: { id: Tone; label: string; hint: string }[] = [
  { id: "protocol", label: "Protocolar", hint: "Directori generali, bănci, corporații, juriști" },
  { id: "distant", label: "Distant / direct", hint: "Operațional, grăbit, vrea doar faptele" },
  { id: "friendly", label: "Prietenos", hint: "HR, training, echipe tinere, relație caldă" },
  { id: "generic", label: "Generic", hint: "Business clasic, clar și echilibrat" },
];

const PAIN: Record<Industry, string> = {
  transport: "erorile de dispecerat, documentele CMR și instruirea șoferilor pe proceduri",
  production: "procedurile de pe linie, instruirea operatorilor și rotația personalului",
  finance: "găsirea rapidă a procedurilor de creditare, audit și conformitate",
};

type ToneSet = { opening: string; pitch: string; wa: string; waFollow: string; subject: string; email: string };

function toneSet(tone: Tone, industry: Industry): ToneSet {
  const pain = PAIN[industry];
  const pilot =
    "un pilot gratuit de 30 de zile, instalat pe serverul firmei, pe procedurile unui singur departament, cu rezultate măsurate la final";
  switch (tone) {
    case "protocol":
      return {
        opening:
          "Bună ziua, domnule/doamnă {name}. Mă numesc {sender} și reprezint OPSQAI. Vă mulțumesc că îmi acordați un moment. Dacă îmi permiteți, aș dori să vă prezint, în mai puțin de un minut, o inițiativă relevantă pentru {company}. Este un moment potrivit?",
        pitch: `OPSQAI este o platformă de inteligență artificială instalată exclusiv în infrastructura companiei, astfel încât datele nu părăsesc niciodată rețeaua dumneavoastră. Pentru ${pain}, angajații primesc răspunsuri exacte din documentele interne, cu sursa citată. V-aș propune, cu respect, ${pilot}. Ați fi de acord cu o întâlnire de 15 minute în care să vă prezint detaliile?`,
        wa: `Stimate domnule/Stimată doamnă {name}, vă scriu din partea OPSQAI. Sprijinim companii precum {company} în privința ${pain}, printr-o platformă AI instalată integral pe serverele proprii, fără transfer de date în cloud. Vă propunem ${pilot}. V-ar conveni o scurtă prezentare de 15 minute? Cu deosebită considerație, {sender}`,
        waFollow:
          "Stimate domnule/Stimată doamnă {name}, vă mulțumesc pentru timpul acordat. Conform discuției, vă transmit materialul de prezentare și fișa de securitate. Rămân la dispoziția dumneavoastră pentru întâlnirea de la ora {time}. Cu deosebită considerație, {sender}",
        subject: "Propunere de pilot gratuit OPSQAI pentru {company}",
        email: `Stimate domnule/Stimată doamnă {name},

Vă adresez această scrisoare în numele OPSQAI. Sprijinim organizații din România în privința ${pain}, printr-o platformă de inteligență artificială instalată exclusiv în infrastructura proprie a companiei.

Datele rămân în totalitate sub controlul dumneavoastră: {company} rămâne operatorul datelor, iar noi nu avem acces la acestea.

Vă propunem ${pilot}, fără costuri de licență și fără obligații ulterioare.

Dacă inițiativa vă interesează, aș fi onorat să vă prezint detaliile într-o întâlnire de 15 minute, la o dată convenabilă pentru dumneavoastră.

Cu deosebită considerație,
{sender}
OPSQAI | opsqai.de`,
      };
    case "distant":
      return {
        opening: "Bună ziua, {name}. {sender}, OPSQAI. Vă rețin 30 de secunde, vă spun direct despre ce e vorba?",
        pitch: `Pe scurt: AI instalat pe serverul vostru, fără cloud. Rezolvă ${pain}: angajatul întreabă, primește răspunsul din documentele firmei în câteva secunde. Ofertă: ${pilot}. Costul pentru voi: zero. Joi sau vineri, 15 minute?`,
        wa: `Bună ziua, {name}. {sender}, OPSQAI. AI instalat local pentru ${pain}. Fără cloud. Pilot gratuit 30 de zile, fără obligații. 15 minute săptămâna asta?`,
        waFollow: "Bună ziua, {name}. Atașat: fișa OPSQAI și fișa de securitate. Confirm demo-ul la ora {time}. {sender}",
        subject: "{company}: pilot gratuit 30 de zile, AI local",
        email: `Bună ziua, {name},

Pe scurt:
- Ce: AI instalat pe serverul {company}, fără cloud.
- Pentru: ${pain}.
- Ofertă: pilot gratuit 30 de zile, un departament, rezultate măsurate.
- Cost pentru dumneavoastră: zero. Fără obligații.

15 minute marți sau joi?

{sender} | OPSQAI`,
      };
    case "friendly":
      return {
        opening:
          "Bună ziua, {name}! Sunt {sender} de la OPSQAI, mă bucur că v-am prins. Vă sun cu ceva care cred că o să vă ușureze puțin munca la {company}. Aveți un minut?",
        pitch: `Am construit un asistent care stă pe calculatoarele firmei, nu în cloud, și îi ajută pe colegi cu ${pain}. Noii colegi învață mai repede, cu lecții scurte și teste, iar dumneavoastră scăpați de aceleași întrebări repetate. Vă propun ${pilot}, fără niciun cost. Cum ar suna să ne vedem 15 minute săptămâna asta?`,
        wa: `Bună ziua, {name}! 😊 Sunt {sender} de la OPSQAI. Ajutăm echipe ca a dumneavoastră cu ${pain}, cu un asistent AI care rulează pe calculatoarele firmei. Avem un pilot gratuit de 30 de zile, fără obligații. Ați avea 15 minute să vi-l arăt?`,
        waFollow: "Bună ziua, {name}! Mulțumesc mult pentru discuție 🙏 Vă las aici materialele promise. Ne auzim la ora {time}. O zi frumoasă! {sender}",
        subject: "O idee pentru echipa {company} (pilot gratuit)",
        email: `Bună ziua, {name},

Vă scriu pentru că lucrăm cu echipe care se confruntă cu ${pain}, și cred că v-ar putea ajuta.

OPSQAI este un asistent care stă pe calculatoarele firmei (nu în cloud), răspunde colegilor din documentele interne și îi ajută pe cei noi să învețe mai repede, cu lecții și teste scurte.

Vă propunem un pilot gratuit de 30 de zile pe un singur departament, fără costuri și fără obligații, ca să vedeți singuri dacă vă ajută.

Ați avea 15 minute săptămâna aceasta?

Cu drag,
{sender} | OPSQAI`,
      };
    default:
      return {
        opening: CALL_OPENING,
        pitch: `OPSQAI rulează 100% instalat pe calculatoarele firmei, fără date trimise în cloud, și ajută cu ${pain}. Angajații primesc răspunsuri instant din regulamentele firmei, iar noii veniți sunt instruiți și testați automat. Vă propun ${pilot}. Cum arată programul dumneavoastră joi?`,
        wa: `Bună ziua, {name}! Sunt {sender} de la OPSQAI. Sprijinim companiile în privința ${pain}, cu o platformă AI care rulează pe serverul firmei, fără cloud. Oferim un pilot gratuit de 30 de zile. Aveți deschidere pentru un demo de 15 minute săptămâna aceasta?`,
        waFollow: WA.followup,
        subject: "Pilot gratuit OPSQAI pentru {company} (100% local, fără cloud)",
        email: `Bună ziua, {name},

Vă contactez deoarece sprijinim companiile din România în privința ${pain}.

OPSQAI este o platformă de asistență operațională și academie internă care rulează 100% pe serverul dumneavoastră, fără ca datele să părăsească rețeaua firmei.

Vă propunem un pilot gratuit de 30 de zile, pe un singur departament, cu rezultate măsurate la final.

Ați fi deschis pentru o discuție de 15 minute marți sau joi?

Cu stimă,
{sender} | OPSQAI
opsqai.de`,
      };
  }
}

export function toneScripts(tone: Tone, industry: Industry, v: Vars) {
  const s = toneSet(tone, industry);
  return {
    opening: fill(s.opening, v),
    pitch: fill(s.pitch, v),
    whatsapp: fill(s.wa, v),
    whatsappFollowUp: fill(s.waFollow, v),
    subject: fill(s.subject, v),
    email: fill(s.email, v),
  };
}

/** Objection replies re-phrased for the tone; price always routes to the pilot. */
export function toneObjection(tone: Tone, i: number): string {
  const base = OBJECTIONS[i]?.a ?? "";
  const price =
    "Pilotul de 30 de zile este gratuit, fără costuri de licență. Discutăm investiția doar la final, pe baza rezultatelor măsurate la dumneavoastră.";
  const a = i === 2 ? price : base;
  if (tone === "protocol") return `Înțeleg pe deplin preocuparea dumneavoastră. ${a}`;
  if (tone === "distant") return a.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".");
  if (tone === "friendly") return `Vă înțeleg foarte bine, aud asta des. ${a}`;
  return a;
}

export type EmailProvider = "default" | "gmail" | "outlook" | "yahoo" | "icloud";

/** Opens a compose window in the colleague's own mailbox (no server-side sending). */
export function composeEmailUrl(
  provider: EmailProvider | string | null | undefined,
  from: string | null | undefined,
  to: string | null | undefined,
  subject: string,
  body: string,
) {
  const e = encodeURIComponent;
  const t = e(to ?? "");
  if (provider === "gmail")
    return `https://mail.google.com/mail/?${from ? `authuser=${e(from)}&` : ""}view=cm&fs=1&to=${t}&su=${e(subject)}&body=${e(body)}`;
  if (provider === "outlook")
    return `https://outlook.live.com/mail/0/deeplink/compose?to=${t}&subject=${e(subject)}&body=${e(body)}`;
  if (provider === "yahoo")
    return `https://compose.mail.yahoo.com/?to=${t}&subject=${e(subject)}&body=${e(body)}`;
  return mailtoUrl(to, subject, body);
}
