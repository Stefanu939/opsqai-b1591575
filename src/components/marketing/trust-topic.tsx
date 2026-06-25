import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MarketingLayout } from "./layout";

export interface TrustTopicProps {
  eyebrow?: string;
  title: string;
  intro: string;
  children: ReactNode;
}

export function TrustTopic({ eyebrow = "Trust Center", title, intro, children }: TrustTopicProps) {
  return (
    <MarketingLayout>
      <section className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          <Link to="/trust" className="hover:text-foreground">{eyebrow}</Link>
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">{intro}</p>
        <div className="prose prose-sm dark:prose-invert mt-8 max-w-none [&>h2]:mt-8 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h3]:mt-6 [&>h3]:font-semibold [&>ul]:mt-2 [&>p]:text-muted-foreground [&>ul>li]:text-muted-foreground [&_strong]:text-foreground">
          {children}
        </div>
        <div className="mt-10 rounded-lg border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
          This page is maintained by OPSQAI as informational customer-facing content. It describes current controls and practices and is not a substitute for independent certification.
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <Link to="/trust" className="rounded-md border border-border/60 px-3 py-1.5 hover:bg-muted/40">← Back to Trust Center</Link>
          <Link to="/contact" className="rounded-md border border-border/60 px-3 py-1.5 hover:bg-muted/40">Contact notify@opsqai.de</Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
