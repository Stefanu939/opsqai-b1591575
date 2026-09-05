import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageProvider } from "@/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmHost } from "@/components/ui/confirm";
import { getBrowserAuthProvider } from "@/lib/providers/registry";
import { ChatGlider } from "@/components/support/chat-glider";
import { SupportWidget } from "@/components/support/support-widget";
import { LicenseProvider } from "@/lib/license";

/**
 * Exactly one floating bubble per product surface:
 * - Customer Portal (/portal/*): ticketing only.
 * - Management Center (/management/*) and Self-Hosted (/app/*): employee chat only.
 * - Public marketing pages: none.
 */
function FloatingBubbles() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/portal")) return <SupportWidget />;
  if (pathname.startsWith("/management") || pathname.startsWith("/app")) return <ChatGlider />;
  return null;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="mt-4 text-muted-foreground">Page not found.</p>
        <a
          href="/"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go home
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root" });
  }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "OPSQAI" },
      { name: "format-detection", content: "telephone=no" },
      { name: "theme-color", content: "#101315", media: "(prefers-color-scheme: dark)" },
      { name: "theme-color", content: "#f1f3ef", media: "(prefers-color-scheme: light)" },

      { title: "OPSQAI — Operational AI Platform for Windows Self-Hosted" },
      {
        name: "description",
        content:
          "OPSQAI is a licensed operational AI platform for Windows Self-Hosted environments, with governed knowledge, compliance, learning and domain workspaces.",
      },
      { property: "og:site_name", content: "OPSQAI" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "google-site-verification", content: "doSgT7AbYXFy4PqKvzuXoGvIlApYP44UMowQd5ChIp4" },
      // og:image intentionally lives on leaf routes — root og:image would
      // override every child's share image.
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png", sizes: "64x64" },
      { rel: "icon", href: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Work+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "OPSQAI",
              url: "https://opsqai.de/",
              logo: "https://opsqai.de/icons/icon-192.png",
              description:
                "Enterprise Operational AI Platform, delivered as a Windows Self-Hosted product with a local AI provider (Ollama). Knowledge, SOPs, compliance, academy, operations, quality, HR, finance and logistics workspaces — all inside the customer's own environment.",
              sameAs: ["https://www.linkedin.com/company/opsqai"],
            },
            {
              "@type": "WebSite",
              name: "OPSQAI",
              url: "https://opsqai.de/",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://opsqai.de/blog?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('opsqai-theme');if(t!=='light'&&t!=='dark'){t='light';}var r=document.documentElement;if(t==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}r.style.colorScheme=t;}catch(e){document.documentElement.classList.remove('dark');}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-background text-foreground antialiased" suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const unsubscribe = getBrowserAuthProvider().onSessionChange(async (event) => {
      if (event === "SIGNED_OUT") {
        // Stop protected server-function calls before the session disappears
        // from their Authorization header, then remove all private cache.
        await queryClient.cancelQueries();
        queryClient.clear();
        await router.navigate({ to: "/auth", replace: true });
        await router.invalidate();
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        await router.invalidate();
        await queryClient.invalidateQueries();
      }
    });
    import("@/lib/register-sw").then((m) => m.registerServiceWorker()).catch(() => {});
    return () => unsubscribe();
  }, [router, queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          <LicenseProvider>
            <Outlet />
            <FloatingBubbles />
            <Toaster />
            <ConfirmHost />
          </LicenseProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
