import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { globalSearch } from "@/lib/dashboard.functions";
import { useAuth } from "@/lib/auth-context";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  BookOpen,
  HelpCircle,
  MessageSquare,
  Users,
  Search,
  AlertTriangle,
  ClipboardCheck,
  MessagesSquare,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, any> = {
  sop: BookOpen,
  faq: HelpCircle,
  audit: MessageSquare,
  user: Users,
  gap: AlertTriangle,
  ai_audit: ClipboardCheck,
  thread: MessagesSquare,
  workspace: FlaskConical,
};
const LABELS: Record<string, string> = {
  sop: "SOPs",
  faq: "FAQs",
  audit: "Audit log",
  user: "Users",
  gap: "Knowledge gaps",
  ai_audit: "AI audits",
  thread: "Conversations",
  workspace: "Workspaces",
};

export function GlobalSearch({ asButton = false }: { asButton?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const { activeCompanyId } = useAuth() as any;
  const search = useServerFn(globalSearch);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setResults([]);
      return;
    }
    const h = setTimeout(async () => {
      try {
        const r = await search({ data: { q, companyId: activeCompanyId ?? null } });
        setResults(r.results as any[]);
      } catch {
        setResults([]);
      }
    }, 180);
    return () => clearTimeout(h);
  }, [q, open, activeCompanyId]);

  const groups = results.reduce<Record<string, any[]>>((acc, r) => {
    (acc[r.kind] ||= []).push(r);
    return acc;
  }, {});

  const go = (r: any) => {
    setOpen(false);
    if (r.kind === "sop") navigate({ to: "/app/knowledge" });
    else if (r.kind === "faq") navigate({ to: "/app/faq" });
    else if (r.kind === "audit") navigate({ to: "/app/admin/audit" });
    else if (r.kind === "user") navigate({ to: "/app/admin/users" });
    else if (r.kind === "gap") navigate({ to: "/app/admin/knowledge-gaps" });
    else if (r.kind === "ai_audit") navigate({ to: "/app/admin/ai-audit" });
    else if (r.kind === "thread")
      navigate({ to: "/app/chat/$threadId", params: { threadId: r.id } });
    else if (r.kind === "workspace")
      navigate({ to: "/app/workspace/$sessionId", params: { sessionId: r.id } });
  };

  return (
    <>
      {asButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-8 gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="text-xs hidden lg:inline">Search</span>
          <kbd className="hidden lg:inline-flex pointer-events-none h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={q}
          onValueChange={setQ}
          placeholder="Search SOPs, FAQs, users, audit…"
        />
        <CommandList>
          <CommandEmpty>
            {q.length < 2 ? "Type at least 2 characters." : "No results."}
          </CommandEmpty>
          {Object.entries(groups).map(([kind, items], i) => {
            const Icon = ICONS[kind] ?? Search;
            return (
              <div key={kind}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={LABELS[kind] ?? kind}>
                  {items.map((r) => (
                    <CommandItem
                      key={`${r.kind}-${r.id}`}
                      value={`${r.kind}-${r.label}-${r.id}`}
                      onSelect={() => go(r)}
                    >
                      <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate">{r.label}</div>
                        {r.sub && (
                          <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}
        </CommandList>
      </CommandDialog>
    </>
  );
}
