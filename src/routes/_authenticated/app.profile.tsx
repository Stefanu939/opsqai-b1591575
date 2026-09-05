import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettings } from "@/components/app/profile-settings";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile settings — OPSQAI Platform" },
      { name: "description", content: "Manage your OPSQAI profile, status and holidays." },
      { property: "og:title", content: "Profile settings — OPSQAI Platform" },
      {
        property: "og:description",
        content: "Manage your OPSQAI profile, status and holidays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ProfileSettings />,
});
