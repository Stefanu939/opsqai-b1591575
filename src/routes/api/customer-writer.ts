/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";

const ACTIONS = {
  generate: "Write a new high-quality enterprise document based on the brief.",
  rewrite: "Rewrite the provided text to improve clarity and professionalism. Keep meaning and structure.",
  simplify: "Simplify the language. Short sentences, plain words. Keep all facts.",
  technical: "Make the text more technical, precise and architecture-oriented.",
  executive: "Rewrite for a C-level executive audience: outcomes, ROI, risk, decisions.",
  automotive: "Adapt tone, examples and terminology for the automotive industry.",
  healthcare: "Adapt tone, examples and terminology for the healthcare industry. Note relevant compliance.",
  manufacturing: "Adapt tone, examples and terminology for manufacturing operations.",
  retail: "Adapt tone, examples and terminology for retail and store operations.",
  translate: "Translate the text into the requested target language. Preserve markdown.",
  format: "Improve markdown formatting: headings, tables, bullet hierarchy. Do not change facts.",
} as const;

type Action = keyof typeof ACTIONS;

export const Route = createFileRoute("/api/customer-writer")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace("Bearer ", "");
          if (!token) return new Response("Unauthorized", { status: 401 });
          const apiKey = process.env.LOVABLE_API_KEY;
          const supaUrl = process.env.SUPABASE_URL;
          const supaKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!apiKey || !supaUrl || !supaKey) return new Response("Server misconfigured", { status: 500 });

          const supabase = createClient(supaUrl, supaKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          });
          const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
          if (claimsErr || !claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

          const { data: isAdmin } = await (supabase as any).rpc("is_platform_admin");
          if (!isAdmin) return new Response("Forbidden", { status: 403 });

          const body = await request.json() as {
            action: Action; company_id: string; text?: string; brief?: string; target_language?: string;
          };
          const action = body.action;
          if (!ACTIONS[action]) return new Response("Invalid action", { status: 400 });
          if (!body.company_id) return new Response("company_id required", { status: 400 });

          const { loadCustomerContextForAi } = await import("@/lib/customers.functions");
          const ctx = await loadCustomerContextForAi(body.company_id);

          const system = `You are the OPSQAI Enterprise Writing Assistant. You produce clean, professional, customer-ready markdown for a SaaS sales/CS team.

Rules:
- Always output valid markdown only. No code fences, no preamble, no apology.
- Never invent facts that contradict the CUSTOMER PROFILE below.
- If information is missing, write a clear placeholder like "[to be confirmed]" rather than guessing.
- Preserve technical terms verbatim; translate only when the action is "translate".
- Keep tables well-formed (| header | header |).

CUSTOMER PROFILE:
${ctx._systemBlock || "(no profile data yet)"}`;

          const userPrompt =
            action === "generate"
              ? `Task: ${ACTIONS[action]}\nBrief:\n${body.brief ?? ""}`
              : action === "translate"
                ? `Task: ${ACTIONS[action]}\nTarget language: ${body.target_language ?? "English"}\nSource:\n${body.text ?? ""}`
                : `Task: ${ACTIONS[action]}\nSource:\n${body.text ?? ""}`;

          const gateway = createLovableAiGatewayProvider(apiKey);
          const result = await generateText({
            model: gateway(MODEL),
            system,
            prompt: userPrompt,
            temperature: 0.3,
          });
          return new Response(JSON.stringify({ markdown: result.text }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("[customer-writer]", e);
          return new Response(JSON.stringify({ error: "Writer failed" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
