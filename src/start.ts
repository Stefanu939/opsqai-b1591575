import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachBearerToken } from "@/integrations/supabase/bearer-attacher";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Runs before every server function handler. Ensures the platform
// provider registry is populated on the server (cloud or self-hosted)
// before feature code resolves capabilities like "authentication".
const providerBootstrapFunctionMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const { ensureServerProviders } = await import(
    "./lib/providers/server-bootstrap.server"
  );
  await ensureServerProviders();
  return next();
});

// Same guard for SSR page requests, so route loaders that resolve
// providers also see a populated registry.
const providerBootstrapRequestMiddleware = createMiddleware().server(
  async ({ next }) => {
    const { ensureServerProviders } = await import(
      "./lib/providers/server-bootstrap.server"
    );
    await ensureServerProviders();
    return next();
  },
);

export const startInstance = createStart(() => ({
  functionMiddleware: [
    providerBootstrapFunctionMiddleware,
    attachSupabaseAuth,
    attachBearerToken,
  ],
  requestMiddleware: [errorMiddleware, providerBootstrapRequestMiddleware],
}));


