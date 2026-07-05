import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Code2, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/admin/api-docs")({
  component: ApiDocsPage,
});

function CodeBlock({ code, id }: { code: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="rounded-lg border bg-muted/40 p-4 text-xs overflow-x-auto font-mono whitespace-pre">
        {code}
      </pre>
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 p-0"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
          toast.success("Copied");
        }}
        aria-label={`Copy ${id}`}
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function Endpoint({
  method, path, description, params, example,
}: {
  method: "GET";
  path: string;
  description: string;
  params?: { name: string; type: string; required?: boolean; description: string }[];
  example: string;
}) {
  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="font-mono text-[10px] border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {method}
        </Badge>
        <code className="text-sm font-mono">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
      {params && params.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Query parameters</p>
          <ul className="space-y-1.5 text-sm">
            {params.map((p) => (
              <li key={p.name} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <code className="font-mono text-xs shrink-0">{p.name}</code>
                <span className="text-xs text-muted-foreground shrink-0">{p.type}{p.required ? " · required" : ""}</span>
                <span className="text-muted-foreground">{p.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Example</p>
        <CodeBlock code={example} id={path} />
      </div>
    </Card>
  );
}

function ApiDocsPage() {
  const { isAdmin, isPlatformAdmin, isPlatformOwner } = useAuth();
  if (!isAdmin && !isPlatformAdmin && !isPlatformOwner) {
    throw redirect({ to: "/app" });
  }

  const base = typeof window !== "undefined" ? window.location.origin : "https://opsqai.de";

  return (
    <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 md:p-10 space-y-6 max-w-4xl mx-auto w-full">
      <Link
        to="/app/admin/integrations"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to integrations
      </Link>

      <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-4 items-start">
        <div className="h-14 w-14 shrink-0 rounded-2xl border grid place-items-center text-violet-500 bg-violet-500/10 border-violet-500/20">
          <Code2 className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Developer</p>
          <h1 className="mt-0.5 text-2xl sm:text-3xl font-semibold tracking-tight">
            Public REST API v1
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Read your company's knowledge base &amp; FAQs from any external system.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/app/admin/api-keys">
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            Manage keys
          </Link>
        </Button>
      </header>

      <Card className="p-5 sm:p-6 space-y-4">
        <h2 className="text-sm font-semibold">Authentication</h2>
        <p className="text-sm text-muted-foreground">
          All endpoints require a bearer token. Create one from{" "}
          <Link to="/app/admin/api-keys" className="underline">API keys</Link>{" "}
          — you'll see the full secret exactly once. Keys are scoped to your company.
        </p>
        <CodeBlock
          id="auth-header"
          code={`Authorization: Bearer opsq_live_xxxxxxxxxxxxxxxxxxxxxxxx`}
        />
        <div className="text-xs text-muted-foreground">
          <p><strong>Base URL:</strong> <code className="font-mono">{base}/api/public/v1</code></p>
          <p><strong>Rate limit:</strong> Fair-use, contact support for higher tiers.</p>
          <p><strong>Errors:</strong> <code>401</code> invalid token · <code>403</code> insufficient scope · <code>500</code> server error.</p>
        </div>
      </Card>

      <Endpoint
        method="GET"
        path="/api/public/v1/faqs"
        description="List FAQs for your company, ordered by most recently updated."
        params={[
          { name: "category", type: "string", description: "Filter by FAQ category." },
          { name: "limit", type: "1–200", description: "Page size, default 50." },
          { name: "offset", type: "integer", description: "Pagination offset, default 0." },
        ]}
        example={`curl "${base}/api/public/v1/faqs?limit=10" \\
  -H "Authorization: Bearer $OPSQAI_API_KEY"

# Response
{
  "data": [
    {
      "id": "…",
      "category": "shipping",
      "question_en": "How do I…",
      "question_de": "Wie…",
      "answer_en": "…",
      "answer_de": "…",
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "pagination": { "limit": 10, "offset": 0, "total": 42 }
}`}
      />

      <Endpoint
        method="GET"
        path="/api/public/v1/knowledge"
        description="List published, active knowledge documents for your company. Full content only returned when include_content=1."
        params={[
          { name: "category", type: "string", description: "Filter by category." },
          { name: "type", type: "string", description: "Filter by knowledge_type (sop, policy, …)." },
          { name: "include_content", type: "0 | 1", description: "Include content_text in response." },
          { name: "limit", type: "1–200", description: "Page size, default 50." },
          { name: "offset", type: "integer", description: "Pagination offset, default 0." },
        ]}
        example={`curl "${base}/api/public/v1/knowledge?type=sop&limit=20" \\
  -H "Authorization: Bearer $OPSQAI_API_KEY"

# Response
{
  "data": [
    {
      "id": "…",
      "title": "Receiving SOP v3",
      "category": "warehouse",
      "knowledge_type": "sop",
      "doc_code": "SOP-REC-003",
      "version": 3,
      "status": "published",
      "is_active": true,
      "is_critical": true,
      "created_at": "…",
      "updated_at": "…"
    }
  ],
  "pagination": { "limit": 20, "offset": 0, "total": 87 }
}`}
      />

      <Card className="p-5 sm:p-6 space-y-3">
        <h2 className="text-sm font-semibold">Security &amp; scope</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
          <li>Every key is scoped to the company that created it — cross-tenant reads are impossible.</li>
          <li>Only published, active knowledge documents are exposed via the API.</li>
          <li>Revoking a key stops all requests immediately.</li>
          <li>Rotate keys periodically and keep them out of client-side code (they must never ship in a browser bundle).</li>
        </ul>
      </Card>
    </div>
  );
}
