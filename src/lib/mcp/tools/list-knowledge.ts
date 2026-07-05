import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function supabaseForUser(ctx: ToolContext) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_knowledge_documents",
  title: "List knowledge documents",
  description:
    "List published OPSQAI knowledge documents (SOPs, policies, guides) that the signed-in user has access to. " +
    "Filter by category or knowledge_type. Returns metadata only; use search_knowledge to retrieve content.",
  inputSchema: {
    category: z.string().optional().describe("Optional category filter."),
    knowledge_type: z.string().optional().describe("Optional knowledge_type filter (e.g. sop, policy)."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category, knowledge_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("knowledge_documents")
      .select("id, title, category, knowledge_type, doc_code, section, version, status, is_active, is_critical, created_at, updated_at")
      .eq("is_active", true)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 50);
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
