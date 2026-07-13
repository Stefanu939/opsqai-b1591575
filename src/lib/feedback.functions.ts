import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const rateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message_id: z.string().uuid(),
        rating: z.union([z.literal(-1), z.literal(1)]),
        comment: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("company_id, department_id")
      .eq("id", context.userId)
      .maybeSingle();
    const companyId = (
      profile as { company_id: string | null; department_id: string | null } | null
    )?.company_id;
    const departmentId =
      (profile as { company_id: string | null; department_id: string | null } | null)
        ?.department_id ?? null;
    if (!companyId) throw new Error("No company");
    const { error } = await context.supabase.from("message_feedback").upsert(
      {
        message_id: data.message_id,
        user_id: context.userId,
        company_id: companyId,
        rating: data.rating,
        comment: data.comment ?? null,
      } as never,
      { onConflict: "message_id,user_id" },
    );
    if (error) throw new Error(error.message);

    // Thumbs-down: surface as a Knowledge Gap (semantic dedup).
    if (data.rating === -1) {
      try {
        const { data: asst } = await context.supabase
          .from("messages")
          .select("id, thread_id, confidence, created_at")
          .eq("id", data.message_id)
          .maybeSingle();
        const asstRow = asst as {
          id: string;
          thread_id: string;
          confidence: number | null;
          created_at: string;
        } | null;
        if (asstRow) {
          const { data: prevUser } = await context.supabase
            .from("messages")
            .select("id, content")
            .eq("thread_id", asstRow.thread_id)
            .eq("role", "user")
            .lt("created_at", asstRow.created_at)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const userMsg = prevUser as { id: string; content: string } | null;
          if (userMsg && userMsg.content?.trim().length > 4) {
            const q = userMsg.content;
            const norm = q.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 500);
            const { data: matched } = (await context.supabase.rpc(
              "match_knowledge_gap" as never,
              {
                _company_id: companyId,
                _question: q.slice(0, 500),
                _question_normalized: norm,
                _embedding: null,
                _threshold: 0.82,
              } as never,
            )) as { data: string | null };
            if (matched) {
              const { data: cur } = await context.supabase
                .from("knowledge_gaps")
                .select("occurrences")
                .eq("id", matched)
                .maybeSingle();
              const occ = ((cur as { occurrences: number } | null)?.occurrences ?? 1) + 1;
              await context.supabase
                .from("knowledge_gaps")
                .update({
                  occurrences: occ,
                  last_seen: new Date().toISOString(),
                  status: "open",
                } as never)
                .eq("id", matched)
                .in("status", ["open", "in_progress"]);
            } else {
              await context.supabase.from("knowledge_gaps").insert({
                company_id: companyId,
                question_normalized: norm,
                question_sample: q.slice(0, 500),
                department_id: departmentId,
                created_by: context.userId,
                confidence: asstRow.confidence,
                source_thread_id: asstRow.thread_id,
                source_message_id: asstRow.id,
                status: "open",
              } as never);
            }
          }
        }
      } catch (e) {
        console.error("[feedback:gap] failed", e);
      }
    }
    return { ok: true };
  });
