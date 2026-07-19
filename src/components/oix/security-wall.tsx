import { useEffect, useRef, useState } from "react";
import {
  Server,
  WifiOff,
  Monitor,
  Database,
  KeyRound,
  CloudOff,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { SectionShell } from "./section-shell";
import { EditorialHeadline } from "./editorial-headline";
import { cn } from "@/lib/utils";

const items = [
  { icon: Server, label: "Self-Hosted" },
  { icon: WifiOff, label: "Offline Ready" },
  { icon: Monitor, label: "Windows Native" },
  { icon: Database, label: "PostgreSQL" },
  { icon: KeyRound, label: "JWT Licensing" },
  { icon: CloudOff, label: "Zero Cloud Dependency" },
  { icon: Cpu, label: "Customer-Owned AI" },
  { icon: ShieldCheck, label: "Air-Gapped Capable" },
];

export function SecurityWall({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <SectionShell className={cn("oix-hairline-top oix-hairline-bottom", className)}>
      <div ref={ref}>
        <EditorialHeadline
          eyebrow="Enterprise Security"
          size="md"
          serifAccent="by design."
          className="mb-16 max-w-3xl"
        >
          Sovereign infrastructure
        </EditorialHeadline>

        <ul className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li
                key={it.label}
                className={cn(
                  "flex items-center gap-4 border-l border-[var(--oix-gold-line)] pl-4 py-3 transition-all duration-700",
                  visible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4",
                )}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                <Icon
                  className="h-5 w-5 text-[var(--oix-gold)] shrink-0"
                  strokeWidth={1.4}
                  aria-hidden
                />
                <span className="text-sm uppercase tracking-[0.16em] text-[var(--oix-cream)]">
                  {it.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </SectionShell>
  );
}
