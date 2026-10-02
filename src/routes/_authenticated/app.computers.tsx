/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Monitor, Trash2, Save, Globe, Copy, KeyRound } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  getRemoteAccess,
  setRemoteAccess,
  createStationPairingCode,
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
      <RemoteAccessPanel L={L} />
    </ModulePage>
  );
}

function RemoteAccessPanel({ L }: { L: (en: string, ro: string, de: string) => string }) {
  const get = useServerFn(getRemoteAccess);
  const set = useServerFn(setRemoteAccess);
  const mkCode = useServerFn(createStationPairingCode);
  const [st, setSt] = useState<any>(null);
  const [host, setHost] = useState("");
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);

  const load = async () => {
    try {
      const r: any = await get();
      setSt(r);
      setHost((h) => h || r?.hostname || "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, []);

  const statusText: Record<string, string> = {
    off: L("Off", "Oprit", "Aus"),
    pending: L("Configuring the office router…", "Se configurează routerul biroului…", "Bürorouter wird eingerichtet…"),
    ready: L("Ready — other locations can connect", "Gata — alte locații se pot conecta", "Bereit — andere Standorte können sich verbinden"),
    router_manual: L(
      "The router did not accept automatic setup. Forward the port below to this computer in your router.",
      "Routerul nu a acceptat configurarea automată. Redirecționează în router portul de mai jos către acest calculator.",
      "Der Router hat die automatische Einrichtung abgelehnt. Leiten Sie den Port unten im Router an diesen Computer weiter.",
    ),
    cgnat: L(
      "Your internet provider shares one public address between customers, so this office cannot be reached from outside. Ask the provider for a public IP, or use a VPN.",
      "Furnizorul de internet folosește o adresă publică comună pentru mai mulți clienți, deci biroul nu poate fi accesat din exterior. Cere furnizorului o adresă IP publică sau folosește VPN.",
      "Ihr Internetanbieter teilt eine öffentliche Adresse mit anderen Kunden; dieses Büro ist von außen nicht erreichbar. Fragen Sie nach einer öffentlichen IP oder nutzen Sie ein VPN.",
    ),
  };

  const toggle = async (enabled: boolean) => {
    await set({ data: { enabled, hostname: host || null } });
    setCode(null);
    void load();
  };

  return (
    <Panel
      title={L("Computers in other locations", "Calculatoare din alte locații", "Computer an anderen Standorten")}
      description={L(
        "Lets a workstation in another city or country connect directly to this computer over the internet — no VPN, no OPSQAI server in between. Every new computer needs a one-time code from you.",
        "Permite unei stații din alt oraș sau altă țară să se conecteze direct la acest calculator prin internet — fără VPN, fără vreun server OPSQAI la mijloc. Fiecare calculator nou are nevoie de un cod unic generat de tine.",
        "Ein Arbeitsplatz in einer anderen Stadt oder einem anderen Land verbindet sich direkt über das Internet mit diesem Computer — ohne VPN, ohne OPSQAI-Server dazwischen. Jeder neue Computer braucht einen Einmalcode von Ihnen.",
      )}
      icon={Globe}
    >
      {!st ? null : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={st.enabled} onCheckedChange={(v) => void toggle(v)} />
            <span className="text-sm font-medium">
              {L("Allow computers from other locations", "Permite calculatoare din alte locații", "Computer von anderen Standorten erlauben")}
            </span>
          </div>
          {st.enabled && (
            <>
              <div className="rounded-lg border border-border p-3 text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">{L("Status", "Stare", "Status")}: </span>
                  {statusText[st.status] ?? st.status}
                </div>
                {st.publicIp && (
                  <div className="text-muted-foreground">
                    {L("Public address", "Adresă publică", "Öffentliche Adresse")}: <span className="font-mono">{st.publicIp}:{st.externalPort}</span>
                  </div>
                )}
                {st.status === "router_manual" && (
                  <div className="text-muted-foreground">
                    TCP <span className="font-mono">{st.externalPort}</span> → <span className="font-mono">{st.localIp ?? "?"}:443</span>
                  </div>
                )}
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">
                  {L(
                    "Optional: company address name (e.g. from your router's DynDNS). Recommended if your public IP changes.",
                    "Opțional: numele adresei firmei (de ex. DynDNS din router). Recomandat dacă IP-ul public se schimbă.",
                    "Optional: Adressname der Firma (z. B. DynDNS im Router). Empfohlen, wenn sich die öffentliche IP ändert.",
                  )}
                </span>
                <div className="flex gap-2">
                  <Input value={host} placeholder="firma.dyndns.org" onChange={(e) => setHost(e.target.value)} />
                  <Button variant="outline" onClick={() => void toggle(true)}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </label>
              <div className="space-y-2">
                <Button
                  disabled={!(st.publicIp || st.hostname) || st.status === "cgnat"}
                  onClick={async () => {
                    try {
                      setCode((await mkCode()) as any);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : String(e));
                    }
                  }}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  {L("Create pairing code", "Generează cod de asociere", "Kopplungscode erstellen")}
                </Button>
                {code && (
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm break-all">{code.code}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void navigator.clipboard.writeText(code.code);
                          toast.success(L("Copied", "Copiat", "Kopiert"));
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {L(
                        "Valid once, for 15 minutes. Send it to the colleague installing the workstation; they paste it at “Pairing code”.",
                        "Valabil o singură dată, 15 minute. Trimite-l colegului care instalează stația; el îl lipește la „Cod de asociere”.",
                        "Einmal gültig, 15 Minuten. Senden Sie ihn an die Person, die den Arbeitsplatz installiert; sie fügt ihn bei „Kopplungscode“ ein.",
                      )}{" "}
                      {new Date(code.expiresAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}
