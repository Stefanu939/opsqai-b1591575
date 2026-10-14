import {
  Truck,
  GraduationCap,
  ShieldCheck,
  FileText,
  Users,
  BarChart3,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { parseKaiRich, type ModulesBlock, type RoiBlock } from "@/lib/kai-rich-format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  truck: Truck,
  academy: GraduationCap,
  shield: ShieldCheck,
  docs: FileText,
  users: Users,
  chart: BarChart3,
};

function RoiCard({ d }: { d: RoiBlock }) {
  return (
    <div className="my-3">
      {d.title && <h4 className="mb-2 font-display text-[0.95em] font-semibold">{d.title}</h4>}
      <div className="rounded-xl border border-border bg-secondary/60 p-3.5">
        <dl className="space-y-2">
          {(d.rows ?? []).map(([k, v], i) => (
            <div key={i} className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {(d.basis || d.result) && <div className="my-3 h-px bg-border" />}
        {d.basis && <p className="text-[0.85em] text-muted-foreground">{d.basis}</p>}
        {d.result && (
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-success">
            {d.result}
          </p>
        )}
        {d.note && <p className="mt-2 text-[0.8em] leading-snug text-muted-foreground">{d.note}</p>}
      </div>
    </div>
  );
}

function ModulesCard({ d }: { d: ModulesBlock }) {
  return (
    <div className="my-3">
      {d.title && <h4 className="mb-2 font-display text-[0.95em] font-semibold">{d.title}</h4>}
      <ul className="space-y-3">
        {(d.items ?? []).map((it, i) => {
          const Icon = ICONS[it.icon ?? ""] ?? Sparkles;
          return (
            <li key={i} className="flex gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div className="font-semibold">{it.name}</div>
                {it.desc && <div className="text-muted-foreground">{it.desc}</div>}
              </div>
            </li>
          );
        })}
      </ul>
      {d.note && <p className="mt-2 text-[0.8em] text-muted-foreground">{d.note}</p>}
    </div>
  );
}

/** Shared Kai reply renderer for MC and Portal. */
export function KaiRichMessage({ content, className }: { content: string; className?: string }) {
  const parts = parseKaiRich(content);
  return (
    <div
      className={cn(
        "min-w-0 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:italic",
        className,
      )}
    >
      {parts.map((p, i) =>
        p.kind === "md" ? (
          <MessageResponse key={i}>{p.text}</MessageResponse>
        ) : p.kind === "roi" ? (
          <RoiCard key={i} d={p.data} />
        ) : (
          <ModulesCard key={i} d={p.data} />
        ),
      )}
    </div>
  );
}
