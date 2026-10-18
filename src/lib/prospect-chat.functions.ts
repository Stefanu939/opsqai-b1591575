// Prospect Mode chat: public endpoint (anonymous visitors may ask a few
// questions), every session is stored server-side so OPSQAI staff can review
// transcripts in MC. Limits are enforced here, not only in the browser.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { PROSPECT_KAI_SYSTEM } from "@/lib/portal-kai.functions";
import { ProspectLanguageSchema, prospectLanguageInstruction } from "@/lib/prospect-language";
import {
  PROSPECT_ANON_SESSIONS_PER_IP_DAY,
  prospectGate,
  prospectRemaining,
} from "@/lib/prospect-limits";

export type ProspectMsg = { role: "user" | "assistant"; content: string; at: string };

const Ident = z.object({ sessionId: z.string().uuid(), token: z.string().min(20).max(200) });

async function sha(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function caller(db: any) {
  const auth = getRequest().headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.startsWith("sb_")) return null;
  const { data } = await db.auth.getUser(token);
  return data?.user ? { id: data.user.id as string, email: (data.user.email as string) ?? null } : null;
}

async function loadOwned(db: any, sessionId: string, token: string) {
  const { data } = await db.from("prospect_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!data) return null;
  if (data.token_hash !== (await sha(token))) throw new Error("Sesiune invalidă.");
  return data;
}

export const getProspectSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Ident.parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    let foreign = false;
    const s = await loadOwned(db, data.sessionId, data.token).catch(() => { foreign = true; return null; });
    const user = await caller(db);
    if (s?.user_id && user && s.user_id !== user.id) foreign = true;
    if (!s || foreign || (s.user_id && !user)) return { messages: [] as ProspectMsg[], count: 0, foreign };
    return { messages: (s.messages ?? []) as ProspectMsg[], count: s.user_message_count as number, foreign: false };
  });

export const askProspectKai = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Ident.extend({ message: z.string().trim().min(1).max(4000), language: ProspectLanguageSchema }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    const user = await caller(db);
    const now = new Date().toISOString();
    let s = await loadOwned(db, data.sessionId, data.token);
    if (s?.user_id && s.user_id !== user?.id) throw new Error("Sesiune invalidă.");
    if (!s) {
      const req = getRequest();
      const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0] ?? "";
      const ipHash = ip ? await sha(`prospect:${ip}`) : null;
      if (ipHash && !user) {
        const since = new Date(Date.now() - 86_400_000).toISOString();
        const { count } = await db.from("prospect_sessions").select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash).gte("started_at", since);
        if ((count ?? 0) >= PROSPECT_ANON_SESSIONS_PER_IP_DAY) return { ok: false as const, gate: "login_required" as const, count: 0, remaining: 0 };
      }
      const row = { id: data.sessionId, token_hash: await sha(data.token), ip_hash: ipHash, messages: [], user_message_count: 0 };
      const { error } = await db.from("prospect_sessions").insert(row);
      if (error) throw new Error("Nu am putut porni conversația.");
      s = { ...row, user_id: null };
    }
    const patch: Record<string, unknown> = {};
    if (user && !s.user_id) Object.assign(patch, { user_id: user.id, email: user.email, signed_in_at: now });

    const count = s.user_message_count as number;
    const gate = prospectGate(count, Boolean(user));
    if (gate !== "ok") {
      if (gate === "login_required" && !s.login_gate_at) patch.login_gate_at = now;
      if (Object.keys(patch).length) await db.from("prospect_sessions").update(patch).eq("id", s.id);
      return { ok: false as const, gate, count, remaining: prospectRemaining(count) };
    }

    const history: ProspectMsg[] = [...((s.messages ?? []) as ProspectMsg[]), { role: "user", content: data.message, at: now }];
    let reply: string | null = null;
    try {
      const { generateAiText } = await import("@/lib/ai-provider.server");
      reply = (await generateAiText({
        role: "chat",
        system: `${PROSPECT_KAI_SYSTEM}\n\n${prospectLanguageInstruction(data.language)}`,
        messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
      })).trim() || null;
    } catch (e) {
      console.error("[prospect] ai failed", e);
    }
    if (reply) history.push({ role: "assistant", content: reply, at: new Date().toISOString() });
    await db.from("prospect_sessions").update({
      ...patch,
      messages: history,
      user_message_count: count + 1,
      last_message_at: new Date().toISOString(),
    }).eq("id", s.id);
    return { ok: Boolean(reply), gate: "ok" as const, text: reply ?? "", count: count + 1, remaining: prospectRemaining(count + 1) };
  });

/** Called after the contact form succeeds so MC shows the session as converted. */
export const markProspectConverted = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => Ident.extend({ leadId: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const s = await loadOwned(db, data.sessionId, data.token);
    if (!s || (s.user_id && s.user_id !== (context as { userId: string }).userId)) return { ok: false };
    await db.from("prospect_sessions").update({ converted_at: new Date().toISOString(), crm_lead_id: data.leadId }).eq("id", s.id);
    return { ok: true };
  });

// ---------- MC (staff only) ----------

export type ProspectSessionRow = {
  id: string; email: string | null; user_id: string | null; messages: ProspectMsg[];
  user_message_count: number; login_gate_at: string | null; signed_in_at: string | null;
  converted_at: string | null; crm_lead_id: string | null; analysis: ProspectAnalysis | null;
  started_at: string; last_message_at: string;
};

export const listProspectSessions = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context as never);
    const db = await admin();
    const { data, error } = await db.from("prospect_sessions")
      .select("id,email,user_id,messages,user_message_count,login_gate_at,signed_in_at,converted_at,crm_lead_id,analysis,started_at,last_message_at")
      .gt("user_message_count", 0)
      .order("last_message_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return { sessions: (data ?? []) as ProspectSessionRow[] };
  });

const AnalysisSchema = z.object({
  interest: z.enum(["hot", "warm", "cold"]),
  summary: z.string().max(800),
  questions: z.array(z.string().max(200)).max(8),
  suggestions: z.array(z.string().max(200)).max(8),
  blocker: z.string().max(400),
  winback: z.string().max(1200),
});
export type ProspectAnalysis = z.infer<typeof AnalysisSchema>;

export const analyzeProspectSession = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context as never);
    const db = await admin();
    const { data: s } = await db.from("prospect_sessions").select("messages,converted_at").eq("id", data.id).maybeSingle();
    if (!s) throw new Error("Sesiunea nu există.");
    const transcript = ((s.messages ?? []) as ProspectMsg[])
      .map((m) => `${m.role === "user" ? "Prospect" : "Kai"}: ${m.content}`).join("\n\n").slice(0, 24000);
    const { generateAiText } = await import("@/lib/ai-provider.server");
    const raw = await generateAiText({
      role: "chat",
      temperature: 0.2,
      system: `You analyse a sales conversation between a prospect and Kai (OPSQAI assistant) for the OPSQAI sales team. Reply ONLY with JSON: {"interest":"hot|warm|cold","summary":"","questions":[],"suggestions":[],"blocker":"","winback":""}. Romanian language. questions = what the prospect asked; suggestions = what Kai recommended (modules, pilot, ideas); blocker = where/why they stopped (${s.converted_at ? "they DID request contact" : "they did not request contact"}); winback = a short, friendly WhatsApp/email follow-up message addressing that blocker, offering the free 30-day pilot, no prices, no invented facts, signed with no name. Only use facts from the transcript.`,
      prompt: transcript,
    });
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const analysis = AnalysisSchema.parse(JSON.parse(json));
    await db.from("prospect_sessions").update({ analysis }).eq("id", data.id);
    return analysis;
  });
