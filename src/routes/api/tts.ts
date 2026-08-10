import { createFileRoute } from "@tanstack/react-router";

/**
 * Public TTS proxy → the central AI provider's speech endpoint.
 * The provider (Cloud gateway or a local engine) is resolved centrally;
 * this route never names a model, a host or an API key. When the active
 * engine has no speech capability (local Ollama), it answers 501 — it
 * NEVER falls back to a cloud provider.
 * Body: { text: string, lang: "en" | "de" }
 * Returns: audio/mpeg (mp3) so the browser can cache it and play with <audio>.
 *
 * Rate limited per-IP to protect paid AI credits from unauthenticated abuse
 * (same in-memory pattern as /api/chat).
 */

// Per-IP token bucket: 20 requests / 10 minutes.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? "unknown";
}

function rateLimit(ip: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfter: 0 };
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { resolveTTSOrNull, activeAiProviderLabel } = await import(
          "@/lib/ai-provider.server"
        );
        const tts = resolveTTSOrNull();
        if (!tts) {
          return new Response(
            JSON.stringify({
              error: "text_to_speech_unsupported",
              provider: activeAiProviderLabel(),
              message:
                "Text-to-speech is not available on the active AI engine. " +
                "No external AI provider is contacted.",
            }),
            { status: 501, headers: { "Content-Type": "application/json" } },
          );
        }

        const ip = getClientIp(request);
        const rl = rateLimit(ip);
        if (!rl.ok) {
          return new Response("Too many requests", {
            status: 429,
            headers: { "Retry-After": String(rl.retryAfter) },
          });
        }

        let payload: { text?: string; lang?: string };
        try {
          payload = await request.json();
        } catch {
          return new Response("bad json", { status: 400 });
        }
        const text = (payload.text ?? "").trim();
        if (!text || text.length > 4000) return new Response("bad text", { status: 400 });
        const lang = payload.lang === "de" ? "de" : "en";
        const voice = "alloy";
        const instructions =
          lang === "de"
            ? "Ruhig, souverän und premium. Sprich langsam, warm und vertrauenswürdig, wie eine Enterprise-Produktnarration von Apple oder Stripe. Kurze Pausen zwischen Sätzen."
            : "Calm, confident, premium. Speak slowly, warm and trustworthy, like an enterprise product narration from Apple or Stripe. Short pauses between sentences.";
        const res = await fetch(tts.url, {
          method: "POST",
          headers: tts.headers,
          body: JSON.stringify({
            ...(tts.modelInPath ? {} : { model: tts.model }),
            input: text,
            voice,
            instructions,
            response_format: "mp3",
            speed: 0.95,
          }),
        });
        if (!res.ok) {
          const upstream = await res.text().catch(() => "");
          console.error("[tts] upstream failure", { status: res.status, upstream });
          return new Response("tts failed", { status: 502 });
        }
        return new Response(res.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
