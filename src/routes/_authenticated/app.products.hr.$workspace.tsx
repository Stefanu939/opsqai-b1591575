// OPSQAI HR — the real Self-Hosted workspace surface (Phase 1: employee core).
//
// Reads and writes the local installation database through the authenticated HR
// server functions. Licence-gated at product level, right-gated per user.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { ModulePage } from "@/components/app/module-page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useLicense } from "@/lib/license";
import { useT } from "@/i18n";
import { hrUi } from "@/i18n/pages/hr";
import { localizeWorkspaceLabel, WORKSPACE_UI } from "@/i18n/pages/product-workspaces";
import { findWorkspace, resolveEffectiveConfig } from "@/lib/product-architecture";
import { HrOverviewSection } from "@/components/app/hr/overview-section";
import { EmployeesSection } from "@/components/app/hr/employees-section";
import { TasksSection } from "@/components/app/hr/tasks-section";
import { HrSettingsSection } from "@/components/app/hr/settings-section";
import { useHrOverview } from "@/components/app/hr/use-hr";
import { DocumentsSection } from "@/components/app/hr/documents-section";
import { LifecycleSection } from "@/components/app/hr/lifecycle-section";
import { EquipmentSection } from "@/components/app/hr/equipment-section";
import { IncidentsSection } from "@/components/app/hr/incidents-section";
import { ScreeningSection } from "@/components/app/hr/screening-section";
import { HrAnalyticsSection } from "@/components/app/hr/analytics-section";
import { hrExtUi } from "@/i18n/pages/hr-ext";
import { hrWsUi } from "@/i18n/pages/hr-ws";
import { PoliciesSection } from "@/components/app/hr/policies-section";
import { RequestsSection } from "@/components/app/hr/requests-section";
import { KnowledgeSection } from "@/components/app/hr/knowledge-section";
import { TrainingSection } from "@/components/app/hr/training-section";
import { ComplianceSection } from "@/components/app/hr/compliance-section";
import { IntelligenceSection } from "@/components/app/hr/intelligence-section";

export const Route = createFileRoute("/_authenticated/app/products/hr/$workspace")({
  component: HrWorkspacePage,
});

function HrWorkspacePage() {
  const { workspace: slug } = Route.useParams();
  const license = useLicense();
  const { lang } = useT();
  const ui = WORKSPACE_UI[lang] ?? WORKSPACE_UI.en;
  const found = findWorkspace("hr", slug);
  const t = hrUi(lang);

  const cfg = resolveEffectiveConfig({
    profile: license.profile,
    enabledProducts: license.products,
    entitlements: license.modules,
  });
  const enabled = cfg.products.includes("opsqai_hr");

  if (!found) {
    return (
      <ModulePage eyebrow={t.eyebrow} title={ui.unknownTitle}>
        <EmptyState icon={ShieldOff} title={ui.unknownTitle} description={ui.unknownBody} />
      </ModulePage>
    );
  }

  const title = localizeWorkspaceLabel(found.workspace.route, found.workspace.label, lang);

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

  return (
    <ModulePage
      eyebrow={`${t.eyebrow} · ${found.product.label}`}
      title={title}
      description={found.workspace.description}
    >
      <HrSection slug={slug} t={t} x={hrExtUi(lang)} w={hrWsUi(lang)} />
    </ModulePage>
  );
}

function HrSection({
  slug,
  t,
  x,
  w,
}: {
  slug: string;
  t: ReturnType<typeof hrUi>;
  x: ReturnType<typeof hrExtUi>;
  w: ReturnType<typeof hrWsUi>;
}) {
  if (slug === "employees") return <EmployeesSection t={t} />;
  if (slug === "tasks") return <TasksSection t={t} w={w} x={x} />;
  if (slug === "settings") return <HrSettingsSection t={t} w={w} />;
  if (slug === "documents") return <DocumentsSection t={x} w={w} />;
  if (slug === "lifecycle") return <LifecycleSection t={x} w={w} h={t} />;
  if (slug === "equipment") return <EquipmentSection t={x} w={w} />;
  if (slug === "incidents") return <IncidentsSection t={x} />;
  if (slug === "screening") return <ScreeningSection t={x} />;
  if (slug === "analytics") return <HrAnalyticsSection t={x} />;
  if (slug === "policies") return <PoliciesSection w={w} />;
  if (slug === "requests") return <RequestsSection w={w} />;
  if (slug === "knowledge") return <KnowledgeSection w={w} />;
  if (slug === "training") return <TrainingSection w={w} />;
  if (slug === "compliance") return <ComplianceSection w={w} />;
  if (slug === "intelligence") return <IntelligenceSection w={w} />;
  if (slug === "overview") return <HrOverview t={t} w={w} x={x} />;
  return <EmptyState title={t.comingSoon} description={t.notLicensedBody} />;
}

function HrOverview({ t, w, x }: { t: ReturnType<typeof hrUi>; w: ReturnType<typeof hrWsUi>; x: ReturnType<typeof hrExtUi> }) {
  const query = useHrOverview();
  if (query.isPending) return <Skeleton className="h-72 w-full rounded-lg" />;
  if (query.error) {
    return <EmptyState title={t.employees} description={(query.error as Error).message} />;
  }
  if (!query.data) return <EmptyState title={t.employees} />;
  return <HrOverviewSection t={t} w={w} x={x} data={query.data} />;
}
