import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Send, Paperclip, Smile, Filter, Phone, MoreVertical, Check, CheckCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/support")({
  head: () => ({ meta: [{ title: "Support Inbox — Mission Control" }] }),
  component: SupportInbox,
});

interface Conv {
  id: string;
  name: string;
  company: string;
  initials: string;
  color: string;
  last: string;
  time: string;
  unread: number;
  status: "online" | "offline" | "away";
}

const CONVS: Conv[] = [
  { id: "1", name: "Andrei Popescu", company: "Contabil Expert SRL", initials: "AP", color: "#7c5cff", last: "Am o problemă cu importul ANAF…", time: "acum 2m", unread: 3, status: "online" },
  { id: "2", name: "Maria Ionescu", company: "Fiscal Pro Consulting", initials: "MI", color: "#22d3ee", last: "Mulțumesc pentru ajutor!", time: "acum 12m", unread: 0, status: "online" },
  { id: "3", name: "Ștefan Vlad", company: "Audit & Balance", initials: "SV", color: "#ec4899", last: "Când se face update-ul următor?", time: "1h", unread: 1, status: "away" },
  { id: "4", name: "Elena Radu", company: "Tax Advisory", initials: "ER", color: "#f59e0b", last: "OK, aștept răspunsul.", time: "3h", unread: 0, status: "offline" },
  { id: "5", name: "Bogdan Stan", company: "Bilanț Complet SA", initials: "BS", color: "#10b981", last: "Perfect, funcționează acum.", time: "ieri", unread: 0, status: "offline" },
  { id: "6", name: "Carmen Dobre", company: "Contab Plus", initials: "CD", color: "#a78bfa", last: "Am nevoie de acces admin.", time: "ieri", unread: 0, status: "offline" },
];

interface Msg { id: string; from: "me" | "them"; text: string; time: string; read?: boolean }

const THREAD: Msg[] = [
  { id: "m1", from: "them", text: "Bună ziua! Am o problemă cu importul din ANAF.", time: "09:12" },
  { id: "m2", from: "them", text: "Îmi dă eroare 'timeout' la fiecare încercare.", time: "09:12" },
  { id: "m3", from: "me", text: "Salut Andrei! Verific imediat, poți să-mi trimiți un screenshot cu eroarea?", time: "09:14", read: true },
  { id: "m4", from: "them", text: "Sigur, uite:", time: "09:16" },
  { id: "m5", from: "them", text: "'Request timed out after 30s'", time: "09:16" },
  { id: "m6", from: "me", text: "Mulțumesc. Se pare că e o problemă cu proxy-ul ANAF de azi dimineață. Am escaladat la echipa de infra.", time: "09:18", read: true },
  { id: "m7", from: "me", text: "Ar trebui rezolvat în 15-20 minute. Îți dau confirmare când e OK.", time: "09:18", read: true },
  { id: "m8", from: "them", text: "Perfect, mulțumesc mult!", time: "09:19" },
];

const FILTERS = ["All", "Unread", "Assigned to me"] as const;

function SupportInbox() {
  const [active, setActive] = useState(CONVS[0]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("All");
  const [draft, setDraft] = useState("");

  const filteredConvs = CONVS.filter(c => filter === "Unread" ? c.unread > 0 : true);

  return (
    <div className="h-[calc(100vh-140px)] flex overflow-hidden rounded-xl border border-white/5 bg-[var(--mc-surface)] m-4">
      {/* Left: conv list */}
      <aside className="w-[320px] shrink-0 border-r border-white/5 flex flex-col bg-[var(--mc-surface-2)]">
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="mc-heading font-semibold text-[var(--mc-fg)]">Inbox</h2>
            <div className="mc-num text-xs px-2 py-0.5 rounded-full bg-[var(--mc-gold)]/15 text-[var(--mc-gold-glow)]">
              {CONVS.reduce((a, c) => a + c.unread, 0)}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--mc-fg-dim)]" />
            <Input placeholder="Caută conversații…" className="pl-8 h-9 bg-[var(--mc-surface-3)] border-white/5 text-sm" />
          </div>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "text-[11px] px-2.5 py-1 rounded-full border transition-colors",
                  filter === f
                    ? "bg-[var(--mc-gold)]/15 border-[var(--mc-gold)]/40 text-[var(--mc-gold-glow)]"
                    : "border-white/5 text-[var(--mc-fg-muted)] hover:text-[var(--mc-fg)]",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map(c => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 border-b border-white/5 text-left transition-colors",
                active.id === c.id ? "bg-[var(--mc-gold)]/8" : "hover:bg-white/[0.02]",
              )}
            >
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm text-white" style={{ background: c.color }}>
                  {c.initials}
                </div>
                {c.status === "online" && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[var(--mc-success)] border-2 border-[var(--mc-surface-2)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-medium text-sm text-[var(--mc-fg)] truncate">{c.name}</div>
                  <div className="text-[10px] text-[var(--mc-fg-dim)] shrink-0">{c.time}</div>
                </div>
                <div className="text-[11px] text-[var(--mc-fg-muted)] truncate">{c.company}</div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className={cn("text-xs truncate", c.unread > 0 ? "text-[var(--mc-fg)] font-medium" : "text-[var(--mc-fg-muted)]")}>
                    {c.last}
                  </div>
                  {c.unread > 0 && (
                    <div className="shrink-0 h-5 min-w-[20px] rounded-full bg-[var(--mc-gold)] text-black text-[10px] font-bold flex items-center justify-center px-1.5">
                      {c.unread}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Center: thread */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm text-white" style={{ background: active.color }}>
              {active.initials}
            </div>
            <div>
              <div className="font-medium text-[var(--mc-fg)]">{active.name}</div>
              <div className="text-[11px] text-[var(--mc-fg-muted)]">{active.company} · {active.status === "online" ? "online" : "offline"}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon"><Phone className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><Filter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 bg-[var(--mc-bg)]/40">
          {THREAD.map(m => (
            <div key={m.id} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-2 text-sm relative",
                m.from === "me"
                  ? "bg-[var(--mc-gold)] text-black rounded-br-md"
                  : "bg-[var(--mc-surface-3)] text-[var(--mc-fg)] rounded-bl-md border border-white/5",
              )}>
                <div className="whitespace-pre-wrap">{m.text}</div>
                <div className={cn(
                  "text-[10px] mt-1 flex items-center gap-1 justify-end",
                  m.from === "me" ? "text-black/60" : "text-[var(--mc-fg-dim)]",
                )}>
                  {m.time}
                  {m.from === "me" && (m.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t border-white/5 px-4 py-3 flex items-center gap-2 bg-[var(--mc-surface-2)]">
          <Button variant="ghost" size="icon"><Paperclip className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon"><Smile className="h-4 w-4" /></Button>
          <Input
            placeholder="Scrie un mesaj…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="flex-1 bg-[var(--mc-surface-3)] border-white/5"
          />
          <Button
            className="bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black"
            size="icon"
            disabled={!draft.trim()}
            onClick={() => setDraft("")}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </main>

      {/* Right: client panel */}
      <aside className="w-[300px] shrink-0 border-l border-white/5 bg-[var(--mc-surface-2)] overflow-y-auto">
        <div className="p-5 flex flex-col items-center text-center border-b border-white/5">
          <div className="h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl text-white" style={{ background: active.color }}>
            {active.initials}
          </div>
          <div className="mt-3 font-semibold text-[var(--mc-fg)]">{active.name}</div>
          <div className="text-xs text-[var(--mc-fg-muted)]">{active.company}</div>
          <div className="mt-3 flex gap-1.5">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--mc-gold)]/15 text-[var(--mc-gold-glow)] border border-[var(--mc-gold)]/30">Enterprise</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--mc-success)]/15 text-[var(--mc-success)] border border-[var(--mc-success)]/30">Active</span>
          </div>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <div className="mc-eyebrow mb-1">Plan</div>
            <div className="text-[var(--mc-fg)]">OPSQAI Cloud + 4 module</div>
            <div className="text-xs text-[var(--mc-fg-muted)] mt-0.5">€3.400 / lună</div>
          </div>
          <div>
            <div className="mc-eyebrow mb-1">Contact</div>
            <div className="text-[var(--mc-fg)] text-xs">andrei@contabil-expert.ro</div>
            <div className="text-[var(--mc-fg-muted)] text-xs">+40 723 456 789</div>
          </div>
          <div>
            <div className="mc-eyebrow mb-1">Health score</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-[87%] bg-[var(--mc-success)]" />
              </div>
              <span className="mc-num text-sm font-semibold text-[var(--mc-success)]">87</span>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="mc-eyebrow">Quick actions</div>
            <Button variant="outline" className="w-full justify-start text-xs h-8 border-white/5">
              Escaladează la owner
            </Button>
            <Button variant="outline" className="w-full justify-start text-xs h-8 border-white/5">
              Deschide company profile
            </Button>
            <Button variant="outline" className="w-full justify-start text-xs h-8 border-white/5">
              Trimite ofertă upgrade
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
