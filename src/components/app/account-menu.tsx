// Shared account menu (top-right) for Self-Hosted, Management Center and
// Customer Portal: presence status, holidays, profile settings, help, sign out.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  CircleUser,
  HelpCircle,
  LifeBuoy,
  LogOut,
  Palmtree,
  Search,
  Settings,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getMyPresence, setMyPresence } from "@/lib/presence.functions";
import {
  cancelTimeOff,
  decideTimeOff,
  listMyTimeOff,
  requestTimeOff,
} from "@/lib/time-off.functions";

export type PresenceStatusValue = "available" | "busy" | "away" | "dnd";

export const PRESENCE_META: Record<
  PresenceStatusValue,
  { label: string; dot: string }
> = {
  available: { label: "Available", dot: "bg-emerald-500" },
  busy: { label: "Busy", dot: "bg-red-500" },
  away: { label: "Away", dot: "bg-amber-500" },
  dnd: { label: "Do not disturb", dot: "bg-rose-600" },
};

export function PresenceDot({
  status,
  className,
}: {
  status: PresenceStatusValue;
  className?: string;
}) {
  return (
    <span
      aria-label={PRESENCE_META[status].label}
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background",
        PRESENCE_META[status].dot,
        className,
      )}
    />
  );
}

export interface HelpLink {
  label: string;
  description?: string;
  href: string;
  external?: boolean;
}

export interface AccountMenuProps {
  /** Route the "Profile settings" entry navigates to. */
  profilePath: string;
  /** Short role/context line under the name, e.g. "Platform staff". */
  roleLabel: string;
  helpLinks: HelpLink[];
  /** Cloud surfaces show a support shortcut; Self-Hosted stays local. */
  supportHref?: string | undefined;
  className?: string;
}

const EXPIRY_OPTIONS = [
  { key: "none", label: "No expiry", minutes: 0 },
  { key: "30m", label: "30 minutes", minutes: 30 },
  { key: "1h", label: "1 hour", minutes: 60 },
  { key: "4h", label: "4 hours", minutes: 240 },
  { key: "today", label: "Until end of day", minutes: -1 },
] as const;

function untilFrom(key: string): string | null {
  const opt = EXPIRY_OPTIONS.find((o) => o.key === key);
  if (!opt || opt.minutes === 0) return null;
  if (opt.minutes === -1) {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return d.toISOString();
  }
  return new Date(Date.now() + opt.minutes * 60_000).toISOString();
}

function fmtDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AccountMenu({
  profilePath,
  roleLabel,
  helpLinks,
  supportHref,
  className,
}: AccountMenuProps) {
  const { user, signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusOpen, setStatusOpen] = useState(false);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const enabled = Boolean(isAuthenticated && user?.id);

  const presence = useQuery({
    queryKey: ["presence", "me", user?.id],
    queryFn: () => getMyPresence({ data: {} }),
    enabled,
    retry: false,
    staleTime: 30_000,
  });

  const status = (presence.data?.status ?? "available") as PresenceStatusValue;

  const initials = useMemo(() => {
    const local = user?.email?.split("@")[0] ?? "";
    return (local.slice(0, 2) || "OQ").toUpperCase();
  }, [user?.email]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "ml-1 flex items-center gap-2 rounded-md border border-border bg-secondary/60 py-1 pl-1 pr-2.5 text-left transition-colors hover:bg-secondary",
              className,
            )}
          >
            <span className="relative">
              <span className="grid h-8 w-8 place-items-center rounded-sm bg-primary text-[11px] font-semibold text-primary-foreground">
                {initials}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5">
                <PresenceDot status={status} />
              </span>
            </span>
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-xs font-semibold text-foreground">
                {user?.email?.split("@")[0] ?? "Account"}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">{roleLabel}</span>
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="space-y-1">
            <div className="truncate text-sm font-semibold">
              {user?.email?.split("@")[0] ?? "Account"}
            </div>
            <div className="truncate text-xs font-normal text-muted-foreground">
              {user?.email}
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs font-normal text-muted-foreground">
              <PresenceDot status={status} />
              <span>{PRESENCE_META[status].label}</span>
              {presence.data?.message ? (
                <span className="truncate">— {presence.data.message}</span>
              ) : null}
            </div>
            <div className="text-[11px] font-normal text-muted-foreground">{roleLabel}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTimeout(() => setStatusOpen(true), 0)}>
            <CircleUser className="mr-2 h-4 w-4" />
            Set status
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTimeout(() => setHolidaysOpen(true), 0)}>
            <Palmtree className="mr-2 h-4 w-4" />
            Holidays
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              void navigate({ to: profilePath as never });
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Profile settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTimeout(() => setHelpOpen(true), 0)}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void (async () => {
                await qc.cancelQueries();
                qc.clear();
                await signOut();
                void navigate({ to: "/auth", replace: true });
              })();
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <StatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        current={{
          status,
          message: presence.data?.message ?? null,
        }}
      />
      <HolidaysDialog open={holidaysOpen} onOpenChange={setHolidaysOpen} />
      <HelpSheet
        open={helpOpen}
        onOpenChange={setHelpOpen}
        links={helpLinks}
        supportHref={supportHref}
      />
    </>
  );
}

function StatusDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  current: { status: PresenceStatusValue; message: string | null };
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<PresenceStatusValue>(current.status);
  const [message, setMessage] = useState(current.message ?? "");
  const [expiry, setExpiry] = useState<string>("none");

  useEffect(() => {
    if (open) {
      setStatus(current.status);
      setMessage(current.message ?? "");
      setExpiry("none");
    }
  }, [open, current.status, current.message]);

  const save = useMutation({
    mutationFn: () =>
      setMyPresence({
        data: {
          status,
          message: message.trim() ? message.trim() : null,
          until: untilFrom(expiry),
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["presence"] });
      toast.success("Status updated");
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not update status"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set status</DialogTitle>
          <DialogDescription>
            Your status is visible to colleagues in chat and conversation lists.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {(Object.keys(PRESENCE_META) as PresenceStatusValue[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={cn(
                "flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                status === key
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border hover:bg-secondary",
              )}
            >
              <PresenceDot status={key} />
              {PRESENCE_META[key].label}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Personal message (optional)
          </label>
          <Input
            value={message}
            maxLength={140}
            placeholder="In a meeting until 3pm"
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Clear after</label>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setExpiry(opt.key)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs",
                  expiry === opt.key
                    ? "border-primary/40 bg-primary/10"
                    : "border-border hover:bg-secondary",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_BADGE: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function HolidaysDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { isAuthenticated, user } = useAuth();
  const qc = useQueryClient();
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [reason, setReason] = useState("");

  const list = useQuery({
    queryKey: ["time-off", user?.id],
    queryFn: () => listMyTimeOff({ data: {} }),
    enabled: Boolean(open && isAuthenticated && user?.id),
    retry: false,
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["time-off"] });
    void qc.invalidateQueries({ queryKey: ["calendar"] });
  };

  const create = useMutation({
    mutationFn: () =>
      requestTimeOff({
        data: { startsOn, endsOn, reason: reason.trim() ? reason.trim() : null },
      }),
    onSuccess: (r) => {
      setReason("");
      refresh();
      toast.success(
        r.status === "approved" ? "Time off approved and added to calendar" : "Request sent for approval",
      );
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not send request"),
  });

  const decide = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" }) =>
      decideTimeOff({ data: v }),
    onSuccess: () => {
      refresh();
      toast.success("Request updated");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelTimeOff({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Request cancelled");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const canSubmit = startsOn !== "" && endsOn !== "" && endsOn >= startsOn;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Holidays</DialogTitle>
          <DialogDescription>
            Request time off. Approved periods appear automatically in the calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Reason (optional)
            </label>
            <Textarea
              rows={2}
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button
              onClick={() => create.mutate()}
              disabled={!canSubmit || create.isPending}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Request time off
            </Button>
          </div>
        </div>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">My requests</h3>
          {(list.data?.mine ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <ul className="space-y-2">
              {(list.data?.mine ?? []).map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                >
                  <span className="font-medium">
                    {fmtDate(r.startsOn)} – {fmtDate(r.endsOn)}
                  </span>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"}>
                    {STATUS_BADGE[r.status] ?? r.status}
                  </Badge>
                  {r.reason ? (
                    <span className="truncate text-muted-foreground">{r.reason}</span>
                  ) : null}
                  {r.status === "pending" || r.status === "approved" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      onClick={() => cancel.mutate(r.id)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        {list.data?.canApprove ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Requests to approve</h3>
            {(list.data?.pending ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting for you.</p>
            ) : (
              <ul className="space-y-2">
                {(list.data?.pending ?? []).map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5 text-sm"
                  >
                    <span className="font-medium">
                      {fmtDate(r.startsOn)} – {fmtDate(r.endsOn)}
                    </span>
                    {r.reason ? (
                      <span className="truncate text-muted-foreground">{r.reason}</span>
                    ) : null}
                    <span className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => decide.mutate({ id: r.id, decision: "rejected" })}
                      >
                        Reject
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function HelpSheet({
  open,
  onOpenChange,
  links,
  supportHref,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  links: HelpLink[];
  supportHref?: string | undefined;
}) {
  const [q, setQ] = useState("");
  const filtered = links.filter((l) =>
    (l.label + " " + (l.description ?? "")).toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Help</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search help topics…"
              className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
            />
          </label>

          <ul className="space-y-2">
            {filtered.map((l) => (
              <li key={l.href + l.label}>
                <a
                  href={l.href}
                  {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="block rounded-md border border-border p-3 text-sm transition-colors hover:bg-secondary"
                  onClick={() => onOpenChange(false)}
                >
                  <span className="font-medium">{l.label}</span>
                  {l.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {l.description}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="text-sm text-muted-foreground">No matching topic.</li>
            ) : null}
          </ul>

          {supportHref ? (
            <a
              href={supportHref}
              className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm font-medium"
              onClick={() => onOpenChange(false)}
            >
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </a>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
