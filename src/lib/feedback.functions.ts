import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const rateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      message_id: z.string().uuid(),
      rating: z.union([z.literal(-1), z.literal(1)]),
      comment: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles").select("company_id").eq("id", context.userId).maybeSingle();
    if (!profile?.company_id) throw new Error("No company");
    const { error } = await context.supabase
      .from("message_feedback")
      .upsert({
        message_id: data.message_id, user_id: context.userId,
        company_id: profile.company_id, rating: data.rating,
        comment: data.comment ?? null,
      } as never, { onConflict: "message_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
