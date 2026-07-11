import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Ticket, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/_authenticated/portal/tickets")({
  component: PortalTickets,
});

function PortalTickets() {
  return (
    <div className="p-6 md:p-10 space-y-6 max-w-4xl">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-2">
          <Ticket className="h-7 w-7" /> Tickets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Support conversations with the OPSQAI team.
        </p>
      </header>

      <Card className="p-6 space-y-3">
        <p className="text-sm">
          Tickets are handled through the shared Support workspace. Open the support widget from the
          top navigation, or jump to the full inbox:
        </p>
        <Link
          to="/app/admin/support"
          search={{}}
          className="inline-flex items-center gap-1 text-sm underline"
        >
          Go to Support inbox <ExternalLink className="h-3 w-3" />
        </Link>
      </Card>
    </div>
  );
}
