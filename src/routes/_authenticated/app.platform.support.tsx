import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { ComingSoonPanel } from "@/components/platform/ComingSoonPanel";

export const Route = createFileRoute("/_authenticated/app/platform/support")({
  head: () => ({ meta: [{ title: "Support Inbox — Mission Control" }] }),
  component: () => (
    <ComingSoonPanel
      eyebrow="Commercial · Support Inbox"
      title="Support Inbox — WhatsApp premium"
      description="Interfață nouă, ușor de navigat. Toate conversațiile suport ale clienților într-un singur loc."
      icon={<MessageSquare className="h-4 w-4" />}
      bullets={[
        "Listă conversații stânga cu avatar și unread badge",
        "Thread activ centru cu bule violet și timestamps discrete",
        "Panel client dreapta: company info, plan, quick actions",
        "Composer cu attach, emoji, send",
        "Filtre: Unread / Assigned to me / All",
        "Search global instant",
      ]}
    />
  ),
});
