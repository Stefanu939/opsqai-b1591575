import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { embedOne } from "@/lib/embeddings.server";
import { cached, createTimer, background } from "@/lib/perf.server";
import type { Database } from "@/integrations/supabase/types";

const REFUSAL = {
  en: "I could not find reliable information inside your company knowledge base.",
  de: "Ich konnte keine verlässlichen Informationen in der Wissensdatenbank Ihres Unternehmens finden.",
  ro: "Nu am putut găsi informații sigure în baza de cunoștințe a companiei.",
} as const;

const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|yo|howdy|good\s*(morning|afternoon|evening|day)|thanks|thank\s+you|thx|ty|cheers|bye|goodbye|see\s+ya)\b/i,
  /^(hallo|hi|hey|guten\s*(morgen|tag|abend)|servus|moin|danke|tsch[üu]ss|auf\s+wiedersehen)\b/i,
  /^(salut|bun[ăa]|bun[ăa]\s+(ziua|dimineața|seara)|noroc|mul[țt]umesc|mersi|pa|la\s+revedere)\b/i,
  /^(who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|how\s+are\s+you)\b/i,
  /^(wer\s+bist\s+du|was\s+kannst\s+du|wie\s+geht'?s)\b/i,
  /^(cine\s+e[șs]ti|ce\s+po[țt]i\s+face|ce\s+faci)\b/i,
];
function detectGreeting(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  return GREETING_PATTERNS.some((re) => re.test(trimmed));
}

const FOLLOWUP_PATTERNS = [
  /\b(elaborate|explain|explain (it|that|more)|tell me more|more detail|more details|give (me )?more details|expand|clarify|summari[sz]e|tl;?dr|in short|shorter|translate|in (english|german|romanian|deutsch|englisch|rom[âa]n[ăa]|german[ăa]|englez[ăa])|rephrase|simpler|simplify|continue|go on|and\??|why\??|how\??|what about|details?\??)\b/i,
  /\b(erkl[äa]re|erl[äa]utere|mehr details?|ausf[üu]hrlicher|zusammenfassen|[üu]bersetze|fortfahren|weiter|warum\??|wie\??)\b/i,
  /\b(elaboreaz[ăa]|explic[ăa]|mai multe detalii|detalia[zț]i|rezum[ăa]|traduce[țt]i|continu[ăa]|de ce\??|cum\??)\b/i,
];
function detectFollowup(q: string): boolean {
  const trimmed = q.trim();
  if (trimmed.length === 0 || trimmed.length > 160) return false;
  return FOLLOWUP_PATTERNS.some((re) => re.test(trimmed));
}

function normalizeQuestion(q: string): string {
  return q.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !["the","and","for","with","what","when","where","how","why","who","which","does","das","der","die","und","mit","wie","was","wann","wer","wo","sa","de","la","ce","cum","cand","care"].includes(w))
    .sort().join(" ")
    .slice(0, 200);
}

const FOLLOWUP_PROMPT = (context: string) => `You are OPSQAI, a friendly and helpful AI knowledge assistant for a logistics and warehouse operations company.

The user is asking a FOLLOW-UP question. Re-use the prior conversation and the previously retrieved sources below.

RULES:
1. Use ONLY information from the prior conversation and the sources below. No outside knowledge.
2. LANGUAGE: Detect the user's language from their latest message and answer in that EXACT same language — whatever it is (English, German, Romanian, French, Spanish, Italian, Polish, Turkish, Arabic, Ukrainian, Hungarian, Czech, Bulgarian, Portuguese, Dutch, etc.). Match script and locale. Never switch language unless explicitly asked.
3. If the requested information is not present, reply with a single short sentence in the user's language meaning exactly: "I could not find reliable information inside your company knowledge base." Reference equivalents:
   - EN: "${REFUSAL.en}"
   - DE: "${REFUSAL.de}"
   - RO: "${REFUSAL.ro}"
4. When you do answer, end with a "Sources:" block (translate the label to the user's language: "Quellen:", "Surse:", "Sources :", "Fuentes:", "Fonti:", etc.).

PREVIOUSLY RETRIEVED SOURCES:
${context || "(No sources are available.)"}`;

const GREETING_PROMPT = (lang: string) => `You are OPSQAI, a friendly and helpful company knowledge assistant for logistics and warehouse operations.

Respond warmly and naturally in 1–3 sentences, in the SAME language the user wrote in (any language — English, German, Romanian, French, Spanish, Italian, Polish, Turkish, Arabic, etc.). Briefly mention that you can help find answers from the company's SOPs, manuals and FAQs. Do NOT include any "Sources:" block.

User's interface language hint (use only as a fallback if their message is too short to detect): ${lang}.`;

const SYSTEM_PROMPT = (context: string, hasSources: boolean) => `You are OPSQAI, a friendly and helpful AI knowledge assistant for a logistics and warehouse operations company.

ABSOLUTE RULES — non-negotiable:
1. SOURCE-GROUNDED ONLY. You may ONLY use information explicitly written in "COMPANY KNOWLEDGE" below.
2. NO assumptions, NO guessing, NO procedural inference, NO general world knowledge.
3. NEVER invent role names, escalation paths, time limits, contacts, document codes, or company rules.
4. Direct rule application IS allowed (e.g. ">60 min → notify manager" applies for 75 min).
5. IF the answer is NOT explicitly supported, reply with a single short sentence in the user's language meaning exactly: "I could not find reliable information inside your company knowledge base." — and NOTHING else. Reference equivalents:
   - EN: "${REFUSAL.en}"
   - DE: "${REFUSAL.de}"
   - RO: "${REFUSAL.ro}"
6. LANGUAGE: Detect the user's language from their latest message and answer in that EXACT same language — any language (English, German, Romanian, French, Spanish, Italian, Polish, Turkish, Arabic, Ukrainian, Hungarian, Czech, Bulgarian, Portuguese, Dutch, etc.). Match script and locale. Translate the facts from the sources; keep document codes, proper names, and technical identifiers unchanged. Never switch language unless explicitly asked.
7. FORMAT when supported:
   - Concise direct answer first (1–4 short sentences or a tight list).
   - Then a "Sources:" block (translate the label to the user's language: "Quellen:", "Surse:", "Sources :", "Fuentes:", "Fonti:", "Źródła:", etc.), one line per source:
     "[DOC-CODE or Title] v<version> — Section: <section or '—'> — Confidence: <high|medium|low> — Excerpt: \\"<short verbatim quote, ≤200 chars>\\""
8. ${hasSources ? "Sources WERE retrieved; evaluate carefully before answering." : "NO sources were retrieved. Reply with the refusal sentence in the user's language."}

COMPANY KNOWLEDGE:
${context || "(No matching company documents or FAQs were found.)"}`;


interface SourceItem {
  type: "document" | "faq";
  id: string;
  document_id?: string;
  title: string;
  code?: string | null;
  excerpt: string;
  similarity?: number;
  version?: number;
  section?: string | null;
  page?: number | null;
  department?: string | null;
  last_updated?: string | null;
  confidence?: "high" | "medium" | "low";
  primary?: boolean;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const timer = createTimer("chat");
        const authHeader = request.headers.get("authorization");
        const token = authHeader?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY;
        const supaUrl = process.env.SUPABASE_URL;
        const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supaUrl || !supaKey) return new Response("Server misconfigured", { status: 500 });

        const supabase = createClient<Database>(supaUrl, supaKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });

        // Auth + body parse in parallel
        const [claimsRes, body] = await Promise.all([
          supabase.auth.getClaims(token),
          request.json() as Promise<{ messages?: UIMessage[]; threadId?: string; language?: string }>,
        ]);
        timer.mark("auth_and_parse");
        const { data: claims, error: claimsErr } = claimsRes;
        if (claimsErr || !claims?.claims.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claims.claims.sub;

        const messages = body.messages ?? [];
        const threadId = body.threadId;
        const langHint = body.language ?? "en";
        if (!threadId) return new Response("threadId required", { status: 400 });

        // Thread + profile in parallel (company comes from thread, then cached)
        const [threadRes, profileRes] = await Promise.all([
          supabase.from("threads").select("id, title, company_id")
            .eq("id", threadId).eq("user_id", userId).maybeSingle(),
          supabase.from("profiles").select("department_id").eq("id", userId).maybeSingle(),
        ]);
        timer.mark("thread_profile");
        const thread = threadRes.data;
        if (!thread) return new Response("Thread not found", { status: 404 });
        const companyId = thread.company_id;
        const userDeptId = (profileRes.data as { department_id?: string | null } | null)?.department_id ?? null;

        // Cached per-company config (15min TTL) — avoids round-trip on every msg
        const minConfidence = await cached(
          "company:min_confidence", companyId, 15 * 60_000,
          async () => {
            const { data } = await supabase
              .from("companies").select("min_confidence").eq("id", companyId).maybeSingle();
            return Number((data as { min_confidence?: number } | null)?.min_confidence ?? 0.55);
          },
        );
        timer.mark("company_config");

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const query = lastUser?.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim() ?? "";

        const isGreeting = detectGreeting(query);
        const hasPriorAssistant = messages.some((m) => m.role === "assistant");
        const isFollowup = !isGreeting && hasPriorAssistant && detectFollowup(query);
        const sources: SourceItem[] = [];
        let contextBlock = "";
        let mode: "greeting" | "kb" | "gap" | "followup" =
          isGreeting ? "greeting" : isFollowup ? "followup" : "kb";
        let confidence = 0;
        let topSimilarity = 0;
        let queryEmbedding: number[] | null = null;

        if (isFollowup) {
          const { data: prior } = await supabase
            .from("messages").select("role, sources, created_at")
            .eq("thread_id", threadId).eq("role", "assistant")
            .order("created_at", { ascending: false }).limit(1);
          const priorSources = (prior?.[0]?.sources ?? null) as SourceItem[] | null;
          if (Array.isArray(priorSources) && priorSources.length > 0) {
            for (const s of priorSources) sources.push(s);
            contextBlock = sources.map((s, i) =>
              `[${s.type === "document" ? "Doc" : "FAQ"} ${i + 1}] ${s.code ? s.code + " — " : ""}${s.title}\n${s.excerpt}`,
            ).join("\n\n---\n\n");
          }
        } else if (!isGreeting && query) {
          try {
            // Parallel: embed query AND fetch FAQ pool in one round-trip.
            // FAQs are cached per-company for 5 min to skip repeated 200-row pulls.
            const [qVec, faqs] = await Promise.all([
              embedOne(query),
              cached("company:faqs", companyId, 5 * 60_000, async () => {
                // Defense-in-depth: explicit company filter on top of RLS isolation.
                const { data } = await supabase
                  .from("faqs").select("id,question_de,question_en,answer_de,answer_en,category")
                  .eq("company_id", companyId).limit(500);
                return data ?? [];
              }),
            ]);
            queryEmbedding = qVec;
            timer.mark("embed_and_faqs");

            const { data: matches, error: matchErr } = await supabase.rpc(
              "match_document_chunks_for_company" as never,
              { query_embedding: `[${qVec.join(",")}]`, match_count: 8, min_similarity: 0.15, _company_id: companyId } as never,
            ) as { data: Array<{ chunk_id: string; document_id: string; doc_title: string; doc_code: string | null; content: string; similarity: number; chunk_index: number }> | null; error: unknown };
            const matchList = matches ?? [];
            timer.mark("vector_match", { count: matchList.length });
            console.log("[chat:retrieval]", {
              company_id: companyId,
              query: query.slice(0, 120),
              chunk_count: matchList.length,
              top_similarities: matchList.slice(0, 5).map((m) => Number(m.similarity?.toFixed(3))),
              match_error: matchErr ?? null,
            });

            const docIds = Array.from(new Set(matchList.map((m) => m.document_id)));
            const docMeta: Record<string, { version: number; section: string | null; page: number | null; department_id: string | null; updated_at: string; department_name?: string | null }> = {};
            if (docIds.length) {
              const { data: docs } = await supabase
                .from("knowledge_documents")
                .select("id, version, section, page, department_id, updated_at")
                .in("id", docIds);
              const deptIds = Array.from(new Set((docs ?? []).map((d) => (d as { department_id: string | null }).department_id).filter(Boolean) as string[]));
              const deptMap: Record<string, string> = {};
              if (deptIds.length) {
                const { data: depts } = await supabase.from("departments").select("id, name").in("id", deptIds);
                for (const d of depts ?? []) deptMap[d.id] = d.name;
              }
              for (const d of docs ?? []) {
                const row = d as { id: string; version: number; section: string | null; page: number | null; department_id: string | null; updated_at: string };
                docMeta[row.id] = { ...row, department_name: row.department_id ? deptMap[row.department_id] ?? null : null };
              }
            }
            timer.mark("doc_metadata");

            const sims = matchList.map((m) => m.similarity);
            for (let i = 0; i < matchList.length; i++) {
              const m = matchList[i];
              const meta = docMeta[m.document_id];
              const sim = m.similarity;
              const conf: "high" | "medium" | "low" = sim >= 0.6 ? "high" : sim >= 0.4 ? "medium" : "low";
              sources.push({
                type: "document",
                id: m.chunk_id,
                document_id: m.document_id,
                title: m.doc_title,
                code: m.doc_code,
                excerpt: m.content,
                similarity: sim,
                version: meta?.version,
                section: meta?.section ?? null,
                page: meta?.page ?? null,
                department: meta?.department_name ?? null,
                last_updated: meta?.updated_at ?? null,
                confidence: conf,
                primary: i === 0,
              });
            }
            if (sims.length) {
              const top = sims.slice(0, 3);
              confidence = top.reduce((a, b) => a + b, 0) / top.length;
              topSimilarity = sims[0] ?? 0;
            }

            const STOP = new Set(["the","and","for","with","what","when","where","how","why","who","which","does","from","this","that","into","über","das","der","die","den","und","mit","wie","was","wann","wer","wo","von","für","ist","sind","sa","de","la","ce","cum","cand","care","este","sunt","pentru","din"]);
            const lq = query.toLowerCase();
            const words = Array.from(new Set(lq.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w))));
            const scored = faqs.map((f) => {
              const qBlob = `${f.question_de} ${f.question_en} ${f.category}`.toLowerCase();
              const aBlob = `${f.answer_de} ${f.answer_en}`.toLowerCase();
              // Weight question/category hits more than answer hits.
              const s = words.reduce((acc, w) => acc + (qBlob.includes(w) ? 2 : 0) + (aBlob.includes(w) ? 1 : 0), 0);
              return { f, s };
            }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
            const faqConf = (s: number): "high" | "medium" | "low" =>
              s >= 4 ? "high" : s >= 2 ? "medium" : "low";
            for (const { f, s } of scored) {
              sources.push({ type: "faq", id: f.id, title: `${f.question_en} / ${f.question_de}`, excerpt: `EN: ${f.answer_en}\nDE: ${f.answer_de}`, confidence: faqConf(s) });
            }
            // If we found strong FAQ matches, boost confidence so the answer isn't refused on weak KB sim alone.
            if (scored.length > 0 && confidence < 0.6) {
              const faqBoost = Math.min(0.75, 0.5 + scored[0].s * 0.05);
              confidence = Math.max(confidence, faqBoost);
              if (topSimilarity < faqBoost) topSimilarity = faqBoost;
            }
          } catch (e) {
            console.error("[chat:retrieval] embed/match failed", e);
          }

          const docBlocks = sources.filter((s) => s.type === "document").map((s, i) =>
            `[Doc ${i + 1}] ${s.code ? s.code + " — " : ""}${s.title} v${s.version ?? 1}\n${s.excerpt}`);
          const faqBlocks = sources.filter((s) => s.type === "faq").map((s, i) =>
            `[FAQ ${i + 1}] ${s.title}\n${s.excerpt}`);
          contextBlock = [...docBlocks, ...faqBlocks].join("\n\n---\n\n");

          if (sources.length === 0) mode = "gap";
          console.log("[chat:decision]", {
            mode,
            sources_count: sources.length,
            confidence: Number(confidence.toFixed(3)),
            min_confidence: minConfidence,
          });
        }
        timer.mark("rag_complete");


        const gateway = createLovableAiGatewayProvider(apiKey);
        const systemPrompt = isGreeting ? GREETING_PROMPT(langHint)
          : isFollowup ? FOLLOWUP_PROMPT(contextBlock)
          : mode === "gap" ? SYSTEM_PROMPT("", false) : SYSTEM_PROMPT(contextBlock, true);

        const modelMessages = await convertToModelMessages(messages);

        timer.mark("prepare_llm");

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: systemPrompt,
          messages: modelMessages,
        });
        timer.mark("stream_started");


        const canCreateRequest = mode === "gap";

        // Escalation manager (when gap)
        let escalation: { name: string | null; email: string | null; phone: string | null; department: string | null } | null = null;
        if (mode === "gap" && userDeptId) {
          const { data: dept } = await supabase
            .from("departments").select("name, phone, email, manager_id").eq("id", userDeptId).maybeSingle();
          const d = dept as { name: string; phone: string | null; email: string | null; manager_id: string | null } | null;
          if (d) {
            let mgrName: string | null = null;
            let mgrEmail = d.email;
            if (d.manager_id) {
              const { data: mgr } = await supabase
                .from("profiles").select("full_name").eq("id", d.manager_id).maybeSingle();
              mgrName = (mgr as { full_name: string | null } | null)?.full_name ?? null;
            }
            escalation = { name: mgrName, email: mgrEmail, phone: d.phone, department: d.name };
          }
        }

        // Determine whether this turn should be tracked as a knowledge gap.
        // Triggers: refusal mode, low aggregated confidence, or weak top match.
        const LOW_CONF_THRESHOLD = 0.7;
        const WEAK_TOP_MATCH = 0.45;
        const isKnowledgeGap =
          mode === "gap" ||
          (mode === "kb" && (confidence > 0 ? confidence < LOW_CONF_THRESHOLD : true)) ||
          (mode === "kb" && sources.length > 0 && topSimilarity < WEAK_TOP_MATCH);

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          messageMetadata: ({ part }) => {
            if (part.type === "start") {
              return {
                sources, mode, canCreateRequest, question: query, confidence, minConfidence, escalation,
                isKnowledgeGap,
              };
            }
            return undefined;
          },
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const { data: existing } = await supabase
                .from("messages").select("id").eq("thread_id", threadId);
              const existingCount = existing?.length ?? 0;
              const newMessages = finalMessages.slice(existingCount);
              const toInsert = newMessages.map((m) => ({
                thread_id: threadId,
                user_id: userId,
                company_id: companyId,
                role: m.role as "user" | "assistant" | "system",
                content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 100000),
                parts: m.parts as never,
                sources: m.role === "assistant" ? (sources as unknown as never) : null,
                confidence: m.role === "assistant" ? confidence : null,
              }));
              let insertedAssistantId: string | null = null;
              if (toInsert.length) {
                const { data: insertedRows } = await supabase
                  .from("messages").insert(toInsert as never).select("id, role");
                const asst = (insertedRows as Array<{ id: string; role: string }> | null)
                  ?.filter((r) => r.role === "assistant").slice(-1)[0];
                insertedAssistantId = asst?.id ?? null;
              }

              const lastUserMsg = newMessages.find((m) => m.role === "user");
              const lastAsstMsg = newMessages.find((m) => m.role === "assistant");
              if (lastUserMsg) {
                const q = lastUserMsg.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
                const a = lastAsstMsg?.parts.map((p) => (p.type === "text" ? p.text : "")).join("") ?? "";
                await supabase.from("audit_log").insert({
                  user_id: userId, company_id: companyId, thread_id: threadId,
                  question: q.slice(0, 2000), answer_preview: a.slice(0, 500),
                  sources: sources as unknown as never,
                });

                // -------- Knowledge Gap lifecycle --------
                if (isKnowledgeGap && q.trim().length > 4) {
                  const norm = normalizeQuestion(q) || q.toLowerCase().slice(0, 500);
                  const embedLiteral = queryEmbedding ? `[${queryEmbedding.join(",")}]` : null;
                  let gapId: string | null = null;
                  try {
                    const { data: matched } = await supabase.rpc(
                      "match_knowledge_gap" as never,
                      {
                        _company_id: companyId,
                        _question: q.slice(0, 500),
                        _question_normalized: norm,
                        _embedding: embedLiteral,
                        _threshold: 0.82,
                      } as never,
                    ) as { data: string | null };
                    gapId = matched ?? null;
                  } catch (e) { console.error("[chat:gap] match_knowledge_gap failed", e); }

                  if (gapId) {
                    await supabase.from("knowledge_gaps")
                      .update({
                        occurrences: undefined as never, // bump via rpc-less increment below
                        last_seen: new Date().toISOString(),
                      } as never)
                      .eq("id", gapId);
                    // increment occurrences
                    const { data: cur } = await supabase
                      .from("knowledge_gaps").select("occurrences").eq("id", gapId).maybeSingle();
                    const occ = ((cur as { occurrences: number } | null)?.occurrences ?? 1) + 1;
                    await supabase.from("knowledge_gaps")
                      .update({ occurrences: occ, status: "open" } as never)
                      .eq("id", gapId)
                      .in("status", ["open", "in_progress"]);
                  } else {
                    const { data: ins } = await supabase.from("knowledge_gaps").insert({
                      company_id: companyId,
                      question_normalized: norm,
                      question_sample: q.slice(0, 500),
                      department_id: userDeptId ?? null,
                      created_by: userId,
                      confidence: confidence || null,
                      source_thread_id: threadId,
                      source_message_id: insertedAssistantId,
                      embedding: embedLiteral,
                      status: "open",
                    } as never).select("id").maybeSingle();
                    gapId = (ins as { id: string } | null)?.id ?? null;

                    if (gapId) {
                      const { data: targets } = await supabase
                        .from("user_roles").select("user_id, role")
                        .eq("company_id", companyId).in("role", ["admin", "manager"]);
                      const uniq = Array.from(new Set((targets ?? []).map((t) => t.user_id)));
                      if (uniq.length) {
                        await supabase.from("notifications").insert(uniq.map((uid) => ({
                          company_id: companyId, user_id: uid, kind: "new_gap" as const,
                          title: "New knowledge gap detected",
                          body: q.slice(0, 200),
                          link: `/app/admin/knowledge-gaps?gap=${gapId}`,
                          payload: { question: q.slice(0, 500), gap_id: gapId, confidence } as never,
                        })) as never);
                      }
                    }
                  }
                }

                // Low confidence notification (separate from gap, for audit review)
                if (mode !== "gap" && confidence > 0 && confidence < minConfidence) {
                  const { data: targets } = await supabase
                    .from("user_roles").select("user_id")
                    .eq("company_id", companyId).in("role", ["admin", "manager"]);
                  const uniq = Array.from(new Set((targets ?? []).map((t) => t.user_id)));
                  if (uniq.length) {
                    await supabase.from("notifications").insert(uniq.map((uid) => ({
                      company_id: companyId, user_id: uid, kind: "low_confidence" as const,
                      title: "Low-confidence answer",
                      body: `"${q.slice(0, 160)}" (confidence ${(confidence * 100).toFixed(0)}%)`,
                      link: `/app/admin/knowledge-gaps`,
                      payload: { confidence, question: q.slice(0, 500) } as never,
                    })) as never);
                  }
                }
              }


              if (thread.title === "New conversation" || thread.title === "Neue Unterhaltung" || thread.title === "Conversație nouă") {
                const firstUserText = finalMessages.find((m) => m.role === "user")
                  ?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").slice(0, 80);
                if (firstUserText) {
                  await supabase.from("threads")
                    .update({ title: firstUserText, updated_at: new Date().toISOString() }).eq("id", threadId);
                }
              } else {
                await supabase.from("threads")
                  .update({ updated_at: new Date().toISOString() }).eq("id", threadId);
              }
            } catch (e) {
              console.error("persist messages failed", e);
            }
            timer.summary({ mode, sources: sources.length });
          },
        });

      },
    },
  },
});
