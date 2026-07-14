import { createFileRoute, redirect } from "@tanstack/react-router";

// /app === AI Chat (Self-Hosted product entry). Redirect to the chat leaf.
export const Route = createFileRoute("/_authenticated/app/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/chat" });
  },
});
