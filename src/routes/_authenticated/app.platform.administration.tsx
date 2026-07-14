import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Plus, Check, X } from "lucide-react";
import { PremiumCard } from "@/components/platform/PremiumCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/platform/administration")({
  head: () => ({ meta: [{ title: "Platform Administration — Mission Control" }] }),
  component: AdminOrg,
});

interface Node {
  id: string;
  name: string;
  role: string;
  color: string;
  children?: Node[];
}

const ORG: Node = {
  id: "1", name: "Alexandru Marin", role: "Owner", color: "#c9a84c",
  children: [
    {
      id: "2", name: "Ioana Ștefan", role: "COO", color: "#7c5cff",
      children: [
        { id: "5", name: "Radu Enache", role: "Support Lead", color: "#22d3ee", children: [
          { id: "9", name: "Andreea D.", role: "Support Agent", color: "#a78bfa" },
          { id: "10", name: "Vlad P.", role: "Support Agent", color: "#a78bfa" },
        ]},
        { id: "6", name: "Elena Munteanu", role: "Ops Manager", color: "#ec4899" },
      ],
    },
    {
      id: "3", name: "Cristian Vasile", role: "CTO", color: "#7c5cff",
      children: [
        { id: "7", name: "Mihai Popa", role: "Platform Engineer", color: "#22d3ee" },
        { id: "8", name: "Sorina L.", role: "SRE", color: "#22d3ee" },
      ],
    },
    {
      id: "4", name: "Diana Georgescu", role: "Head of Sales", color: "#7c5cff",
      children: [
        { id: "11", name: "Mihaela T.", role: "Sales Agent", color: "#10b981" },
        { id: "12", name: "Bogdan A.", role: "Sales Agent", color: "#10b981" },
      ],
    },
  ],
};

const ROLES = ["Owner", "COO", "CTO", "Head of Sales", "Support Lead", "Ops Manager", "Platform Engineer", "SRE", "Support Agent", "Sales Agent"];
const MODULES = ["Dashboard", "Companies", "Billing", "Support", "Audit AI", "Ops", "Admin"];

const PERMS: Record<string, string[]> = {
  Owner: MODULES,
  COO: ["Dashboard", "Companies", "Billing", "Support", "Audit AI", "Ops"],
  CTO: ["Dashboard", "Companies", "Ops", "Audit AI"],
  "Head of Sales": ["Dashboard", "Companies", "Billing", "Audit AI"],
  "Support Lead": ["Dashboard", "Support", "Companies"],
  "Ops Manager": ["Dashboard", "Ops", "Companies"],
  "Platform Engineer": ["Dashboard", "Ops"],
  "SRE": ["Dashboard", "Ops"],
  "Support Agent": ["Dashboard", "Support"],
  "Sales Agent": ["Dashboard", "Billing", "Companies"],
};

function NodeCard({ n, onSelect, selected }: { n: Node; onSelect: (n: Node) => void; selected: string }) {
  const initials = n.name.split(" ").map(x => x[0]).slice(0, 2).join("");
  return (
    <button
      onClick={() => onSelect(n)}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all min-w-[180px]",
        selected === n.id
          ? "border-[var(--mc-gold)]/60 bg-[var(--mc-gold)]/12 shadow-[0_0_0_3px_rgba(201,168,76,0.1)]"
          : "border-white/5 bg-[var(--mc-surface-2)] hover:border-white/10",
      )}
    >
      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: n.color }}>
        {initials}
      </div>
      <div className="text-left min-w-0">
        <div className="text-xs font-medium text-[var(--mc-fg)] truncate">{n.name}</div>
        <div className="text-[10px] text-[var(--mc-fg-muted)] truncate">{n.role}</div>
      </div>
    </button>
  );
}

function Tree({ n, onSelect, selected }: { n: Node; onSelect: (n: Node) => void; selected: string }) {
  return (
    <div className="flex flex-col items-center">
      <NodeCard n={n} onSelect={onSelect} selected={selected} />
      {n.children && n.children.length > 0 && (
        <>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-start gap-6 relative">
            {n.children.length > 1 && (
              <div className="absolute top-0 left-[calc(50%-1px)] right-0 h-px bg-white/10"
                style={{ left: "10%", right: "10%" }} />
            )}
            {n.children.map(c => (
              <div key={c.id} className="flex flex-col items-center relative">
                {n.children!.length > 1 && <div className="w-px h-6 bg-white/10 -mt-6" />}
                <Tree n={c} onSelect={onSelect} selected={selected} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AdminOrg() {
  const [selected, setSelected] = useState<Node>(ORG);

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <div className="mc-eyebrow flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-[var(--mc-gold)]" /> System · Governance</div>
          <h1 className="mc-heading text-2xl font-semibold text-[var(--mc-fg)] mt-1">Platform Administration</h1>
          <p className="text-sm text-[var(--mc-fg-muted)] mt-1">Organigramă echipă OPSQAI · permisiuni per rol</p>
        </div>
        <Button className="bg-[var(--mc-gold)] hover:bg-[var(--mc-gold-glow)] text-black"><Plus className="h-4 w-4 mr-1.5" /> Add person</Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        <PremiumCard eyebrow="Organigramă" padding="lg" className="overflow-x-auto">
          <div className="min-w-max py-6 flex justify-center">
            <Tree n={ORG} onSelect={setSelected} selected={selected.id} />
          </div>
        </PremiumCard>

        <PremiumCard eyebrow={selected.role} title={selected.name} padding="md">
          <div className="flex flex-col items-center pb-4 border-b border-white/5">
            <div className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold text-white" style={{ background: selected.color }}>
              {selected.name.split(" ").map(x => x[0]).slice(0, 2).join("")}
            </div>
            <div className="mt-2 font-semibold text-[var(--mc-fg)]">{selected.name}</div>
            <div className="text-xs text-[var(--mc-fg-muted)]">{selected.role}</div>
          </div>
          <div className="pt-4 space-y-2">
            <div className="mc-eyebrow">Acces module</div>
            {MODULES.map(m => {
              const allowed = (PERMS[selected.role] || []).includes(m);
              return (
                <div key={m} className="flex items-center justify-between text-xs rounded-md bg-[var(--mc-surface-2)] px-3 py-1.5 border border-white/5">
                  <span className={allowed ? "text-[var(--mc-fg)]" : "text-[var(--mc-fg-dim)]"}>{m}</span>
                  {allowed ? (
                    <Check className="h-3.5 w-3.5 text-[var(--mc-success)]" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-[var(--mc-fg-dim)]" />
                  )}
                </div>
              );
            })}
          </div>
        </PremiumCard>
      </div>

      <PremiumCard eyebrow="Matrice permisiuni" title="Rol × Modul" padding="md" className="overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-[var(--mc-fg-muted)] font-medium sticky left-0 bg-[var(--mc-surface)]">Rol</th>
              {MODULES.map(m => (
                <th key={m} className="text-center py-2 px-2 text-[var(--mc-fg-muted)] font-medium">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map(r => (
              <tr key={r} className="border-t border-white/5">
                <td className="py-2 pr-4 font-medium text-[var(--mc-fg)] sticky left-0 bg-[var(--mc-surface)]">{r}</td>
                {MODULES.map(m => {
                  const ok = (PERMS[r] || []).includes(m);
                  return (
                    <td key={m} className="text-center py-2 px-2">
                      {ok ? <Check className="h-3.5 w-3.5 text-[var(--mc-success)] mx-auto" /> : <span className="text-[var(--mc-fg-dim)]">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </PremiumCard>
    </div>
  );
}
