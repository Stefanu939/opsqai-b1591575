import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/app-shell";
import { ProfileSettings } from "@/components/app/profile-settings";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({
    meta: [
      { title: "Profile settings — OPSQAI" },
      { name: "description", content: "Manage your OPSQAI profile, status and holidays." },
      { property: "og:title", content: "Profile settings — OPSQAI" },
      {
        property: "og:description",
        content: "Manage your OPSQAI profile, status and holidays.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <ProfileSettings />
    </AppShell>
  );
}
