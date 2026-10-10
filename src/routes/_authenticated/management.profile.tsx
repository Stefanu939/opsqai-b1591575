import { createFileRoute } from "@tanstack/react-router";
import { ProfileSettings } from "@/components/app/profile-settings";
import { SenderSettingsCard } from "@/components/mc/sender-settings-card";
import { AndroidAppCard } from "@/components/app/android-app-card";

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
  component: () => (
    <>
      <ProfileSettings title="Profile settings" />
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-6 md:px-6">
        <SenderSettingsCard />
        <AndroidAppCard />
      </div>
    </>
  ),
});
