import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import {
  getMyProfile,
  updateMyProfile,
  listDepartments,
  createDepartment,
} from "@/lib/users.functions";
import { getPlatformConfig, savePlatformAiConfig } from "@/lib/mc-admin.functions";
import { getCompanyLogo, saveCompanyLogo } from "@/lib/company-logo.functions";
import { ModulePage } from "@/components/app/module-page";
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
import { Building2, User, Cpu, Upload, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  getComplianceSettings,
  updateComplianceSettings,
} from "@/lib/compliance.functions";
import {
  listCountries,
  resolveCountryConfig,
  FRAMEWORKS,
  type FrameworkKey,
} from "@/lib/compliance-registry";
import { AvatarUploader } from "@/components/app/avatar-uploader";
import { LocalAiEngineCard } from "@/components/admin/local-ai-engine-card";
import { getClientDeploymentMode } from "@/lib/deployment-mode";

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
  const addDept = useServerFn(createDepartment);
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
  const [newDept, setNewDept] = useState("");
  const [deptBusy, setDeptBusy] = useState(false);
  const canManageDepts = isPlatformAdmin || isAdmin;

  const submitDept = async () => {
    const name = newDept.trim();
    if (!name) return;
    setDeptBusy(true);
    try {
      const created = await addDept({ data: { name } });
      setDepts((prev) =>
        prev.some((d) => d.id === created.id)
          ? prev
          : [...prev, { id: created.id, name: created.name }],
      );
      setForm((f) => ({ ...f, department_id: created.id }));
      setNewDept("");
      toast.success(`Department "${created.name}" is ready`);
    } catch (err) {
      toast.error("Could not create the department");
    } finally {
      setDeptBusy(false);
    }
  };

  const [ai, setAi] = useState<AiConfig>({
    provider: "gateway",
    model: "openai/gpt-5.5",
    base_url: null,
    temperature: 0.2,
    max_tokens: null,
  });
  const [aiBusy, setAiBusy] = useState(false);
  const isSelfHosted = getClientDeploymentMode() === "selfhost";
  const [aiInstallId, setAiInstallId] = useState<string | null>(null);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchDepts()
      .then((d) => setDepts(d as Dept[]))
      .catch(() => {});
    if (!user) return;
    void fetchProfile()
      .then((data) => {
        if (!data) return;
        setForm({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          position: data.position ?? "",
          phone: data.phone ?? "",
          department_id: data.department_id ?? "",
          language_pref: data.language_pref === "de" ? "de" : "en",
        });
      })
      .catch(() => {});
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
    fetchLogo({ data: {} } as never)
      .then((r) => setLogoUrl(r.logo_url))
      .catch(() => {});
  }, [fetchLogo]);

  async function handleLogoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2 MB");
      return;
    }
    setLogoBusy(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { logo_url } = await saveLogo({
        data: { data_base64: base64, content_type: file.type },
      });
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
    <ModulePage
      eyebrow="Workspace"
      title="Organization"
      description="Company profile, your personal settings, and the AI provider powering this installation."
    >
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-1" /> My profile
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building2 className="h-4 w-4 mr-1" /> Company
          </TabsTrigger>
          {canConfigureAi && (
            <TabsTrigger value="compliance">
              <ShieldCheck className="h-4 w-4 mr-1" /> Compliance
            </TabsTrigger>
          )}
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
                  {canManageDepts && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newDept}
                        placeholder="New department name"
                        onChange={(e) => setNewDept(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void submitDept();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        loading={deptBusy}
                        disabled={!newDept.trim()}
                        onClick={() => void submitDept()}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Select
                    value={form.language_pref}
                    onValueChange={(v) => setForm({ ...form, language_pref: v as "en" | "de" })}
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
          <TabsContent value="compliance">
            <ComplianceSettingsCard />
          </TabsContent>
        )}

        {canConfigureAi && (
          <TabsContent value="ai">
            {isSelfHosted ? (
              <div className="space-y-4">
                <Card className="p-6 space-y-2">
                  <h3 className="font-display text-lg font-semibold">On-premise AI engine</h3>
                  <p className="text-sm text-muted-foreground">
                    This installation runs every AI feature — chat, document understanding,
                    embeddings and audits — on the local engine bundled with OPSQAI. No prompt,
                    document or answer ever leaves this machine, and there is no cloud fallback: if
                    the local engine is unavailable, the affected feature reports it instead of
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
                        onChange={(e) => setAi({ ...ai, temperature: Number(e.target.value) || 0 })}
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
            )}
          </TabsContent>
        )}
      </Tabs>
    </ModulePage>
  );
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "ro", label: "Română" },
];

function ComplianceSettingsCard() {
  const load = useServerFn(getComplianceSettings);
  const save = useServerFn(updateComplianceSettings);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState("OTHER_EU");
  const [language, setLanguage] = useState("en");
  const [frameworks, setFrameworks] = useState<string[]>([]);
  const [intervals, setIntervals] = useState<Record<string, number>>({});
  const [defaultInterval, setDefaultInterval] = useState(365);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((s) => {
        if (cancelled) return;
        setCountry(s.country_code);
        setLanguage(s.primary_language);
        setFrameworks(s.framework_keys);
        setIntervals(s.review_interval_days ?? {});
        setDefaultInterval(s.default_review_interval_days);
        setError(null);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const cfg = resolveCountryConfig(country);

  const pickCountry = (code: string) => {
    const next = resolveCountryConfig(code);
    setCountry(next.code);
    setLanguage(next.defaultLanguage);
    setFrameworks([...next.applicableFrameworks]);
    setDefaultInterval(next.defaultReviewIntervalDays);
  };

  const toggleFramework = (key: string, on: boolean) =>
    setFrameworks((prev) => (on ? [...new Set([...prev, key])] : prev.filter((k) => k !== key)));

  const submit = async () => {
    setBusy(true);
    try {
      const payload = {
        country_code: country,
        primary_language: language,
        framework_keys: frameworks,
        review_interval_days: {
          ...intervals,
          default: defaultInterval,
        },
      };
      const saved = await save({ data: payload });
      setIntervals(saved.review_interval_days ?? {});
      toast.success("Compliance context updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading compliance context…
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-1">
        <h3 className="font-display text-lg font-semibold">Country &amp; compliance context</h3>
        <p className="text-xs text-muted-foreground max-w-2xl">
          Advisory only. These settings tell OPSQAI which jurisdiction, language and reference
          frameworks to consider when reviewing your documentation. They do not certify or assert
          legal compliance.
        </p>
      </div>

      {error && (
        <p className="text-xs text-destructive">Could not load current settings: {error}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Country / jurisdiction</Label>
          <Select value={country} onValueChange={pickCountry}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listCountries().map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Primary language</Label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        {cfg.dataProtectionContext}
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Reference frameworks</Label>
          <Badge variant="secondary" className="text-[10px]">
            {frameworks.length} selected
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(FRAMEWORKS) as FrameworkKey[]).map((key) => {
            const meta = FRAMEWORKS[key];
            const checked = frameworks.includes(key);
            const recommended = cfg.applicableFrameworks.includes(key);
            return (
              <div
                key={key}
                className="rounded-lg border border-border p-3 space-y-2 bg-card/60"
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`fw-${key}`}
                    checked={checked}
                    onCheckedChange={(v) => toggleFramework(key, v === true)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor={`fw-${key}`} className="text-xs font-semibold cursor-pointer">
                      {meta.name}
                      {recommended && (
                        <span className="ml-2 text-[10px] font-normal text-primary">
                          recommended
                        </span>
                      )}
                    </Label>
                    <p className="text-[11px] leading-snug text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                </div>
                {checked && (
                  <div className="flex items-center gap-2 pl-6">
                    <Label className="text-[11px] text-muted-foreground">Review every</Label>
                    <Input
                      type="number"
                      min={30}
                      max={1825}
                      className="h-7 w-20 text-xs"
                      value={intervals[key] ?? defaultInterval}
                      onChange={(e) =>
                        setIntervals((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                    />
                    <span className="text-[11px] text-muted-foreground">days</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Default review interval (days)</Label>
          <Input
            type="number"
            min={30}
            max={1825}
            className="w-32"
            value={defaultInterval}
            onChange={(e) => setDefaultInterval(Number(e.target.value))}
          />
        </div>
        <Button onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save compliance context"}
        </Button>
      </div>
    </Card>
  );
}
