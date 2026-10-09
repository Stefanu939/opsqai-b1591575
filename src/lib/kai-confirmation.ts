import type { KaiAction } from "@/lib/kai.functions";

export type KaiActionStatus = "running" | "executed" | "failed";
export type KaiActionResult = { status: KaiActionStatus; message?: string };

export const kaiActionKey = (action: KaiAction) => JSON.stringify(action);
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9@]+/g, " ").trim();

const TYPE_WORDS: Record<KaiAction["type"], string[]> = {
  add_lead: ["crm", "firma", "compania", "lead"],
  debrief: ["debrief", "rezumat"],
  calendar: ["sedinta", "intalnirea", "calendar"],
  task: ["task", "reminder", "sarcina"],
  time_off: ["concediu", "concediul"],
  team_email: ["email", "echipa"],
  email: ["email", "mesaj"],
  whatsapp: ["whatsapp", "mesaj"],
  call: ["suna", "apel"],
  doc: ["document", "onepager", "securitate", "prezentare"],
  onboard: ["inroleaza", "licenta", "client"],
  pricing: ["pret", "oferta"],
  open: ["deschide", "pagina"],
};

/** Approval is matched to an existing immutable proposal, never generated from approval text. */
export function resolveKaiConfirmation(text: string, actions: KaiAction[]) {
  const normalized = normalize(text);
  if (/\b(nu|anuleaza|renunt|stop|fara)\b/.test(normalized)) return { kind: "none" as const };
  if (!/^(confirm|da confirm|da confirma|confirma|aproba|aprob|da poti|poti trece|poti adauga|poti trimite|executa)\b/.test(normalized)) return { kind: "none" as const };
  if (/\b(dar|schimba|modifica|inlocuieste|exceptie|doar)\b/.test(normalized)) return { kind: "ambiguous" as const };
  if (!actions.length) return { kind: "missing" as const };
  const bare = /^(confirm|da confirm|confirma|aproba|aprob|executa)( te rog)?$/.test(normalized);
  if (bare) return actions.length === 1 ? { kind: "matched" as const, action: actions[0] } : { kind: "ambiguous" as const };

  const words = normalized.split(" ");
  const requestedTypes = Object.entries(TYPE_WORDS).filter(([, tokens]) => tokens.some((token) => words.includes(token))).map(([type]) => type);
  let candidates = requestedTypes.length ? actions.filter((a) => requestedTypes.includes(a.type)) : actions;
  const targets = candidates.filter((a) => {
    const target = "company_name" in a ? a.company_name : "title" in a ? a.title : a.type === "team_email" ? a.to.join(" ") : "";
    const name = normalize(target);
    return name.length > 1 && (` ${normalized} `).includes(` ${name} `);
  });
  if (targets.length) candidates = targets;
  // Extra company names or changed dates/details must be clarified, not silently applied.
  const genericWords = new Set("confirm da confirma aproba aprob executa poti trece adauga trimite seteaza salveaza deschide te rog in din pentru la pe si un o firma compania lead crm sedinta intalnirea calendar task reminder sarcina concediu concediul email echipa mesaj whatsapp suna apel document onepager securitate prezentare inroleaza licenta client pret oferta pagina rezumat debrief aceasta asta acesta propusa propus".split(" "));
  const targetWords = new Set(targets.flatMap((a) => normalize("company_name" in a ? a.company_name : "title" in a ? a.title : a.type === "team_email" ? a.to.join(" ") : "").split(" ")));
  if (words.some((word) => !genericWords.has(word) && !targetWords.has(word))) return { kind: "ambiguous" as const };
  return candidates.length === 1 ? { kind: "matched" as const, action: candidates[0] } : { kind: "ambiguous" as const };
}