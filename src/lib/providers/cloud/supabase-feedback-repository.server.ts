// Cloud IFeedbackRepository — wraps public.message_feedback.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { IFeedbackRepository } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

export function createSupabaseFeedbackRepository(client: Client): IFeedbackRepository {
  return {
    async upsertRating({ messageId, userId, companyId, rating, comment }) {
      const { error } = await client.from("message_feedback").upsert(
        {
          message_id: messageId,
          user_id: userId,
          company_id: companyId,
          rating,
          comment,
        },
        { onConflict: "message_id,user_id" },
      );
      if (error) throw new Error(error.message);
    },
  };
}
