/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { generatePptx } from "@/lib/generators/pptx.server";
import { generateXlsx } from "@/lib/generators/xlsx.server";
import { generateDocx } from "@/lib/generators/docx.server";
import { generatePdf } from "@/lib/generators/pdf.server";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "workspace-temp";
const MAX_CONTEXT_PER_FILE = 18_000;

const SYSTEM_PROMPT = (filesBlock: string, retention: string) => `You are OPSQAI Workspace — an AI Operations Assistant that helps managers analyse, compare and generate temporary business documents during this session.

CORE RULES — non-negotiable:
1. The files in "SESSION FILES" below are TEMPORARY. They are NEVER part of the company knowledge base, NEVER searchable, and will be auto-deleted (retention: ${retention}).
2. NEVER claim the files are stored permanently or learned from. They live only in this conversation.
3. Use ONLY the SESSION FILES and the user's instructions. Do not invent facts that are not in the files.
4. When the user asks for a presentation, spreadsheet, report, Word document or PDF, call the appropriate tool (generate_pptx, generate_xlsx, generate_docx, generate_pdf). Build complete, professional content — proper titles, structured bullets, speaker notes, headers — based on the uploaded files. After the tool returns, briefly tell the user what you created and reference the download link they will see below the message.
5. Detect the user's language (English, German, Romanian) and answer in that language.
6. Keep prose concise. Prefer bullet lists, tables and clear structure.
7. If asked for analysis (summary, comparison, KPIs, risks, action items, non-conformities), answer directly in the chat — do not call a generator unless explicitly asked for a downloadable document.

SESSION FILES:
${filesBlock || "(no files uploaded yet)"}`;

export const Route = createFileRoute("/api/workspace-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY;
        const supaUrl = process.env.SUPABASE_URL;
        const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !supaUrl || !supaKey) return new Response("Server misconfigured", { status: 500 });

        const supabase = createClient<Database>(supaUrl, supaKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims.sub) return new Response("Unauthorized", { status: 401 });
        const userId = claims.claims.sub;

        const body = (await request.json()) as {
          messages?: UIMessage[]; sessionId?: string; language?: string;
        };
        const messages = body.messages ?? [];
        const sessionId = body.sessionId;
        const langHint = body.language ?? "en";
        if (!sessionId) return new Response("sessionId required", { status: 400 });

        const { data: session } = await supabase
          .from("workspace_sessions" as never)
          .select("id, company_id, user_id, title")
          .eq("id", sessionId).maybeSingle() as unknown as { data: { id: string; company_id: string; user_id: string; title: string } | null };
        if (!session || session.user_id !== userId) {
          return new Response("Session not found", { status: 404 });
        }
        const companyId = session.company_id;

        const { data: company } = await supabase
          .from("companies").select("workspace_retention").eq("id", companyId).maybeSingle() as unknown as { data: { workspace_retention: string } | null };
        const retention = company?.workspace_retention ?? "immediate";

        const { data: files } = await supabase
          .from("workspace_files" as never)
          .select("id, file_name, mime, extracted_text")
          .eq("session_id", sessionId).order("created_at") as unknown as {
            data: Array<{ id: string; file_name: string; mime: string | null; extracted_text: string | null }> | null;
          };
        const filesBlock = (files ?? []).map((f, i) => {
          const txt = (f.extracted_text ?? "").slice(0, MAX_CONTEXT_PER_FILE);
          return `=== File ${i + 1}: ${f.file_name} (${f.mime ?? "?"}) ===\n${txt}`;
        }).join("\n\n");

        const expiryForArtifact = (): string | null => {
          const now = Date.now();
          switch (retention) {
            case "immediate": return new Date(now + 30 * 60 * 1000).toISOString();
            case "1h": return new Date(now + 60 * 60 * 1000).toISOString();
            case "24h": return new Date(now + 24 * 60 * 60 * 1000).toISOString();
            case "7d": return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
            default: return null;
          }
        };

        async function saveArtifact(
          kind: "pptx" | "xlsx" | "docx" | "pdf",
          bytes: Uint8Array,
          baseName: string,
          contentType: string,
        ) {
          const safe = baseName.replace(/[^\w.\-]+/g, "_").slice(0, 80) || `artifact.${kind}`;
          const finalName = safe.endsWith(`.${kind}`) ? safe : `${safe}.${kind}`;
          const path = `${companyId}/${sessionId}/${crypto.randomUUID()}-${finalName}`;
          const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
            contentType, upsert: false,
          });
          if (up.error) throw new Error(up.error.message);
          const expires = expiryForArtifact();
          const ins = await supabase.from("workspace_artifacts" as never).insert({
            session_id: sessionId, company_id: companyId, user_id: userId,
            kind, file_name: finalName, storage_path: path, expires_at: expires,
          } as never).select("id").single() as unknown as { data: { id: string } | null; error: { message: string } | null };
          if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "insert failed");
          const signed = await supabase.storage.from(BUCKET)
            .createSignedUrl(path, 60 * 10, { download: finalName });
          return {
            artifact_id: ins.data.id,
            file_name: finalName,
            kind,
            download_url: signed.data?.signedUrl ?? null,
            expires_at: expires,
          };
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT(filesBlock, retention) + `\n\nLanguage hint: ${langHint}`,
          messages: await convertToModelMessages(messages),
          tools: {
            generate_pptx: tool({
              description: "Generate a downloadable PowerPoint (.pptx) presentation. Provide a title, optional subtitle, and an array of slides with title/subtitle/bullets/notes.",
              inputSchema: z.object({
                title: z.string().min(1).max(200),
                subtitle: z.string().max(200).optional(),
                theme: z.enum(["light", "dark", "corporate"]).optional(),
                file_name: z.string().max(80).optional(),
                slides: z.array(z.object({
                  title: z.string().max(200).optional(),
                  subtitle: z.string().max(200).optional(),
                  bullets: z.array(z.string().max(400)).max(12).optional(),
                  notes: z.string().max(2000).optional(),
                })).min(1).max(40),
              }),
              execute: async (input) => {
                const bytes = await generatePptx(input);
                return await saveArtifact(
                  "pptx", bytes,
                  input.file_name ?? input.title,
                  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                );
              },
            }),
            generate_xlsx: tool({
              description: "Generate a downloadable Excel (.xlsx) workbook. Provide one or more sheets with headers and rows.",
              inputSchema: z.object({
                title: z.string().max(200).optional(),
                file_name: z.string().max(80).optional(),
                sheets: z.array(z.object({
                  name: z.string().min(1).max(31),
                  headers: z.array(z.string().max(80)).max(40),
                  rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).max(40)).max(2000),
                })).min(1).max(12),
              }),
              execute: async (input) => {
                const bytes = await generateXlsx(input);
                return await saveArtifact(
                  "xlsx", bytes,
                  input.file_name ?? input.title ?? "workbook",
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                );
              },
            }),
            generate_docx: tool({
              description: "Generate a downloadable Word (.docx) document with headings, paragraphs, bullet lists, numbered lists, and tables.",
              inputSchema: z.object({
                title: z.string().min(1).max(200),
                subtitle: z.string().max(200).optional(),
                file_name: z.string().max(80).optional(),
                blocks: z.array(z.union([
                  z.object({ type: z.enum(["h1", "h2", "h3", "p"]), text: z.string().max(4000) }),
                  z.object({ type: z.literal("bullets"), items: z.array(z.string().max(800)).max(60) }),
                  z.object({ type: z.literal("numbered"), items: z.array(z.string().max(800)).max(60) }),
                  z.object({
                    type: z.literal("table"),
                    headers: z.array(z.string().max(120)).max(12),
                    rows: z.array(z.array(z.string().max(800)).max(12)).max(200),
                  }),
                ])).min(1).max(200),
              }),
              execute: async (input) => {
                const bytes = await generateDocx(input);
                return await saveArtifact(
                  "docx", bytes,
                  input.file_name ?? input.title,
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                );
              },
            }),
            generate_pdf: tool({
              description: "Generate a downloadable PDF report. Provide a title, optional subtitle, and sections (heading + paragraphs).",
              inputSchema: z.object({
                title: z.string().min(1).max(200),
                subtitle: z.string().max(200).optional(),
                file_name: z.string().max(80).optional(),
                sections: z.array(z.object({
                  heading: z.string().max(200).optional(),
                  paragraphs: z.array(z.string().max(4000)).max(40),
                })).min(1).max(80),
              }),
              execute: async (input) => {
                const bytes = await generatePdf(input);
                return await saveArtifact(
                  "pdf", bytes,
                  input.file_name ?? input.title,
                  "application/pdf",
                );
              },
            }),
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ messages: finalMessages }) => {
            try {
              const { data: existing } = await supabase
                .from("workspace_messages" as never)
                .select("id")
                .eq("session_id", sessionId) as unknown as { data: Array<{ id: string }> | null };
              const startAt = existing?.length ?? 0;
              const newMessages = finalMessages.slice(startAt);
              const toInsert = newMessages.map((m) => ({
                session_id: sessionId,
                company_id: companyId,
                user_id: userId,
                role: m.role,
                content: m.parts.map((p: any) => (p.type === "text" ? p.text : "")).join("").slice(0, 100000),
                parts: m.parts as never,
              }));
              if (toInsert.length) {
                await supabase.from("workspace_messages" as never).insert(toInsert as never);
              }
              await supabase.from("workspace_sessions" as never)
                .update({ updated_at: new Date().toISOString() } as never).eq("id", sessionId);

              // Audit only metadata; never store document contents
              const lastUser = newMessages.find((m) => m.role === "user");
              if (lastUser) {
                await supabase.from("audit_log").insert({
                  user_id: userId,
                  company_id: companyId,
                  thread_id: null,
                  question: `[workspace] ${lastUser.parts.map((p: any) => (p.type === "text" ? p.text : "")).join("").slice(0, 500)}`,
                  answer_preview: "[workspace session — content not stored]",
                  sources: null,
                });
              }
            } catch (e) {
              console.error("workspace persist failed", e);
            }
          },
        });
      },
    },
  },
});
