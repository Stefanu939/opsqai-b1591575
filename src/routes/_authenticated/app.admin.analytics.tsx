import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeAnalyticsPage } from "@/components/admin/knowledge-analytics";

export const Route = createFileRoute("/_authenticated/app/admin/analytics")({
  head: () => ({ meta: [{ title: "Knowledge Analytics — OPSQAI" }] }),
  component: KnowledgeAnalyticsPage,
});
