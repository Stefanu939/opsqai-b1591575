// Browser player for Kai's neural voice: streams 24 kHz PCM SSE and plays it in order.
import { createParser } from "eventsource-parser";
import { supabase } from "@/integrations/supabase/client";

function decodePCM(pending: Uint8Array, incoming: Uint8Array) {
  const bytes = new Uint8Array(pending.length + incoming.length);
  bytes.set(pending);
  bytes.set(incoming, pending.length);
  const usable = bytes.length - (bytes.length % 2);
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(usable / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return { samples, pending: bytes.slice(usable) };
}

let shared: AudioContext | null = null;
/** Create/resume the audio context inside a user gesture (mobile autoplay rules). */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  shared ??= new AudioContext({ sampleRate: 24000 });
  if (shared.state === "suspended") void shared.resume();
}

export async function speakNeural(text: string, signal: AbortSignal): Promise<void> {
  unlockAudio();
  const context = shared!;
  if (context.state === "suspended") await context.resume();
  const sources = new Set<AudioBufferSourceNode>();
  const stopAll = () => sources.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
  signal.addEventListener("abort", stopAll, { once: true });
  let playhead = 0;
  let pending = new Uint8Array(0);
  let completed = false;
  let played = 0;
  let playback: Promise<void> = Promise.resolve();
  try {
    const { data } = await supabase.auth.getSession();
    const res = await fetch("/api/kai-voice", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`voice ${res.status}`);
    const parser = createParser({
      onEvent(event) {
        const p = JSON.parse(event.data) as { type: string; audio?: string; error?: unknown };
        if (p.type === "error" || p.error) throw new Error("voice stream error");
        if (p.type === "speech.audio.done") { completed = true; return; }
        if (p.type !== "speech.audio.delta" || !p.audio) return;
        const d = decodePCM(pending, Uint8Array.from(atob(p.audio), (c) => c.charCodeAt(0)));
        pending = new Uint8Array(d.pending);
        if (!d.samples.length) return;
        played += d.samples.length;
        const buf = context.createBuffer(1, d.samples.length, 24000);
        buf.copyToChannel(d.samples, 0);
        const src = context.createBufferSource();
        src.buffer = buf;
        src.connect(context.destination);
        sources.add(src);
        playback = new Promise<void>((resolve) => { src.onended = () => { sources.delete(src); resolve(); }; });
        playhead = Math.max(playhead, context.currentTime + 0.05);
        src.start(playhead);
        playhead += buf.duration;
      },
    });
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      for (;;) {
        const n = await reader.read();
        if (n.done) break;
        parser.feed(n.value);
      }
    } finally {
      reader.releaseLock();
    }
    if (!completed || !played) throw new Error("incomplete voice stream");
    await playback;
  } finally {
    signal.removeEventListener("abort", stopAll);
    if (signal.aborted) stopAll();
  }
}
