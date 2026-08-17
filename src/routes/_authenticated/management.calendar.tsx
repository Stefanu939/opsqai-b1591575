import { createFileRoute } from "@tanstack/react-router";
import { ModulePage } from "@/components/app/module-page";
import { CalendarPanel } from "@/components/calendar/calendar-panel";
import { ExtensionCard } from "@/components/calendar/extension-card";

export const Route = createFileRoute("/_authenticated/management/calendar")({
  head: () => ({
    meta: [
      { title: "Fleet Calendar — OPSQAI Management Center" },
      {
        name: "description",
        content:
          "Renewals, maintenance windows, releases and staff meetings for the whole OPSQAI fleet — with Outlook and Google Calendar sync.",
      },
      { property: "og:title", content: "Fleet Calendar — OPSQAI Management Center" },
      {
        property: "og:description",
        content: "Every renewal, release and meeting across the OPSQAI fleet in one calendar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagementCalendarPage,
});

function ManagementCalendarPage() {
  return (
    <ModulePage
      eyebrow="Management Center"
      title="Fleet Calendar"
      description="License renewals, maintenance windows, releases and staff meetings — one timeline for the whole fleet."
      width="full"
    >
      <CalendarPanel scope="platform" />
      <ExtensionCard />
    </ModulePage>
  );
}
