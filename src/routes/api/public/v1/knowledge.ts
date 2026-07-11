import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateApiRequest,
  corsPreflight,
  jsonResponse,
  parsePagination,
  requireScope,
} from "./-_auth";

export const Route = createFileRoute("/api/public/v1/knowledge")({
  server: {
    handlers: {
      OPTIONS: () => corsPreflight(),
      GET: async ({ request }) => {
        const auth = await authenticateApiRequest(request);
        if (auth instanceof Response) return auth;
        const scopeErr = requireScope(auth.ctx, "read:knowledge");
        if (scopeErr) return scopeErr;

        const url = new URL(request.url);
        const { limit, offset } = parsePagination(url);
        const category = url.searchParams.get("category");
        const knowledgeType = url.searchParams.get("type");
        const includeContent = url.searchParams.get("include_content") === "1";

        const columns = [
          "id",
          "title",
          "category",
          "knowledge_type",
          "doc_code",
          "section",
          "version",
          "status",
          "is_active",
          "is_critical",
          "created_at",
          "updated_at",
          includeContent ? "content_text" : null,
        ].filter(Boolean).join(", ");

        let query = auth.supabaseAdmin
          .from("knowledge_documents")
          .select(columns, { count: "exact" })
          .eq("company_id", auth.ctx.companyId)
          .eq("is_active", true)
          .eq("status", "published")
          .order("updated_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (category) query = query.eq("category", category);
        if (knowledgeType) query = query.eq("knowledge_type", knowledgeType);

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
