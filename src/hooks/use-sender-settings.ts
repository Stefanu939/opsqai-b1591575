import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type SenderSettings = {
  sender_email: string | null;
  email_provider: string;
  whatsapp_number: string | null;
  kai_may_compose: boolean;
};

const EMPTY: SenderSettings = {
  sender_email: null,
  email_provider: "default",
  whatsapp_number: null,
  kai_may_compose: false,
};

/** Per-account outreach identity (own row only, enforced by RLS). */
export function useSenderSettings() {
  const { user, session, loading } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["sender-settings", user?.id],
    enabled: Boolean(!loading && session && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mc_sender_settings")
        .select("sender_email, email_provider, whatsapp_number, kai_may_compose")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as SenderSettings | null) ?? EMPTY;
    },
  });
  const save = useMutation({
    mutationFn: async (v: SenderSettings) => {
      const { error } = await supabase
        .from("mc_sender_settings")
        .upsert({ ...v, user_id: user!.id, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sender-settings"] }),
  });
  return { settings: q.data ?? EMPTY, save };
}
