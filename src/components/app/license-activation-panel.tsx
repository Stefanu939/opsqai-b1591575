import { useRef, useState } from "react";
import { FileUp, History, KeyRound, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  importActivationBundle,
  importActivationToken,
  listActivatedLicenses,
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
  const listHistory = useServerFn(listActivatedLicenses);

  const [value, setValue] = useState("");
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [info, setInfo] = useState<Preview | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const history = useQuery({
    queryKey: ["license-activation-history"],
    queryFn: () => listHistory({} as never),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 256 * 1024) {
      toast.error("That file is too large to be a license");
      return;
    }
    const text = (await file.text()).trim();
    setValue(text);
    setInfo(null);
    toast.success(`Loaded ${file.name} — verify before activating`);
  }


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
      void history.refetch();
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
        <input
          ref={fileRef}
          type="file"
          accept=".jwt,.json,.txt,.lic,application/json,text/plain"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <FileUp className="mr-1 h-4 w-4" />
          Import file
        </Button>
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

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          Activation history
        </div>
        {history.isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : (history.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No license has been activated on this install yet.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {(history.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2 text-[11px]"
              >
                <Badge variant="outline" className="text-[10px]">
                  {row.kind === "module" ? `module · ${row.module_key}` : "installation"}
                </Badge>
                {row.revoked ? (
                  <Badge variant="destructive" className="text-[10px]">
                    revoked
                  </Badge>
                ) : row.suspended ? (
                  <Badge variant="secondary" className="text-[10px]">
                    suspended
                  </Badge>
                ) : (
                  <Badge className="text-[10px]">active</Badge>
                )}
                {row.company_name && (
                  <span className="text-muted-foreground">{row.company_name}</span>
                )}
                {row.expires_at && (
                  <span className="text-muted-foreground">
                    expires {new Date(row.expires_at).toLocaleDateString()}
                  </span>
                )}
                {row.validated_at && (
                  <span className="ml-auto text-muted-foreground">
                    activated {new Date(row.validated_at).toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

