import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettings } from "@/components/app/profile-settings";

export const Route = createFileRoute("/_authenticated/management/profile")({
  head: () => ({
    meta: [
      { title: "Profile settings — OPSQAI Management Center" },
      {
        name: "description",
        content: "Manage your Management Center profile, status and holidays.",
      },
      { property: "og:title", content: "Profile settings — OPSQAI Management Center" },
      {
        property: "og:description",
        content: "Manage your Management Center profile, status and holidays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ProfileSettings title="Profile settings" />,
});
