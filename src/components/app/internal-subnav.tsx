import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Sparkles, BookOpen } from "lucide-react";

const cls =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors data-[status=active]:bg-primary/10 data-[status=active]:text-primary";

export function InternalSubnav() {
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border/60 px-4 md:px-6 py-2 bg-background/80 backdrop-blur sticky top-0 z-20">
      <Link to="/app/internal" activeOptions={{ exact: true }} className={cls}>
        <LayoutDashboard className="h-3.5 w-3.5" /> Overview
      </Link>
      <Link to="/app/internal/assistant" className={cls}>
        <Sparkles className="h-3.5 w-3.5" /> OPSQAI Assistant
      </Link>
      <Link to="/app/internal/knowledge" className={cls}>
        <BookOpen className="h-3.5 w-3.5" /> System Knowledge
      </Link>
    </nav>
  );
}
