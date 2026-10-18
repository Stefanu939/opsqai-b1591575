import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/prospect")({
  beforeLoad: () => { throw redirect({ to: "/kai", statusCode: 301, replace: true }); },
});