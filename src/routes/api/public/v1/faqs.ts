import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateApiRequest,
  corsPreflight,
  jsonResponse,
  parsePagination,
  requireScope,
} from "./_auth";

export const Route = createFileRoute("/api/public/v1/faqs")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const auth = await authenticateApiRequest(request);
        if (auth instanceof Response) return auth;
        const scopeErr = requireScope(auth.ctx, "read:faqs");
        if (scopeErr) return scopeErr;

        const url = new URL(request.url);
        const { limit, offset } = parsePagination(url);
        const category = url.searchParams.get("category");

        let query = auth.supabaseAdmin
          .from("faqs")
          .select(
            "id, category, question_en, question_de, answer_en, answer_de, created_at, updated_at",
            { count: "exact" },
          )
          .eq("company_id", auth.ctx.companyId)
          .order("updated_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (category) query = query.eq("category", category);

        const { data, count, error } = await query;
        if (error) return jsonResponse({ error: error.message }, 500);

        return jsonResponse({
          data,
          pagination: { limit, offset, total: count ?? data?.length ?? 0 },
        });
      },
    },
  },
});
