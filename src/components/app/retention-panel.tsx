import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getPrivacyRetention, setPrivacyRetention } from "@/lib/privacy.functions";

/** GDPR retention of AI chat history — Self-Hosted admins. */
export function RetentionPanel({ lang }: { lang: string }) {
  const get = useServerFn(getPrivacyRetention);
  const set = useServerFn(setPrivacyRetention);
  const [days, setDays] = useState("");
  const [last, setLast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const T =
    lang === "de"
      ? { t: "Aufbewahrung des KI-Chatverlaufs", d: "Gespräche, die länger als diese Anzahl Tage inaktiv sind, werden automatisch gelöscht. Leer = unbegrenzt.", s: "Speichern", l: "Letzte Bereinigung" }
      : lang === "en"
        ? { t: "AI chat history retention", d: "Conversations inactive for longer than this many days are deleted automatically. Empty = keep forever.", s: "Save", l: "Last purge" }
        : { t: "Retenția istoricului AI Chat", d: "Conversațiile inactive de mai mult de atâtea zile se șterg automat. Gol = păstrare nelimitată.", s: "Salvează", l: "Ultima curățare" };

  useEffect(() => {
    get()
      .then((r) => {
        setDays(r.chatRetentionDays ? String(r.chatRetentionDays) : "");
        setLast(r.lastPurgeAt);
      })
      .catch(() => undefined);
  }, [get]);

  const save = async () => {
    const n = days.trim() ? Number(days) : null;
    if (n !== null && (!Number.isInteger(n) || n < 7 || n > 3650)) {
      toast.error("7 – 3650");
      return;
    }
    setBusy(true);
    try {
      const r = await set({ data: { days: n } });
      setLast(r.lastPurgeAt);
      toast.success(T.s + " ✓");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel>
      <div className="space-y-2">
        <h3 className="font-semibold">{T.t}</h3>
        <p className="text-sm text-muted-foreground">{T.d}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" min={7} max={3650} className="w-32" value={days} onChange={(e) => setDays(e.target.value)} placeholder="90" />
          <Button size="sm" onClick={save} disabled={busy}>{T.s}</Button>
          {last && <span className="text-xs text-muted-foreground">{T.l}: {new Date(last).toLocaleString()}</span>}
        </div>
      </div>
    </Panel>
  );
}
