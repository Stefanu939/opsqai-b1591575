import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { bootstrapBrowserProviders } from "./lib/providers/browser-bootstrap";

// Register the Cloud or Self-Hosted IBrowserAuthProvider once before
// anything can call getBrowserAuthProvider(). Safe on both server and
// client — bootstrap short-circuits after the first invocation.
bootstrapBrowserProviders();

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
