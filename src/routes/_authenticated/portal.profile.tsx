import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettings } from "@/components/app/profile-settings";

export const Route = createFileRoute("/_authenticated/portal/profile")({
  head: () => ({
    meta: [
      { title: "Profile settings — OPSQAI Customer Portal" },
      {
        name: "description",
        content: "Manage your Customer Portal profile, status and holidays.",
      },
      { property: "og:title", content: "Profile settings — OPSQAI Customer Portal" },
      {
        property: "og:description",
        content: "Manage your Customer Portal profile, status and holidays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <ProfileSettings title="Profile settings" />,
});
