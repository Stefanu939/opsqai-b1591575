import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFaqsTool from "./tools/list-faqs";
import listKnowledgeTool from "./tools/list-knowledge";
import searchKnowledgeTool from "./tools/search-knowledge";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
// Read the project ref via process.env (server-only). Using import.meta.env would
// let Vite inline the Cloud project ref as a build-time literal into the SH bundle.
const projectRef = process.env.SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "opsqai-mcp",
  title: "OPSQAI",
  version: "0.1.0",
  instructions:
    "Read-only access to the signed-in OPSQAI user's FAQs and knowledge base " +
    "(SOPs, policies, guides). Use list_faqs and list_knowledge_documents to browse, " +
    "and search_knowledge for keyword search across document titles and content. " +
    "All results are scoped to the user's company via row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFaqsTool, listKnowledgeTool, searchKnowledgeTool],
});
