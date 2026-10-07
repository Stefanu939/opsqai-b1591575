import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Kai's neural "JARVIS-style" voice (Management Center staff only, Cloud only).
// Streams 24 kHz PCM over SSE from the AI Gateway speech endpoint.


export const Route = createFileRoute("/api/kai-voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (process.env["OPSQAI_MODE"] === "selfhost") return new Response("Not found", { status: 404 });
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Server misconfigured", { status: 500 });
        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims } = await supabase.auth.getClaims(token);
        const userId = claims?.claims.sub;
        if (!userId) return new Response("Unauthorized", { status: 401 });
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        const staff = (roles ?? []).some((r) => ["platform_admin", "platform_owner", "superadmin"].includes(r.role));
        if (!staff) return new Response("Forbidden", { status: 403 });

        let text = "";
        try {
          text = String(((await request.json()) as { text?: string }).text ?? "").trim();
        } catch {
          return new Response("bad json", { status: 400 });
        }
        if (!text || text.length > 1500) return new Response("bad text", { status: 400 });

        const { streamNeuralSpeech } = await import("@/lib/ai-provider.server");
        let upstream: Response;
        try {
          upstream = await streamNeuralSpeech(text, request.signal);
        } catch (e) {
          console.error("[kai-voice]", e);
          return new Response(JSON.stringify({ error: "voice_unavailable" }), { status: 501, headers: { "Content-Type": "application/json" } });
        }
        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          console.error("[kai-voice]", upstream.status, detail.slice(0, 300));
          return new Response(JSON.stringify({ error: "voice_failed", status: upstream.status }), {
            status: upstream.status === 402 || upstream.status === 429 ? upstream.status : 502,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
