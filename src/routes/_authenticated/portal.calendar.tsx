import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/app/module-page";
import { CalendarPanel } from "@/components/calendar/calendar-panel";
import { ExtensionCard } from "@/components/calendar/extension-card";

export const Route = createFileRoute("/_authenticated/portal/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — OPSQAI Customer Portal" },
      {
        name: "description",
        content:
          "Your renewal dates, maintenance windows and own events in one place, syncable with Outlook and Google Calendar.",
      },
      { property: "og:title", content: "Calendar — OPSQAI Customer Portal" },
      {
        property: "og:description",
        content: "Renewals, maintenance windows and your own events — synced to Outlook or Gmail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalCalendarPage,
});

function PortalCalendarPage() {
  return (
    <ModulePage
      eyebrow="Customer Portal"
      title="Calendar"
      description="Renewal dates, maintenance windows and your own reminders — subscribe once and they follow you into Outlook or Gmail."
      width="full"
    >
      <CalendarPanel scope="portal" />
      <ExtensionCard />
    </ModulePage>
  );
}
