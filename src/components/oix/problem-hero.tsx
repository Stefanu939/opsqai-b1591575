import { MessageSquareQuote, SearchCheck, PenTool, LayoutGrid } from "lucide-react";
import { SectionShell } from "./section-shell";
import { EditorialHeadline } from "./editorial-headline";
import { OixButton } from "./buttons";
import { useDiscoveryCopy } from "@/i18n/pages/discovery";

const STEP_ICONS = [MessageSquareQuote, SearchCheck, PenTool, LayoutGrid];

/**
 * Problem-first homepage hero: "Your Workspace. Built around your problems."
 * The four-stage line (Problem → Diagnosis → Solution → Workspace) is the
 * core positioning; CTAs lead to Discovery, the cost calculator and the pilot.
 */
export function ProblemHero() {
  const t = useDiscoveryCopy().hero;
  const steps = [t.line1, t.line2, t.line3, t.line4];

  return (
    <SectionShell className="pt-24 md:pt-32">
      <div className="max-w-4xl">
        <EditorialHeadline
          as="h1"
          size="xl"
          eyebrow={<span>{t.eyebrow}</span>}
          serifAccent={t.serifAccent}
        >
          {t.h1a}
          <br className="hidden sm:block" /> {t.h1b}
        </EditorialHeadline>

        <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
          {t.intro}
        </p>

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

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <OixButton to="/discovery" variant="gold" withArrow>
            {t.primary}
          </OixButton>
          <OixButton to="/#cost" variant="ghost">
            {t.secondary}
          </OixButton>
          <OixButton to="/pilot" variant="ghost">
            {t.tertiary}
          </OixButton>
        </div>
      </div>
    </SectionShell>
  );
}
