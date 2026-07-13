import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function supabaseForUser(ctx: ToolContext) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_knowledge",
  title: "Search knowledge base",
  description:
    "Keyword search across published OPSQAI knowledge documents (SOPs, policies, guides) that the signed-in user has access to. " +
    "Returns matching document metadata. Set include_content=true to also return the full extracted text.",
  inputSchema: {
    query: z.string().min(1).describe("Free-text query matched against document title and text."),
    category: z.string().optional().describe("Optional category filter."),
    knowledge_type: z
      .string()
      .optional()
      .describe("Optional knowledge_type filter (e.g. sop, policy)."),
    include_content: z.boolean().optional().describe("Include full content_text (default false)."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, knowledge_type, include_content, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
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
      include_content ? "content_text" : null,
    ]
      .filter(Boolean)
      .join(", ");

    const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);
    const pattern = `%${escaped}%`;

    let q = supabase
      .from("knowledge_documents")
      .select(columns)
      .eq("is_active", true)
      .eq("status", "published")
      .or(`title.ilike.${pattern},content_text.ilike.${pattern}`)
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (category) q = q.eq("category", category);
    if (knowledge_type) q = q.eq("knowledge_type", knowledge_type);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { documents: data ?? [] },
    };
  },
});
