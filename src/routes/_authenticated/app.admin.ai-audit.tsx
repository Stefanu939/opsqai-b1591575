import { createFileRoute } from "@tanstack/react-router";
import { AiAuditPage } from "@/components/admin/ai-audit";

export const Route = createFileRoute("/_authenticated/app/admin/ai-audit")({
  component: AiAuditPage,
});
