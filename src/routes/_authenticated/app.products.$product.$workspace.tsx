// Product Workspace surface — the single real route family behind every
// OPSQAI Product workspace:
//
//   /app/products/<product-slug>/<workspace-slug>
//
// The workspace does NOT invent ERP / TMS / HRIS / accounting functionality.
// It gives a licensed domain its own operational context and surfaces the Core
// platform capabilities that matter inside that domain. Core capabilities stay
// Core: still part of every installation, still RBAC-gated.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLicense } from "@/lib/license";
import { useT } from "@/i18n";
import {
  CORE_CAPABILITIES,
  findWorkspace,
  productSlug,
  resolveEffectiveConfig,
  workspaceSiblings,
  type CoreCapabilityKey,
} from "@/lib/product-architecture";
import { resolveWorkspaceIcon } from "@/lib/workspace-icons";
import { localizeWorkspaceLabel, WORKSPACE_UI } from "@/i18n/pages/product-workspaces";
import { ShieldOff, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/products/$product/$workspace")({
  component: ProductWorkspacePage,
});

/** Core capabilities that already own a real Self-Hosted route. */
const CORE_ROUTES: Partial<Record<CoreCapabilityKey, string>> = {
  chat: "/app/chat",
  kb: "/app/knowledge",
  faq: "/app/faq",
  academy: "/app/academy",
  audit_log: "/app/audit",
  knowledge_gaps: "/app/gaps",
  sop_versioning: "/app/knowledge",
  reports: "/app",
  workspace_health: "/app",
  compliance_center: "/app/organization",
  enterprise_export: "/app/organization",
  internal_requests: "/app/chat",
  support_center: "/app/chat",
  multi_language: "/app/organization",
  internal_chat: "/app/chat",
  notifications: "/app",
};

function ProductWorkspacePage() {
  const { product: slug, workspace: workspaceSlug } = Route.useParams();
  const license = useLicense();
  const { lang } = useT();
  const ui = WORKSPACE_UI[lang] ?? WORKSPACE_UI.en;

  const found = findWorkspace(slug, workspaceSlug);

  if (!found) {
    return (
      <ModulePage eyebrow={ui.eyebrow} title={ui.unknownTitle}>
        <EmptyState icon={ShieldOff} title={ui.unknownTitle} description={ui.unknownBody} />
      </ModulePage>
    );
  }

  const { product, workspace } = found;

  // A company profile never activates a product — only explicit entitlements do.
  const cfg = resolveEffectiveConfig({
    profile: license.profile,
    enabledProducts: license.products,
    entitlements: license.modules,
  });
  const enabled = cfg.products.includes(product.key);

  const title = localizeWorkspaceLabel(workspace.route, workspace.label, lang);

  if (!enabled) {
    return (
      <ModulePage eyebrow={product.label} title={title} description={product.domain}>
        <EmptyState
          icon={ShieldOff}
          title={ui.notLicensedTitle}
          description={ui.notLicensedBody}
          action={
            <Button asChild variant="outline">
              <Link to="/app/modules">{ui.backToLicense}</Link>
            </Button>
          }
        />
      </ModulePage>
    );
  }

  const siblings = workspaceSiblings(workspace);
  const coreKeys = workspace.coreCapabilities ?? [];

  return (
    <ModulePage
      eyebrow={`${ui.eyebrow} · ${product.label}`}
      title={title}
      description={workspace.description}
      tabs={
        <div className="flex flex-wrap gap-2">
          {siblings.map((w) => {
            const Icon = resolveWorkspaceIcon(w.icon);
            const active = w.key === workspace.key;
            return (
              <Button
                key={w.key}
                asChild
                size="sm"
                variant={active ? "default" : "outline"}
              >
                <Link
                  to="/app/products/$product/$workspace"
                  params={{
                    product: productSlug(product.key),
                    workspace: (w.route ?? "").split("/").pop() ?? "",
                  }}
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
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          glass
          className="lg:col-span-2"
          icon={resolveWorkspaceIcon(workspace.icon)}
          title={ui.coreInContext}
          description={ui.coreNote}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {coreKeys.map((key) => {
              const cap = CORE_CAPABILITIES.find((c) => c.key === key);
              if (!cap) return null;
              const to = CORE_ROUTES[key];
              return (
                <div
                  key={key}
                  className="rounded-lg border border-border bg-background/40 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{cap.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{cap.description}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      Core
                    </Badge>
                  </div>
                  <div className="mt-3">
                    {to ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link to={to}>{ui.open}</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{ui.noRouteYet}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel icon={Sparkles} title={product.label} description={product.domain}>
          <p className="text-sm text-muted-foreground">{product.description}</p>
          <p className="mt-4 text-xs text-muted-foreground">{ui.aiNote}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {product.capabilities.map((c) => (
              <Badge key={c} variant="outline" className="font-mono text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        </Panel>
      </div>
    </ModulePage>
  );
}
