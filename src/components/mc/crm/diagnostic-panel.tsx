import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, ExternalLink, Mail, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { downloadBase64 } from "@/components/app/transport/download";
import { composeEmailUrl, STRATO_WEBMAIL_URL } from "@/lib/mc-outreach";
import { useSenderSettings } from "@/hooks/use-sender-settings";
import {
  generateLeadDiagnostic,
  getDiagnosticStatus,
  renderDiagnosticPdf,
  sendDiagnosticEmail,
} from "@/lib/diagnostic.functions";

type Lead = { id: string; company_name: string; contact_name: string | null; email: string | null; notes: string | null };
type Activity = { subject: string | null; body: string | null; created_at: string | null };

/** Pulls the client's own words out of a diagnostic request note. */
function clientRequest(notes: string | null) {
  const n = notes ?? "";
  const role = n.match(/Funcție:\s*(.+)/)?.[1]?.trim() ?? "";
  const message = n.includes("[DIAGNOSTIC]") ? n.split(/\n\s*\n/).slice(1).join("\n\n").trim() : n.trim();
  return { role: role === "-" ? "" : role, message };
}

export function DiagnosticPanel({ lead, activities, sender, onChange }: { lead: Lead; activities: Activity[]; sender: string; onChange: () => void }) {
  const gen = useServerFn(generateLeadDiagnostic);
  const pdf = useServerFn(renderDiagnosticPdf);
  const send = useServerFn(sendDiagnosticEmail);
  const statusFn = useServerFn(getDiagnosticStatus);
  const { settings } = useSenderSettings();
  const { data: status } = useQuery({ queryKey: ["diagnostic-status"], queryFn: () => statusFn() });

  const saved = activities.find((a) => a.subject === "Diagnostic operațional AI");
  const req = clientRequest(lead.notes);
  const [message, setMessage] = useState(req.message);
  const [text, setText] = useState(saved?.body ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (saved?.body && !text) setText(saved.body); }, [saved?.body]); // eslint-disable-line react-hooks/exhaustive-deps

  const first = (lead.contact_name ?? "").split(/\s+/)[0];
  const subject = `Diagnostic operațional OPSQAI — ${lead.company_name}`;
  const body = `Bună ziua${first ? ` ${first}` : ""},\n\nVă mulțumim pentru descrierea procesului. Mai jos găsiți diagnosticul nostru operațional (PDF atașat):\n\n${text.replace(/^##\s*/gm, "")}\n\nPutem discuta pașii în 20 de minute, când vă este comod.\n\n${sender}\nOPSQAI · opsqai.de`;

  const run = async (k: string, fn: () => Promise<void>) => {
    setBusy(k);
    try { await fn(); } catch (e) { toast.error(e instanceof Error ? e.message : "Eroare"); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          Nevoia clientului {req.role && <Badge variant="outline" className="text-[10px]">{req.role}</Badge>}
        </div>
        <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mesajul clientului…" />
      </div>
      <Button size="sm" disabled={busy !== null || message.trim().length < 10}
        onClick={() => run("gen", async () => {
          const r = await gen({ data: { id: lead.id, message, role: req.role || null } } as never);
          setText(r.text); toast.success("Diagnostic generat și salvat în istoric"); onChange();
        })}>
        <Sparkles className="mr-1 h-4 w-4" /> {busy === "gen" ? "Se analizează…" : text ? "Regenerează diagnosticul" : "Generează diagnostic AI"}
      </Button>

      {text && (
        <>
          <Textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy !== null}
              onClick={() => run("pdf", async () => {
                const f = await pdf({ data: { id: lead.id, text } } as never);
                downloadBase64(f.filename, f.base64);
              })}>
              <Download className="mr-1 h-4 w-4" /> Export PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(composeEmailUrl(settings.email_provider, settings.sender_email, lead.email, subject, body), "_blank")}>
              <Mail className="mr-1 h-4 w-4" /> Deschide în aplicația de mail
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => { void navigator.clipboard?.writeText(body).catch(() => {}); window.open(STRATO_WEBMAIL_URL, "_blank"); toast.info("Textul e copiat — lipește-l în Strato Webmail."); }}>
              <ExternalLink className="mr-1 h-4 w-4" /> Strato Webmail
            </Button>
            <Button size="sm" disabled={busy !== null || !status?.strato || !lead.email}
              title={status?.strato ? `Trimite din ${status.from}` : "Configurează contul Strato pentru trimitere directă"}
              onClick={() => run("send", async () => {
                await send({ data: { id: lead.id, to: lead.email!, subject, body, text } } as never);
                toast.success(`Trimis către ${lead.email}`); onChange();
              })}>
              <Send className="mr-1 h-4 w-4" /> {busy === "send" ? "Se trimite…" : "Trimite direct (Strato)"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {status?.strato
              ? `Trimitere directă din ${status.from}, cu PDF atașat. Trimitere automată la cererile noi: ${status.autoSend ? "pornită" : "oprită"}.`
              : "Trimiterea directă prin Strato nu e configurată încă — folosește aplicația de mail sau Strato Webmail."}
          </p>
        </>
      )}
    </div>
  );
}
