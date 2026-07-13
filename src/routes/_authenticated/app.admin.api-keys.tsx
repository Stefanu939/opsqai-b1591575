import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  KeyRound,
  Plus,
  Copy,
  CheckCircle2,
  Trash2,
  Loader2,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { listApiKeys, createApiKey, revokeApiKey, type ApiKeyRow } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/app/admin/api-keys")({
  component: ApiKeysPage,
});

function ApiKeysPage() {
  const { isAdmin, isPlatformAdmin, isPlatformOwner } = useAuth();
  if (!isAdmin && !isPlatformAdmin && !isPlatformOwner) {
    throw redirect({ to: "/app" });
  }

  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [freshSecret, setFreshSecret] = useState<{ key: ApiKeyRow; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await list();
      setKeys(r.keys);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load keys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onCreate() {
    if (!newName.trim()) {
      toast.error("Name is required");
      return;
    }
    setCreating(true);
    try {
      const r = await create({ data: { name: newName.trim() } });
      setFreshSecret({ key: r.key, secret: r.secret });
      setNewName("");
      setShowNew(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create key");
    } finally {
      setCreating(false);
    }
  }

  async function onRevoke(id: string) {
    try {
      await revoke({ data: { id } });
      toast.success("Key revoked");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke");
    }
  }

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-5xl mx-auto w-full">
      <Link
        to="/app/admin/integrations"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to integrations
      </Link>

      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4 items-start">
        <div className="h-14 w-14 shrink-0 rounded-2xl border grid place-items-center text-violet-500 bg-violet-500/10 border-violet-500/20">
          <KeyRound className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Developer</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold tracking-tight truncate">
            API keys
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage bearer tokens for the OPSQAI Public REST API v1.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/admin/api-docs">
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              API docs
            </Link>
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-3.5 w-3.5 mr-2" />
            New key
          </Button>
        </div>
      </header>

      <Card className="p-5 sm:p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading keys…
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <KeyRound className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No API keys yet.</p>
            <Button className="mt-4" size="sm" onClick={() => setShowNew(true)}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              Create your first key
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {keys.map((k) => {
              const revoked = !!k.revoked_at;
              return (
                <li
                  key={k.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{k.name}</span>
                      {revoked ? (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 bg-destructive/10 text-destructive text-[10px]"
                        >
                          Revoked
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]"
                        >
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <code className="font-mono">{k.key_prefix}••••••••</code>
                      <span>Created {new Date(k.created_at).toLocaleDateString()}</span>
                      {k.last_used_at && (
                        <span>Last used {new Date(k.last_used_at).toLocaleDateString()}</span>
                      )}
                      <span>Scopes: {k.scopes.join(", ")}</span>
                    </div>
                  </div>
                  {!revoked && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Revoke
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke this API key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Any client using <code className="font-mono">{k.key_prefix}…</code> will
                            stop working immediately. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRevoke(k.id)}>
                            Revoke key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Create dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>
              Give the key a descriptive name so you know where it's used (e.g. "Zapier
              production").
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="key-name">Name</Label>
            <Input
              id="key-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Zapier integration"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show-secret-once dialog */}
      <Dialog open={!!freshSecret} onOpenChange={(o) => !o && setFreshSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Copy your API key now
            </DialogTitle>
            <DialogDescription>
              This is the only time we'll show the full secret. Store it in a secure vault — you
              won't be able to view it again.
            </DialogDescription>
          </DialogHeader>
          {freshSecret && (
            <div className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 flex items-center gap-2">
                <code className="text-xs flex-1 min-w-0 break-all font-mono">
                  {freshSecret.secret}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(freshSecret.secret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                    toast.success("Copied");
                  }}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use as a bearer token:{" "}
                <code className="font-mono">
                  Authorization: Bearer {freshSecret.key.key_prefix}…
                </code>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setFreshSecret(null)}>I've saved it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
