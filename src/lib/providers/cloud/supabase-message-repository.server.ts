// Cloud IMessageRepository — narrow reads used by feedback + knowledge-gap flow.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { IMessageRepository } from "@/lib/providers/interfaces";

type Client = SupabaseClient<Database>;

export function createSupabaseMessageRepository(client: Client): IMessageRepository {
  return {
    async findAssistantById(id) {
      const { data, error } = await client
        .from("messages")
        .select("id, thread_id, confidence, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return {
        id: data.id,
        threadId: data.thread_id,
        confidence: data.confidence,
        createdAt: data.created_at,
      };
    },
    async findLastUserBefore(threadId, beforeCreatedAt) {
      const { data, error } = await client
        .from("messages")
        .select("id, content")
        .eq("thread_id", threadId)
        .eq("role", "user")
        .lt("created_at", beforeCreatedAt)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? { id: data.id, content: data.content } : null;
    },
  };
}
