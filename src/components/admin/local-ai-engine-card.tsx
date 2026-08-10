// Local AI engine panel — Self-Hosted only.
//
// Ollama is the single supported local runtime: no API key, no external
// service. This card shows live engine health, the models in use and the
// pinned embedding dimension, and lets an admin change models.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAiEngineStatus, saveAiEngineConfig } from "@/lib/ai-engine.functions";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type ProbeStep = { id: string; label: string; ok: boolean; detail?: string | null };

export function LocalAiEngineCard() {
  const qc = useQueryClient();
  const status = useServerFn(getAiEngineStatus);
  const save = useServerFn(saveAiEngineConfig);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["selfhost-ai-engine"],
    queryFn: () => status({ data: {} } as never) as Promise<{
      base_url: string;
      models: { chat: string; "chat-fast": string; embedding: string };
      pinned_embedding_dim: number | null;
      probe: { ok: boolean; steps: ProbeStep[]; embeddingDimension?: number | null };
    }>,
    refetchOnWindowFocus: false,
  });

  const [baseUrl, setBaseUrl] = useState("");
  const [chat, setChat] = useState("");
  const [fast, setFast] = useState("");
  const [embedding, setEmbedding] = useState("");

  useEffect(() => {
    if (!data) return;
    setBaseUrl(data.base_url);
    setChat(data.models.chat);
    setFast(data.models["chat-fast"]);
    setEmbedding(data.models.embedding);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          base_url: baseUrl.trim(),
          chat_model: chat.trim(),
          chat_fast_model: fast.trim(),
          embedding_model: embedding.trim(),
        },
      }),
    onSuccess: (r: { embedding_dim: number | null; realigned: boolean; warning: string | null }) => {
      if (r.warning) toast.warning(r.warning);
      else if (r.realigned)
        toast.success(
          `Saved. Vector storage realigned to ${r.embedding_dim} dimensions — re-index existing documents.`,
        );
      else toast.success("Local AI engine configuration saved");
      qc.invalidateQueries({ queryKey: ["selfhost-ai-engine"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const healthy = data?.probe?.ok === true;

  return (
    <SectionCard
      title="Local AI engine"
      description="OPSQAI Self-Hosted runs chat, embeddings and retrieval on this machine through Ollama. No API key and no external AI service are used."
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Checking local engine…</div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={healthy ? "outline" : "destructive"}>
              {healthy ? "Engine online" : "Engine unavailable"}
            </Badge>
            <span className="font-mono text-xs text-muted-foreground">{data?.base_url}</span>
            <Badge variant="outline">
              Embedding dimension: {data?.pinned_embedding_dim ?? "not pinned"}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["selfhost-ai-engine"] })}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Re-check
            </Button>
          </div>

          <ul className="space-y-1.5 text-sm">
            {(data?.probe?.steps ?? []).map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                {s.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                )}
                <span>
                  {s.label}
                  {s.detail ? (
                    <span className="ml-2 text-xs text-muted-foreground">{s.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label>Chat model</Label>
              <Input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                className="mt-1 font-mono"
                placeholder="qwen2.5:7b"
              />
            </div>
            <div>
              <Label>Fast model</Label>
              <Input
                value={fast}
                onChange={(e) => setFast(e.target.value)}
                className="mt-1 font-mono"
                placeholder="qwen2.5:3b"
              />
            </div>
            <div>
              <Label>Embedding model</Label>
              <Input
                value={embedding}
                onChange={(e) => setEmbedding(e.target.value)}
                className="mt-1 font-mono"
                placeholder="bge-m3"
              />
            </div>
            <div>
              <Label>Ollama URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="mt-1 font-mono"
                placeholder="http://127.0.0.1:11434"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Changing the embedding model changes the vector length. OPSQAI re-probes the
            model and rebuilds the vector column and retrieval functions automatically;
            existing documents must then be re-indexed.
          </p>

          <div className="flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving…" : "Save engine configuration"}
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
