import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { Navigate } from "@tanstack/react-router";
import { getEmailSettings, sendTestEmail, updateEmailSettings } from "@/lib/email/settings.functions";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/admin/email")({
  component: PlatformEmailSettingsPage,
});

const FIELDS: Array<{ key: string; label: string; help?: string; type?: string }> = [
  { key: "sender_name", label: "Sender name" },
  { key: "sender_email", label: "Sender email", help: "From: address (must be on a verified sender domain)", type: "email" },
  { key: "reply_to_email", label: "Reply-to", help: "Where replies are delivered", type: "email" },
  { key: "support_email", label: "Support inbox", type: "email" },
  { key: "contact_email", label: "General contact inbox", type: "email" },
  { key: "security_email", label: "Security inbox", type: "email" },
  { key: "privacy_email", label: "Privacy / policy inbox", type: "email" },
  { key: "website_url", label: "Website URL" },
  { key: "company_name", label: "Company name" },
  { key: "footer_text", label: "Footer tagline" },
  { key: "logo_url", label: "Brand logo URL", help: "Absolute URL — shown in every email header" },
];

function PlatformEmailSettingsPage() {
  const { isPlatformAdmin, isPlatformOwner, user } = useAuth();
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (!isPlatformAdmin && !isPlatformOwner) return;
    getEmailSettings()
      .then((d) => setSettings((d ?? {}) as Record<string, any>))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [isPlatformAdmin, isPlatformOwner]);

  useEffect(() => {
    if (user?.email) setTestTo(user.email);
  }, [user?.email]);

  if (!isPlatformAdmin && !isPlatformOwner) return <Navigate to="/app" />;

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const fd = new FormData(e.currentTarget);
      const data: Record<string, any> = { provider: settings.provider ?? "lovable" };
      for (const f of FIELDS) data[f.key] = String(fd.get(f.key) ?? "").trim();
      await updateEmailSettings({ data });
      toast.success("Email settings saved");
      setSettings({ ...settings, ...data });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    try {
      await sendTestEmail({ data: { to: testTo } });
      toast.success(`Test email queued to ${testTo}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (loading || !settings) {
    return <div className="p-6 text-sm text-muted-foreground">Loading email settings…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Platform Email Settings</h1>
          <p className="text-sm text-muted-foreground">
            Centralised configuration for every email sent by OPSQAI — auth, notifications, invitations, Academy, support and more.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={onSave} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={settings.provider ?? "lovable"}
                onValueChange={(v) => setSettings({ ...settings, provider: v })}
              >
                <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable">Lovable Emails (managed)</SelectItem>
                  <SelectItem value="smtp" disabled>SMTP (coming soon)</SelectItem>
                  <SelectItem value="resend" disabled>Resend (coming soon)</SelectItem>
                  <SelectItem value="sendgrid" disabled>SendGrid (coming soon)</SelectItem>
                  <SelectItem value="mailgun" disabled>Mailgun (coming soon)</SelectItem>
                  <SelectItem value="postmark" disabled>Postmark (coming soon)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Provider is pluggable; add SMTP / Resend / SendGrid keys without changing app code.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  name={f.key}
                  type={f.type ?? "text"}
                  defaultValue={settings[f.key] ?? ""}
                  required
                />
                {f.help ? <p className="text-xs text-muted-foreground">{f.help}</p> : null}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Send test email</h2>
          <p className="text-sm text-muted-foreground">
            Validates sender domain, provider connection, template rendering and queue delivery end-to-end.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="testTo">Recipient</Label>
            <Input id="testTo" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <Button onClick={onTest} disabled={!testTo}>
            <Send className="mr-2 h-4 w-4" /> Send test email
          </Button>
        </div>
      </Card>
    </div>
  );
}
