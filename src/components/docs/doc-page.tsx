import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export function DocPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-4xl px-4 py-14 md:py-20">
      <Link
        to="/documentation"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> All documentation
      </Link>
      <p className="mt-6 text-xs uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
      <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{intro}</p>
      <div className="mt-10 space-y-10 doc-prose">{children}</div>
    </article>
  );
}

export function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

export function DocCode({ children }: { children: string }) {
  return (
    <pre className="rounded-lg border border-border/60 bg-surface-1 p-4 text-xs overflow-x-auto">
      <code className="font-mono">{children}</code>
    </pre>
  );
}
