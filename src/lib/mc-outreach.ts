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
