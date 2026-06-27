/**
 * Reusable Export & Migration dialog for Knowledge Base, FAQ and Workspace.
 * Reuses the existing OPSQAI Dialog / Card / Button styling — no redesign.
 *
 * Three modes:
 *   - "only"    : safe read-only export
 *   - "migrate" : export with manifest tailored for re-import
 *   - "delete"  : export + permanent deletion (requires typing DELETE,
 *                 and Workspace Owner or Platform Admin role)
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { runExport } from "@/lib/exports.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

type Mode = "only" | "migrate" | "delete";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: "kb" | "faq" | "workspace";
  /** Optional platform-admin scoping override */
  companyId?: string;
  /** Callback after a successful delete so caller can refresh */
  onDeleted?: () => void;
}

const KIND_LABEL: Record<Props["kind"], string> = {
  kb: "Knowledge Base",
  faq: "FAQ",
  workspace: "Workspace",
};

export function ExportDialog({ open, onOpenChange, kind, companyId, onDeleted }: Props) {
  const { isWorkspaceOwner, isPlatformAdmin } = useAuth();
  const canDelete = isWorkspaceOwner || isPlatformAdmin;
  const run = useServerFn(runExport);

  const [mode, setMode] = useState<Mode>("only");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string | null; sha256: string; bytes: number } | null>(null);

  const reset = () => { setMode("only"); setTyped(""); setResult(null); };

  const submit = async () => {
    setBusy(true);
    try {
      const r = await run({
        data: {
          kind,
          mode,
          format: "zip",
          company_id: companyId,
          delete_confirmation: mode === "delete" ? typed : undefined,
        },
      });
      setResult({ url: r.download_url, sha256: r.sha256, bytes: r.bytes });
      toast.success(
        mode === "delete"
          ? `${KIND_LABEL[kind]} exported and deleted`
          : `${KIND_LABEL[kind]} export ready`,
      );
      if (mode === "delete" && onDeleted) onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export {KIND_LABEL[kind]}</DialogTitle>
          <DialogDescription>
            Choose how to export. All operations are recorded in the Audit Log.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="grid gap-2">
              {(["only", "migrate", "delete"] as const).map((m) => {
                const disabled = m === "delete" && !canDelete;
                const active = mode === m;
                return (
                  <button
                    type="button"
                    key={m}
                    disabled={disabled}
                    onClick={() => setMode(m)}
                    className={`text-left rounded-lg border p-3 transition ${
                      active ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-primary/40"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {m === "only" && "Export Only"}
                        {m === "migrate" && "Export & Migrate"}
                        {m === "delete" && "Export + Delete"}
                      </span>
                      {m === "delete" && <Badge variant="destructive" className="text-[10px]">Irreversible</Badge>}
                      {disabled && <Badge variant="outline" className="text-[10px]">Workspace Owner only</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {m === "only" && "Download a ZIP archive. Nothing in your workspace changes."}
                      {m === "migrate" && "Generate a versioned package suitable for re-importing into another OPSQAI instance."}
                      {m === "delete" && "Export, verify the archive checksum, then permanently delete the source data from this workspace."}
                    </p>
                  </button>
                );
              })}
            </div>

            {mode === "delete" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <ShieldAlert className="h-4 w-4" /> Permanent deletion
                </div>
                <p className="text-xs text-muted-foreground">
                  After the archive is verified, all {KIND_LABEL[kind].toLowerCase()} records for this workspace will be removed. This cannot be undone.
                </p>
                <Label className="text-xs">Type <span className="font-mono font-semibold">DELETE</span> to confirm</Label>
                <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="DELETE" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Export completed and integrity verified.
            </div>
            <div className="text-xs text-muted-foreground space-y-1 font-mono break-all">
              <div>SHA-256: {result.sha256}</div>
              <div>Size: {(result.bytes / 1024).toFixed(1)} KB</div>
            </div>
            {result.url && (
              <Button asChild className="w-full">
                <a href={result.url} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4 mr-2" /> Download archive
                </a>
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <Button
              onClick={submit}
              disabled={busy || (mode === "delete" && typed !== "DELETE")}
              variant={mode === "delete" ? "destructive" : "default"}
              className="w-full"
            >
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Working…</> : mode === "delete" ? "Export + Delete" : "Run export"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
