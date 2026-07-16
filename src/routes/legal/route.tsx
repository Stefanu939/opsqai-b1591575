import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { MarketingLayout } from "@/components/marketing/layout";

export const Route = createFileRoute("/legal")({
  component: () => (
    <MarketingLayout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <nav className="mb-8 text-xs flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <Link
            to="/legal/privacy"
            className="hover:text-foreground data-[status=active]:text-foreground"
          >
            Privacy
          </Link>
          <Link
            to="/legal/cookies"
            className="hover:text-foreground data-[status=active]:text-foreground"
          >
            Cookies
          </Link>
          <Link
            to="/legal/terms"
            className="hover:text-foreground data-[status=active]:text-foreground"
          >
            Terms
          </Link>
          <Link
            to="/legal/dpa"
            className="hover:text-foreground data-[status=active]:text-foreground"
          >
            DPA
          </Link>
          <Link
            to="/legal/responsible-ai"
            className="hover:text-foreground data-[status=active]:text-foreground"
          >
            Responsible AI
          </Link>
          <Link
            to="/legal/impressum"
            className="hover:text-foreground data-[status=active]:text-foreground"
          >
            Impressum
          </Link>
        </nav>
        <article className="prose prose-sm dark:prose-invert max-w-none [&>h1]:text-3xl [&>h1]:font-semibold [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-8 [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>ul]:text-muted-foreground [&>ul>li]:my-1">
          <Outlet />
        </article>
        <p className="mt-12 text-xs text-muted-foreground border-t border-border/60 pt-6">
          For the current signed version or a written addendum tailored to your organisation,
          contact{" "}
          <a href="mailto:notify@opsqai.de" className="underline">
            notify@opsqai.de
          </a>
          .
        </p>
      </div>
    </MarketingLayout>
  ),
});
