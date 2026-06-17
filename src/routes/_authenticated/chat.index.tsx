import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/i18n";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Trash2 } from "lucide-react";
import { deleteThread } from "@/lib/threads.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const { t } = useT();
  const navigate = useNavigate();
  const newThread = useServerFn(createThread);
  const delThread = useServerFn(deleteThread);
  const [threads, setThreads] = useState<{ id: string; title: string; updated_at: string }[]>([]);

  const load = async () => {
    const { data } = await supabase.from("threads").select("id,title,updated_at").order("updated_at", { ascending: false });
    setThreads(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const onNew = async () => {
    const th = await newThread({ data: {} });
    navigate({ to: "/chat/$threadId", params: { threadId: th.id } });
  };

  const onDelete = async (id: string) => {
    try { await delThread({ data: { id } }); load(); } catch (e) { toast.error(String(e)); }
  };

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("chat")}</h1>
        <Button onClick={onNew}>{t("newChat")}</Button>
      </div>
      {threads.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">{t("noThreads")}</Card>
      ) : (
        <Card className="divide-y divide-border">
          {threads.map((th) => (
            <div key={th.id} className="flex items-center gap-3 p-4 hover:bg-muted">
              <Link to="/chat/$threadId" params={{ threadId: th.id }} className="flex-1 min-w-0 flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{th.title}</div>
                  <div className="text-xs text-muted-foreground font-mono">{new Date(th.updated_at).toLocaleString()}</div>
                </div>
              </Link>
              <button onClick={() => onDelete(th.id)} className="p-2 text-muted-foreground hover:text-destructive rounded">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
