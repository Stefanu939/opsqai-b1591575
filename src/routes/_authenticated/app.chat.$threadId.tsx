import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { classifyChatError, chatErrorMessage, isChatStalled } from "@/lib/chat-reliability";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { getBrowserAuthProvider } from "@/lib/providers/registry";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useT } from "@/i18n";
import {
  Send,
  FileText,
  BookOpenCheck,
  ScrollText,
  Copy,
  Check,
  AlertCircle,
  Inbox,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Download,
  Phone,
  Mail,
  UserCheck,
  CheckCheck,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { EmojiPicker } from "@/components/app/chat/emoji-picker";
import { MessageReactions } from "@/components/app/chat/message-reactions";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { createInternalRequest } from "@/lib/internal-requests.functions";
import { rateMessage } from "@/lib/feedback.functions";
import { firstNameFrom } from "@/lib/chat-grounding";
import { useAuth } from "@/lib/auth-context";
import { Square, Mic, ImagePlus, Volume2, VolumeX, X } from "lucide-react";
import { useServerFn as useServerFn2 } from "@tanstack/react-start";
import { transcribeVoiceInput, synthesizeVoiceReply, uploadChatImage, signChatImage } from "@/lib/ai-features.functions";
import { toast } from "sonner";

interface SourceItem {
  type: "document" | "faq";
  id: string;
  document_id?: string;
  title: string;
  code?: string | null;
  excerpt: string;
  similarity?: number;
  version?: number;
  section?: string | null;
  page?: number | null;
  department?: string | null;
  last_updated?: string | null;
  confidence?: "high" | "medium" | "low";
  primary?: boolean;
}

interface PendingAttachment {
  id: string;
  filename: string;
  mediaType: string;
  previewUrl: string;
  status: "uploading" | "ready";
  path?: string;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface Escalation {
  name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
}

interface MessageMeta {
  sources?: SourceItem[];
  mode?: "greeting" | "kb" | "gap" | "followup";
  canCreateRequest?: boolean;
  question?: string;
  confidence?: number;
  minConfidence?: number;
  escalation?: Escalation | null;
  isKnowledgeGap?: boolean;
  images?: { id: string; document_id: string; caption: string | null; data_url: string }[];
}

type ConfBucket = "high" | "medium" | "low";
function bucketConfidence(n: number | undefined | null): ConfBucket {
  const v = typeof n === "number" ? n : 0;
  if (v >= 0.5) return "high";
  if (v >= 0.3) return "medium";
  return "low";
}
function confLabel(b: ConfBucket): string {
  return b === "high" ? "High" : b === "medium" ? "Medium" : "Low";
}
function confClasses(b: ConfBucket): string {
  if (b === "high") return "bg-success/15 text-success border-success/30";
  if (b === "medium")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}
// Show a relevance % that rewards a clear primary match while staying truthful for supporting ones.
function displayRelevance(sim: number | undefined, isPrimary: boolean): number {
  const s = typeof sim === "number" ? sim : 0;
  if (isPrimary && s >= 0.3) return Math.min(100, Math.round(50 + s * 80));
  return Math.max(0, Math.min(100, Math.round(s * 100)));
}
// Strip any "Sources:" / "Quellen:" / "Surse:" trailing block the LLM emits — UI renders sources separately.
function stripSourcesBlock(text: string): string {
  if (!text) return text;
  const re = /\n+\s*(?:\*\*|__)?\s*(?:Sources|Quellen|Surse)\s*:?\s*(?:\*\*|__)?[\s\S]*$/i;
  return text.replace(re, "").trimEnd();
}

export const Route = createFileRoute("/_authenticated/app/chat/$threadId")({
  validateSearch: (s: Record<string, unknown>) => z.object({ q: z.string().optional() }).parse(s),
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  const { q } = Route.useSearch();
  const { t, lang } = useT();
  const { user } = useAuth();
  const firstName = firstNameFrom(
    (user?.metadata as Record<string, string> | undefined)?.full_name ?? null,
    user?.email ?? null,
  );
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const tokenRef = useRef<string>("");

  useEffect(() => {
    const load = async () => {
      const sess = await getBrowserAuthProvider().getSession();
      tokenRef.current = sess?.accessToken ?? "";
      const { listThreadMessages } = await import("@/lib/threads.functions");
      const data = await listThreadMessages({ data: { threadId } });
      const msgs: UIMessage[] = (data ?? []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        parts: (m.parts as UIMessage["parts"]) ?? [{ type: "text", text: m.content }],
        metadata: m.sources ? { sources: m.sources } : undefined,
      }));
      setInitial(msgs);
    };
    load();
  }, [threadId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: () => ({ Authorization: `Bearer ${tokenRef.current}` }),
        body: () => ({ threadId, language: lang }),
      }),
    [threadId, lang],
  );

  if (!initial)
    return <div className="flex-1 grid place-items-center text-sm text-muted-foreground">…</div>;

  return (
    <ChatInner
      key={threadId}
      threadId={threadId}
      initial={initial}
      transport={transport}
      seed={q}
      seededRef={seededRef}
      taRef={taRef}
      scrollRef={scrollRef}
      t={t}
      firstName={firstName}
    />
  );
}

function ChatInner({
  threadId,
  initial,
  transport,
  seed,
  seededRef,
  taRef,
  scrollRef,
  t,
  firstName,
}: {
  threadId: string;
  initial: UIMessage[];
  transport: DefaultChatTransport<UIMessage>;
  seed?: string;
  seededRef: React.MutableRefObject<boolean>;
  taRef: React.RefObject<HTMLTextAreaElement | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  t: (k: never) => string;
  firstName: string;
}) {
  const transcribeVoice = useServerFn2(transcribeVoiceInput);
  const synthesizeVoice = useServerFn2(synthesizeVoiceReply);
  const uploadImage = useServerFn2(uploadChatImage);

  const [spokenReplyEnabled, setSpokenReplyEnabled] = useState(false);
  const spokenReplyEnabledRef = useRef(spokenReplyEnabled);
  spokenReplyEnabledRef.current = spokenReplyEnabled;
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  };

  const { messages, sendMessage, status, error, stop, regenerate } = useChat({
    id: threadId,
    messages: initial,
    transport,
    onError: (e) => console.error(e),
    onFinish: ({ message }) => {
      if (!spokenReplyEnabledRef.current || message.role !== "assistant") return;
      const text = stripSourcesBlock(
        message.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
      ).trim();
      if (!text) return;
      void (async () => {
        try {
          const { audio_base64, content_type } = await synthesizeVoice({
            data: { text: text.slice(0, 4000) },
          });
          const audio = new Audio(`data:${content_type};base64,${audio_base64}`);
          audioRef.current = audio;
          audio.onended = () => setSpeaking(false);
          setSpeaking(true);
          await audio.play();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not play spoken reply.");
        }
      })();
    },
  });
  const [input, setInput] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [stoppedIds, setStoppedIds] = useState<Set<string>>(new Set());
  const loading = status === "submitted" || status === "streaming";
  const T = t as (k: string) => string;
  const initialIds = useMemo(() => new Set(initial.map((m) => m.id)), [initial]);

  // -------- Voice input (mic) --------
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";

  const startRecording = async () => {
    if (!micSupported) {
      toast.error("Voice input is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void (async () => {
          try {
            setTranscribing(true);
            const blob = new Blob(audioChunksRef.current, { type: mimeType || "audio/webm" });
            const base64 = await blobToBase64(blob);
            const { text } = await transcribeVoice({
              data: {
                audio_base64: base64,
                mime_type: blob.type || "audio/webm",
                filename: "voice-note.webm",
              },
            });
            if (text?.trim()) {
              setInput((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
              taRef.current?.focus();
            } else {
              toast.message("No speech detected.");
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Voice transcription failed.");
          } finally {
            setTranscribing(false);
          }
        })();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access was denied or is unavailable.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  // -------- Image attachments --------
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

  const onPickImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} exceeds the 8 MB limit.`);
        continue;
      }
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setAttachments((prev) => [
        ...prev,
        { id, filename: file.name, mediaType: file.type, previewUrl, status: "uploading" },
      ]);
      try {
        const base64 = await blobToBase64(file);
        const { path } = await uploadImage({
          data: { filename: file.name, content_type: file.type, data_base64: base64 },
        });
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "ready", path } : a)),
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Could not upload ${file.name}.`);
        setAttachments((prev) => prev.filter((a) => a.id !== id));
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const found = prev.find((a) => a.id === id);
      if (found) URL.revokeObjectURL(found.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  };

  const failureKind = timedOut ? "timeout" : error ? classifyChatError(error.message) : null;

  useEffect(() => {
    if (seed && !seededRef.current && initial.length === 0) {
      seededRef.current = true;
      sendMessage({ text: seed });
    }
  }, [seed, sendMessage, seededRef, initial.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, scrollRef]);

  useEffect(() => {
    if (!loading) taRef.current?.focus();
  }, [loading, taRef]);

  // Stall watchdog: a local engine that dies mid-stream must not leave the UI
  // "thinking" forever. Abort and surface a retryable timeout instead.
  useEffect(() => {
    if (!loading) return;
    let lastActivity = Date.now();
    const tick = window.setInterval(() => {
      if (isChatStalled(lastActivity, Date.now())) {
        window.clearInterval(tick);
        stop();
        setTimedOut(true);
      }
    }, 2_000);
    lastActivity = Date.now();
    return () => window.clearInterval(tick);
  }, [loading, messages, stop]);

  const onRetry = () => {
    setTimedOut(false);
    void regenerate();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    const readyAttachments = attachments.filter((a) => a.status === "ready" && a.path);
    if ((!text && readyAttachments.length === 0) || loading) return;
    if (attachments.some((a) => a.status === "uploading")) {
      toast.message("Please wait for image upload to finish.");
      return;
    }
    setTimedOut(false);
    const files = readyAttachments.map((a) => ({
      type: "file" as const,
      mediaType: a.mediaType,
      url: `chatimg:${a.path}`,
      filename: a.filename,
    }));
    if (text) {
      sendMessage(files.length > 0 ? { text, files } : { text });
    } else {
      sendMessage({ files });
    }
    setInput("");
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
  };

  // Stop generation immediately: aborts the underlying request via the AI SDK
  // transport (AbortController under the hood) while keeping whatever partial
  // text already streamed in, and marks that message as manually stopped.
  const onStop = () => {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant") {
      setStoppedIds((prev) => new Set(prev).add(last.id));
    }
    stop();
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="oq-chat-canvas flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 md:px-8 py-6 space-y-2">
          {messages.length === 0 && (
            <div className="text-center py-16">
               <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-md border border-primary/25 bg-primary/10">
                 <LogoMark size={28} className="text-primary" />
              </div>
              <p className="font-display text-lg font-medium text-foreground">
                {firstName !== "there" ? `Hi ${firstName} — ${T("askAnything")}` : T("askAnything")}
              </p>
              <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">{T("ragNote")}</p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex justify-center pb-2">
               <span className="rounded-sm border border-border bg-card px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {T("today") || "Today"}
              </span>
            </div>
          )}

          {messages.map((m, mi) => {
            const rawText = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
            const meta = m.metadata as MessageMeta | undefined;
            const sources = meta?.sources ?? [];
            if (m.role === "user") {
              const imageParts = m.parts.filter(
                (p): p is Extract<UIMessage["parts"][number], { type: "file" }> =>
                  p.type === "file" && typeof p.url === "string" && p.url.startsWith("chatimg:"),
              );
              return (
                <div key={m.id} className="oq-enter group flex flex-col items-end">
                  {imageParts.length > 0 && (
                    <div className="mb-1.5 flex max-w-[85%] flex-wrap justify-end gap-1.5">
                      {imageParts.map((p, i) => (
                        <UserImageAttachment key={i} path={p.url.slice("chatimg:".length)} />
                      ))}
                    </div>
                  )}
                  {rawText.trim() && (
                     <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-xs whitespace-pre-wrap">
                      {rawText}
                      <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
                        <CheckCheck className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                  <MessageReactions messageId={m.id} align="end" />
                </div>
              );
            }
            const text = stripSourcesBlock(rawText);
            const isPersisted = initialIds.has(m.id);
            const docs = sources.filter((s) => s.type === "document");
            const primary = docs.find((d) => d.primary) ?? docs[0];
            const answerBucket = bucketConfidence(meta?.confidence);
            const showMeta = text && sources.length > 0 && meta?.mode !== "gap";
            const prev = messages[mi - 1];
            const grouped = prev?.role === "assistant";
            return (
              <div key={m.id} className="oq-enter group flex gap-2.5">
                <div className="w-8 shrink-0">
                  {!grouped && (
                     <div className="grid h-8 w-8 place-items-center rounded-sm border border-primary/25 bg-primary/10">
                       <LogoMark size={18} className="text-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 max-w-[88%]">
                  <div
                     className={`rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-xs ${grouped ? "rounded-tl-sm" : "rounded-bl-sm"}`}
                  >
                    <div className="text-[15px] leading-relaxed prose prose-sm max-w-none prose-headings:font-display prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                      {text ? (
                        <ReactMarkdown>{text}</ReactMarkdown>
                      ) : (
                        <ThinkingDots label={T("thinking")} />
                      )}
                    </div>
                    {stoppedIds.has(m.id) && (
                      <div className="mt-2 text-[11px] text-muted-foreground italic">
                        Stopped
                      </div>
                    )}
                    {showMeta && (
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                        {primary && (
                          <div
                            style={{ animationDelay: "60ms" }}
                            className="oq-enter flex min-w-0 items-center gap-1.5 text-muted-foreground"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-medium text-foreground truncate">
                              {primary.code ? `${primary.code} — ${primary.title}` : primary.title}
                            </span>
                          </div>
                        )}
                        <span
                          style={{ animationDelay: "140ms" }}
                          className={`oq-enter inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium transition-colors duration-200 ${confClasses(answerBucket)}`}
                        >
                          {confLabel(answerBucket)}
                        </span>
                      </div>
                    )}
                    {sources.length > 0 && (
                      <SourcesPanel sources={sources} answerBucket={answerBucket} T={T} />
                    )}
                    {(meta?.images?.length ?? 0) > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {meta!.images!.map((img) => (
                          <a
                            key={img.id}
                            href={img.data_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block h-20 w-20 overflow-hidden rounded-lg border border-border"
                            title={img.caption ?? "Cited visual"}
                          >
                            <img
                              src={img.data_url}
                              alt={img.caption ?? "Cited document visual"}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {meta?.escalation && meta.escalation.department && (
                    <EscalationCard escalation={meta.escalation} />
                  )}
                  {meta?.canCreateRequest && text && (
                    <CreateRequestCTA threadId={threadId} question={meta.question ?? ""} T={T} />
                  )}
                  {meta?.isKnowledgeGap && meta.mode !== "gap" && text && (
                    <div className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <span aria-hidden>⚠</span>
                      <span>
                        This question has been flagged as a <strong>knowledge gap</strong>. Our
                        administrators have been notified and can improve the Knowledge Base.
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <MessageReactions messageId={m.id} />
                    {text && (
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <CopyButton text={text} label={T("copy") || "Copy"} />
                      </div>
                    )}
                    {text && isPersisted && <FeedbackBar messageId={m.id} />}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-2.5">
               <div className="grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-primary/25 bg-primary/10">
                 <LogoMark size={18} className="text-primary" />
              </div>
               <div className="rounded-lg rounded-bl-sm border border-border bg-card px-3.5 py-2.5 shadow-xs">
                <ThinkingDots label={T("searching")} />
              </div>
            </div>
          )}
        </div>
      </div>

       <form onSubmit={onSubmit} className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto p-3 md:p-4">
          {failureKind && (
            <div
              role="alert"
              className="mb-2 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              <span className="flex-1 min-w-[12rem]">{chatErrorMessage(failureKind)}</span>
              {failureKind !== "unauthorized" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="h-7 px-2 text-xs"
                >
                  Retry
                </Button>
              )}
            </div>
          )}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div key={a.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                  <img src={a.previewUrl} alt={a.filename} className="h-full w-full object-cover" />
                  {a.status === "uploading" && (
                    <div className="absolute inset-0 grid place-items-center bg-background/60 text-[10px]">…</div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    aria-label="Remove image"
                    className="absolute right-0.5 top-0.5 rounded-full bg-background/80 p-0.5 text-foreground shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
           <div className="flex gap-1.5 items-end rounded-lg border border-border bg-card p-1.5 pl-2 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
            <EmojiPicker
              onPick={(emoji: string) => {
                setInput((v) => v + emoji);
                taRef.current?.focus();
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void onPickImages(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Attach image"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={recording ? "Stop recording" : "Record voice message"}
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`h-9 w-9 shrink-0 rounded-full transition-colors ${recording ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              {recording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={spokenReplyEnabled ? "Disable spoken replies" : "Enable spoken replies"}
              onClick={() => {
                if (speaking) stopSpeaking();
                setSpokenReplyEnabled((v) => !v);
              }}
              className={`h-9 w-9 shrink-0 rounded-full transition-colors ${spokenReplyEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            >
              {spokenReplyEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            {speaking && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={stopSpeaking}
                className="h-9 shrink-0 rounded-full text-xs"
              >
                Stop audio
              </Button>
            )}
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={T("typeMessage")}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e as unknown as React.FormEvent);
                }
              }}
              className="resize-none min-h-[40px] max-h-40 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[15px]"
            />
            {loading ? (
              <Button
                type="button"
                size="icon"
                aria-label="Stop generating"
                onClick={onStop}
                className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                aria-label="Send message"
                disabled={!input.trim() && attachments.filter((a) => a.status === "ready").length === 0}
                className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function SourcesPanel({
  sources,
  answerBucket,
  T,
}: {
  sources: SourceItem[];
  answerBucket: ConfBucket;
  T: (k: string) => string;
}) {
  const navigate = useNavigate();
  const docs = sources.filter((s) => s.type === "document");

  const faqs = sources.filter((s) => s.type === "faq");
  const primary = docs.find((d) => d.primary) ?? docs[0];
  const primarySim = typeof primary?.similarity === "number" ? primary.similarity : 0;
  // Drop supporting docs that are noticeably less relevant than the primary match.
  const supporting = docs
    .filter((d) => d !== primary)
    .filter((d) => {
      const s = typeof d.similarity === "number" ? d.similarity : 0;
      if (primarySim >= 0.4) return s >= primarySim - 0.1 && s >= 0.3;
      return s >= 0.25;
    });

  // Open the cited document where it lives: the Knowledge Base entry. The old
  // behaviour created an in-memory blob: URL, which the Windows desktop shell
  // cannot open ("Get an app to open this 'blob' link").
  const openDoc = (documentId?: string) => {
    if (!documentId) return;
    void navigate({ to: "/app/knowledge", search: { doc: documentId } });
  };

  // Explicit download of the original file (streamed through a server fn so it
  // works on Cloud object storage and Self-Hosted local storage alike).
  const downloadDoc = async (documentId?: string, title?: string) => {
    if (!documentId) return;
    const { getKnowledgeDocumentBlob } = await import("@/lib/kb.functions");
    const blob = await getKnowledgeDocumentBlob({ data: { document_id: documentId } });
    if (!blob) return;
    const binary = atob(blob.data_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: blob.content_type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = title || "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };


  const DocCard = ({
    s,
    isPrimary,
    index = 0,
  }: {
    s: SourceItem;
    isPrimary?: boolean;
    index?: number;
  }) => {
    const bucket: ConfBucket = isPrimary ? answerBucket : bucketConfidence(s.similarity);
    const rel = displayRelevance(s.similarity, !!isPrimary);
    return (
      <div
        style={{ animationDelay: `${index * 60}ms` }}
        className={`oq-enter rounded-xl border p-3 transition-colors ${isPrimary ? "border-[var(--gold-line)] bg-[var(--gold-soft)]" : "border-border bg-muted/30"}`}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {isPrimary && <Badge className="text-[10px]">Primary</Badge>}
          {s.code && (
            <Badge variant="outline" className="font-mono text-[10px]">
              {s.code}
            </Badge>
          )}
          {s.version && (
            <Badge variant="secondary" className="text-[10px]">
              v{s.version}
            </Badge>
          )}
          <div className="text-sm font-medium truncate">{s.title}</div>
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mb-2">
          {s.version && (
            <>
              <dt className="text-muted-foreground">Version</dt>
              <dd className="font-medium">v{s.version}</dd>
            </>
          )}
          {s.department && (
            <>
              <dt className="text-muted-foreground">Department</dt>
              <dd className="font-medium truncate">{s.department}</dd>
            </>
          )}
          {s.last_updated && (
            <>
              <dt className="text-muted-foreground">Last updated</dt>
              <dd className="font-medium">{new Date(s.last_updated).toLocaleDateString()}</dd>
            </>
          )}
          {s.section && (
            <>
              <dt className="text-muted-foreground">Matched section</dt>
              <dd className="font-medium truncate">{s.section}</dd>
            </>
          )}
          {s.page && (
            <>
              <dt className="text-muted-foreground">Page</dt>
              <dd className="font-medium">{s.page}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Confidence</dt>
          <dd>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${confClasses(bucket)}`}
            >
              {confLabel(bucket)}
            </span>
          </dd>
          {typeof s.similarity === "number" && (
            <>
              <dt className="text-muted-foreground">Relevance</dt>
              <dd className="font-medium">{rel}%</dd>
            </>
          )}
        </dl>
        {s.excerpt && (
          <details className="mt-2 group/excerpt">
            <summary className="cursor-pointer text-[11px] font-medium text-primary hover:underline list-none inline-flex items-center gap-1">
              <ScrollText className="h-3 w-3" /> Matched excerpt
            </summary>
            <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-primary/30 pl-2 line-clamp-6">
              {s.excerpt}
            </p>
          </details>
        )}
        <div className="mt-2 flex items-center gap-3">
          <CopyButton text={s.excerpt} label={T("copy") || "Copy"} />
          {s.document_id && (
            <>
              <button
                onClick={() => openDoc(s.document_id)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Open in Knowledge Base
              </button>
              <button
                onClick={() => void downloadDoc(s.document_id, s.title)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
              >
                <Download className="h-3 w-3" /> Download file
              </button>
            </>
          )}

        </div>
      </div>
    );
  };

  return (
    <div className="mt-3">
      <Sheet>
        <SheetTrigger asChild>
          <button className="group inline-flex items-center gap-2 text-xs font-medium text-primary transition-colors hover:underline">
            <ScrollText className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            {T("viewSources")} ({sources.length})
          </button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{T("sources")}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            {primary && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Primary source
                </h3>
                <DocCard s={primary} isPrimary />
              </div>
            )}
            {supporting.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  Supporting sources
                </h3>
                <div className="space-y-3">
                  {supporting.map((s, i) => (
                    <DocCard key={i} s={s} index={i + 1} />
                  ))}
                </div>
              </div>
            )}
            {faqs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <BookOpenCheck className="h-3.5 w-3.5" /> FAQ
                </h3>
                <div className="space-y-3">
                  {faqs.map((s, i) => (
                    <div
                      key={i}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className="oq-enter rounded-md border border-border p-3 bg-muted/30"
                    >
                      <div className="text-sm font-medium mb-1">{s.title}</div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {s.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FeedbackBar({ messageId }: { messageId: string }) {
  const rate = useServerFn(rateMessage);
  const [voted, setVoted] = useState<-1 | 1 | null>(null);
  const vote = async (r: -1 | 1) => {
    try {
      await rate({ data: { message_id: messageId, rating: r } });
      setVoted(r);
    } catch (e) {
      console.error(e);
    }
  };
  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        onClick={() => vote(1)}
        aria-label="Helpful"
        className={`p-1.5 rounded-md transition-colors ${voted === 1 ? "text-success bg-success/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => vote(-1)}
        aria-label="Not helpful"
        className={`p-1.5 rounded-md transition-colors ${voted === -1 ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function EscalationCard({ escalation }: { escalation: Escalation }) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <UserCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Ask your {escalation.department} manager</div>
          {escalation.name && (
            <div className="text-xs text-muted-foreground mt-0.5">{escalation.name}</div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {escalation.phone && (
              <a
                href={`tel:${escalation.phone}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted"
              >
                <Phone className="h-3 w-3" /> {escalation.phone}
              </a>
            )}
            {escalation.email && (
              <a
                href={`mailto:${escalation.email}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted"
              >
                <Mail className="h-3 w-3" /> {escalation.email}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserImageAttachment({ path }: { path: string }) {
  const sign = useServerFn2(signChatImage);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    sign({ data: { path } })
      .then((res) => {
        if (!cancelled) setDataUrl(`data:${res.content_type};base64,${res.data_base64}`);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [path, sign]);
  if (failed) return null;
  if (!dataUrl)
    return <div className="h-20 w-20 rounded-lg border border-border/60 bg-muted animate-pulse" />;
  return (
    <a
      href={dataUrl}
      target="_blank"
      rel="noreferrer"
      className="block h-20 w-20 overflow-hidden rounded-lg border border-border"
    >
      <img src={dataUrl} alt="Attached" className="h-full w-full object-cover" />
    </a>
  );
}

function ThinkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" />
      </span>
      <span className="italic">{label}</span>
    </div>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* noop */
        }
      }}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? "✓" : label}
    </button>
  );
}

function CreateRequestCTA({
  threadId,
  question,
  T,
}: {
  threadId: string;
  question: string;
  T: (k: string) => string;
}) {
  const create = useServerFn(createInternalRequest);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const onClick = async () => {
    if (!question.trim()) return;
    setState("sending");
    try {
      await create({ data: { question, thread_id: threadId } });
      setState("sent");
    } catch (e) {
      console.error(e);
      setState("error");
    }
  };
  return (
    <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{T("kbGapTitle")}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{T("kbGapBody")}</p>
          {state === "sent" ? (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <Check className="h-3.5 w-3.5" /> {T("requestSent")}
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="default"
              className="mt-3 h-8"
              onClick={onClick}
              disabled={state === "sending"}
            >
              <Inbox className="h-3.5 w-3.5 mr-1.5" />
              {state === "sending" ? T("sending") : T("createInternalRequest")}
            </Button>
          )}
          {state === "error" && (
            <div className="text-xs text-destructive mt-2">{T("errorOccurred")}</div>
          )}
        </div>
      </div>
    </div>
  );
}
