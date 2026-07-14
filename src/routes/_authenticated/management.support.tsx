import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listSupportConversations } from "@/lib/support.functions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inbox, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/management/support")({
  head: () => ({ meta: [{ title: "Support — Management Center" }] }),
  component: SupportPage,
});

type Row = {
  id: string;
  company_id: string;
  subject: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  last_message_at: string;
  unread_for_platform: number;
  companies: { name: string } | null;
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function SupportPage() {
  const list = useServerFn(listSupportConversations);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | Row["status"]>("open");
  const [priority, setPriority] = useState<"all" | Row["priority"]>("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["mc-support", status, priority, q],
    queryFn: () =>
      list({
        data: {
          scope: "platform",
          status: status === "all" ? undefined : status,
          priority: priority === "all" ? undefined : priority,
          search: q || undefined,
        },
      }) as Promise<Row[]>,
  });

  const unread = useMemo(
    () => (data as Row[]).reduce((sum, r) => sum + (r.unread_for_platform ?? 0), 0),
    [data],
  );

  const columns: Column<Row>[] = [
    {
      key: "subject",
      header: "Subject",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">{r.subject}</span>
          <span className="text-xs text-muted-foreground">
            {r.companies?.name ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge
          variant={
            r.status === "open"
              ? "default"
              : r.status === "pending"
                ? "secondary"
                : "outline"
          }
        >
          {r.status}
        </Badge>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (r) => (
        <Badge
          variant={
            r.priority === "critical"
              ? "destructive"
              : r.priority === "high"
                ? "default"
                : "outline"
          }
        >
          {r.priority}
        </Badge>
      ),
    },
    {
      key: "unread",
      header: "Unread",
      align: "right",
      render: (r) => (
        <span className="tabular-nums">
          {r.unread_for_platform > 0 ? (
            <Badge>{r.unread_for_platform}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      ),
    },
    {
      key: "last",
      header: "Last message",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.last_message_at ? relTime(r.last_message_at) + " ago" : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <PageHeader
        eyebrow="Management Center"
        title="Support"
        description="Every support conversation across all customers."
      />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by subject…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as typeof priority)}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          <span className="tabular-nums">{unread}</span> unread
        </div>
      </div>

      <DataTable<Row>
        columns={columns}
        rows={data as Row[]}
        rowKey={(r) => r.id}
        loading={isLoading}
        empty={{
          icon: Inbox,
          title: "No conversations",
          description: "Support tickets from customers will appear here.",
        }}
      />
    </div>
  );
}
