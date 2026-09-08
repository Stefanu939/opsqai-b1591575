// OPSQAI HR — visible loading / failure states.
//
// The HR Overview and Settings screens both read one aggregated query. When it
// is slow or fails we must never leave an empty grey panel on screen: show what
// is happening and offer a retry.
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

export function HrLoading({ label }: { label: string }) {
  return (
    <Panel>
      <div className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
      <div className="space-y-3 px-6 pb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
        ))}
      </div>
    </Panel>
  );
}

export function HrFailure({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Panel>
      <div className="space-y-3 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden />
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          {retryLabel}
        </Button>
      </div>
    </Panel>
  );
}

export function HrWarnings({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
      <p className="font-medium text-amber-600 dark:text-amber-400">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        {items.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
