import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listSupportConversations,
  getSupportConversation,
  createSupportConversation,
  postSupportMessage,
} from "@/lib/support.functions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessagesSquare, Plus, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/portal/support")({
  component: PortalSupport,
});

function PortalSupport() {
  const listFn = useServerFn(listSupportConversations);
  const getFn = useServerFn(getSupportConversation);
  const createFn = useServerFn(createSupportConversation);
  const postFn = useServerFn(postSupportMessage);
  const qc = useQueryClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "critical">("normal");
  const [body, setBody] = useState("");

  const list = useQuery({
    queryKey: ["portal-support-list"],
    queryFn: () => listFn({ data: { scope: "mine" } }),
  });

  const conv = useQuery({
    queryKey: ["portal-support", selected],
    queryFn: () => getFn({ data: { id: selected! } }),
    enabled: !!selected,
  });

  const create = useMutation({
    mutationFn: () => createFn({ data: { subject, priority, body } }),
    onSuccess: (row) => {
      toast.success("Ticket opened");
      setOpen(false);
      setSubject("");
      setBody("");
      setPriority("normal");
      setSelected((row as { id: string }).id);
      qc.invalidateQueries({ queryKey: ["portal-support-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: () =>
      postFn({ data: { conversation_id: selected!, body: reply, internal_note: false } }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["portal-support", selected] });
      qc.invalidateQueries({ queryKey: ["portal-support-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = list.data ?? [];

  return (
    <div className="p-6 md:p-10 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
            Customer portal
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
            Support
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Open a support ticket with the OPSQAI team. All conversations are private to your
            company.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Open a support ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Short summary"
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe the issue…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => create.mutate()}
                disabled={!subject.trim() || !body.trim() || create.isPending}
              >
                Open ticket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        <Card className="p-0 overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessagesSquare}
                title="No tickets yet"
                description="Open a new ticket to start a conversation with OPSQAI support."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setSelected(r.id)}
                    className={`w-full text-left p-3 hover:bg-accent/40 transition-colors ${selected === r.id ? "bg-accent" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm truncate">{r.subject}</div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.priority} ·{" "}
                      {r.last_message_at
                        ? new Date(r.last_message_at).toLocaleString()
                        : new Date(r.created_at).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-0 flex flex-col min-h-[500px]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-sm text-muted-foreground text-center">
                Select a ticket to view the conversation.
              </div>
            </div>
          ) : conv.isLoading || !conv.data?.conversation ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (
            <>
              <div className="border-b border-border p-4">
                <div className="font-display font-semibold">{conv.data.conversation.subject}</div>
                <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                  <Badge variant="outline">{conv.data.conversation.status}</Badge>
                  <Badge variant="outline">{conv.data.conversation.priority}</Badge>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conv.data.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_kind === "customer" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.sender_kind === "customer"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-1">
                        {m.sender_kind === "customer" ? "You" : "OPSQAI"} ·{" "}
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Textarea
                  rows={2}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply…"
                  className="resize-none"
                />
                <Button
                  onClick={() => send.mutate()}
                  disabled={!reply.trim() || send.isPending}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
