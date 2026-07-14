import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronRight, Search, Bell, Command, LogOut, User, Globe } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useT, type Lang } from "@/i18n";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";

const PATH_LABELS: Record<string, string> = {
  app: "OPSQAI",
  platform: "Platform",
  overview: "Overview",
  admin: "Admin",
  companies: "Companies",
  billing: "Billing",
  support: "Support Inbox",
  "ai-audit": "Audit AI",
  maintenance: "Recovery & Maintenance",
  platform_: "Platform Administration",
};

function labelFor(segment: string) {
  return PATH_LABELS[segment] ?? segment.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const LANG_LABEL: Record<Lang, string> = { ro: "RO", de: "DE", en: "EN" };
const LANG_NAME: Record<Lang, string> = { ro: "Română", de: "Deutsch", en: "English" };

export function PlatformTopbar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const navigate = useNavigate();

  const { lang, setLang, t } = useT();
  const [email, setEmail] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      setEmail(u.email ?? "");
      const meta = (u.user_metadata ?? {}) as { avatar_url?: string; picture?: string };
      setAvatarUrl(meta.avatar_url ?? meta.picture ?? null);
    });
  }, []);

  function changeLang(next: Lang) {
    setLang(next);
    document.documentElement.setAttribute("lang", next);
    toast.success(`${t("language") ?? "Language"}: ${LANG_NAME[next]}`);
  }

  const initials = (email || "?").slice(0, 2).toUpperCase();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--mc-gold-line)] bg-[#0a0a1a]/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a1a]/70">
      <SidebarTrigger className="h-8 w-8 shrink-0 rounded-md text-[var(--mc-fg-muted)] hover:bg-[var(--mc-surface-2)] hover:text-[var(--mc-gold)]" />

      <div className="flex min-w-0 items-center gap-1 text-[12px]">
        {segments.slice(0, -1).map((s, idx) => (
          <div key={idx} className="flex items-center gap-1 text-[var(--mc-fg-dim)]">
            <span className="truncate">{labelFor(s)}</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        ))}
        <span className="mc-heading truncate font-semibold text-[var(--mc-fg)]">
          {labelFor(segments[segments.length - 1] ?? "app")}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] px-2.5 py-1 text-[12px] text-[var(--mc-fg-muted)] w-56">
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <span className="ml-auto flex items-center gap-0.5 rounded border border-[var(--mc-gold-line)] px-1 py-0 text-[10px] text-[var(--mc-fg-dim)]">
            <Command className="h-2.5 w-2.5" />K
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] px-2 py-1 text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--mc-success)] shadow-[0_0_6px_var(--mc-success)]" />
          <span className="mc-eyebrow text-[var(--mc-fg-muted)]">prod</span>
        </div>

        {/* Language switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] px-2 text-[11px] font-semibold text-[var(--mc-fg-muted)] hover:text-[var(--mc-gold-glow)]"
              aria-label="Language"
            >
              <Globe className="h-3.5 w-3.5" />
              {LANG_LABEL[lang]}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuLabel className="mc-eyebrow">Language</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <DropdownMenuRadioItem value="ro">Română</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="de">Deutsch</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <button
          type="button"
          className="relative h-8 w-8 rounded-md border border-[var(--mc-gold-line)] bg-[var(--mc-surface-2)] text-[var(--mc-fg-muted)] hover:text-[var(--mc-gold-glow)]"
          aria-label="Notifications"
        >
          <Bell className="mx-auto h-3.5 w-3.5" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--mc-gold)] shadow-[0_0_6px_var(--mc-gold)]" />
        </button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-2 rounded-full border border-[var(--mc-gold-line-strong)] bg-gradient-to-br from-[#2a2060] to-[#12122a] pl-0.5 pr-2 text-[11px] font-semibold text-[var(--mc-fg)] hover:brightness-110"
              aria-label="Profile"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-[var(--mc-gold-line-strong)]"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--mc-surface-3)] text-[10px] font-black tracking-tight text-[var(--mc-gold-glow)]">
                  {initials}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate text-[11px] text-[var(--mc-fg-muted)]">
              {email || "Signed in"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/app/profile" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-[var(--mc-danger)] focus:text-[var(--mc-danger)]">
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
