import { createFileRoute } from "@tanstack/react-router";

/**
 * Public TTS proxy → Lovable AI Gateway (openai/gpt-4o-mini-tts).
 * Body: { text: string, lang: "en" | "de" }
 * Returns: audio/mpeg (mp3) so the browser can cache it and play with <audio>.
 */
export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI disabled", { status: 503 });
        let payload: { text?: string; lang?: string };
        try { payload = await request.json(); } catch { return new Response("bad json", { status: 400 }); }
        const text = (payload.text ?? "").trim();
        if (!text || text.length > 4000) return new Response("bad text", { status: 400 });
        const lang = payload.lang === "de" ? "de" : "en";
        const voice = "alloy";
        const instructions = lang === "de"
          ? "Ruhig, souverän und premium. Sprich langsam, warm und vertrauenswürdig, wie eine Enterprise-SaaS-Produktnarration von Apple oder Stripe. Kurze Pausen zwischen Sätzen."
          : "Calm, confident, premium. Speak slowly, warm and trustworthy, like an enterprise SaaS product narration from Apple or Stripe. Short pauses between sentences.";
        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice,
            instructions,
            response_format: "mp3",
            speed: 0.95,
          }),
        });
        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          return new Response(msg || "tts failed", { status: res.status });
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
