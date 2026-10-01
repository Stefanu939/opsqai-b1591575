// Email Intelligence (Self-Hosted) — reads the configured team inbox,
// classifies messages against the company Knowledge Base and prepares
// grounded reply drafts. The employee reviews and sends from their own mail
// client; OPSQAI never sends email autonomously.

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Copy, MailOpen, ExternalLink, Check, X, Sparkles } from "lucide-react";
import { useT } from "@/i18n";
import {
  getEmailSettings,
  saveEmailSettings,
  testEmailInbox,
  syncEmailNow,
  listEmailMessages,
  getEmailMessage,
  setEmailMessageStatus,
  generateEmailDraft,
  updateEmailDraft,
  approveEmailDraft,
  discardEmailDraft,
} from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated/app/email")({
  head: () => ({
    meta: [{ title: "Email Intelligence — OPSQAI" }],
  }),
  component: EmailIntelligencePage,
});

const TXT = {
  ro: {
    eyebrow: "Microsoft 365",
    title: "Email Intelligence",
    desc: "Mesajele din inbox-ul echipei sunt clasificate după procedurile companiei și primești un răspuns propus, ancorat în Knowledge Base. Tu îl verifici și îl trimiți din clientul tău de email — OPSQAI nu trimite niciodată singur.",
    mailboxLabel: "Cutia poștală (shared inbox)",
    labelField: "Nume",
    enabled: "Sincronizare activă",
    poll: "Interval de verificare (minute)",
    test: "Testează accesul",
    saved: "Setările au fost salvate.",
    ok: "Accesul la cutie funcționează",
    syncNow: "Sincronizează acum",
    syncDone: "Mesaje importate: ",
    lastSync: "Ultima sincronizare",
    status: "Stare",
    open: "Deschise",
    handled: "Rezolvate",
    ignored: "Ignorate",
    all: "Toate",
    search: "Caută subiect, expeditor, conținut…",
    noMessages: "Niciun mesaj încă. Configurează inbox-ul și sincronizează.",
    needCfg: "Configurează întâi cutia poștală.",
    from: "De la",
    received: "Primit",
    attachments: "Atașamente",
    generate: "Generează răspuns (AI)",
    generating: "Se generează…",
    draft: "Răspuns propus",
    draftSaved: "Răspunsul a fost salvat.",
    approved: "Răspuns aprobat — trimite-l din clientul tău de email.",
    discarded: "Răspunsul a fost aruncat.",
    approve: "Aprobă pentru trimitere",
    discard: "Aruncă",
    copyDraft: "Copiază",
    openInMail: "Deschide în email",
    grounded: "Ancorat în Knowledge Base",
    notGrounded: "Fără bază documentată — trimite manual",
    sources: "Surse folosite",
    summary: "Rezumat",
    classification: "Clasificare",
    priority: "Prioritate",
    markHandled: "Marchează rezolvat",
    markIgnored: "Marchează ignorat",
    selectOne: "Selectează un mesaj pentru detalii și răspuns.",
    bodyUnavailable: "Conținutul complet se încarcă la prima deschidere.",
  },
  en: {
    eyebrow: "Microsoft 365",
    title: "Email Intelligence",
    desc: "Messages in the team inbox are classified against company procedures and a proposed reply is drafted, grounded in the Knowledge Base. You review and send it from your own mail client — OPSQAI never sends on its own.",
    mailboxLabel: "Mailbox (shared inbox)",
    labelField: "Name",
    enabled: "Sync enabled",
    poll: "Check interval (minutes)",
    test: "Test access",
    saved: "Settings saved.",
    ok: "Mailbox access works",
    syncNow: "Sync now",
    syncDone: "Messages imported: ",
    lastSync: "Last sync",
    status: "Status",
    open: "Open",
    handled: "Handled",
    ignored: "Ignored",
    all: "All",
    search: "Search subject, sender, content…",
    noMessages: "No messages yet. Configure the inbox and sync.",
    needCfg: "Configure the mailbox first.",
    from: "From",
    received: "Received",
    attachments: "Attachments",
    generate: "Generate reply (AI)",
    generating: "Generating…",
    draft: "Proposed reply",
    draftSaved: "Reply saved.",
    approved: "Reply approved — send it from your own mail client.",
    discarded: "Reply discarded.",
    approve: "Approve for sending",
    discard: "Discard",
    copyDraft: "Copy",
    openInMail: "Open in email",
    grounded: "Grounded in Knowledge Base",
    notGrounded: "No documented basis — send manually",
    sources: "Sources used",
    summary: "Summary",
    classification: "Classification",
    priority: "Priority",
    markHandled: "Mark handled",
    markIgnored: "Mark ignored",
    selectOne: "Select a message for details and the reply draft.",
    bodyUnavailable: "The full body loads on first open.",
  },
  de: {
    eyebrow: "Microsoft 365",
    title: "E-Mail Intelligence",
    desc: "Nachrichten im Team-Postfach werden anhand der Unternehmensverfahren klassifiziert; ein Antwortentwurf wird aus der Wissensdatenbank erzeugt. Sie prüfen und senden aus Ihrem eigenen Mailprogramm — OPSQAI versendet nie selbst.",
    mailboxLabel: "Postfach (geteiltes Postfach)",
    labelField: "Name",
    enabled: "Synchronisierung aktiv",
    poll: "Prüfintervall (Minuten)",
    test: "Zugriff testen",
    saved: "Einstellungen gespeichert.",
    ok: "Postfachzugriff funktioniert",
    syncNow: "Jetzt synchronisieren",
    syncDone: "Importierte Nachrichten: ",
    lastSync: "Letzte Synchronisierung",
    status: "Status",
    open: "Offen",
    handled: "Bearbeitet",
    ignored: "Ignoriert",
    all: "Alle",
    search: "Betreff, Absender, Inhalt suchen…",
    noMessages: "Noch keine Nachrichten. Postfach konfigurieren und synchronisieren.",
    needCfg: "Zuerst das Postfach konfigurieren.",
    from: "Von",
    received: "Empfangen",
    attachments: "Anhänge",
    generate: "Antwort erzeugen (KI)",
    generating: "Wird erzeugt…",
    draft: "Antwortentwurf",
    draftSaved: "Antwort gespeichert.",
    approved: "Antwort freigegeben — senden Sie sie aus Ihrem Mailprogramm.",
    discarded: "Entwurf verworfen.",
    approve: "Zum Senden freigeben",
    discard: "Verwerfen",
    copyDraft: "Kopieren",
    openInMail: "In E-Mail öffnen",
    grounded: "Aus Wissensdatenbank belegt",
    notGrounded: "Ohne dokumentierte Grundlage — manuell senden",
    sources: "Verwendete Quellen",
    summary: "Zusammenfassung",
    classification: "Klassifizierung",
    priority: "Priorität",
    markHandled: "Als bearbeitet markieren",
    markIgnored: "Als ignoriert markieren",
    selectOne: "Wählen Sie eine Nachricht für Details und den Antwortentwurf.",
    bodyUnavailable: "Der vollständige Inhalt wird beim ersten Öffnen geladen.",
  },
} as const;

interface MessageRow {
  id: string;
  subject: string | null;
  from_name: string | null;
  from_email: string | null;
  received_at: string | null;
  preview: string | null;
  has_attachments: boolean;
  classification: string | null;
  priority: string | null;
  status: string;
  summary: string | null;
  draft_id: string | null;
  draft_status: string | null;
  draft_grounded: boolean | null;
}

interface SourceRef {
  document_id: string;
  title: string;
  code: string | null;
  section: string | null;
  page: number | null;
  page_end: number | null;
  similarity: number;
}

function EmailIntelligencePage() {
  const { lang } = useT();
  const L = TXT[(lang === "ro" || lang === "de" ? lang : "en") as "ro" | "en" | "de"];
  const qc = useQueryClient();

  const fetchSettings = useServerFn(getEmailSettings);
  const save = useServerFn(saveEmailSettings);
  const test = useServerFn(testEmailInbox);
  const sync = useServerFn(syncEmailNow);
  const list = useServerFn(listEmailMessages);
  const detail = useServerFn(getEmailMessage);
  const setStatus = useServerFn(setEmailMessageStatus);
  const generate = useServerFn(generateEmailDraft);
  const updateDraft = useServerFn(updateEmailDraft);
  const approveDraft = useServerFn(approveEmailDraft);
  const discardDraft = useServerFn(discardEmailDraft);

  const q = useQuery({ queryKey: ["email-settings"], queryFn: () => fetchSettings() });

  const [label, setLabel] = useState("");
  const [mailbox, setMailbox] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [poll, setPoll] = useState(15);
  const [busy, setBusy] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"open" | "handled" | "ignored" | "all">("open");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  const cfg = q.data?.config ?? null;

  useEffect(() => {
    if (!cfg) return;
    setLabel(cfg.label);
    setMailbox(cfg.mailbox);
    setEnabled(cfg.enabled);
    setPoll(cfg.pollMinutes);
  }, [cfg]);

  const qMessages = useQuery({
    queryKey: ["email-messages", statusFilter, search],
    queryFn: () => list({ data: { status: statusFilter, q: search, limit: 100 } }),
    enabled: Boolean(cfg),
    refetchInterval: 60_000,
  });

  const qDetail = useQuery({
    queryKey: ["email-message", selectedId],
    queryFn: () => detail({ data: { id: selectedId! } }),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    setDraftText(qDetail.data?.draft ? String(qDetail.data.draft.draft) : "");
  }, [qDetail.data]);

  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await qc.invalidateQueries({ queryKey: ["email-settings"] });
      await qc.invalidateQueries({ queryKey: ["email-messages"] });
      await qc.invalidateQueries({ queryKey: ["email-message"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const messages: MessageRow[] = qMessages.data?.messages ?? [];
  const selected = qDetail.data;
  const draft = selected?.draft ?? null;
  const sources: SourceRef[] = draft ? (draft.sources ?? []) : [];

  return (
    <ModulePage eyebrow={L.eyebrow} title={L.title} description={L.desc}>
      {q.isLoading || !q.data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-6">
          <Panel className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">{L.mailboxLabel}</h2>
              {cfg?.lastStatus ? (
                <Badge variant={cfg.lastStatus === "error" ? "destructive" : "secondary"}>{cfg.lastStatus}</Badge>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5"><Label>{L.labelField}</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{L.mailboxLabel}</Label><Input type="email" placeholder="ops@company.com" value={mailbox} onChange={(e) => setMailbox(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{L.poll}</Label><Input type="number" min={5} max={720} value={poll} onChange={(e) => setPoll(Number(e.target.value) || 15)} /></div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Switch checked={enabled} onCheckedChange={setEnabled} id="email-enabled" />
              <div><Label htmlFor="email-enabled">{L.enabled}</Label></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={busy !== null || !mailbox} onClick={() => run("save", async () => {
                await save({ data: { label: label || "Shared inbox", mailbox, enabled, poll_minutes: poll } });
              }, L.saved)}>{L.saved.replace(/\..*/, "")}</Button>
              <Button variant="outline" disabled={busy !== null || !mailbox} onClick={() => run("test", async () => {
                const r = await test({ data: { mailbox } });
                if (!r.ok) throw new Error(r.error);
              }, L.ok)}>{L.test}</Button>
              <Button variant="outline" disabled={busy !== null || !cfg} onClick={() => run("sync", async () => {
                const r = await sync();
                toast.success(`${L.syncDone}${r.added}`);
              })}>
                <RefreshCw className={`mr-1 h-4 w-4 ${busy === "sync" ? "animate-spin" : ""}`} />
                {L.syncNow}
              </Button>
              <span className="text-xs text-muted-foreground">
                {L.lastSync}: {cfg?.lastSyncAt ? new Date(cfg.lastSyncAt).toLocaleString() : "—"}
              </span>
            </div>
            {cfg?.lastError ? <p className="text-sm text-destructive">{cfg.lastError}</p> : null}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <Panel className="p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {(["open", "handled", "ignored", "all"] as const).map((s) => (
                  <Button key={s} size="sm" variant={statusFilter === s ? "default" : "ghost"} onClick={() => setStatusFilter(s)}>
                    {s === "open" ? L.open : s === "handled" ? L.handled : s === "ignored" ? L.ignored : L.all}
                    {s === "open" && q.data.openCount > 0 ? ` · ${q.data.openCount}` : ""}
                  </Button>
                ))}
              </div>
              <Input placeholder={L.search} value={search} onChange={(e) => setSearch(e.target.value)} />
              {!cfg ? (
                <p className="text-sm text-muted-foreground">{L.needCfg}</p>
              ) : qMessages.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">{L.noMessages}</p>
              ) : (
                <ul className="max-h-[520px] divide-y overflow-y-auto rounded-md border">
                  {messages.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(m.id)}
                        className={`flex w-full flex-col gap-0.5 p-3 text-left hover:bg-muted/40 ${selectedId === m.id ? "bg-muted/60" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate font-medium">{m.subject ?? "(no subject)"}</span>
                          {m.priority && m.priority !== "normal" ? (
                            <Badge variant={m.priority === "urgent" || m.priority === "high" ? "destructive" : "secondary"}>{m.priority}</Badge>
                          ) : null}
                        </div>
                        <span className="truncate text-xs text-muted-foreground">
                          {m.from_name || m.from_email} · {m.received_at ? new Date(m.received_at).toLocaleString() : "—"}
                          {m.has_attachments ? " 📎" : ""}
                        </span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{m.summary || m.preview || ""}</span>
                        {m.draft_id ? (
                          <Badge variant={m.draft_grounded ? "secondary" : "outline"} className="mt-1 w-fit">
                            {m.draft_grounded ? L.grounded : L.notGrounded}
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="p-5 space-y-4">
              {!selectedId ? (
                <p className="text-sm text-muted-foreground">{L.selectOne}</p>
              ) : qDetail.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : !selected ? (
                <p className="text-sm text-muted-foreground">{L.bodyUnavailable}</p>
              ) : (
                <>
                  <div className="space-y-1">
                    <h3 className="font-semibold">{selected.message.subject ?? "(no subject)"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {L.from}: {selected.message.from_name || selected.message.from_email} · {L.received}:{" "}
                      {selected.message.received_at ? new Date(String(selected.message.received_at)).toLocaleString() : "—"}
                    </p>
                    {selected.message.summary ? (
                      <p className="text-sm"><span className="text-muted-foreground">{L.summary}: </span>{selected.message.summary}</p>
                    ) : null}
                  </div>

                  <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                    {selected.message.body_text || selected.message.preview || L.bodyUnavailable}
                  </div>

                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-medium">{L.draft}</h4>
                      {draft?.grounded != null ? (
                        <Badge variant={draft.grounded ? "secondary" : "outline"}>
                          {draft.grounded ? L.grounded : L.notGrounded}
                        </Badge>
                      ) : null}
                    </div>
                    {draft ? (
                      <>
                        <Textarea className="min-h-48" value={draftText} onChange={(e) => setDraftText(e.target.value)} />
                        {sources.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">{L.sources}</p>
                            <ul className="space-y-1">
                              {sources.slice(0, 8).map((s, i) => (
                                <li key={`${s.document_id}:${i}`} className="text-xs text-muted-foreground">
                                  {s.code ? `${s.code} — ` : ""}{s.title}
                                  {s.section ? ` · ${s.section}` : ""}
                                  {s.page != null ? ` · p. ${s.page_end ? `${s.page}-${s.page_end}` : s.page}` : ""}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run(`d-gen-${selected.message.id}`, async () => {
                            await generate({ data: { id: selected.message.id } });
                          })}>
                            <Sparkles className="mr-1 h-4 w-4" />{L.generate}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy !== null || draftText === draft.draft} onClick={() => run(`d-save`, async () => {
                            await updateDraft({ data: { id: draft.id, draft: draftText } });
                          }, L.draftSaved)}>
                            {L.draftSaved.replace(/\..*/, "")}
                          </Button>
                          <Button size="sm" disabled={busy !== null} onClick={() => run(`d-approve`, async () => {
                            await approveDraft({ data: { id: draft.id } });
                          }, L.approved)}><Check className="mr-1 h-4 w-4" />{L.approve}</Button>
                          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(`d-discard`, async () => {
                            await discardDraft({ data: { id: draft.id } });
                          }, L.discarded)}><X className="mr-1 h-4 w-4" />{L.discard}</Button>
                          <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(draftText); toast.success("OK"); }}>
                            <Copy className="mr-1 h-4 w-4" />{L.copyDraft}
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`mailto:${encodeURIComponent(String(selected.message.from_email ?? ""))}?subject=${encodeURIComponent(selected.message.subject ?? "")}&body=${encodeURIComponent(draftText)}`}>
                              <MailOpen className="mr-1 h-4 w-4" />{L.openInMail}
                            </a>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Button size="sm" disabled={busy !== null} onClick={() => run(`gen-${selected.message.id}`, async () => {
                        await generate({ data: { id: selected.message.id } });
                      }, busy)}>
                        <Sparkles className="mr-1 h-4 w-4" />{busy === `gen-${selected.message.id}` ? L.generating : L.generate}
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run(`st-${selected.message.id}`, async () => {
                      await setStatus({ data: { id: selected.message.id, status: "handled" } });
                    }, L.markHandled)}>{L.markHandled}</Button>
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run(`ig-${selected.message.id}`, async () => {
                      await setStatus({ data: { id: selected.message.id, status: "ignored" } });
                    }, L.markIgnored)}>{L.markIgnored}</Button>
                    {selected.message.from_email ? (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`mailto:${encodeURIComponent(String(selected.message.from_email))}?subject=${encodeURIComponent(String(selected.message.subject ?? ""))}`}>
                          <ExternalLink className="mr-1 h-4 w-4" />{L.openInMail}
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </Panel>
          </div>
        </div>
      )}
    </ModulePage>
  );
}
