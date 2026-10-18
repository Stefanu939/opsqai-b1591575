import { MessageSquareQuote, SearchCheck, PenTool, LayoutGrid } from "lucide-react";
import { SectionShell } from "./section-shell";
import { EditorialHeadline } from "./editorial-headline";
import { OixButton } from "./buttons";
import { useDiscoveryCopy } from "@/i18n/pages/discovery";
import { useProspectCopy } from "@/i18n/pages/prospect";

const STEP_ICONS = [MessageSquareQuote, SearchCheck, PenTool, LayoutGrid];

/**
 * Problem-first homepage hero: "Your Workspace. Built around your problems."
 * The four-stage line (Problem → Diagnosis → Solution → Workspace) is the
 * core positioning; CTAs lead to Discovery, the cost calculator and the pilot.
 */
export function ProblemHero() {
  const t = useDiscoveryCopy().hero;
  const kai = useProspectCopy();
  const steps = [t.line1, t.line2, t.line3, t.line4];

  return (
    <SectionShell className="pt-24 md:pt-32">
      <div className="max-w-4xl">
        <p className="oix-eyebrow">{kai.heroEyebrow}</p>
        <h1 className="mt-5 font-display text-6xl font-semibold leading-none text-foreground sm:text-7xl md:text-8xl">{kai.heroTitle}</h1>
        <h2 className="mt-5 font-display text-2xl font-medium text-foreground sm:text-3xl">{kai.heroSubtitle}</h2>

        <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {kai.heroIntro}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <OixButton to="/kai" variant="gold" withArrow>{kai.chatCta}</OixButton>
          <OixButton to="/discovery" variant="ghost">{t.primary}</OixButton>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{kai.heroNote}</p>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((label, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={label} className="bg-card p-5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.6} />
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-snug text-foreground">{label}</p>
              </li>
            );
          })}
        </ol>

      </div>
    </SectionShell>
  );
}
