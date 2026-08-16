import { useState } from "react";
import { KeyRound, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  importActivationBundle,
  importActivationToken,
  previewActivationToken,
} from "@/lib/license-activation.functions";

interface Preview {
  ok: boolean;
  reason?: string;
  kind?: string;
  install_id?: string;
  expires_at?: number;
  maintenance_expires_at?: number | null;
  module?: string;
  seats?: number | null;
  customer?: string | null;
}

const isBundle = (t: string) => t.trim().startsWith("{");

/**
 * Add License — pastes a signed license issued by the Management Center
 * (a module JWT, an installation JWT, or a full activation bundle) and
 * activates it on this install. Verification is server-side against the
 * pinned public key; nothing is trusted client-side.
 */
export function LicenseActivationPanel({ onActivated }: { onActivated?: () => void }) {
  const preview = useServerFn(previewActivationToken);
  const importToken = useServerFn(importActivationToken);
  const importBundle = useServerFn(importActivationBundle);

  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [info, setInfo] = useState<Preview | null>(null);

  async function check() {
    const token = value.trim();
    if (!token) return;
    setChecking(true);
    setInfo(null);
    try {
      if (isBundle(token)) {
        // Bundles are verified token-by-token on import; preview the inner install token.
        const parsed = JSON.parse(token) as { install_token?: string; install_id?: string };
        if (!parsed.install_token) throw new Error("This bundle has no installation license.");
        const res = (await preview({ data: { token: parsed.install_token } } as never)) as Preview;
        setInfo(res);
      } else {
        const res = (await preview({ data: { token } } as never)) as Preview;
        setInfo(res);
      }
    } catch (e) {
      toast.error((e as Error).message || "Could not read this license");
    } finally {
      setChecking(false);
    }
  }

  async function activate() {
    const token = value.trim();
    if (!token) return;
    setApplying(true);
    try {
      if (isBundle(token)) {
        const res = (await importBundle({ data: { bundle_json: token } } as never)) as {
          modules?: Array<{ module_key: string; ok: boolean }>;
        };
        const ok = (res.modules ?? []).filter((m) => m.ok).length;
        toast.success(`License activated · ${ok} module license(s) applied`);
      } else {
        await importToken({ data: { token } } as never);
        toast.success("License activated on this install");
      }
      setValue("");
      setInfo(null);
      onActivated?.();
      // Entitlements are resolved server-side at load; reload to apply them.
      window.setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      const msg = (e as Error).message || "Activation failed";
      toast.error(
        msg.includes("import_denied")
          ? `License rejected: ${msg.split(":").slice(1).join(":") || "invalid signature"}`
          : msg,
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <Panel
      title="Add a license"
      description="Paste the module license, installation license or activation bundle issued by OPSQAI. Works fully offline."
      icon={KeyRound}
      glass
    >
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        spellCheck={false}
        placeholder="eyJhbGciOiJFZERTQSIsImtpZCI6... or the full activation bundle JSON"
        className="font-mono text-[11px]"
      />

      {info && (
        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 text-xs">
          {info.ok ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {info.kind === "module" ? `module · ${info.module}` : "installation"}
                </Badge>
                {info.install_id && (
                  <span className="text-muted-foreground">install {info.install_id}</span>
                )}
                {info.customer && <span className="text-muted-foreground">{info.customer}</span>}
              </div>
              <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                {info.expires_at && (
                  <li>Valid until {new Date(info.expires_at * 1000).toLocaleDateString()}</li>
                )}
                {info.maintenance_expires_at && (
                  <li>
                    Maintenance until{" "}
                    {new Date(info.maintenance_expires_at * 1000).toLocaleDateString()}
                  </li>
                )}
                {info.seats != null && <li>{info.seats} seats</li>}
              </ul>
            </>
          ) : (
            <p className="text-destructive">
              Signature or claims rejected: {info.reason ?? "invalid"}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={checking} onClick={() => void check()}>
          <ShieldCheck className="mr-1 h-4 w-4" />
          Verify
        </Button>
        <Button
          size="sm"
          loading={applying}
          disabled={!value.trim() || (info != null && !info.ok)}
          onClick={() => void activate()}
        >
          <Upload className="mr-1 h-4 w-4" />
          Activate on this install
        </Button>
      </div>
    </Panel>
  );
}
