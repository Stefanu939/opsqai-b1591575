import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Smartphone, Download } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { getAndroidAppDownload } from "@/lib/android-app.functions";

/** Download card for the OPSQAI Android app — shared by MC and Portal. */
export function AndroidAppCard() {
  const fn = useServerFn(getAndroidAppDownload);
  const { data, isLoading } = useQuery({
    queryKey: ["android-app-download"],
    queryFn: () => fn(),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });

  return (
    <Panel
      icon={Smartphone}
      title="Aplicația OPSQAI pentru Android"
      description="Se actualizează singură: orice noutate apare imediat ce redeschideți aplicația."
    >
      <div className="space-y-3 text-sm">
        {isLoading ? (
          <p className="text-muted-foreground">Se verifică…</p>
        ) : data?.available && data.url ? (
          <>
            <Button asChild>
              <a href={data.url} download>
                <Download className="h-4 w-4" />
                Descarcă aplicația (v{data.version})
              </a>
            </Button>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Deschideți această pagină de pe telefonul Android și apăsați butonul.</li>
              <li>Deschideți fișierul descărcat. Dacă telefonul întreabă, permiteți instalarea din această sursă.</li>
              <li>Porniți OPSQAI de pe ecranul principal și conectați-vă.</li>
            </ol>
            {data.sha256 ? (
              <p className="break-all font-mono text-xs text-muted-foreground">SHA-256: {data.sha256}</p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">Aplicația va fi disponibilă aici în curând.</p>
        )}
      </div>
    </Panel>
  );
}
