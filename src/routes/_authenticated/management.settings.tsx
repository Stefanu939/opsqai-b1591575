import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getPlatformConfig,
  savePlatformAiConfig,
} from "@/lib/mc-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/management/settings")({
  head: () => ({ meta: [{ title: "Settings — Management Center" }] }),
  component: SettingsPage,
});

type Provider = "openai" | "azure" | "ollama" | "anthropic" | "gateway";

type Config = {
  install_id: string | null;
  installer_version: string | null;
  eula_accepted_at: string | null;
  recovery_mode: boolean;
  updated_at: string | null;
  ai_provider_config: {
    provider?: Provider;
    model?: string;
    base_url?: string | null;
    temperature?: number;
    max_tokens?: number | null;
  } | null;
} | null;

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(getPlatformConfig);
  const save = useServerFn(savePlatformAiConfig);

  const { data, isLoading } = useQuery({
    queryKey: ["mc-platform-config"],
    queryFn: () => get({ data: {} } as never) as Promise<Config>,
  });

  const [provider, setProvider] = useState<Provider>("gateway");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState<number | "">("");

  useEffect(() => {
    if (!data?.ai_provider_config) return;
    const c = data.ai_provider_config;
    setProvider((c.provider as Provider) ?? "gateway");
    setModel(c.model ?? "");
    setBaseUrl(c.base_url ?? "");
    setTemperature(c.temperature ?? 0.2);
    setMaxTokens(c.max_tokens ?? "");
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (v: {
      provider: Provider;
      model: string;
      base_url?: string | null;
      temperature: number;
      max_tokens?: number | null;
    }) => save({ data: v }),
    onSuccess: () => {
      toast.success("AI provider configuration saved");
      qc.invalidateQueries({ queryKey: ["mc-platform-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (!model.trim()) {
      toast.error("Model is required");
      return;
    }
    saveMut.mutate({
      provider,
      model: model.trim(),
      base_url: baseUrl.trim() || null,
      temperature,
      max_tokens: maxTokens === "" ? null : Number(maxTokens),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Settings"
        description="Global platform configuration."
      />

      <SectionCard
        title="AI Provider"
        description="Default AI provider used across the platform when no per-install override is set."
      >
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => setProvider(v as Provider)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gateway">Lovable AI Gateway</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="ollama">Ollama (self-hosted)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. gpt-4o-mini, google/gemini-2.5-flash"
                  className="mt-1 font-mono"
                />
              </div>
            </div>

            {(provider === "azure" || provider === "ollama") && (
              <div>
                <Label>Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === "azure"
                      ? "https://<resource>.openai.azure.com"
                      : "http://localhost:11434"
                  }
                  className="mt-1 font-mono"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Temperature</Label>
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Max tokens (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxTokens}
                  onChange={(e) =>
                    setMaxTokens(e.target.value === "" ? "" : parseInt(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={submit} disabled={saveMut.isPending}>
                {saveMut.isPending ? "Saving…" : "Save AI configuration"}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Runtime" description="Read-only platform state.">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Install ID
              </dt>
              <dd className="mt-1 font-mono">{data?.install_id ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Installer version
              </dt>
              <dd className="mt-1 font-mono">{data?.installer_version ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                EULA accepted
              </dt>
              <dd className="mt-1">
                {data?.eula_accepted_at
                  ? new Date(data.eula_accepted_at).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Recovery mode
              </dt>
              <dd className="mt-1">
                {data?.recovery_mode ? (
                  <Badge variant="destructive">Active</Badge>
                ) : (
                  <Badge variant="outline">Off</Badge>
                )}
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>
    </div>
  );
}
