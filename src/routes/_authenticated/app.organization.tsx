import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { updateMyProfile, listDepartments } from "@/lib/users.functions";
import { getPlatformConfig, savePlatformAiConfig } from "@/lib/mc-admin.functions";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";
import { toast } from "sonner";
import { Building2, User, Cpu } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/organization")({
  head: () => ({ meta: [{ title: "Organization — OPSQAI" }] }),
  component: OrganizationPage,
});

interface Dept {
  id: string;
  name: string;
}

interface AiConfig {
  provider: "openai" | "azure" | "ollama" | "anthropic" | "gateway";
  model: string;
  base_url?: string | null;
  temperature: number;
  max_tokens?: number | null;
}

function OrganizationPage() {
  const { t, setLang } = useT();
  const { user, companyName, isPlatformAdmin, isAdmin } = useAuth();
  const canConfigureAi = isPlatformAdmin || isAdmin;

  const update = useServerFn(updateMyProfile);
  const fetchDepts = useServerFn(listDepartments);
  const getCfg = useServerFn(getPlatformConfig);
  const saveAi = useServerFn(savePlatformAiConfig);

  const [depts, setDepts] = useState<Dept[]>([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    position: "",
    phone: "",
    department_id: "",
    language_pref: "en" as "de" | "en",
  });
  const [busy, setBusy] = useState(false);

  const [ai, setAi] = useState<AiConfig>({
    provider: "gateway",
    model: "openai/gpt-5.5",
    base_url: null,
    temperature: 0.2,
    max_tokens: null,
  });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiInstallId, setAiInstallId] = useState<string | null>(null);

  useEffect(() => {
    fetchDepts()
      .then((d) => setDepts(d as Dept[]))
      .catch(() => {});
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name,last_name,position,department_id,language_pref")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        const { data: phoneVal } = await supabase.rpc("get_profile_phone", { _id: user.id });
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          position: data.position ?? "",
          phone: (phoneVal as string | null) ?? "",
          department_id: data.department_id ?? "",
          language_pref: data.language_pref === "de" ? "de" : "en",
        });
      });
  }, [user, fetchDepts]);

  useEffect(() => {
    if (!canConfigureAi) return;
    getCfg({ data: {} } as never)
      .then((cfg) => {
        if (!cfg) return;
        setAiInstallId(cfg.install_id ?? null);
        const c = cfg.ai_provider_config as unknown as AiConfig | null;
        if (c && c.provider) setAi(c);
      })
      .catch(() => {});
  }, [canConfigureAi, getCfg]);

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await update({ data: { ...form, department_id: form.department_id || null } });
      setLang(form.language_pref);
      toast.success(t("saved"));
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
    }
  };

  const submitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiBusy(true);
    try {
      await saveAi({ data: ai });
      toast.success("AI provider updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl w-full mx-auto">
      <PageHeader
        eyebrow="Self-hosted"
        title="Organization"
        description="Company profile, your personal settings, and the AI provider powering this installation."
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-1" /> My profile
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-1" /> Company
          </TabsTrigger>
          {canConfigureAi && (
            <TabsTrigger value="ai">
              <Cpu className="h-4 w-4 mr-1" /> AI provider
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card className="p-6">
            <form onSubmit={submitProfile} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">{t("email")}</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("firstName")}</Label>
                  <Input
                    value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("lastName")}</Label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("position")}</Label>
                  <Input
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("phone")}</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("department")}</Label>
                  <Select
                    value={form.department_id || "__none__"}
                    onValueChange={(v) =>
                      setForm({ ...form, department_id: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {depts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Select
                    value={form.language_pref}
                    onValueChange={(v) =>
                      setForm({ ...form, language_pref: v as "en" | "de" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving…" : t("save")}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="company">
          <Card className="p-6 space-y-3">
            <div>
              <Label className="text-xs">Company name</Label>
              <Input value={companyName ?? ""} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              Company details are managed by OPSQAI. Contact your account manager to change the
              legal name, VAT number, or seat count.
            </p>
          </Card>
        </TabsContent>

        {canConfigureAi && (
          <TabsContent value="ai">
            <Card className="p-6">
              <form onSubmit={submitAi} className="space-y-4">
                {aiInstallId && (
                  <div className="text-xs text-muted-foreground font-mono">
                    Install: {aiInstallId}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Provider</Label>
                    <Select
                      value={ai.provider}
                      onValueChange={(v) => setAi({ ...ai, provider: v as AiConfig["provider"] })}
                    >
                      <SelectTrigger>
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
                  <div className="space-y-1">
                    <Label className="text-xs">Model</Label>
                    <Input
                      value={ai.model}
                      onChange={(e) => setAi({ ...ai, model: e.target.value })}
                      placeholder="openai/gpt-5.5"
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Base URL (optional)</Label>
                    <Input
                      value={ai.base_url ?? ""}
                      onChange={(e) => setAi({ ...ai, base_url: e.target.value || null })}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Temperature</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={ai.temperature}
                      onChange={(e) =>
                        setAi({ ...ai, temperature: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max tokens (optional)</Label>
                    <Input
                      type="number"
                      value={ai.max_tokens ?? ""}
                      onChange={(e) =>
                        setAi({
                          ...ai,
                          max_tokens: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={aiBusy}>
                    {aiBusy ? "Saving…" : "Save AI provider"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  API keys are configured through server environment variables and never stored in
                  the database. Ollama runs entirely on-premise.
                </p>
              </form>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
