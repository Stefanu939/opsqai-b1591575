// Maps the UI-agnostic icon names declared in `product-architecture.ts` to
// real Lucide components. Keeping this here lets the architecture module stay
// free of UI imports.
import {
  AlertTriangle,
  Boxes,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CalendarRange,
  GraduationCap,
  Handshake,
  Inbox,
  LayoutDashboard,
  FileText,
  LineChart,
  MapPin,
  Package,
  Settings,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  AlertTriangle,
  Boxes,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CalendarRange,
  GraduationCap,
  Handshake,
  Inbox,
  LayoutDashboard,
  FileText,
  LineChart,
  MapPin,
  Package,
  Settings,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  UsersRound,
  Wallet,
  Workflow,
  Wrench,
};

export function resolveWorkspaceIcon(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}
