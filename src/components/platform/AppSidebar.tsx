import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserPlus,
  KeyRound,
  Wrench,
  Activity,
  LifeBuoy,
  Settings,
  Building2,
  Package,
  Download,
  ClipboardCheck,
  Rocket,
  FileText,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface Item {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  desc: string;
  disabled?: boolean;
}

const GROWTH: Item[] = [
  {
    title: "Overview",
    url: "/app/platform/overview",
    icon: LayoutDashboard,
    desc: "KPI-uri MRR, licențe active, heartbeat, trend-uri.",
  },
  {
    title: "Onboard client",
    url: "/app/platform/onboarding",
    icon: UserPlus,
    desc: "Wizard 4 pași: creează client, emite licență, generează pachet, trimite email.",
  },
  {
    title: "Clienți",
    url: "/app/platform/customers",
    icon: Building2,
    desc: "Lista tenants OPSQAI · plan, status, utilizare, acțiuni.",
  },
  {
    title: "Installations",
    url: "/app/admin/installations",
    icon: Package,
    desc: "Installs înregistrate, heartbeat, versiune installer.",
  },
  {
    title: "Contacts",
    url: "/app/admin/contacts",
    icon: UserPlus,
    desc: "Contact comercial și tehnic per client.",
  },
  {
    title: "Monitoring",
    url: "/app/admin/monitoring",
    icon: Activity,
    desc: "Fleet health, drift instalări, semnale live.",
  },
];

const LICENSING: Item[] = [
  {
    title: "Licenses & Releases",
    url: "/app/platform/licenses",
    icon: KeyRound,
    desc: "Licențe + module + subscription lifecycle.",
  },
  {
    title: "Module Catalog",
    url: "/app/admin/module-catalog",
    icon: ClipboardCheck,
    desc: "Catalog frozen de module vandabile.",
  },
  {
    title: "Release Management",
    url: "/app/admin/release-management",
    icon: Rocket,
    desc: "Installer builds, signing, canale rollout.",
  },
  {
    title: "Maintenance",
    url: "/app/admin/maintenance",
    icon: Wrench,
    desc: "Ferestre de mentenanță, expirări, renewals.",
  },
  {
    title: "Downloads",
    url: "/app/admin/downloads",
    icon: Download,
    desc: "Installer releases + activation packages servite clienților.",
  },
];

const COMMERCIAL: Item[] = [
  {
    title: "Orders & Subscriptions",
    url: "/app/admin/subscriptions",
    icon: Package,
    desc: "Comenzi, abonamente și evenimente billing.",
  },
  {
    title: "Billing",
    url: "/app/admin/billing",
    icon: CreditCard,
    desc: "€15,000 produs one-off + mentenanță €200–€500/lună + module extra.",
  },
  {
    title: "Support Inbox",
    url: "/app/admin/support",
    icon: LifeBuoy,
    desc: "Tickete și conversații cu clienții.",
  },
];

const OPERATIONS: Item[] = [
  {
    title: "Enterprise Documents",
    url: "/app/admin/customers",
    icon: FileText,
    desc: "Contract, DPA, ISO — per client.",
  },
  {
    title: "Setup",
    url: "/app/platform/setup",
    icon: Wrench,
    desc: "Checklist configurare MC.",
  },
  {
    title: "Doctor",
    url: "/app/platform/doctor",
    icon: Activity,
    desc: "Diagnoză health MC + integrări.",
  },
];

const SYSTEM: Item[] = [
  {
    title: "Team",
    url: "/app/admin/platform-admins",
    icon: Settings,
    desc: "Platform admins, roluri și permisiuni MC.",
  },
  {
    title: "Platform Administration",
    url: "/app/admin/platform",
    icon: ShieldCheck,
    desc: "Setări globale platform.",
  },
  {
    title: "Recovery",
    url: "/app/platform/recovery",
    icon: LifeBuoy,
    desc: "Bootstrap tokens & disaster recovery.",
  },
];

function ItemButton({ item, collapsed, active }: { item: Item; collapsed: boolean; active: boolean }) {
  const inner = (
    <SidebarMenuButton
      asChild
      isActive={active}
      className="group/mci h-9 gap-2.5 rounded-md text-[13px] font-medium transition-colors data-[active=true]:bg-[var(--mc-surface-2)] data-[active=true]:text-[var(--mc-gold-glow)] hover:bg-[var(--mc-surface-2)] hover:text-[var(--mc-gold-glow)]"
    >
      <Link to={item.url} className="relative flex items-center gap-2.5">
        {active && (
          <span
            aria-hidden
            className="absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--mc-gold)] shadow-[0_0_8px_rgba(201,168,76,0.6)]"
          />
        )}
        <item.icon className="h-4 w-4 shrink-0 text-[var(--mc-fg-muted)] group-hover/mci:text-[var(--mc-gold)] group-data-[active=true]/mci:text-[var(--mc-gold)]" />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    </SidebarMenuButton>
  );
  if (!collapsed) return inner;
  return (
    <HoverCard openDelay={80} closeDelay={40}>
      <HoverCardTrigger asChild>{inner}</HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="start"
        sideOffset={12}
        className="w-64 border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-3)] text-[var(--mc-fg)]"
      >
        <div className="mc-eyebrow mb-1 text-[var(--mc-gold-glow)]">{item.title}</div>
        <p className="text-xs leading-relaxed text-[var(--mc-fg-muted)]">{item.desc}</p>
      </HoverCardContent>
    </HoverCard>
  );
}

function Group({ label, items, currentPath, collapsed }: {
  label: string;
  items: Item[];
  currentPath: string;
  collapsed: boolean;
}) {
  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="mc-eyebrow px-3 text-[var(--mc-fg-dim)]">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <ItemButton
                item={item}
                collapsed={collapsed}
                active={currentPath.startsWith(item.url)}
              />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function PlatformSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[var(--mc-gold-line)] bg-[#0a0a0a]"
    >
      <SidebarHeader className="border-b border-[var(--mc-gold-line)] bg-[#080808]">
        <div className="flex h-12 items-center gap-2 px-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--mc-gold-line-strong)] bg-[var(--mc-surface-2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="mc-gold-text text-[10px] font-black tracking-tight">MC</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="mc-heading truncate text-sm font-semibold tracking-tight text-[var(--mc-fg)]">
                Mission Control
              </div>
              <div className="mc-eyebrow text-[9px] text-[var(--mc-fg-dim)]">
                OPSQAI · Platform
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#0a0a0a]">
        <Group label="Growth" items={GROWTH} currentPath={currentPath} collapsed={collapsed} />
        <Group label="Operations" items={OPERATIONS} currentPath={currentPath} collapsed={collapsed} />
        <Group label="System" items={SYSTEM} currentPath={currentPath} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--mc-gold-line)] bg-[#080808]">
        {!collapsed && (
          <div className="px-3 py-2 text-[10px] text-[var(--mc-fg-dim)]">
            <div className="mc-num">env · production</div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--mc-success)] shadow-[0_0_6px_var(--mc-success)]" />
              <span>All systems nominal</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
