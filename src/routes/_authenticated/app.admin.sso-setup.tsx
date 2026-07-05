import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle2, Copy, ExternalLink, Loader2, ShieldCheck, Info, Clock, XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/sso-setup")({
  component: SsoSetupPage,
});

type IdpType = "azure_ad" | "okta" | "onelogin" | "ping" | "google_workspace" | "other";
type SsoStatus = "draft" | "pending_review" | "active" | "rejected";

type SsoConfig = {
  id: string;
  idp_type: IdpType;
  display_name: string | null;
  metadata_url: string | null;
  tenant_id: string | null;
  email_domains: string[];
  status: SsoStatus;
  notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
};

const IDP_LABELS: Record<IdpType, string> = {
  azure_ad: "Microsoft Entra ID (Azure AD)",
  okta: "Okta",
  onelogin: "OneLogin",
  ping: "Ping Identity",
  google_workspace: "Google Workspace",
  other: "Other SAML 2.0 IdP",
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5 min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
        <code className="text-xs flex-1 min-w-0 truncate font-mono">{value}</code>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            toast.success("Copied");
          }}
        >
          {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function SsoSetupPage() {
  const { isPlatformAdmin, isPlatformOwner, isAdmin, activeCompanyId, user } = useAuth();
  if (!isPlatformAdmin && !isPlatformOwner && !isAdmin) {
    throw redirect({ to: "/app" });
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const acsUrl = `${supabaseUrl}/auth/v1/sso/saml/acs`;
  const entityId = `${supabaseUrl}/auth/v1/sso/saml/metadata`;
  const metadataUrl = `${supabaseUrl}/auth/v1/sso/saml/metadata?download=true`;

  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form state
  const [idpType, setIdpType] = useState<IdpType>("azure_ad");
  const [displayName, setDisplayName] = useState("");
  const [metaUrl, setMetaUrl] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [domains, setDomains] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!activeCompanyId) return;
    setLoading(true);
    supabase
      .from("sso_configurations")
      .select("*")
      .eq("company_id", activeCompanyId)
      .maybeSingle()
      .then(({ data }) => {
        const c = data as SsoConfig | null;
        setConfig(c);
        if (c) {
          setIdpType(c.idp_type);
          setDisplayName(c.display_name ?? "");
          setMetaUrl(c.metadata_url ?? "");
          setTenantId(c.tenant_id ?? "");
          setDomains(c.email_domains.join(", "));
          setNotes(c.notes ?? "");
        }
        setLoading(false);
      });
  }, [activeCompanyId]);

  async function save(submit: boolean) {
    if (!activeCompanyId || !user) return;
    const parsedDomains = domains
      .split(/[,\s\n]+/)
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    if (submit) {
      if (!metaUrl.trim()) {
        toast.error("IdP metadata URL is required");
        return;
      }
      if (parsedDomains.length === 0) {
        toast.error("At least one email domain is required");
        return;
      }
    }

    setSaving(true);
    const payload = {
      company_id: activeCompanyId,
      idp_type: idpType,
      display_name: displayName.trim() || null,
      metadata_url: metaUrl.trim() || null,
      tenant_id: tenantId.trim() || null,
      email_domains: parsedDomains,
      notes: notes.trim() || null,
      status: submit ? ("pending_review" as SsoStatus) : ("draft" as SsoStatus),
      submitted_at: submit ? new Date().toISOString() : null,
      submitted_by: submit ? user.id : null,
    };

    const { data, error } = await supabase
      .from("sso_configurations")
      .upsert(payload, { onConflict: "company_id" })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setConfig(data as SsoConfig);
    toast.success(submit ? "Submitted for review" : "Draft saved");
  }

  const isPending = config?.status === "pending_review";
  const isActive = config?.status === "active";
  const isRejected = config?.status === "rejected";
  const locked = isPending || isActive;

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-4xl mx-auto w-full">
      <Link
        to="/app/admin/integrations/$provider"
        params={{ provider: "microsoft-sso" }}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to integration
      </Link>

      <header className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 items-start">
        <div className="h-14 w-14 shrink-0 rounded-2xl border grid place-items-center text-sky-500 bg-sky-500/10 border-sky-500/20">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Enterprise SSO</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold tracking-tight truncate">
            SSO configuration
          </h1>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {isActive && (
              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Active
              </Badge>
            )}
            {isPending && (
              <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" /> Pending review
              </Badge>
            )}
            {isRejected && (
              <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
                <XCircle className="h-3 w-3" /> Needs changes
              </Badge>
            )}
            {!config && (
              <Badge variant="outline" className="text-muted-foreground">Not configured</Badge>
            )}
          </div>
        </div>
      </header>

      {isRejected && config?.rejection_reason && (
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <p className="text-xs uppercase tracking-wider text-destructive mb-1">Review feedback</p>
          <p className="text-sm">{config.rejection_reason}</p>
        </Card>
      )}

      {/* Step 1 — Service Provider details */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center">1</span>
            <h2 className="text-sm font-semibold">Configure your identity provider</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            In your IdP (Azure Portal → Enterprise Applications, Okta admin, etc.) create a new SAML 2.0 application and paste these Service Provider values:
          </p>
        </div>
        <div className="grid gap-3">
          <CopyRow label="ACS URL (Reply URL)" value={acsUrl} />
          <CopyRow label="Entity ID (Identifier)" value={entityId} />
          <CopyRow label="SP Metadata (optional)" value={metadataUrl} />
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p><strong className="text-foreground">Azure AD quick steps:</strong></p>
            <ol className="list-decimal ml-4 space-y-0.5">
              <li>Azure Portal → Microsoft Entra ID → Enterprise applications → New application → Create your own → non-gallery.</li>
              <li>Single sign-on → SAML. Paste the ACS URL as <em>Reply URL</em> and the Entity ID as <em>Identifier</em>.</li>
              <li>Set <em>NameID</em> claim to <code className="font-mono">user.mail</code> (persistent, email format).</li>
              <li>Copy the <em>App Federation Metadata Url</em> — you'll paste it in step&nbsp;2.</li>
              <li>Assign the users/groups allowed to sign in.</li>
            </ol>
          </div>
        </div>
      </Card>

      {/* Step 2 — Submit config */}
      <Card className="p-5 sm:p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center">2</span>
            <h2 className="text-sm font-semibold">Submit your IdP details</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste your IdP metadata URL and the email domains that should route through SSO. Our team activates it (usually within 1 business day).
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading configuration…
          </div>
        ) : (
          <fieldset disabled={locked || saving} className="space-y-4 disabled:opacity-70">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="idp">Identity provider</Label>
                <Select value={idpType} onValueChange={(v) => setIdpType(v as IdpType)}>
                  <SelectTrigger id="idp"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(IDP_LABELS) as [IdpType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name (optional)</Label>
                <Input
                  id="displayName"
                  placeholder="e.g. Acme Corp SSO"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="metaUrl">IdP metadata URL <span className="text-destructive">*</span></Label>
              <Input
                id="metaUrl"
                type="url"
                placeholder="https://login.microsoftonline.com/.../federationmetadata.xml"
                value={metaUrl}
                onChange={(e) => setMetaUrl(e.target.value)}
                inputMode="url"
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Azure: "App Federation Metadata Url". Okta: "Identity Provider metadata".
              </p>
            </div>

            {idpType === "azure_ad" && (
              <div className="space-y-1.5">
                <Label htmlFor="tenantId">Azure Tenant ID (optional)</Label>
                <Input
                  id="tenantId"
                  placeholder="00000000-0000-0000-0000-000000000000"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="domains">Email domains <span className="text-destructive">*</span></Label>
              <Input
                id="domains"
                placeholder="acme.com, acme.co.uk"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                Users signing in with an email at these domains will be routed to your IdP. Comma or space separated.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes for our team (optional)</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Any specifics — group claims, attribute mapping requirements, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </fieldset>
        )}

        {!loading && !locked && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={() => save(true)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit for activation
            </Button>
            <Button
              variant="outline"
              onClick={() => save(false)}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Save as draft
            </Button>
          </div>
        )}

        {isPending && (
          <div className="flex gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Submitted {config?.submitted_at ? new Date(config.submitted_at).toLocaleString() : ""}.
              Our team will validate the metadata and activate SSO for your domains. You'll get an email when it's live.
            </p>
          </div>
        )}

        {isActive && (
          <div className="flex gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              SSO is active. Users with matching email domains are automatically redirected to your IdP on sign-in.
            </p>
          </div>
        )}
      </Card>

      {/* Step 3 — Test */}
      <Card className="p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center">3</span>
          <h2 className="text-sm font-semibold">Test sign-in</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Once activated, open the sign-in page in a private window and enter an email at one of your configured domains. You'll be redirected to your IdP.
        </p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <a href="/auth" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open sign-in page
          </a>
        </Button>
      </Card>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        SAML metadata and email domains are visible to platform administrators for activation and audit. Only company admins can submit or edit this configuration.
      </p>
    </div>
  );
}
