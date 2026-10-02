/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Monitor, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n";
import {
  listConnectedComputers,
  updateConnectedComputer,
  revokeConnectedComputer,
} from "@/lib/stations.functions";

export const Route = createFileRoute("/_authenticated/app/computers")({
  head: () => ({ meta: [{ title: "Connected computers — OPSQAI" }] }),
  component: ComputersPage,
});

function ComputersPage() {
  const { lang } = useT();
  const L = (en: string, ro: string, de: string) => (lang === "ro" ? ro : lang === "de" ? de : en);
  const list = useServerFn(listConnectedComputers);
  const save = useServerFn(updateConnectedComputer);
  const revoke = useServerFn(revokeConnectedComputer);
  const [rows, setRows] = useState<any[]>([]);
  const [edit, setEdit] = useState<Record<string, { name: string; location: string }>>({});

  const load = async () => {
    try {
      setRows(((await list()) as any[]) ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

  return (
    <ModulePage
      eyebrow="Self-Hosted"
      title={L("Connected computers", "Calculatoare conectate", "Verbundene Computer")}
      description={L(
        "Workstations paired with this main computer. The licence and all data stay here; revoke a lost or stolen computer to disconnect it immediately.",
        "Stațiile asociate cu acest calculator principal. Licența și toate datele rămân aici; revocă un calculator pierdut sau furat pentru a-l deconecta imediat.",
        "Arbeitsplätze, die mit diesem Hauptcomputer verbunden sind. Lizenz und Daten bleiben hier; einen verlorenen Computer widerrufen, um ihn sofort zu trennen.",
      )}
    >
      <Panel title={L("Workstations", "Stații de lucru", "Arbeitsplätze")} icon={Monitor}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {L(
              "No workstation is paired yet. Install OPSQAI on another computer and choose “Workstation”.",
              "Nicio stație asociată încă. Instalează OPSQAI pe alt calculator și alege „Stație de lucru”.",
              "Noch kein Arbeitsplatz verbunden. OPSQAI auf einem anderen Computer installieren und „Arbeitsplatz“ wählen.",
            )}
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const e = edit[r.id] ?? { name: r.name, location: r.location ?? "" };
              return (
                <div key={r.id} className="rounded-lg border border-border p-3 grid gap-2 md:grid-cols-[1fr_1fr_auto] items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{L("Station", "Stația", "Arbeitsplatz")} {i + 1}</span>
                      <span className="font-mono">{r.id.slice(0, 8)}</span>
                      {r.revoked_at ? (
                        <Badge variant="destructive">{L("Revoked", "Revocată", "Widerrufen")}</Badge>
                      ) : (
                        <Badge variant="secondary">{L("Active", "Activă", "Aktiv")}</Badge>
                      )}
                    </div>
                    <Input
                      value={e.name}
                      disabled={!!r.revoked_at}
                      onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, name: ev.target.value } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">
                      {L("Last connection", "Ultima conectare", "Letzte Verbindung")}: {fmt(r.last_seen_at)}
                    </div>
                    <Input
                      value={e.location}
                      disabled={!!r.revoked_at}
                      placeholder={L("Location", "Locație", "Standort")}
                      onChange={(ev) => setEdit({ ...edit, [r.id]: { ...e, location: ev.target.value } })}
                    />
                  </div>
                  {!r.revoked_at && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await save({ data: { id: r.id, name: e.name, location: e.location || null } });
                          toast.success(L("Saved", "Salvat", "Gespeichert"));
                          void load();
                        }}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm(L("Revoke this computer?", "Revoci acest calculator?", "Diesen Computer widerrufen?"))) return;
                          await revoke({ data: { id: r.id } });
                          void load();
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> {L("Revoke", "Revocă", "Widerrufen")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </ModulePage>
  );
}
