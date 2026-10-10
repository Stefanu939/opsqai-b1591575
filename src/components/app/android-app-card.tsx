import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, ArrowDownToLine } from "lucide-react";
import { getAndroidAppDownload } from "@/lib/android-app.functions";

/** Compact, discreet download strip for the OPSQAI Android app — shared by MC and Portal. */
export function AndroidAppCard() {
  const fn = useServerFn(getAndroidAppDownload);
  const { data } = useQuery({
    queryKey: ["android-app-download"],
    queryFn: () => fn(),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  if (!data?.available || !data.url) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Smartphone className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">OPSQAI pentru Android</p>
        <p className="text-xs text-muted-foreground">v{data.version}</p>
      </div>
      <a
        href={data.url}
        download
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <ArrowDownToLine className="h-3.5 w-3.5" />
        Descarcă
      </a>
    </div>
  );
}
