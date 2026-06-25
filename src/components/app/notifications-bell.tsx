import { useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Notif {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as Notif[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() } as never).eq("id", id);
    load();
  };
  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() } as never).in("id", ids);
      load();
    }
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    load();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">Notifications</div>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>Mark all read</Button>}
        </div>
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">No notifications yet.</div>
        ) : (
          <div>
            {items.map((n) => (
              <div key={n.id} className={`px-3 py-2.5 border-b last:border-0 text-xs hover:bg-muted/40 ${n.read_at ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-2">
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { if (!n.read_at) markRead(n.id); if (n.link) navigate({ to: n.link }); }}
                  >
                    <div className="font-medium truncate">{n.title}</div>
                    {n.body && <div className="text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                  </button>
                  <div className="flex flex-col gap-0.5">
                    {!n.read_at && (
                      <button aria-label="Mark read" onClick={() => markRead(n.id)} className="p-1 text-muted-foreground hover:text-foreground">
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    <button aria-label="Dismiss" onClick={() => remove(n.id)} className="p-1 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
