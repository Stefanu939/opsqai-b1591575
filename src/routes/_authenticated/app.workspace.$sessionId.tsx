/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useServerFn } from "@tanstack/react-start";
import {
  getWorkspaceSession,
  registerWorkspaceFile,
  deleteWorkspaceFile,
  downloadArtifactUrl,
  renameWorkspaceSession,
} from "@/lib/workspace.functions";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import {
  Send, Upload, FileText, X, Loader2, Download, Sparkles, ArrowLeft, ShieldCheck,
  FileSpreadsheet, Presentation, FileType2, Pencil, Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const BUCKET = "workspace-temp";
const ACCEPT = ".pdf,.docx,.txt,.md,.csv,.xlsx,.pptx,.json,image/*,application/zip";

export const Route = createFileRoute("/_authenticated/app/workspace/$sessionId")({
  component: WorkspaceSession,
  head: () => ({ meta: [{ title: "AI Workspace · OPSQAI" }] }),
});

interface WSFile { id: string; file_name: string; mime: string | null; size_bytes: number | null; status: string; expires_at: string | null; created_at: string }
interface WSArtifact { id: string; kind: "pptx" | "xlsx" | "docx" | "pdf" | "csv" | "txt"; file_name: string; storage_path: string; expires_at: string | null; created_at: string }
interface WSSession { id: string; title: string; company_id: string; user_id: string }

function iconFor(kind: string) {
  if (kind === "pptx") return Presentation;
  if (kind === "xlsx" || kind === "csv") return FileSpreadsheet;
  if (kind === "pdf") return FileType2;
  return FileText;
}

function WorkspaceSession() {
  const { sessionId } = Route.useParams();
  const { lang } = useT();
  const get = useServerFn(getWorkspaceSession);
  const register = useServerFn(registerWorkspaceFile);
  const del = useServerFn(deleteWorkspaceFile);
  const dlUrl = useServerFn(downloadArtifactUrl);
  const rename = useServerFn(renameWorkspaceSession);

  const [session, setSession] = useState<WSSession | null>(null);
  const [files, setFiles] = useState<WSFile[]>([]);
  const [artifacts, setArtifacts] = useState<WSArtifact[]>([]);
  const [retention, setRetention] = useState<string>("immediate");
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const tokenRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const reload = async () => {
    const data = (await get({ data: { id: sessionId } })) as any;
    setSession(data.session);
    setFiles(data.files);
    setArtifacts(data.artifacts);
    setRetention(data.retention);
    setTitle(data.session.title);
    setInitial(
      (data.messages ?? []).map((m: any) => ({
        id: m.id, role: m.role,
        parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: m.content }],
      })),
    );
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      tokenRef.current = sess.session?.access_token ?? "";
      await reload();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/workspace-chat",
      headers: () => ({ Authorization: `Bearer ${tokenRef.current}` }),
      body: () => ({ sessionId, language: lang }),
    }),
    [sessionId, lang],
  );

  if (!session || !initial) {
    return (
      <AppShell>
        <div className="flex-1 grid place-items-center text-sm text-muted-foreground">…</div>
      </AppShell>
    );
  }

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(fileList)) {
        const id = crypto.randomUUID();
        const safe = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${session.company_id}/${sessionId}/${id}-${safe}`;
        const up = await supabase.storage.from(BUCKET).upload(path, f, {
          contentType: f.type || "application/octet-stream",
          upsert: false,
        });
        if (up.error) {
          console.error(up.error);
          alert(`Upload failed: ${up.error.message}`);
          continue;
        }
        try {
          await register({
            data: {
              session_id: sessionId,
              storage_path: path,
              file_name: f.name,
              mime: f.type || undefined,
              size_bytes: f.size,
            },
          });
        } catch (e) {
          console.error(e);
          alert(`Processing failed: ${(e as Error).message}`);
        }
      }
      await reload();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = async (id: string) => {
    await del({ data: { id } });
    await reload();
  };

  const saveTitle = async () => {
    if (title.trim() && title !== session.title) {
      await rename({ data: { id: sessionId, title: title.trim() } });
      await reload();
    }
    setEditingTitle(false);
  };

  return (
    <AppShell>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-card/50 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/app/workspace" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
            {editingTitle ? (
              <div className="flex items-center gap-1">
                <input
                  value={title} onChange={(e) => setTitle(e.target.value)}
                  className="bg-background border rounded px-2 py-1 text-sm font-medium min-w-0"
                  autoFocus onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(); }}
                />
                <Button size="icon" variant="ghost" onClick={saveTitle}><Check className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold truncate">{session.title}</span>
                <Button size="icon" variant="ghost" onClick={() => setEditingTitle(true)}><Pencil className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>
          <Badge variant="outline" className="gap-1 text-xs"><ShieldCheck className="h-3 w-3" />Temporary · retention: {retention}</Badge>
        </div>

        <div className="flex-1 grid lg:grid-cols-[320px_1fr] min-h-0">
          {/* Sidebar: files + artifacts */}
          <aside className="border-r bg-muted/20 p-4 overflow-y-auto space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Session files</h3>
                <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => inputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Upload
                </Button>
                <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              </div>
              {files.length === 0 ? (
                <div className="text-xs text-muted-foreground border border-dashed rounded-md p-4 text-center">
                  Drop PDF, DOCX, XLSX, PPTX, CSV, TXT or images. Multiple files supported.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {files.map((f) => (
                    <li key={f.id} className="group flex items-center gap-2 text-sm bg-card border rounded-md px-2 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1" title={f.file_name}>{f.file_name}</span>
                      <button onClick={() => removeFile(f.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Generated artifacts</h3>
              {artifacts.length === 0 ? (
                <div className="text-xs text-muted-foreground">Ask the assistant to generate a presentation, spreadsheet, report or PDF.</div>
              ) : (
                <ul className="space-y-1.5">
                  {artifacts.map((a) => {
                    const Icon = iconFor(a.kind);
                    return (
                      <li key={a.id} className="flex items-center gap-2 text-sm bg-card border rounded-md px-2 py-1.5">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate flex-1" title={a.file_name}>{a.file_name}</span>
                        <button
                          className="text-muted-foreground hover:text-primary"
                          onClick={async () => {
                            const { url } = (await dlUrl({ data: { id: a.id } })) as { url: string };
                            window.open(url, "_blank");
                          }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Chat */}
          <ChatPanel
            key={sessionId}
            initial={initial}
            transport={transport}
            files={files}
            scrollRef={scrollRef}
            onArtifact={reload}
            dlUrl={dlUrl}
          />
        </div>
      </div>
    </AppShell>
  );
}

function ChatPanel({
  initial, transport, files, scrollRef, onArtifact, dlUrl,
}: {
  initial: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  files: WSFile[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onArtifact: () => void | Promise<void>;
  dlUrl: (args: { data: { id: string } }) => Promise<{ url: string }>;
}) {
  const { messages, sendMessage, status } = useChat({
    messages: initial,
    transport,
  });
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const lastCountRef = useRef(0);

  // Refresh artifact list when assistant finishes a tool call
  useEffect(() => {
    if (status !== "ready") return;
    if (messages.length !== lastCountRef.current) {
      lastCountRef.current = messages.length;
      const last = messages[messages.length - 1];
      if (last?.role === "assistant" && last.parts.some((p: any) => p.type?.startsWith?.("tool-"))) {
        void onArtifact();
      }
    }
  }, [messages, status, onArtifact]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  const submit = async () => {
    const v = text.trim();
    if (!v || status === "submitted" || status === "streaming") return;
    setText("");
    await sendMessage({ text: v });
  };

  const suggestions = files.length
    ? [
        "Summarise the uploaded documents for executives.",
        "Compare these reports and list inconsistencies.",
        "Create a PowerPoint for tomorrow's management meeting from these files.",
        "Extract action items and generate an Excel CAPA tracker.",
      ]
    : ["Upload some files to get started, then ask me to analyse, compare, or generate a report."];

  return (
    <section className="flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto text-center space-y-4 mt-12">
            <div className="inline-flex items-center gap-2 text-sm text-primary font-medium">
              <Sparkles className="h-4 w-4" /> AI Workspace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">What would you like to do?</h2>
            <p className="text-sm text-muted-foreground">
              Uploaded files are temporary and only visible in this session.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 mt-4 text-left">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="border rounded-md p-3 text-sm hover:border-primary/40 hover:bg-primary/5 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageRow key={m.id} m={m} dlUrl={dlUrl} />
        ))}

        {(status === "submitted" || status === "streaming") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Working…
          </div>
        )}
      </div>

      <div className="border-t p-4 bg-card/50">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(); }
            }}
            placeholder="Ask, analyse, or say: 'Generate a PowerPoint for tomorrow's meeting from these files.'"
            rows={2}
            className="resize-none"
          />
          <Button onClick={submit} disabled={!text.trim() || status === "submitted" || status === "streaming"} className="h-10 w-10 p-0 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function MessageRow({
  m, dlUrl,
}: { m: UIMessage; dlUrl: (args: { data: { id: string } }) => Promise<{ url: string }> }) {
  const isUser = m.role === "user";
  const text = m.parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("");

  // Tool outputs (generated artifacts)
  type ToolOut =
    | { success: true; artifact_id: string; file_name: string; kind: string; download_url?: string | null }
    | { success: false; kind: string; error: string; stage?: string }
    | { artifact_id?: string; file_name?: string; kind?: string; download_url?: string | null }; // legacy shape
  const toolOutputs = (m.parts as any[])
    .filter((p) => typeof p.type === "string" && p.type.startsWith("tool-") && p.state === "output-available")
    .map((p) => p.output as ToolOut);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <Card className={`max-w-3xl ${isUser ? "bg-primary text-primary-foreground" : "bg-card"} p-4 space-y-3`}>
        {text && (
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            {isUser ? <p className="whitespace-pre-wrap m-0">{text}</p> : <ReactMarkdown>{text}</ReactMarkdown>}
          </div>
        )}
        {toolOutputs.length > 0 && (
          <div className="space-y-1.5">
            {toolOutputs.map((o, i) => {
              // Failure card
              if (o && "success" in o && o.success === false) {
                return (
                  <div
                    key={i}
                    className="w-full flex items-start gap-2 text-sm border border-destructive/40 bg-destructive/5 rounded-md px-3 py-2"
                  >
                    <X className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-destructive">Artifact generation failed{o.kind ? ` (.${o.kind})` : ""}.</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Reason: {o.error}{o.stage ? ` — stage: ${o.stage}` : ""}</div>
                    </div>
                  </div>
                );
              }
              const artifactId = (o as { artifact_id?: string }).artifact_id;
              const fileName = (o as { file_name?: string }).file_name;
              const kind = (o as { kind?: string }).kind ?? "";
              if (!artifactId) return null;
              const Icon = iconFor(kind);
              return (
                <button
                  key={artifactId + i}
                  onClick={async () => {
                    try {
                      const { url } = await dlUrl({ data: { id: artifactId } });
                      window.open(url, "_blank");
                    } catch (e) {
                      alert(`Download failed: ${(e as Error).message}`);
                    }
                  }}
                  className="w-full flex items-center gap-2 text-sm border rounded-md px-3 py-2 bg-background text-foreground hover:border-primary/50"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-medium truncate">{fileName ?? `artifact.${kind}`}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-primary"><Download className="h-3.5 w-3.5" />Download</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
