import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Download, Sparkles } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, RadialBarChart, RadialBar } from "recharts";
import { PremiumCard } from "@/components/platform/PremiumCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/audit")({
  head: () => ({ meta: [{ title: "Audit AI — Mission Control" }] }),
  component: AuditAI,
});

interface CompanyAudit {
  id: string;
  name: string;
  plan: string;
  score: number;
  status: "healthy" | "at-risk" | "churn";
  mrr: number;
  paid: number;
  late: number;
  unpaid: number;
}

const COMPANIES: CompanyAudit[] = [
  { id: "c1", name: "Contabil Expert SRL", plan: "Enterprise", score: 92, status: "healthy", mrr: 3400, paid: 11, late: 1, unpaid: 0 },
  { id: "c2", name: "Fiscal Pro Consulting", plan: "Growth", score: 78, status: "healthy", mrr: 1800, paid: 10, late: 2, unpaid: 0 },
  { id: "c3", name: "Audit & Balance", plan: "Enterprise", score: 54, status: "at-risk", mrr: 2900, paid: 8, late: 2, unpaid: 2 },
  { id: "c4", name: "Tax Advisory Group", plan: "Growth", score: 41, status: "at-risk", mrr: 1500, paid: 7, late: 3, unpaid: 2 },
  { id: "c5", name: "Bilanț Complet SA", plan: "Starter", score: 88, status: "healthy", mrr: 800, paid: 12, late: 0, unpaid: 0 },
  { id: "c6", name: "Contab Plus", plan: "Growth", score: 28, status: "churn", mrr: 1200, paid: 4, late: 3, unpaid: 5 },
];

const HEARTBEAT = Array.from({ length: 30 }, (_, i) => ({
  d: `d${i}`,
  v: 60 + Math.sin(i / 3) * 20 + Math.random() * 15,
}));

const FILTERS = ["Toate", "Healthy", "At-risk", "Churn"] as const;

function scoreColor(s: number) {
  if (s >= 75) return "var(--mc-success)";
  if (s >= 50) return "var(--mc-warn, #f59e0b)";
  return "var(--mc-danger)";
}

function Donut({ score, size = 56 }: { score: number; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      <ResponsiveContainer>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: score, fill: scoreColor(score) }]} startAngle={90} endAngle={90 - (360 * score / 100)}>
          <RadialBar background={{ fill: "rgba(255,255,255,0.06)" }} dataKey="v" cornerRadius={4} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center mc-num text-sm font-semibold" style={{ color: scoreColor(score) }}>
        {score}
      </div>
    </div>
  );
}

function AuditAI() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>("Toate");
  const [selected, setSelected] = useState(COMPANIES[0]);

  const filtered = COMPANIES.filter(c => {
    if (filter === "Toate") return true;
    if (filter === "Healthy") return c.status === "healthy";
    if (filter === "At-risk") return c.status === "at-risk";
    return c.status === "churn";
  });

  const avg = Math.round(COMPANIES.reduce((a, c) => a + c.score, 0) / COMPANIES.length);
  const atRisk = COMPANIES.filter(c => c.status !== "healthy").length;

  const payData = [
    { name: "Paid", value: selected.paid, fill: "var(--mc-success)" },
    { name: "Late", value: selected.late, fill: "#f59e0b" },
    { name: "Unpaid", value: selected.unpaid, fill: "var(--mc-danger)" },
  ];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="mc-eyebrow flex items-center gap-1.5"><Brain className="h-3 w-3 text-[var(--mc-gold)]" /> Intelligence · Audit AI</div>
          <h1 className="mc-heading text-2xl font-semibold text-[var(--mc-fg)] mt-1">Health scoring firme</h1>
          <p className="text-sm text-[var(--mc-fg-muted)] mt-1">Audit generat AI · retention & churn signals</p>
        </div>
        <Button variant="outline" className="border-white/5"><Download className="h-4 w-4 mr-2" /> Export PDF</Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PremiumCard eyebrow="Score mediu portofoliu" padding="md">
          <div className="flex items-center justify-between">
            <div>
              <div className="mc-num mc-gold-text text-3xl font-bold">{avg}</div>
              <div className="text-xs text-[var(--mc-success)] flex items-center gap-1 mt-1"><TrendingUp className="h-3 w-3" /> +4 vs. luna trecută</div>
            </div>
            <Donut score={avg} size={70} />
          </div>
        </PremiumCard>
        <PremiumCard eyebrow="Firme at-risk" padding="md">
          <div className="mc-num text-3xl font-bold text-[var(--mc-danger)]">{atRisk}</div>
          <div className="text-xs text-[var(--mc-fg-muted)] mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-[var(--mc-danger)]" /> Necesită retention plan
          </div>
        </PremiumCard>
        <PremiumCard eyebrow="Sugestii AI active" padding="md">
          <div className="mc-num mc-gold-text text-3xl font-bold">12</div>
          <div className="text-xs text-[var(--mc-fg-muted)] mt-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[var(--mc-gold)]" /> 4 upsell · 8 retention
          </div>
        </PremiumCard>
      </div>

      <div className="flex gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition-colors",
              filter === f
                ? "bg-[var(--mc-gold)]/15 border-[var(--mc-gold)]/40 text-[var(--mc-gold-glow)]"
                : "border-white/5 text-[var(--mc-fg-muted)] hover:text-[var(--mc-fg)]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        <PremiumCard eyebrow="Firme" padding="sm">
          <div className="space-y-1">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={cn(
                  "w-full flex items-center gap-4 px-3 py-2.5 rounded-lg transition-colors text-left",
                  selected.id === c.id ? "bg-[var(--mc-gold)]/10" : "hover:bg-white/[0.03]",
                )}
              >
                <Donut score={c.score} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-[var(--mc-fg)] truncate">{c.name}</div>
                  <div className="text-[11px] text-[var(--mc-fg-muted)]">{c.plan} · €{c.mrr}/mo</div>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full border",
                  c.status === "healthy" && "border-[var(--mc-success)]/30 bg-[var(--mc-success)]/10 text-[var(--mc-success)]",
                  c.status === "at-risk" && "border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b]",
                  c.status === "churn" && "border-[var(--mc-danger)]/30 bg-[var(--mc-danger)]/10 text-[var(--mc-danger)]",
                )}>
                  {c.status}
                </span>
              </button>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard eyebrow={`Detaliu · ${selected.name}`} title={<span>Health score <span style={{ color: scoreColor(selected.score) }} className="mc-num">{selected.score}</span></span>} padding="md">
          <div className="space-y-4">
            <div>
              <div className="mc-eyebrow mb-2">Heartbeat 30 zile</div>
              <div className="h-24">
                <ResponsiveContainer>
                  <AreaChart data={HEARTBEAT}>
                    <defs>
                      <linearGradient id="hb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--mc-gold)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--mc-gold)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area dataKey="v" stroke="var(--mc-gold)" fill="url(#hb)" strokeWidth={1.5} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <div className="mc-eyebrow mb-2">Plăți ultimele 12 luni</div>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={payData} dataKey="value" innerRadius={28} outerRadius={44} paddingAngle={2}>
                        {payData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--mc-surface-3)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs space-y-1.5 flex-1">
                  <div className="flex justify-between"><span className="text-[var(--mc-success)]">● Paid</span> <span className="mc-num">{selected.paid}</span></div>
                  <div className="flex justify-between"><span className="text-[#f59e0b]">● Late</span> <span className="mc-num">{selected.late}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--mc-danger)]">● Unpaid</span> <span className="mc-num">{selected.unpaid}</span></div>
                </div>
              </div>
            </div>
            <div>
              <div className="mc-eyebrow mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[var(--mc-gold)]" /> Sugestii AI</div>
              <div className="space-y-1.5 text-xs">
                {selected.status === "healthy" ? (
                  <>
                    <div className="rounded-md border border-[var(--mc-gold)]/20 bg-[var(--mc-gold)]/8 p-2.5">
                      <div className="font-medium text-[var(--mc-gold-glow)]">Upsell opportunity</div>
                      <div className="text-[var(--mc-fg-muted)] mt-0.5">Consum ridicat pe raportări → propune modul CRM (+€500/lună).</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-md border border-[var(--mc-danger)]/25 bg-[var(--mc-danger)]/8 p-2.5">
                      <div className="font-medium text-[var(--mc-danger)]">Retention urgent</div>
                      <div className="text-[var(--mc-fg-muted)] mt-0.5">Scor în scădere 3 luni. Programează call de check-in.</div>
                    </div>
                    <div className="rounded-md border border-white/5 bg-[var(--mc-surface-3)] p-2.5">
                      <div className="font-medium text-[var(--mc-fg)]">Ofertă discount 15%</div>
                      <div className="text-[var(--mc-fg-muted)] mt-0.5">Valabil 30 zile, condiționat de renewal 12 luni.</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </PremiumCard>
      </div>
    </div>
  );
}
