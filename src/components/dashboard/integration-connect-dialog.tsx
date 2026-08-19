// Connect dialog for the Outlook / Gmail / Teams dashboard cards.
//
// OPSQAI links the two mail providers through the Inbox Companion extension
// and the private ICS calendar feed (no OAuth broker), and Teams through an
// incoming webhook. The dialog walks the admin through the real steps and then
// persists the connection state.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { connectIntegrationFn, disconnectIntegrationFn } from "@/lib/integrations.functions";
import { getCalendarFeed } from "@/lib/calendar.functions";
import {
  calendarFeedUrl,
  calendarGoogleUrl,
  calendarOutlookWebUrl,
  calendarWebcalUrl,
} from "@/lib/calendar-feed-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type IntegrationProviderKey = "outlook" | "gmail" | "teams";

const TITLE: Record<IntegrationProviderKey, string> = {
  outlook: "Connect Microsoft Outlook",
  gmail: "Connect Gmail",
  teams: "Connect Microsoft Teams",
};

export function IntegrationConnectDialog({
  provider,
  connected,
  onClose,
}: {
  provider: IntegrationProviderKey | null;
  connected: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const connect = useServerFn(connectIntegrationFn);
  const disconnect = useServerFn(disconnectIntegrationFn);
  const feed = useServerFn(getCalendarFeed);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const isMail = provider === "outlook" || provider === "gmail";

  const feedQ = useQuery({
    queryKey: ["calendar-feed", "integration"],
    queryFn: () => feed({ data: {} } as never),
    enabled: isMail,
  });
  const feedUrl = calendarFeedUrl((feedQ.data as { token?: string } | undefined)?.token);

  const save = useMutation({
    mutationFn: () =>
      connect({
        data: {
          provider: provider as IntegrationProviderKey,
          method: isMail ? "companion" : null,
          webhookUrl: provider === "teams" ? webhookUrl : null,
        },
      } as never),
    onSuccess: () => {
      toast.success("Integration connected");
      qc.invalidateQueries({ queryKey: ["management-overview"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => disconnect({ data: { provider: provider as IntegrationProviderKey } } as never),
    onSuccess: () => {
      toast.success("Integration disconnected");
      qc.invalidateQueries({ queryKey: ["management-overview"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{provider ? TITLE[provider] : ""}</DialogTitle>
          <DialogDescription>
            {isMail
              ? "Two steps: install the Inbox Companion extension, then subscribe your mailbox calendar to the private OPSQAI feed."
              : "Paste an incoming-webhook URL from the Teams channel that should receive OPSQAI notifications."}
          </DialogDescription>
        </DialogHeader>

        {isMail ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                1 · Inbox Companion extension
              </Label>
              <a href="/opsqai-inbox-companion.zip" download>
                <Button variant="outline" size="sm" type="button">
                  <Download className="mr-2 h-4 w-4" />
                  Download extension (.zip)
                </Button>
              </a>
              <p className="text-xs text-muted-foreground">
                Load it as an unpacked extension in Edge/Chrome, then sign in with your OPSQAI
                account. It adds “Ask OPSQAI” to {provider === "gmail" ? "Gmail" : "Outlook"}.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                2 · Calendar subscription
              </Label>
              {feedQ.isLoading ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing your private link…
                </p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input readOnly value={feedUrl} className="font-mono text-[11px]" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        await navigator.clipboard.writeText(feedUrl);
                        setCopied(true);
                        toast.success("Link copied");
                        setTimeout(() => setCopied(false), 1500);
                      }}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {provider === "gmail" ? (
                      <a href={calendarGoogleUrl(feedUrl)} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm" type="button">
                          <ExternalLink className="mr-2 h-3.5 w-3.5" />
                          Add to Google Calendar
                        </Button>
                      </a>
                    ) : (
                      <>
                        <a
                          href={calendarOutlookWebUrl(feedUrl, true)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="outline" size="sm" type="button">
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            Microsoft 365
                          </Button>
                        </a>
                        <a href={calendarOutlookWebUrl(feedUrl)} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm" type="button">
                            Outlook.com
                          </Button>
                        </a>
                      </>
                    )}
                    <a href={calendarWebcalUrl(feedUrl)}>
                      <Button variant="ghost" size="sm" type="button">
                        Desktop (webcal)
                      </Button>
                    </a>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Providers fetch this link from their own servers. If your OPSQAI host is not
                    reachable from the internet, paste the link inside your network instead.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="teams-webhook">Incoming webhook URL</Label>
            <Input
              id="teams-webhook"
              placeholder="https://outlook.office.com/webhook/…"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              In Teams: channel → … → Connectors → Incoming Webhook → Create, then copy the URL.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {connected ? (
            <Button
              variant="ghost"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              type="button"
            >
              Disconnect
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} type="button">
            {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {connected ? "Save" : "Mark as connected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
