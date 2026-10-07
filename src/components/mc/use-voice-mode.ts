// Hands-free voice mode for Kai (turn-based).
// Listening and pause detection run in the browser (no cost). Speech output
// uses Kai's neural "JARVIS" voice; the device voice is only a fallback.
import { useCallback, useEffect, useRef, useState } from "react";
import { speakNeural, unlockAudio } from "@/components/mc/neural-speech";

export type VoiceState = "off" | "listening" | "thinking" | "speaking";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = any;

const END_WORDS = /\b(inchide|închide|stop convorbire|la revedere|gata convorbirea)\b/i;

function cleanForSpeech(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[(DB|ANAF|Web|Estimare|Document \d+|FAQ \d+)\]/gi, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[*_#>`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export function voiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean((w.SpeechRecognition || w.webkitSpeechRecognition) && window.speechSynthesis);
}

export function useVoiceMode(onUtterance: (text: string) => void) {
  const [state, setState] = useState<VoiceState>("off");
  const [interim, setInterim] = useState("");
  const recRef = useRef<Rec>(null);
  const audioRef = useRef<AbortController | null>(null);
  const stateRef = useRef<VoiceState>("off");
  const cbRef = useRef(onUtterance);
  cbRef.current = onUtterance;

  const set = (s: VoiceState) => {
    stateRef.current = s;
    setState(s);
  };

  const listen = useCallback(() => {
    if (stateRef.current === "off") return;
    const w = window as unknown as Record<string, new () => Rec>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    try {
      recRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    const rec = new Ctor();
    rec.lang = "ro-RO";
    rec.interimResults = true;
    rec.continuous = false; // ends automatically after a pause
    let finalText = "";
    rec.onresult = (e: Rec) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else partial += r[0].transcript;
      }
      setInterim((finalText + " " + partial).trim());
    };
    rec.onerror = () => {
      /* onend handles restart */
    };
    rec.onend = () => {
      if (stateRef.current !== "listening") return;
      const t = finalText.trim();
      setInterim("");
      if (!t) {
        setTimeout(listen, 250); // silence → keep listening
        return;
      }
      if (END_WORDS.test(t)) {
        stop();
        return;
      }
      set("thinking");
      cbRef.current(t);
    };
    recRef.current = rec;
    set("listening");
    try {
      rec.start();
    } catch {
      setTimeout(listen, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakDevice = (clean: string) => {
    const synth = window.speechSynthesis;
    if (!synth) return listen();
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "ro-RO";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("ro"));
    if (voice) u.voice = voice;
    u.rate = 1.0;
    u.onend = () => {
      if (stateRef.current === "speaking") listen();
    };
    u.onerror = u.onend;
    synth.speak(u);
  };

  const speak = useCallback(
    (text: string) => {
      if (stateRef.current === "off") return;
      const clean = cleanForSpeech(text);
      if (!clean) return listen();
      audioRef.current?.abort();
      const ctrl = new AbortController();
      audioRef.current = ctrl;
      set("speaking");
      speakNeural(clean, ctrl.signal)
        .then(() => {
          if (!ctrl.signal.aborted && stateRef.current === "speaking") listen();
        })
        .catch(() => {
          if (ctrl.signal.aborted || stateRef.current !== "speaking") return;
          speakDevice(clean); // neural voice unavailable → device voice
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listen],
  );

  const stop = useCallback(() => {
    stateRef.current = "off";
    setState("off");
    setInterim("");
    try {
      recRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    audioRef.current?.abort();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const start = useCallback(() => {
    window.speechSynthesis?.getVoices(); // warm up voice list
    unlockAudio(); // must happen inside the tap for mobile browsers
    stateRef.current = "listening";
    listen();
  }, [listen]);

  /** Tap while Kai talks: interrupt and listen right away. */
  const interrupt = useCallback(() => {
    if (stateRef.current !== "speaking") return;
    audioRef.current?.abort();
    window.speechSynthesis?.cancel();
    stateRef.current = "listening";
    listen();
  }, [listen]);

  useEffect(() => stop, [stop]);

  return { state, interim, start, stop, speak, interrupt, listen };
}
