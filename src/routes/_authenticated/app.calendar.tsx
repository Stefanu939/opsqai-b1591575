import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/app/module-page";
import { CalendarPanel } from "@/components/calendar/calendar-panel";
import { ExtensionCard } from "@/components/calendar/extension-card";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — OPSQAI Platform" },
      {
        name: "description",
        content:
          "Reviews, maintenance windows, training deadlines and team meetings for your OPSQAI installation, with Outlook and Google Calendar sync.",
      },
      { property: "og:title", content: "Calendar — OPSQAI Platform" },
      {
        property: "og:description",
        content: "Every review, deadline and meeting for your installation in one timeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppCalendarPage,
});

function AppCalendarPage() {
  return (
    <ModulePage
      eyebrow="Operations"
      title="Calendar"
      description="Document reviews, training deadlines, maintenance windows and team meetings — one shared timeline."
      width="full"
    >
      <CalendarPanel scope="platform" />
      <ExtensionCard />
    </ModulePage>
  );
}
