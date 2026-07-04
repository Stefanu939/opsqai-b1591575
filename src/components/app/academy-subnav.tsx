import { Link } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Award, Sparkles, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const baseCls =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors data-[status=active]:bg-primary/10 data-[status=active]:text-primary";

export function AcademySubnav() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("academy.manage");
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border/60 px-4 md:px-6 py-2 bg-background/80 backdrop-blur sticky top-0 z-20">
      <Link to="/app/academy" activeOptions={{ exact: true }} className={baseCls}>
        <GraduationCap className="h-3.5 w-3.5" /> My Training
      </Link>
      <Link to="/app/academy/teacher" className={baseCls}>
        <Sparkles className="h-3.5 w-3.5" /> AI Teacher
      </Link>
      <Link to="/app/academy/courses" className={baseCls}>
        <BookOpen className="h-3.5 w-3.5" /> Course Catalog
      </Link>
      <Link to="/app/academy/certificates" className={baseCls}>
        <Award className="h-3.5 w-3.5" /> Certificates
      </Link>
      {canManage && (
        <>
          <span className="mx-1 h-4 w-px bg-border" />
          <Link to="/app/academy/analytics" className={baseCls}>
            <BarChart3 className="h-3.5 w-3.5" /> Analytics
          </Link>
          <Link to="/app/academy/settings" className={baseCls}>
            <SettingsIcon className="h-3.5 w-3.5" /> Settings
          </Link>
        </>
      )}
    </nav>
  );
}
