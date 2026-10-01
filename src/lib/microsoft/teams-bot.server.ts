// Microsoft Teams bot for the Self-Hosted installation — server only.
//
// The customer registers a bot app in Entra ID (the same registration can be
// reused with a bot channel registration). OPSQAI answers questions in 1:1
// chats and channels using the same grounded KB pipeline as AI Chat: answers
// only from approved company knowledge, with a source attribution line.
// Inbound requests are validated against Bot Framework's signing keys so a
// forged webhook cannot use OPSQAI's knowledge.

import { createPublicKey, verify as cryptoVerify } from "node:crypto";
import { readSelfHostConfig, writeSelfHostConfig } from "@/lib/selfhost-config.server";
import { getKnowledgeRepository } from "@/lib/providers/registry";
import { generateAiText, resolveEmbedOne } from "@/lib/ai-provider.server";
import {
  detectLanguage,
  groundedSystemPrompt,
  refusalText,
  sourceAttributionLine,
} from "@/lib/chat-grounding";
import { mq } from "./db.server";

export interface TeamsBotConfig {
  appId?: string;
  appSecret?: string;
  enabled?: boolean;
}

export function getTeamsBotConfig(): TeamsBotConfig {
  const cfg = readSelfHostConfig();
  return (cfg.teamsBot as TeamsBotConfig | undefined) ?? {};
}

export function setTeamsBotConfig(patch: TeamsBotConfig): TeamsBotConfig {
  const cfg = readSelfHostConfig();
  const current = (cfg.teamsBot as TeamsBotConfig | undefined) ?? {};
  const next: TeamsBotConfig = { ...current, ...patch };
  if (!patch.appSecret) next.appSecret = current.appSecret;
  cfg.teamsBot = next;
  writeSelfHostConfig(cfg);
  return next;
}

export function isTeamsBotConfigured(c: TeamsBotConfig = getTeamsBotConfig()): boolean {
  return Boolean(c.appId && c.appSecret);
}

// ── Inbound request validation (Bot Framework signing keys) ───────────────
interface Jwk { kid: string; kty: string; n: string; e: string }
let bfKeys: { at: number; keys: Jwk[] } | null = null;

async function getBotFrameworkKeys(force = false): Promise<Jwk[]> {
  if (!force && bfKeys && Date.now() - bfKeys.at < 6 * 3600_000) return bfKeys.keys;
  const res = await fetch("https://login.botframework.com/v1/.well-known/keys");
  if (!res.ok) throw new Error("Bot Framework keys unavailable");
  const { keys } = (await res.json()) as { keys: Jwk[] };
  bfKeys = { at: Date.now(), keys };
  return keys;
}

/** Verifies the Bot Framework JWT on the inbound webhook: signature, issuer, audience and expiry. */
export async function verifyBotFrameworkRequest(token: string, appId: string): Promise<void> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) throw new Error("teams_bad_token");
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as { kid?: string; alg?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("teams_bad_alg");
  let keys = await getBotFrameworkKeys();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    keys = await getBotFrameworkKeys(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error("teams_unknown_key");
  const key = createPublicKey({ key: { kty: jwk.kty, n: jwk.n, e: jwk.e }, format: "jwk" });
  if (!cryptoVerify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"))) {
    throw new Error("teams_bad_signature");
  }
  const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as Record<string, unknown>;
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== "https://api.botframework.com") throw new Error("teams_bad_issuer");
  if (claims.aud !== appId) throw new Error("teams_bad_audience");
  if (typeof claims.exp === "number" && claims.exp < now - 60) throw new Error("teams_token_expired");
}

// ── Outbound: Bot Framework Connector API ─────────────────────────────────
let botToken: { token: string; exp: number } | null = null;

async function getBotConnectorToken(c: TeamsBotConfig): Promise<string> {
  if (botToken && botToken.exp - 120 > Date.now() / 1000) return botToken.token;
  const res = await fetch("https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.appId!,
      client_secret: c.appSecret!,
      grant_type: "client_credentials",
      scope: "https://api.botframework.com/.default",
    }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Bot connector token failed: ${json.error_description?.split("\r\n")[0] ?? res.status}`);
  }
  botToken = { token: json.access_token, exp: Date.now() / 1000 + (json.expires_in ?? 3600) };
  return json.access_token;
}

export async function sendBotReply(
  c: TeamsBotConfig,
  p: { serviceUrl: string; conversationId: string; text: string; appOrigin: string | null },
): Promise<void> {
  const token = await getBotConnectorToken(c);
  const url = `${p.serviceUrl.replace(/\/$/, "")}/v3/conversations/${encodeURIComponent(p.conversationId)}/activities`;
  const body: Record<string, unknown> = { type: "message", text: p.text, textFormat: "markdown" };
  if (p.appOrigin) {
    body.attachments = [
      {
        contentType: "application/vnd.microsoft.card.hero",
        content: {
          title: "OPSQAI",
          text: "Răspuns generat din procedurile companiei.",
          buttons: [{ type: "openUrl", title: "Deschide în OPSQAI", value: `${p.appOrigin}/app/chat` }],
        },
      },
    ];
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Bot reply failed ${res.status}: ${t.slice(0, 300)}`);
  }
}

// ── Grounded answering, same rules as AI Chat ─────────────────────────────
export interface BotAnswer {
  text: string;
  grounded: boolean;
  sourceCount: number;
}

export async function answerFromKnowledge(
  companyId: string,
  question: string,
  language: string,
): Promise<BotAnswer> {
  const repo = getKnowledgeRepository(undefined);
  const embedding = await resolveEmbedOne(question);
  const matches = await repo.searchSimilar(companyId, embedding, 12);
  const docs = matches.length
    ? await repo.getDocumentsByIds(Array.from(new Set(matches.map((m) => m.document_id))))
    : [];
  const meta = new Map(docs.map((d) => [d.id, d]));
  let chunkMeta = new Map<string, { id: string; section: string | null; page: number | null; page_end: number | null }>();
  try {
    const rows = await repo.getChunkMetadata(matches.map((m) => ({ document_id: m.document_id, chunk_index: m.chunk_index })));
    chunkMeta = new Map(rows.map((r) => [`${r.document_id}:${r.chunk_index}`, { id: r.id, section: r.section, page: r.page, page_end: r.page_end }]));
  } catch {
    /* optional */
  }
  const sources = matches.map((m, index) => {
    const doc = meta.get(m.document_id);
    const cm = chunkMeta.get(`${m.document_id}:${m.chunk_index}`);
    return {
      type: "document" as const,
      id: `${m.document_id}:${m.chunk_index}`,
      chunk_id: cm?.id ?? null,
      document_id: m.document_id,
      title: doc?.title ?? "Knowledge document",
      code: doc?.docCode ?? null,
      excerpt: m.content,
      similarity: Number(m.similarity ?? 0),
      section: cm?.section ?? null,
      page: cm?.page ?? null,
      pageEnd: cm?.page_end ?? null,
      paginated: false,
      last_updated: doc?.updatedAt ?? null,
      confidence: Number(m.similarity ?? 0) >= 0.45 ? "high" : Number(m.similarity ?? 0) >= 0.28 ? "medium" : "low",
      primary: index === 0,
      departmentName: null as string | null,
    };
  });
  const confidence = matches.length
    ? matches.slice(0, 3).reduce((sum, m) => sum + Number(m.similarity ?? 0), 0) / Math.min(3, matches.length)
    : 0;
  const grounded = matches.some((m) => Number(m.similarity ?? 0) >= 0.34) || confidence >= 0.34;
  if (!grounded) return { text: refusalText(question, language), grounded: false, sourceCount: 0 };

  const context = sources
    .slice(0, 8)
    .map((s, i) => {
      const head = [`[Document ${i + 1}] ${s.code ? `${s.code} — ` : ""}${s.title}`];
      if (s.section) head.push(`Section: ${s.section}`);
      if (s.page != null) head.push(`Page: ${s.pageEnd ? `${s.page}-${s.pageEnd}` : s.page}`);
      return `${head.join(" | ")}\n${s.excerpt}`;
    })
    .join("\n\n---\n\n");
  const system = groundedSystemPrompt(context, language);
  const text = (await generateAiText({ role: "chat", system, prompt: question })).trim();
  return { text: `${text}${sourceAttributionLine(sources, language)}`, grounded: true, sourceCount: sources.length };
}

/** The one company of this local installation. */
export async function botCompanyId(): Promise<string | null> {
  const rows = await mq<{ id: string }>(`SELECT id FROM public.companies ORDER BY created_at LIMIT 1`);
  return rows[0]?.id ?? null;
}
