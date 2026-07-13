import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Circle, AlertTriangle, Rocket } from "lucide-react";
import {
  getFirstRunGate,
  getFirstRunProgress,
  acceptEula,
  firstRunImportLicense,
  firstRunTestStorage,
  firstRunSetAiProvider,
  firstRunTestSmtp,
  firstRunConfigureSso,
  firstRunSetBackupTarget,
  firstRunRunDoctor,
  firstRunCreateAdmin,
} from "@/lib/first-run.functions";

export const Route = createFileRoute("/first-run")({
  head: () => ({
    meta: [
      { title: "OPSQAI — First-Run Setup" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  beforeLoad: async () => {
    const gate = await getFirstRunGate();
    if (!gate.open) {
      throw redirect({ to: "/auth" });
    }
  },
  component: FirstRunWizard,
});

type StepId =
  | "eula"
  | "license"
  | "storage"
  | "ai"
  | "smtp"
  | "sso"
  | "backup"
  | "doctor"
  | "admin"
  | "finish";

const STEPS: { id: StepId; label: string }[] = [
  { id: "eula", label: "Accept license" },
  { id: "license", label: "Import license" },
  { id: "storage", label: "Configure storage" },
  { id: "ai", label: "Configure AI provider" },
  { id: "smtp", label: "Configure SMTP" },
  { id: "sso", label: "Configure SSO" },
  { id: "backup", label: "Configure backup" },
  { id: "doctor", label: "Test connections" },
  { id: "admin", label: "Create admin" },
  { id: "finish", label: "Finish" },
];

function FirstRunWizard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getProgress = useServerFn(getFirstRunProgress);
  const { data: progress } = useQuery({
    queryKey: ["first-run-progress"],
    queryFn: () => getProgress(),
  });

  const done = new Set<string>(progress?.setup_progress ?? []);
  const [currentIdx, setCurrentIdx] = useState(() => {
    // Resume where the customer left off.
    const idx = STEPS.findIndex((s) => !isStepDone(s.id, done));
    return idx < 0 ? STEPS.length - 1 : idx;
  });
  const current = STEPS[currentIdx];

  const advance = () => {
    qc.invalidateQueries({ queryKey: ["first-run-progress"] });
    setCurrentIdx((i) => Math.min(i + 1, STEPS.length - 1));
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">OPSQAI first-run setup</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            One-time wizard. Runs only when this install has no admin account yet.
            Progress is saved after each step — safe to close and resume.
          </p>
        </header>

        <Card className="p-4">
          <ol className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {STEPS.map((s, i) => {
              const complete = isStepDone(s.id, done) || i < currentIdx;
              const active = i === currentIdx;
              return (
                <li
                  key={s.id}
                  className={`flex items-center gap-1.5 ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  {complete ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {i + 1}. {s.label}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="p-6">
          {current.id === "eula" && <EulaStep onDone={advance} />}
          {current.id === "license" && <LicenseStep onDone={advance} />}
          {current.id === "storage" && <StorageStep onDone={advance} />}
          {current.id === "ai" && <AiStep onDone={advance} />}
          {current.id === "smtp" && <SmtpStep onDone={advance} />}
          {current.id === "sso" && <SsoStep onDone={advance} />}
          {current.id === "backup" && <BackupStep onDone={advance} />}
          {current.id === "doctor" && <DoctorStep onDone={advance} />}
          {current.id === "admin" && <AdminStep onDone={advance} />}
          {current.id === "finish" && (
            <FinishStep onDone={() => navigate({ to: "/auth", replace: true })} />
          )}
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
          >
            Back
          </Button>
          <div className="text-xs text-muted-foreground self-center">
            Step {currentIdx + 1} of {STEPS.length}
          </div>
        </div>
      </div>
    </div>
  );
}

function isStepDone(step: StepId, done: Set<string>): boolean {
  const map: Record<StepId, string | null> = {
    eula: "eula_accepted",
    license: "license_imported",
    storage: "storage_ok",
    ai: "ai_configured",
    smtp: "smtp_configured",
    sso: "sso_configured",
    backup: "backup_configured",
    doctor: null, // ephemeral — always shown
    admin: "admin_created",
    finish: null,
  };
  const id = map[step];
  return id ? done.has(id) : false;
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="mb-4 space-y-1">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  );
}

function EulaStep({ onDone }: { onDone: () => void }) {
  const [checked, setChecked] = useState(false);
  const call = useServerFn(acceptEula);
  const mut = useMutation({
    mutationFn: () => call({ data: { accepted: true } }),
    onSuccess: () => {
      toast.success("EULA accepted");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader title="End-User License Agreement" description="Please read and accept before continuing." />
      <Textarea
        readOnly
        rows={10}
        className="font-mono text-xs mb-3"
        value={`OPSQAI Self-Hosted End-User License Agreement (summary)

By installing OPSQAI Self-Hosted you agree to the license terms shipped in
your installation package under LICENSE.txt. Key points:

  - The software is licensed, not sold.
  - Use is bound to the install_id embedded in your Installation License.
  - You are responsible for the security of the host, database, storage,
    and backup destinations you configure below.
  - Telemetry: only heartbeat + license CRL check on schedule. No customer
    data leaves the install unless you enable an outbound integration.

Full text: docs/legal/eula.md (also in your installation package ZIP).`}
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
        I have read and accept the OPSQAI EULA.
      </label>
      <div className="mt-4">
        <Button disabled={!checked || mut.isPending} onClick={() => mut.mutate()}>
          Accept and continue
        </Button>
      </div>
    </>
  );
}

function LicenseStep({ onDone }: { onDone: () => void }) {
  const [token, setToken] = useState("");
  const call = useServerFn(firstRunImportLicense);
  const mut = useMutation({
    mutationFn: () => call({ data: { token: token.trim() } }),
    onSuccess: (r) => {
      if ("ok" in r && r.ok) {
        toast.success("License imported");
        onDone();
      } else {
        toast.error(`Import failed: ${(r as { reason: string }).reason}`);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="Import Installation License"
        description="Paste the signed token that starts with opsqai.v1. — from your OPSQAI representative or the Customer Portal."
      />
      <Textarea
        rows={6}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="opsqai.v1.eyJ..."
        className="font-mono text-xs"
      />
      <div className="mt-4">
        <Button disabled={token.length < 20 || mut.isPending} onClick={() => mut.mutate()}>
          Verify and import
        </Button>
      </div>
    </>
  );
}

function StorageStep({ onDone }: { onDone: () => void }) {
  const call = useServerFn(firstRunTestStorage);
  const mut = useMutation({
    mutationFn: () => call(),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success(`Storage OK (bucket: ${r.bucket})`);
        onDone();
      } else toast.error(`Storage test failed: ${r.error}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="Object storage"
        description="Verifies the uploads bucket is writable. Configure the connection in your .env before running this step (S3/MinIO endpoint, region, credentials)."
      />
      <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
        Run probe upload
      </Button>
    </>
  );
}

function AiStep({ onDone }: { onDone: () => void }) {
  const [provider, setProvider] = useState<"lovable" | "azure" | "openai-compatible" | "ollama">("lovable");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const call = useServerFn(firstRunSetAiProvider);
  const mut = useMutation({
    mutationFn: () =>
      call({ data: { provider, endpoint, model, api_key: apiKey } }),
    onSuccess: (r) => {
      toast.success(r.requires_restart ? "AI provider saved (restart container to apply)" : "AI provider saved");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="AI provider"
        description="Pick the LLM backend. Secrets are written to /var/lib/opsqai/secrets.env (chmod 600) and sourced by the container entrypoint — never stored in the database."
      />
      <div className="space-y-3">
        <div>
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lovable">Lovable AI Gateway (default)</SelectItem>
              <SelectItem value="azure">Azure OpenAI</SelectItem>
              <SelectItem value="openai-compatible">OpenAI-compatible endpoint</SelectItem>
              <SelectItem value="ollama">Ollama (self-hosted)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {provider !== "lovable" && (
          <>
            <div>
              <Label>Endpoint URL</Label>
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />
            </div>
          </>
        )}
        <div>
          <Label>API key</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
        </div>
      </div>
      <div className="mt-4">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Save AI configuration</Button>
      </div>
    </>
  );
}

function SmtpStep({ onDone }: { onDone: () => void }) {
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [testTo, setTestTo] = useState("");
  const call = useServerFn(firstRunTestSmtp);
  const mut = useMutation({
    mutationFn: () =>
      call({
        data: {
          host,
          port: Number(port),
          from_email: fromEmail,
          from_name: fromName,
          username,
          password,
          test_recipient: testTo,
        },
      }),
    onSuccess: () => { toast.success("SMTP saved"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="Outbound email (SMTP)"
        description="Values are written to secrets.env (chmod 600). Restart the container after finishing the wizard for changes to take effect."
      />
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Host</Label><Input value={host} onChange={(e) => setHost(e.target.value)} /></div>
        <div><Label>Port</Label><Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} /></div>
        <div><Label>From email</Label><Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
        <div><Label>From name</Label><Input value={fromName} onChange={(e) => setFromName(e.target.value)} /></div>
        <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" /></div>
        <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></div>
        <div className="col-span-2"><Label>Test recipient (optional)</Label><Input value={testTo} onChange={(e) => setTestTo(e.target.value)} /></div>
      </div>
      <div className="mt-4">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || !host || !fromEmail}>Save SMTP configuration</Button>
      </div>
    </>
  );
}

function SsoStep({ onDone }: { onDone: () => void }) {
  const call = useServerFn(firstRunConfigureSso);
  const mut = useMutation({
    mutationFn: (skip: boolean) => call({ data: { skip } }),
    onSuccess: () => { toast.success("SSO step recorded"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="Single Sign-On (optional)"
        description="Configure SAML/OIDC now, or skip and add it later under Admin → SSO Setup."
      />
      <div className="flex gap-2">
        <Button onClick={() => mut.mutate(false)} disabled={mut.isPending}>Configure later in admin</Button>
        <Button variant="outline" onClick={() => mut.mutate(true)} disabled={mut.isPending}>Skip</Button>
      </div>
    </>
  );
}

function BackupStep({ onDone }: { onDone: () => void }) {
  const [target, setTarget] = useState<"local" | "s3" | "azure" | "nas">("local");
  const [endpoint, setEndpoint] = useState("");
  const [bucket, setBucket] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const call = useServerFn(firstRunSetBackupTarget);
  const mut = useMutation({
    mutationFn: () =>
      call({
        data: { target, endpoint, bucket, access_key: accessKey, secret_key: secretKey },
      }),
    onSuccess: () => { toast.success("Backup target saved"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="Backup destination"
        description="Where nightly backups will be written. Credentials go to secrets.env — backup them alongside the DB (they are needed for DR restore)."
      />
      <div className="space-y-3">
        <div>
          <Label>Target</Label>
          <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="local">Local volume</SelectItem>
              <SelectItem value="s3">S3 / S3-compatible</SelectItem>
              <SelectItem value="azure">Azure Blob</SelectItem>
              <SelectItem value="nas">NAS / NFS mount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {target !== "local" && (
          <>
            <div><Label>Endpoint / URL</Label><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} /></div>
            <div><Label>Bucket / container</Label><Input value={bucket} onChange={(e) => setBucket(e.target.value)} /></div>
            <div><Label>Access key</Label><Input value={accessKey} onChange={(e) => setAccessKey(e.target.value)} autoComplete="off" /></div>
            <div><Label>Secret key</Label><Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} autoComplete="off" /></div>
          </>
        )}
      </div>
      <div className="mt-4">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>Save backup target</Button>
      </div>
    </>
  );
}

function DoctorStep({ onDone }: { onDone: () => void }) {
  const call = useServerFn(firstRunRunDoctor);
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["first-run-doctor"],
    queryFn: () => call(),
  });
  return (
    <>
      <StepHeader
        title="Test connections"
        description="Runs the same health probes as the post-install Doctor panel. All checks must be OK or WARN (no FAILs) before you can continue."
      />
      {data ? (
        <div className="space-y-2">
          {data.checks.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-3 rounded border p-2 text-sm">
              <div>
                <div className="font-medium">{c.label}</div>
                {c.detail && <div className="text-xs text-muted-foreground">{c.detail}</div>}
              </div>
              <StatusBadge status={c.status} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Running…</div>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>Re-run</Button>
        <Button
          onClick={onDone}
          disabled={!data || data.overall === "fail"}
        >
          Continue
        </Button>
      </div>
    </>
  );
}

function AdminStep({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const call = useServerFn(firstRunCreateAdmin);
  const mut = useMutation({
    mutationFn: () => call({ data: { email, password, full_name: fullName } }),
    onSuccess: () => { toast.success("Platform admin created"); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <>
      <StepHeader
        title="Create the first platform admin"
        description="This is the only user with root privileges on the install. Once created, this wizard is permanently sealed."
      />
      <div className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Save these credentials in your password manager <strong>before</strong> submitting. Recovery requires the
          DR break-glass procedure, not this wizard.
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></div>
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></div>
        <div><Label>Password (min 12 chars)</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
      </div>
      <div className="mt-4">
        <Button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || password.length < 12 || !email || !fullName}
        >
          Create admin account
        </Button>
      </div>
    </>
  );
}

function FinishStep({ onDone }: { onDone: () => void }) {
  return (
    <>
      <StepHeader
        title="All done"
        description="Restart the container so entrypoint.sh picks up the new secrets.env values, then sign in with your new admin account."
      />
      <ol className="text-sm list-decimal ml-5 space-y-1 mb-4">
        <li>Run <code className="text-xs bg-muted px-1 rounded">docker compose restart opsqai</code> on the host.</li>
        <li>Sign in at <code className="text-xs bg-muted px-1 rounded">/auth</code> with the admin credentials you just created.</li>
        <li>Verify green status on <code className="text-xs bg-muted px-1 rounded">/app/platform/setup</code> (the Doctor panel).</li>
      </ol>
      <Button onClick={onDone}>Go to sign-in</Button>
    </>
  );
}

function StatusBadge({ status }: { status: "ok" | "warn" | "fail" | "skip" }) {
  if (status === "ok") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">ok</Badge>;
  if (status === "warn") return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">warn</Badge>;
  if (status === "fail") return <Badge variant="destructive">fail</Badge>;
  return <Badge variant="outline">skip</Badge>;
}
