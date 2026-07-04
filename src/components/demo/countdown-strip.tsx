import { Link } from "@tanstack/react-router";
import { Building2, Clock, ShieldCheck } from "lucide-react";
import { useDemoSession, DEMO_COMPANY_NAME } from "@/lib/demo/session";

export function DemoCountdownStrip() {
  const { display, secondsLeft } = useDemoSession();
  const low = secondsLeft <= 60;
  return (
    <div className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-11 flex items-center justify-between gap-4 text-[12px]">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="font-semibold truncate">{DEMO_COMPANY_NAME}</span>
          <span className="hidden sm:inline text-muted-foreground">·</span>
          <span className="hidden sm:inline text-muted-foreground truncate">Interactive Demo — read-only preview</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:flex items-center gap-1.5 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Read-only
          </span>
          <span className={`inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold ${low ? "text-destructive" : "text-foreground"}`}>
            <Clock className="h-3.5 w-3.5" />
            {display}
          </span>
          <Link to="/contact" className="hidden sm:inline text-primary hover:underline font-medium">Book a demo</Link>
        </div>
      </div>
    </div>
  );
}
