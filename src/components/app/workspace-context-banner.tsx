/**
 * Persistent context banner shown at the top of every authenticated page.
 * Tells the user which workspace they're viewing — especially important
 * for platform admins who can hop between companies via the sidebar
 * Workspace Context Switcher.
 */
import { Building2, Globe2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";

export function WorkspaceContextBanner() {
  const { isPlatformAdmin, activeCompanyId, companyName } = useAuth();
  if (!isPlatformAdmin) return null;
  const isGlobal = !activeCompanyId;
  return (
    <div className="border-b border-border bg-muted/30 px-4 md:px-8 py-2 flex items-center gap-2 text-[11px]">
      <span className="uppercase tracking-wider text-muted-foreground">Viewing workspace</span>
      {isGlobal ? (
        <Badge variant="secondary" className="gap-1.5">
          <Globe2 className="h-3 w-3" /> All Companies (Global)
        </Badge>
      ) : (
        <Badge variant="default" className="gap-1.5">
          <Building2 className="h-3 w-3" /> {companyName ?? "—"}
        </Badge>
      )}
      <span className="ml-auto text-muted-foreground hidden sm:inline">
        Platform context active
      </span>
    </div>
  );
}
