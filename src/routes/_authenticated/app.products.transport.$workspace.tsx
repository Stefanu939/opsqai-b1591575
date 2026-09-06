// OPSQAI Transport — the real Self-Hosted workspace surface.
//
// Every section reads and writes the local installation database through the
// authenticated Transport server functions. Access stays licence-gated at the
// product level and right-gated per user inside the company.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { ModulePage } from "@/components/app/module-page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLicense } from "@/lib/license";
import { useT } from "@/i18n";
import { transportUi } from "@/i18n/pages/transport";
import { localizeWorkspaceLabel, WORKSPACE_UI } from "@/i18n/pages/product-workspaces";
import {
  findWorkspace,
  resolveEffectiveConfig,
  workspaceSiblings,
} from "@/lib/product-architecture";
import { resolveWorkspaceIcon } from "@/lib/workspace-icons";
import { OverviewSection } from "@/components/app/transport/overview-section";
import {
  CarriersSection,
  IncidentsSection,
  OperationsSection,
  RequestsSection,
} from "@/components/app/transport/registers-section";
import { AuditSection } from "@/components/app/transport/audit-section";
import { NotesSection } from "@/components/app/transport/notes-section";
import { MapSection } from "@/components/app/transport/map-section";
import { CmrSection } from "@/components/app/transport/cmr-section";
import { SettingsSection } from "@/components/app/transport/settings-section";
import {
  useTransportOverview,
  useTransportRegisters,
} from "@/components/app/transport/use-transport";

export const Route = createFileRoute(
  "/_authenticated/app/products/transport/$workspace",
)({
  component: TransportWorkspacePage,
});

function TransportWorkspacePage() {
  const { workspace: slug } = Route.useParams();
  const license = useLicense();
  const { lang } = useT();
  const ui = WORKSPACE_UI[lang] ?? WORKSPACE_UI.en;
  const found = findWorkspace("transport", slug);
  const t = transportUi(lang);

  const cfg = resolveEffectiveConfig({
    profile: license.profile,
    enabledProducts: license.products,
    entitlements: license.modules,
  });
  const enabled = cfg.products.includes("opsqai_transport");

  const title = found
    ? localizeWorkspaceLabel(found.workspace.route, found.workspace.label, lang)
    : t.eyebrow;

  if (!found) {
    return (
      <ModulePage eyebrow={t.eyebrow} title={ui.unknownTitle}>
        <EmptyState icon={ShieldOff} title={ui.unknownTitle} description={ui.unknownBody} />
      </ModulePage>
    );
  }

  if (!enabled) {
    return (
      <ModulePage eyebrow={t.eyebrow} title={title}>
        <EmptyState
          icon={ShieldOff}
          title={t.notLicensed}
          description={t.notLicensedBody}
          action={
            <Button asChild variant="outline">
              <Link to="/app/modules">{ui.backToLicense}</Link>
            </Button>
          }
        />
      </ModulePage>
    );
  }

  const siblings = workspaceSiblings(found.workspace);

  return (
    <ModulePage
      eyebrow={`${t.eyebrow} · ${found.product.label}`}
      title={title}
      description={found.workspace.description}
      tabs={
        <div className="flex flex-wrap gap-2">
          {siblings.map((w) => {
            const Icon = resolveWorkspaceIcon(w.icon);
            const active = w.key === found.workspace.key;
            return (
              <Button key={w.key} asChild size="sm" variant={active ? "default" : "outline"}>
                <Link
                  to="/app/products/transport/$workspace"
                  params={{ workspace: (w.route ?? "").split("/").pop() ?? "" }}
                >
                  <Icon className="mr-1.5 size-3.5" />
                  {localizeWorkspaceLabel(w.route, w.label, lang)}
                </Link>
              </Button>
            );
          })}
        </div>
      }
    >
      <TransportSection slug={slug} lang={lang} t={t} />
    </ModulePage>
  );
}

function TransportSection({
  slug,
  lang,
  t,
}: {
  slug: string;
  lang: string;
  t: ReturnType<typeof transportUi>;
}) {
  const uiLang: "en" | "de" | "ro" =
    lang === "de" ? "de" : lang === "ro" ? "ro" : "en";

  if (slug === "map") return <MapSection t={t} />;
  if (slug === "cmr") return <CmrSection t={t} />;
  if (slug === "settings") return <SettingsSection t={t} />;
  if (slug === "procedures") {
    return (
      <div className="grid gap-4">
        <AuditSection t={t} />
        <NotesSection t={t} />
      </div>
    );
  }
  if (slug === "overview" || slug === "intelligence") {
    return <TransportOverview t={t} />;
  }
  return <TransportRegisters slug={slug} lang={uiLang} t={t} />;
}

function TransportOverview({ t }: { t: ReturnType<typeof transportUi> }) {
  const query = useTransportOverview();
  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.none} description={(query.error as Error).message} />;
  }
  if (!query.data) return <EmptyState title={t.none} />;
  return <OverviewSection t={t} data={query.data} />;
}

function TransportRegisters({
  slug,
  lang,
  t,
}: {
  slug: string;
  lang: "en" | "de" | "ro";
  t: ReturnType<typeof transportUi>;
}) {
  const query = useTransportRegisters();
  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.none} description={(query.error as Error).message} />;
  }
  const data = query.data;
  if (!data) return <EmptyState title={t.none} />;

  if (slug === "carriers") return <CarriersSection t={t} lang={lang} data={data} />;
  if (slug === "incidents") return <IncidentsSection t={t} lang={lang} data={data} />;
  if (slug === "requests") return <RequestsSection t={t} lang={lang} data={data} />;
  return <OperationsSection t={t} lang={lang} data={data} />;
}
