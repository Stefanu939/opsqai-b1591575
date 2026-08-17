import { Chrome, Download, Puzzle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Download card for the OPSQAI Inbox Companion — a Chromium extension that
 * shows upcoming OPSQAI events next to Gmail / Outlook Web, driven by the
 * same private ICS feed used for calendar subscriptions.
 */
export function ExtensionCard() {
  const download = () => {
    fetch("/opsqai-inbox-companion.zip")
      .then((res) => {
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "opsqai-inbox-companion.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch((err: Error) => toast.error(err.message));
  };

  return (
    <div className="oq-soft-card grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-[var(--gold-soft)] text-[color:var(--gold)]">
            <Puzzle className="h-4 w-4" />
          </span>
          <h3 className="font-display text-sm font-semibold text-foreground">
            OPSQAI Inbox Companion
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Browser extension for Chrome, Edge, Brave and Arc. Pins your OPSQAI agenda next to Gmail
          and Outlook Web so renewals and meetings stay visible while you work through email.
        </p>
        <ol className="mt-3 space-y-1 text-xs text-muted-foreground">
          <li>1. Download and unzip the package.</li>
          <li>
            2. Open <code className="rounded bg-secondary px-1">chrome://extensions</code> and enable
            Developer mode.
          </li>
          <li>3. Click “Load unpacked” and pick the unzipped folder.</li>
          <li>4. Paste your calendar subscription link into the extension popup.</li>
        </ol>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <Button className="rounded-full" onClick={download}>
          <Download className="mr-2 h-4 w-4" />
          Download extension
        </Button>
        <span className="inline-flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <Chrome className="h-3.5 w-3.5" />
          Manifest V3 · Chromium browsers
        </span>
      </div>
    </div>
  );
}
