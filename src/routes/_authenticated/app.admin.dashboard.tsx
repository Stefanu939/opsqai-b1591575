import { createFileRoute } from "@tanstack/react-router";
import { ExecutiveDashboard } from "@/components/admin/executive-dashboard";

export const Route = createFileRoute("/_authenticated/app/admin/dashboard")({
  component: ExecutiveDashboard,
});
