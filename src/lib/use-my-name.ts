// Shared display-name resolver: prefers the real profile names
// (first_name / last_name) and only falls back to the email local-part
// when the profile has no names set. Used by Kai, the account menu and
// anywhere we greet or sign on the user's behalf.

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getMyProfile } from "@/lib/users.functions";

export interface MyName {
  /** "Stefan" */
  firstName: string;
  /** "Stefan Bari" */
  fullName: string;
  /** "SB" */
  initials: string;
}

function fromEmail(email?: string | null): MyName {
  const local = (email ?? "").split("@")[0].split(/[._-]/)[0];
  const first = local ? local[0].toUpperCase() + local.slice(1) : "";
  return {
    firstName: first,
    fullName: first,
    initials: (local.slice(0, 2) || "OQ").toUpperCase(),
  };
}

export function useMyName(): MyName {
  const { user, session, loading } = useAuth();
  const fallback = fromEmail(user?.email);

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => getMyProfile({}),
    enabled: Boolean(!loading && session && user?.id),
    retry: false,
    staleTime: 60_000,
  });

  const first = profile.data?.first_name?.trim() ?? "";
  const last = profile.data?.last_name?.trim() ?? "";
  if (!first && !last) return fallback;

  const fullName = [first, last].filter(Boolean).join(" ");
  const initials =
    ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() ||
    fallback.initials;
  return { firstName: first || last, fullName, initials };
}
