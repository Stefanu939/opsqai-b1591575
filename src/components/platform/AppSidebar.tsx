import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  MessageSquare,
  Brain,
  ShieldCheck,
  Wrench,
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
}

const DASHBOARD: Item[] = [
  {
    title: "Overview",
    url: "/app/platform/overview",
    icon: LayoutDashboard,
    desc: "Salut, KPI, subscripții problemă, sugestii AI, firme care necesită update.",
  },
];

const COMPANIES: Item[] = [
  {
    title: "Companies",
    url: "/app/admin/companies",
    icon: Building2,
    desc: "Firme, planuri, licențe, releases și module — totul într-un singur ecran.",
  },
];

const COMMERCIAL: Item[] = [
  {
    title: "Billing",
    url: "/app/admin/billing",
    icon: CreditCard,
    desc: "Wizard de emitere abonament: pachet, mentenanță, module, rezumat 12 luni.",
  },
  {
    title: "Support Inbox",
    url: "/app/admin/support",
    icon: MessageSquare,
    desc: "Conversații cu clienții — WhatsApp premium.",
  },
];

const INTELLIGENCE: Item[] = [
  {
    title: "Audit AI",
    url: "/app/admin/ai-audit",
    icon: Brain,
    desc: "Health scoring firme, plăți, heartbeat, sugestii audit director-level.",
  },
];

const OPERATIONS: Item[] = [
  {
    title: "Recovery & Maintenance",
    url: "/app/admin/maintenance",
    icon: Wrench,
    desc: "Ferestre mentenanță, DR tokens, restore packages — combinate.",
  },
];

const SYSTEM: Item[] = [
  {
    title: "Platform Administration",
    url: "/app/admin/platform",
    icon: ShieldCheck,
    desc: "Organigramă echipa OPSQAI, roluri și governance.",
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
            className="absolute -left-2 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[var(--mc-gold)] shadow-[0_0_8px_rgba(124,92,255,0.7)]"
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
      className="border-r border-[var(--mc-gold-line)] bg-[#08081a]"
    >
      <SidebarHeader className="border-b border-[var(--mc-gold-line)] bg-[#06061a]">
        <div className="flex h-12 items-center gap-2 px-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--mc-gold-line-strong)] bg-gradient-to-br from-[#2a2060] to-[#12122a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_18px_-4px_rgba(124,92,255,0.55)]">
            <span className="mc-gold-text text-[10px] font-black tracking-tight">MC</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="mc-heading truncate text-sm font-semibold tracking-tight text-[var(--mc-fg)]">
                Mission Control
              </div>
              <div className="mc-eyebrow text-[9px] text-[var(--mc-fg-dim)]">
                OPSQAI · Cloud
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#08081a]">
        <Group label="Dashboard" items={DASHBOARD} currentPath={currentPath} collapsed={collapsed} />
        <Group label="Companies" items={COMPANIES} currentPath={currentPath} collapsed={collapsed} />
        <Group label="Commercial" items={COMMERCIAL} currentPath={currentPath} collapsed={collapsed} />
        <Group label="Intelligence" items={INTELLIGENCE} currentPath={currentPath} collapsed={collapsed} />
        <Group label="Operations" items={OPERATIONS} currentPath={currentPath} collapsed={collapsed} />
        <Group label="System" items={SYSTEM} currentPath={currentPath} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--mc-gold-line)] bg-[#06061a]">
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
