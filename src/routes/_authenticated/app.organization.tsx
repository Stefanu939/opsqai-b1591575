import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getMyProfile, updateMyProfile, listDepartments } from "@/lib/users.functions";
import { getPlatformConfig, savePlatformAiConfig } from "@/lib/mc-admin.functions";
import { getCompanyLogo, saveCompanyLogo } from "@/lib/company-logo.functions";
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
import { Building2, User, Cpu, Upload, Trash2, Loader2 } from "lucide-react";
import { AvatarUploader } from "@/components/app/avatar-uploader";

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
  const fetchProfile = useServerFn(getMyProfile);
  const fetchDepts = useServerFn(listDepartments);
  const getCfg = useServerFn(getPlatformConfig);
  const saveAi = useServerFn(savePlatformAiConfig);
  const fetchLogo = useServerFn(getCompanyLogo);
  const saveLogo = useServerFn(saveCompanyLogo);

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

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchDepts()
      .then((d) => setDepts(d as Dept[]))
      .catch(() => {});
    if (!user) return;
    void fetchProfile().then((data) => {
      if (!data) return;
      setForm({
        first_name: data.first_name ?? "",
        last_name: data.last_name ?? "",
        position: data.position ?? "",
        phone: data.phone ?? "",
        department_id: data.department_id ?? "",
        language_pref: data.language_pref === "de" ? "de" : "en",
      });
    }).catch(() => {});
  }, [user, fetchDepts, fetchProfile]);

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

  useEffect(() => {
    fetchLogo({ data: {} } as never).then((r) => setLogoUrl(r.logo_url)).catch(() => {});
  }, [fetchLogo]);

  async function handleLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Only image files are allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return; }
    setLogoBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { logo_url } = await saveLogo({ data: { data_base64: base64, content_type: file.type } });
      setLogoUrl(logo_url);
      toast.success("Company logo saved");
    } catch (err) {
      toast.error("Could not save logo");
    } finally {
      setLogoBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

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
          <Card className="p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Profile picture</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shown next to your name across OPSQAI.
                </p>
              </div>
            </div>
            <AvatarUploader size="xl" />
          </Card>
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
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Company logo</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoPick}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoBusy}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoBusy ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG or WebP — max 2 MB.</p>
              </div>
            </div>

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
            {isSelfHosted ? (
              <div className="space-y-4">
                <Card className="p-6 space-y-2">
                  <h3 className="font-display text-lg font-semibold">On-premise AI engine</h3>
                  <p className="text-sm text-muted-foreground">
                    This installation runs every AI feature — chat, document understanding,
                    embeddings and audits — on the local engine bundled with OPSQAI. No prompt,
                    document or answer ever leaves this machine, and there is no cloud fallback:
                    if the local engine is unavailable, the affected feature reports it instead of
                    routing your data outside.
                  </p>
                  {aiInstallId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Install: {aiInstallId}
                    </p>
                  )}
                </Card>
                <LocalAiEngineCard />
              </div>
            ) : (
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
