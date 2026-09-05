// Shared profile settings page body — used by Self-Hosted, Management Center
// and Customer Portal. Only fields that already exist are editable.

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Palmtree } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getMyProfile, updateMyProfile } from "@/lib/users.functions";
import { getMyPresence } from "@/lib/presence.functions";
import { AvatarUploader } from "@/components/app/avatar-uploader";
import {
  AccountMenu as _AccountMenu,
  HolidaysDialog,
  PresenceDot,
  PRESENCE_META,
  type PresenceStatusValue,
} from "@/components/app/account-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const LANGS = [
  { key: "en", label: "English" },
  { key: "de", label: "Deutsch" },
  { key: "ro", label: "Română" },
] as const;

export function ProfileSettings({ title = "Profile settings" }: { title?: string }) {
  const { user, session, loading } = useAuth();
  const qc = useQueryClient();
  const enabled = Boolean(!loading && session && user?.id);
  const [holidaysOpen, setHolidaysOpen] = useState(false);

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => getMyProfile({}),
    enabled,
    retry: false,
  });

  const presence = useQuery({
    queryKey: ["presence", "me", user?.id],
    queryFn: () => getMyPresence(),
    enabled,
    retry: false,
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    position: "",
    phone: "",
    language_pref: "en" as "en" | "de" | "ro",
  });

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      first_name: p.first_name ?? "",
      last_name: p.last_name ?? "",
      position: p.position ?? "",
      phone: p.phone ?? "",
      language_pref: (["en", "de", "ro"].includes(p.language_pref ?? "")
        ? p.language_pref
        : "en") as "en" | "de" | "ro",
    });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: {
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          position: form.position || null,
          phone: form.phone || null,
          language_pref: form.language_pref,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profile saved");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not save profile"),
  });

  const status = (presence.data?.status ?? "available") as PresenceStatusValue;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photo</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUploader size="xl" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">First name</label>
            <Input
              value={form.first_name}
              onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Last name</label>
            <Input
              value={form.last_name}
              onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Position</label>
            <Input
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Language</label>
            <div className="flex gap-2">
              {LANGS.map((l) => (
                <Button
                  key={l.key}
                  type="button"
                  size="sm"
                  variant={form.language_pref === l.key ? "default" : "outline"}
                  onClick={() => setForm((f) => ({ ...f, language_pref: l.key }))}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <PresenceDot status={status} />
          <span>{PRESENCE_META[status].label}</span>
          {presence.data?.message ? (
            <span className="text-muted-foreground">— {presence.data.message}</span>
          ) : null}
          <Button
            className="ml-auto"
            variant="outline"
            size="sm"
            onClick={() => setHolidaysOpen(true)}
          >
            <Palmtree className="mr-2 h-4 w-4" />
            My holidays
          </Button>
        </CardContent>
      </Card>

      <HolidaysDialog open={holidaysOpen} onOpenChange={setHolidaysOpen} />
    </div>
  );
}
