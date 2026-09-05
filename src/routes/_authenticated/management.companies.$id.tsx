import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listCompanies } from "@/lib/companies.functions";
import { listLicenses } from "@/lib/licenses.functions";
import {
  getCompanyArchitecture,
  setCompanyProduct,
  setCompanyProfile,
} from "@/lib/company-products.functions";
import { COMPANY_PROFILES } from "@/lib/product-architecture";
import { getMyInstallationPackageDownloadUrl } from "@/lib/installation-package.functions";
import { listSupportConversations } from "@/lib/support.functions";
import { listCustomerProfiles, upsertCustomerContract } from "@/lib/mc-admin.functions";
import { ManageCustomerDialog } from "@/components/app/manage-customer-dialog";
import { SharedAccessPanel } from "@/components/mc/shared-access";
import { ModulePage } from "@/components/app/module-page";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Building2,
  Download,
  FileSignature,
  FileText,
  Headset,
  KeyRound,
  Layers,
  Package,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";


export const Route = createFileRoute("/_authenticated/management/companies/$id")({
  component: CompanyDetailPage,
});

type License = {
  id: string;
  install_id: string;
  kind: string;
  module_key: string | null;
  company_name: string;
  contact_email: string | null;
  tier: string | null;
  seats: number | null;
  max_users: number | null;
  issued_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  suspended: boolean;
  created_at: string;
  install: {
    install_id: string;
    last_heartbeat_at: string | null;
    app_version: string | null;
    installer_version: string | null;
    user_count: number | null;
  } | null;
  modules: Array<{
    id: string;
    module_key: string | null;
    expires_at: string | null;
    revoked: boolean;
  }>;
};

function CompanyDetailPage() {
  const { id } = Route.useParams();
  const list = useServerFn(listCompanies);
  const listLic = useServerFn(listLicenses);
  const downloadUrl = useServerFn(getMyInstallationPackageDownloadUrl);

  const companyQ = useQuery({
    queryKey: ["mc-companies"],
    queryFn: () => list({ data: {} } as never),
  });
  const licensesQ = useQuery({
    queryKey: ["mc-licenses"],
    queryFn: () => listLic({ data: {} } as never),
  });

  const company = useMemo(
    () => (companyQ.data ?? []).find((c) => c.id === id),
    [companyQ.data, id],
  );

  const companyLicenses = useMemo(() => {
    if (!company) return [] as License[];
    const needle = company.name.trim().toLowerCase();
    return ((licensesQ.data ?? []) as License[]).filter(
      (l) => l.company_name.trim().toLowerCase() === needle,
    );
  }, [licensesQ.data, company]);

  const installs = companyLicenses; // kind === "install" (listLicenses already filtered)

  const downloadMut = useMutation({
    mutationFn: (installId: string) => downloadUrl({ data: { install_id: installId } }),
    onSuccess: (res) => {
      if (res?.signed_url) {
        window.open(res.signed_url, "_blank", "noopener");
        toast.success("Download started");
      } else {
        toast.error("Package not available yet");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (companyQ.isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <EmptyState
          icon={Building2}
          title="Company not found"
          description="This company does not exist or you no longer have access."
          action={
            <Button asChild variant="outline">
              <Link to="/management/companies">Back to companies</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const totalSeats = installs.reduce((s, l) => s + (l.seats ?? 0), 0);
  const totalOnline = installs.filter(
    (l) =>
      l.install?.last_heartbeat_at &&
      Date.now() - new Date(l.install.last_heartbeat_at).getTime() < 15 * 60 * 1000,
  ).length;

  return (
    <ModulePage
      eyebrow="Company"
      title={company.name}
      breadcrumbs={[{ label: "Companies", to: "/management/companies" }, { label: company.name }]}
      actions={
        <Badge variant={company.active ? "default" : "outline"}>
          {company.active ? company.subscription_status : "suspended"}
        </Badge>
      }
    >
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Plan" value={company.subscription_plan} icon={Package} />
        <StatCard
          label="Users"
          value={`${company.user_count} / ${company.max_users}`}
          icon={Users}
        />
        <StatCard label="Total seats" value={totalSeats || "—"} icon={KeyRound} />
        <StatCard label="Online installs" value={totalOnline} icon={Package} />
      </section>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
          <TabsTrigger value="download">Download</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>



        <TabsContent value="overview" className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="mb-3 font-display text-base font-semibold text-foreground">
              General information
            </h3>
            <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <Field label="Company ID" value={<code className="text-xs">{company.id}</code>} />
              <Field label="Name" value={company.name} />
              <Field label="Plan" value={company.subscription_plan} />
              <Field
                label="Subscription status"
                value={company.active ? company.subscription_status : "suspended"}
              />
              <Field label="Max users" value={String(company.max_users)} />
              <Field label="Users" value={String(company.user_count)} />
              <Field label="Documents" value={String(company.document_count)} />
              <Field label="FAQs" value={String(company.faq_count)} />
              {company.created_at && (
                <Field
                  label="Created"
                  value={formatDistanceToNow(new Date(company.created_at), {
                    addSuffix: true,
                  })}
                />
              )}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <ProductsTab companyId={company.id} />
        </TabsContent>

        <TabsContent value="installations">

          <InstallationsTable
            installs={installs}
            loading={licensesQ.isLoading}
            onDownload={(installId) => downloadMut.mutate(installId)}
            downloading={downloadMut.isPending ? downloadMut.variables : null}
          />
        </TabsContent>

        <TabsContent value="licenses">
          <LicensesTable installs={installs} loading={licensesQ.isLoading} />
        </TabsContent>

        <TabsContent value="download" className="space-y-3">
          {installs.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No installation to package"
              description="Issue an installation license from Licenses first."
            />
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border">
              {installs.map((l) => (
                <div key={l.install_id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      {l.tier ?? "install"} · {l.seats ?? 0} seats
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <code className="font-mono">{l.install_id}</code>
                    </div>
                  </div>
                  <Button
                    onClick={() => downloadMut.mutate(l.install_id)}
                    disabled={downloadMut.isPending}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download package
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <EmptyState
            icon={FileText}
            title="Activity log"
            description="Recent activity for this company is reflected in its licenses and installations."
            action={
              <Button variant="outline" asChild>
                <Link to="/management/installations">Open Installations</Link>
              </Button>
            }
          />
        </TabsContent>
      </Tabs>
    </ModulePage>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

function InstallationsTable({
  installs,
  loading,
  onDownload,
  downloading,
}: {
  installs: License[];
  loading: boolean;
  onDownload: (id: string) => void;
  downloading: string | null;
}) {
  const columns: Column<License>[] = [
    {
      key: "install",
      header: "Install",
      render: (l) => <code className="font-mono text-xs">{l.install_id}</code>,
    },
    {
      key: "tier",
      header: "Tier",
      render: (l) => <Badge variant="outline">{l.tier ?? "—"}</Badge>,
    },
    {
      key: "seats",
      header: "Seats",
      align: "right",
      render: (l) => <span className="tabular-nums">{l.seats ?? "—"}</span>,
    },
    {
      key: "version",
      header: "Version",
      render: (l) => <span className="text-muted-foreground">{l.install?.app_version ?? "—"}</span>,
    },
    {
      key: "heartbeat",
      header: "Last heartbeat",
      render: (l) =>
        l.install?.last_heartbeat_at ? (
          formatDistanceToNow(new Date(l.install.last_heartbeat_at), { addSuffix: true })
        ) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (l) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDownload(l.install_id)}
          disabled={downloading === l.install_id}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Package
        </Button>
      ),
    },
  ];
  return (
    <DataTable<License>
      columns={columns}
      rows={installs}
      rowKey={(l) => l.install_id}
      loading={loading}
      empty={{
        icon: Package,
        title: "No installations",
        description: "This company has no installations yet.",
      }}
    />
  );
}

function LicensesTable({ installs, loading }: { installs: License[]; loading: boolean }) {
  const flat = installs.flatMap((l) => [
    {
      id: l.id,
      install_id: l.install_id,
      type: "install",
      key: l.tier ?? "install",
      expires_at: l.expires_at,
      revoked: l.revoked,
      suspended: l.suspended,
    },
    ...l.modules.map((m) => ({
      id: m.id,
      install_id: l.install_id,
      type: "module",
      key: m.module_key ?? "",
      expires_at: m.expires_at,
      revoked: m.revoked,
      suspended: false,
    })),
  ]);

  const columns: Column<(typeof flat)[number]>[] = [
    {
      key: "type",
      header: "Type",
      render: (r) => <Badge variant="outline">{r.type}</Badge>,
    },
    {
      key: "key",
      header: "Key",
      render: (r) => <span className="font-medium text-foreground">{r.key}</span>,
    },
    {
      key: "install",
      header: "Install",
      render: (r) => <code className="font-mono text-xs">{r.install_id}</code>,
    },
    {
      key: "expires",
      header: "Expires",
      render: (r) =>
        r.expires_at ? (
          new Date(r.expires_at).toLocaleDateString()
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) =>
        r.revoked ? (
          <Badge variant="destructive">Revoked</Badge>
        ) : r.suspended ? (
          <Badge variant="outline">Suspended</Badge>
        ) : (
          <Badge>Active</Badge>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={flat}
      rowKey={(r) => r.id}
      loading={loading}
      empty={{
        icon: KeyRound,
        title: "No licenses",
        description: "Issue a license from the Licenses page.",
      }}
    />
  );
}

// ─── Company Profile + enabled OPSQAI Products ──────────────────────────
//
// A company profile only RECOMMENDS products. Nothing is active until it is
// explicitly enabled here; the entitlement then travels in the license.
// Core platform capabilities are shown read-only — they are never
// purchasable and never toggleable.

function ProductsTab({ companyId }: { companyId: string }) {
  const qc = useQueryClient();
  const getArch = useServerFn(getCompanyArchitecture);
  const setProfile = useServerFn(setCompanyProfile);
  const setProduct = useServerFn(setCompanyProduct);

  const archQ = useQuery({
    queryKey: ["mc-company-architecture", companyId],
    queryFn: () => getArch({ data: { company_id: companyId } }),
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["mc-company-architecture", companyId] });

  const profileMut = useMutation({
    mutationFn: (business_type: string) =>
      setProfile({ data: { company_id: companyId, business_type } }),
    onSuccess: () => {
      toast.success("Company profile updated — no product was activated");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const productMut = useMutation({
    mutationFn: (v: { product_key: string; enabled: boolean }) =>
      setProduct({ data: { company_id: companyId, ...v } }),
    onSuccess: (_r, v) => {
      toast.success(v.enabled ? "Product enabled" : "Product disabled");
      void invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (archQ.isLoading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (archQ.isError)
    return (
      <EmptyState
        icon={Layers}
        title="Could not load products"
        description={(archQ.error as Error).message}
      />
    );

  const arch = archQ.data!;
  const enabled = new Set(arch.enabled_products as string[]);
  const available = new Set(arch.available_products as string[]);
  const recommended = new Set(arch.recommended_products as string[]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground">Company profile</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The business type of this customer. It determines which OPSQAI Products are recommended
          and available — it never activates anything on its own.
        </p>
        <div className="mt-3 max-w-sm">
          <Select
            value={arch.profile}
            onValueChange={(v) => profileMut.mutate(v)}
            disabled={profileMut.isPending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a company profile" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_PROFILES.map((p) => (
                <SelectItem key={p.key} value={p.key}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground">OPSQAI Products</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Explicit entitlements. Enabled products are distributed to the installation through the
          license payload.
        </p>
        <div className="mt-3 divide-y divide-border">
          {arch.catalog.map((p) => {
            const isAvailable = available.has(p.key);
            return (
              <div key={p.key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{p.label}</span>
                    <Badge variant="outline">{p.domain}</Badge>
                    {recommended.has(p.key) && <Badge>Recommended</Badge>}
                    {p.status === "planned" && <Badge variant="outline">Planned</Badge>}
                    {!isAvailable && <Badge variant="outline">Not for this profile</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                </div>
                <Switch
                  checked={enabled.has(p.key)}
                  disabled={productMut.isPending || (!isAvailable && !enabled.has(p.key))}
                  onCheckedChange={(v) => productMut.mutate({ product_key: p.key, enabled: v })}
                  aria-label={`Enable ${p.label}`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground">
          Included OPSQAI Core
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Part of the OPSQAI platform for every customer. Not purchasable, not activatable — still
          restricted by roles and permissions.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {arch.core_capabilities.map((c) => (
            <Badge key={c.key} variant="outline">
              {c.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold text-foreground">Optional add-ons</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          The only commercial capabilities. Granted per installation from the Licenses page.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {arch.addons.map((a) => (
            <Badge key={a.key} variant="outline">
              {a.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
