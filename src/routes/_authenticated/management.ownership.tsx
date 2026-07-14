import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listPlatformAdmins,
  promotePlatformAdmin,
  demotePlatformAdmin,
} from "@/lib/companies.functions";
import { listLicenses, transferOwnership } from "@/lib/licenses.functions";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Crown, Shield, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/management/ownership")({
  head: () => ({ meta: [{ title: "Ownership — Management Center" }] }),
  component: OwnershipPage,
});

type License = {
  id: string;
  install_id: string;
  company_name: string;
  owner_type: "opsqai" | "customer" | null;
  owner_since: string | null;
  handed_over_at: string | null;
  handover_notes: string | null;
};

type Admin = {
  id: string;
  email: string;
  full_name: string | null;
  last_sign_in_at: string | null;
  granted_at: string;
};

function OwnershipPage() {
  const qc = useQueryClient();
  const listLic = useServerFn(listLicenses);
  const transfer = useServerFn(transferOwnership);
  const listAdmins = useServerFn(listPlatformAdmins);
  const promote = useServerFn(promotePlatformAdmin);
  const demote = useServerFn(demotePlatformAdmin);

  const { data: licenses = [], isLoading: lLoading } = useQuery({
    queryKey: ["mc-ownership-licenses"],
    queryFn: () => listLic({ data: {} } as never) as Promise<License[]>,
  });

  const { data: admins = [], isLoading: aLoading } = useQuery({
    queryKey: ["mc-platform-admins"],
    queryFn: () => listAdmins({ data: {} } as never) as Promise<Admin[]>,
  });

  const transferMut = useMutation({
    mutationFn: (v: { install_id: string; to: "opsqai" | "customer"; notes?: string }) =>
      transfer({ data: v }),
    onSuccess: () => {
      toast.success("Ownership updated");
      qc.invalidateQueries({ queryKey: ["mc-ownership-licenses"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const promoteMut = useMutation({
    mutationFn: (email: string) => promote({ data: { email } }),
    onSuccess: () => {
      toast.success("Promoted");
      qc.invalidateQueries({ queryKey: ["mc-platform-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const demoteMut = useMutation({
    mutationFn: (user_id: string) => demote({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Demoted");
      qc.invalidateQueries({ queryKey: ["mc-platform-admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const licenseColumns: Column<License>[] = [
    {
      key: "company",
      header: "Company / Install",
      render: (l) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{l.company_name}</span>
          <span className="font-mono text-xs text-muted-foreground">{l.install_id}</span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (l) => (
        <Badge variant={l.owner_type === "customer" ? "default" : "outline"}>
          {l.owner_type ?? "opsqai"}
        </Badge>
      ),
    },
    {
      key: "since",
      header: "Since",
      render: (l) => (
        <span className="text-xs text-muted-foreground">
          {l.owner_since ? new Date(l.owner_since).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "handed",
      header: "Handed over",
      render: (l) => (
        <span className="text-xs text-muted-foreground">
          {l.handed_over_at ? new Date(l.handed_over_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) => (
        <TransferDialog
          license={l}
          onTransfer={(v) => transferMut.mutate(v)}
          pending={transferMut.isPending}
        />
      ),
    },
  ];

  const adminColumns: Column<Admin>[] = [
    {
      key: "user",
      header: "User",
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {a.full_name || a.email}
          </span>
          <span className="text-xs text-muted-foreground">{a.email}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: () => (
        <Badge variant="outline">
          <Shield className="mr-1 h-3 w-3" />
          platform_admin
        </Badge>
      ),
    },
    {
      key: "last",
      header: "Last sign-in",
      render: (a) => (
        <span className="text-xs text-muted-foreground">
          {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (a) => (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm(`Demote ${a.email}?`)) demoteMut.mutate(a.id);
          }}
        >
          Demote
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Ownership"
        description="Installation handovers and platform administrator roles."
      />

      <SectionCard
        title="Installation ownership"
        description="Track which installs are still operated by OPSQAI and which have been handed over to the customer."
      >
        <DataTable<License>
          columns={licenseColumns}
          rows={licenses as License[]}
          rowKey={(l) => l.id}
          loading={lLoading}
          empty={{
            icon: ArrowRightLeft,
            title: "No installs yet",
            description: "Issue an installation license first.",
          }}
        />
      </SectionCard>

      <SectionCard
        title="Platform administrators"
        description="Users with global access to the Management Center."
        actions={<PromoteDialog onPromote={(v) => promoteMut.mutate(v)} pending={promoteMut.isPending} />}
      >
        <DataTable<Admin>
          columns={adminColumns}
          rows={admins as Admin[]}
          rowKey={(a) => a.id}
          loading={aLoading}
          empty={{
            icon: Shield,
            title: "No administrators yet",
            description: "Promote a user to grant Management Center access.",
          }}
        />
      </SectionCard>
    </div>
  );
}

function TransferDialog({
  license,
  onTransfer,
  pending,
}: {
  license: License;
  onTransfer: (v: { install_id: string; to: "opsqai" | "customer"; notes?: string }) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const target = license.owner_type === "customer" ? "opsqai" : "customer";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Hand over
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Transfer {license.install_id} to {target}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {target === "customer"
              ? "The customer will operate this install going forward. OPSQAI will not store any customer infrastructure secrets."
              : "OPSQAI will resume operational ownership of this install."}
          </p>
          <div>
            <Label>Notes (optional, non-secret)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Handover context…"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onTransfer({
                install_id: license.install_id,
                to: target,
                notes: notes || undefined,
              });
              setOpen(false);
              setNotes("");
            }}
            disabled={pending}
          >
            {pending ? "Transferring…" : `Transfer to ${target}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PromoteDialog({
  onPromote,
  pending,
}: {
  onPromote: (email: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Promote user</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to platform administrator</DialogTitle>
        </DialogHeader>
        <div>
          <Label>User email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!email.trim()) {
                toast.error("Email required");
                return;
              }
              onPromote(email.trim());
              setOpen(false);
              setEmail("");
            }}
            disabled={pending}
          >
            {pending ? "Promoting…" : "Promote"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
