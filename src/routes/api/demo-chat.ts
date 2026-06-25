import { createFileRoute } from "@tanstack/react-router";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

// Tiny inline public demo KB. Intentionally narrow — demo only.
const DEMO_KB = `[SOP-INB-01 · Inbound Receiving]
Trucks must check in at the gate. Receiving must be completed within 90 minutes of dock assignment. If receiving exceeds 60 minutes, the team leader must be informed. If receiving exceeds 90 minutes, the warehouse manager must be notified.

[SOP-INB-02 · Damaged Goods]
If a parcel is visibly damaged on arrival, the receiver photographs the damage, marks the CMR with "received under reserve", and creates a damage report in the WMS within 2 hours. Damaged stock is moved to the QC quarantine area, never to standard putaway.

[SOP-SAFE-01 · PPE in Warehouse]
Personal protective equipment in all warehouse areas: safety shoes (mandatory), high-visibility vest (mandatory), and safety gloves when handling sharp packaging. Hearing protection is mandatory in zones marked above 80 dB. Hard hats are required in racking maintenance zones only.

[SOP-EQP-01 · Forklift Inspections]
Forklift operators perform a pre-shift check (brakes, horn, lights, forks, hydraulics, tires). If any check fails, the operator must immediately notify the shift team leader and tag the forklift out of service. The team leader notifies the maintenance supervisor.

[SOP-OUT-01 · Outbound Loading]
Outbound loads are double-checked: pick list vs physical pallet count. The loader signs the loading sheet; the driver signs the CMR. Discrepancies are escalated to the outbound team leader before the truck leaves the yard.`;

const REFUSAL = {
  en: "I could not find that in the demo knowledge base. This is a small public demo — your real OPSQAI tenant uses your own SOPs and FAQs.",
  de: "Ich konnte das in der Demo-Wissensdatenbank nicht finden. Dies ist eine kleine öffentliche Demo — Ihre echte OPSQAI-Umgebung nutzt Ihre eigenen SOPs und FAQs.",
  ro: "Nu am găsit asta în baza de cunoștințe demo. Aceasta este o demonstrație publică redusă — instanța dvs. OPSQAI reală folosește propriile SOP-uri și FAQ-uri.",
};

const PROMPT = `You are OPSQAI, a friendly source-grounded knowledge assistant for logistics operations. You are running in a PUBLIC DEMO.

ABSOLUTE RULES:
1. Use ONLY the DEMO KNOWLEDGE block below. No outside knowledge, no inference, no general logistics knowledge.
2. Detect the user's language (English, German, or Romanian) and answer in that language.
3. Be concise (1–4 short sentences) and end with a "Sources:" line listing the [SOP-CODE].
4. If the answer is NOT clearly in the DEMO KNOWLEDGE, reply with EXACTLY this sentence in the user's language and nothing else:
   - EN: "${REFUSAL.en}"
   - DE: "${REFUSAL.de}"
   - RO: "${REFUSAL.ro}"
5. Greet briefly if the user only greets — no "Sources:" needed.

DEMO KNOWLEDGE:
${DEMO_KB}`;

// In-memory IP rate limiter: 10 requests per 10 minutes. Worker instances are
// short-lived; this is best-effort spam protection, not security.
const BUCKET = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 10;

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const arr = (BUCKET.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) { BUCKET.set(ip, arr); return false; }
  arr.push(now);
  BUCKET.set(ip, arr);
  return true;
}

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).min(1).max(20),
});

export const Route = createFileRoute("/api/demo-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
        if (!rateLimitOk(ip)) {
          return new Response("Rate limit reached. Please try again in a few minutes.", { status: 429 });
        }

        let body: unknown;
        try { body = await request.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
        const parsed = BodySchema.safeParse(body);
        if (!parsed.success) return new Response("Invalid body", { status: 400 });

        const userTurns = parsed.data.messages.filter((m) => m.role === "user").length;
        if (userTurns > 8) return new Response("Demo conversation limit reached.", { status: 429 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Demo unavailable.", { status: 503 });

        const provider = createLovableAiGatewayProvider(apiKey);
        try {
          const result = await generateText({
            model: provider("openai/gpt-5-mini"),
            system: PROMPT,
            messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
            maxRetries: 1,
          });
          return Response.json({ reply: result.text });
        } catch (e) {
          return new Response(`AI gateway error: ${e instanceof Error ? e.message : "unknown"}`, { status: 502 });
        }
      },
    },
  },
});
