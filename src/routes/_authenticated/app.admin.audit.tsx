import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAuditLog } from "@/lib/admin-stats.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/app/admin/audit")({
  component: AuditPage,
});

interface Row {
  id: string;
  user_id: string;
  user_name: string | null;
  company_id: string | null;
  company_name: string | null;
  thread_id: string | null;
  question: string;
  answer_preview: string | null;
  sources: Array<{ type: string; title: string; code?: string | null }> | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function AuditPage() {
  const { t } = useT();
  const { isAdmin, isManager, isPlatformAdmin } = useAuth();
  const fetchAudit = useServerFn(listAuditLog);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [since, setSince] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const canView = isAdmin || isManager || isPlatformAdmin;

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Reset paging when filters change
  useEffect(() => { setOffset(0); }, [debouncedSearch, since]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAudit({
      data: {
        search: debouncedSearch,
        limit: PAGE_SIZE,
        offset,
        since: since ? new Date(since).toISOString() : null,
      },
    })
      .then((r) => {
        if (cancelled) return;
        const res = r as { rows: Row[]; total: number };
        setRows(res.rows);
        setTotal(res.total);
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [canView, fetchAudit, debouncedSearch, since, offset]);

  const fmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }),
    [],
  );

  if (!canView) {
    return <div className="p-8 text-sm text-muted-foreground">Admin only.</div>;
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, total);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{t("auditLog")}</h1>
      <p className="text-sm text-muted-foreground mb-4">{t("auditLogDesc")}</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search question…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Input
          type="date"
          value={since}
          onChange={(e) => setSince(e.target.value)}
          className="sm:max-w-[180px]"
          aria-label="Since date"
        />
        {(search || since) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setSince(""); }}>
            Clear
          </Button>
        )}
        <div className="sm:ml-auto text-xs text-muted-foreground self-center">
          {loading ? "Loading…" : total > 0 ? `${pageStart}–${pageEnd} of ${total}` : "—"}
        </div>
      </div>

      {error && (
        <Card className="p-4 mb-4 border-destructive/40 text-sm text-destructive">{error}</Card>
      )}

      {!loading && rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No audit entries match these filters.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {rows.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <div key={r.id} className="p-4">
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="text-sm font-medium flex-1 min-w-0 break-words">
                      {r.question}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono shrink-0">
                      {fmt.format(new Date(r.created_at))}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span>{r.user_name || r.user_id.slice(0, 8)}</span>
                    {isPlatformAdmin && r.company_name && (
                      <Badge variant="secondary" className="text-[10px]">{r.company_name}</Badge>
                    )}
                  </div>
                </button>
                {r.answer_preview && (
                  <p className={`text-sm text-muted-foreground mt-2 ${isOpen ? "" : "line-clamp-2"}`}>
                    {r.answer_preview}
                  </p>
                )}
                {r.sources && r.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.sources.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {s.type === "document"
                          ? (s.code ? `${s.code} — ${s.title}` : s.title)
                          : `FAQ: ${s.title}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          Previous
        </Button>
        <div className="text-xs text-muted-foreground">
          Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={offset + rows.length >= total || loading}
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
