import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Panel } from "@/components/ui/panel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Trash2, Copy } from "lucide-react";
import { useT } from "@/i18n";
import {
  addSharePointSource,
  getMicrosoftSettings,
  removeSharePointSource,
  saveMicrosoftSettings,
  setSharePointSourceEnabled,
  syncSharePointNow,
  testMicrosoftConnection,
} from "@/lib/microsoft365.functions";
import { getTeamsSettings, saveTeamsSettings, testTeamsBotConnection } from "@/lib/teams-settings.functions";

export const Route = createFileRoute("/_authenticated/app/microsoft")({
  head: () => ({
    meta: [
      { title: "Microsoft 365 — OPSQAI" },
      { name: "description", content: "Sign in with Microsoft Entra ID and sync SharePoint folders into the Knowledge Base." },
      { property: "og:title", content: "Microsoft 365 — OPSQAI" },
      { property: "og:description", content: "Entra ID sign-in and SharePoint folder sync for your OPSQAI installation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MicrosoftPage,
});

const TXT = {
  ro: {
    eyebrow: "Integrări", title: "Microsoft 365",
    desc: "Conectare cu conturile Microsoft ale angajaților și sincronizarea folderelor SharePoint în Knowledge Base. Totul rulează pe acest server.",
    reg: "Înregistrarea aplicației (Entra ID)", tenant: "Tenant ID", client: "Application (client) ID", secret: "Client secret",
    secretKeep: "Salvat — lasă gol ca să îl păstrezi", redirect: "Redirect URI de adăugat în Entra (Web)",
    perms: "Permisiuni necesare: openid, profile, email (delegate) · Sites.Read.All, Files.Read.All (application, cu admin consent).",
    sso: "Permite conectarea cu Microsoft pe platformă", ssoHint: "Doar utilizatorii care au deja cont OPSQAI pot intra. Nu se aplică site-ului public.",
    save: "Salvează", test: "Testează conexiunea", ok: "Conexiune reușită", saved: "Salvat",
    sp: "Foldere SharePoint", spDesc: "Documentele noi și modificate se actualizează automat la 30 de minute. Versiunile vechi sunt dezactivate, iar citările au buton către fișierul original.",
    label: "Nume", site: "Link site SharePoint", folder: "Folder (ex. Proceduri/HR)", add: "Adaugă folder",
    sync: "Sincronizează acum", never: "Nesincronizat", needCfg: "Salvează mai întâi înregistrarea aplicației.",
    teams: "Bot Microsoft Teams", teamsDesc: "Botul răspunde în chaturi 1:1 și în canale doar din Knowledge Base-ul companiei, cu citarea surselor. Răspunsurile nu ies din datele companiei.",
    teamsApp: "Bot App ID (Microsoft App ID)", teamsSecret: "Client secret al botului", teamsSecretKeep: "Salvat — lasă gol ca să îl păstrezi",
    teamsEnabled: "Activează botul în Teams", teamsHook: "Messaging endpoint (de setat în înregistrarea botului)",
    teamsSave: "Salvează botul", teamsTest: "Testează botul", teamsOk: "Conexiunea botului funcționează",
  },
  en: {
    eyebrow: "Integrations", title: "Microsoft 365",
    desc: "Sign in with employees' Microsoft accounts and sync SharePoint folders into the Knowledge Base. Everything runs on this server.",
    reg: "App registration (Entra ID)", tenant: "Tenant ID", client: "Application (client) ID", secret: "Client secret",
    secretKeep: "Saved — leave empty to keep it", redirect: "Redirect URI to add in Entra (Web)",
    perms: "Required permissions: openid, profile, email (delegated) · Sites.Read.All, Files.Read.All (application, admin consent).",
    sso: "Allow Microsoft sign-in on the platform", ssoHint: "Only people who already have an OPSQAI account can sign in. Not used on the public website.",
    save: "Save", test: "Test connection", ok: "Connection works", saved: "Saved",
    sp: "SharePoint folders", spDesc: "New and changed documents update automatically every 30 minutes. Old versions are deactivated and citations link to the original file.",
    label: "Name", site: "SharePoint site link", folder: "Folder (e.g. Procedures/HR)", add: "Add folder",
    sync: "Sync now", never: "Not synced yet", needCfg: "Save the app registration first.",
    teams: "Microsoft Teams bot", teamsDesc: "The bot answers in 1:1 chats and channels only from the company Knowledge Base, with source citations. Nothing leaves company data.",
    teamsApp: "Bot App ID (Microsoft App ID)", teamsSecret: "Bot client secret", teamsSecretKeep: "Saved — leave empty to keep it",
    teamsEnabled: "Enable the bot in Teams", teamsHook: "Messaging endpoint (set in the bot registration)",
    teamsSave: "Save bot", teamsTest: "Test bot", teamsOk: "Bot connection works",
  },
  de: {
    eyebrow: "Integrationen", title: "Microsoft 365",
    desc: "Anmeldung mit Microsoft-Konten der Mitarbeitenden und Synchronisierung von SharePoint-Ordnern in die Wissensdatenbank. Alles läuft auf diesem Server.",
    reg: "App-Registrierung (Entra ID)", tenant: "Mandanten-ID", client: "Anwendungs-(Client-)ID", secret: "Geheimer Clientschlüssel",
    secretKeep: "Gespeichert — leer lassen zum Beibehalten", redirect: "In Entra einzutragende Umleitungs-URI (Web)",
    perms: "Benötigte Berechtigungen: openid, profile, email (delegiert) · Sites.Read.All, Files.Read.All (Anwendung, Admin-Zustimmung).",
    sso: "Microsoft-Anmeldung auf der Plattform erlauben", ssoHint: "Nur Personen mit bestehendem OPSQAI-Konto können sich anmelden. Nicht auf der öffentlichen Website.",
    save: "Speichern", test: "Verbindung testen", ok: "Verbindung funktioniert", saved: "Gespeichert",
    sp: "SharePoint-Ordner", spDesc: "Neue und geänderte Dokumente werden alle 30 Minuten aktualisiert. Alte Versionen werden deaktiviert, Zitate verlinken auf die Originaldatei.",
    label: "Name", site: "Link zur SharePoint-Website", folder: "Ordner (z. B. Verfahren/HR)", add: "Ordner hinzufügen",
    sync: "Jetzt synchronisieren", never: "Noch nicht synchronisiert", needCfg: "Speichern Sie zuerst die App-Registrierung.",
    teams: "Microsoft Teams Bot", teamsDesc: "Der Bot antwortet in 1:1-Chats und Kanälen ausschließlich aus der Wissensdatenbank des Unternehmens, mit Quellenangabe. Unternehmensdaten verlassen die Firma nicht.",
    teamsApp: "Bot-App-ID (Microsoft App ID)", teamsSecret: "Geheimer Clientschlüssel des Bots", teamsSecretKeep: "Gespeichert — leer lassen zum Beibehalten",
    teamsEnabled: "Bot in Teams aktivieren", teamsHook: "Messaging-Endpunkt (in der Bot-Registrierung einzutragen)",
    teamsSave: "Bot speichern", teamsTest: "Bot testen", teamsOk: "Bot-Verbindung funktioniert",
  },
};

function MicrosoftPage() {
  const { lang } = useT();
  const L = TXT[(lang === "ro" || lang === "de" ? lang : "en") as "ro" | "en" | "de"];
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getMicrosoftSettings);
  const fetchTeams = useServerFn(getTeamsSettings);
  const saveTeams = useServerFn(saveTeamsSettings);
  const testTeams = useServerFn(testTeamsBotConnection);
  const save = useServerFn(saveMicrosoftSettings);
  const test = useServerFn(testMicrosoftConnection);
  const add = useServerFn(addSharePointSource);
  const sync = useServerFn(syncSharePointNow);
  const toggle = useServerFn(setSharePointSourceEnabled);
  const remove = useServerFn(removeSharePointSource);
  const q = useQuery({ queryKey: ["microsoft-settings"], queryFn: () => fetchSettings() });
  const qTeams = useQuery({ queryKey: ["teams-settings"], queryFn: fetchTeams });

  const [tenantId, setTenant] = useState("");
  const [clientId, setClient] = useState("");
  const [secret, setSecret] = useState("");
  const [ssoEnabled, setSso] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [src, setSrc] = useState({ label: "", site_url: "", folder_path: "" });
  const [origin, setOrigin] = useState("");
  const [teamsApp, setTeamsApp] = useState("");
  const [teamsSecret, setTeamsSecret] = useState("");
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [hook, setHook] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => setHook(`${window.location.origin}/api/public/teams`), []);
  useEffect(() => {
    if (!qTeams.data) return;
    setTeamsApp(qTeams.data.appId);
    setTeamsEnabled(qTeams.data.enabled);
  }, [qTeams.data]);

  const run = async (key: string, fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(key);
    try {
      await fn();
      if (okMsg) toast.success(okMsg);
      await qc.invalidateQueries({ queryKey: ["microsoft-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const redirectUri = `${origin}/api/auth/microsoft/callback`;

  return (
    <ModulePage eyebrow={L.eyebrow} title={L.title} description={L.desc}>
      {q.isLoading || !q.data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="grid gap-6">
          <Panel className="p-5 space-y-4">
            <h2 className="font-semibold">{L.reg}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5"><Label>{L.tenant}</Label><Input value={tenantId} onChange={(e) => setTenant(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>{L.client}</Label><Input value={clientId} onChange={(e) => setClient(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>{L.secret}</Label>
                <Input type="password" autoComplete="off" value={secret} placeholder={q.data.hasSecret ? L.secretKeep : ""} onChange={(e) => setSecret(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{L.redirect}</Label>
              <div className="flex gap-2">
                <Input readOnly value={redirectUri} className="font-mono text-xs" />
                <Button variant="outline" size="icon" aria-label="Copy" onClick={() => { void navigator.clipboard.writeText(redirectUri); toast.success("OK"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{L.perms}</p>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Switch checked={ssoEnabled} onCheckedChange={setSso} id="sso" />
              <div><Label htmlFor="sso">{L.sso}</Label><p className="text-xs text-muted-foreground">{L.ssoHint}</p></div>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy !== null} onClick={() => run("save", async () => { await save({ data: { tenantId, clientId, clientSecret: secret || undefined, ssoEnabled } }); setSecret(""); }, L.saved)}>{L.save}</Button>
              <Button variant="outline" disabled={busy !== null || !q.data.configured} onClick={() => run("test", async () => { const r = await test(); if (!r.ok) throw new Error(r.error); }, L.ok)}>{L.test}</Button>
            </div>
          </Panel>

          <Panel className="p-5 space-y-4">
            <div><h2 className="font-semibold">{L.sp}</h2><p className="text-sm text-muted-foreground">{L.spDesc}</p></div>
            {!q.data.configured ? (
              <p className="text-sm text-muted-foreground">{L.needCfg}</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-[1fr_2fr_1.5fr_auto] items-end">
                  <div className="space-y-1.5"><Label>{L.label}</Label><Input value={src.label} onChange={(e) => setSrc({ ...src, label: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{L.site}</Label><Input placeholder="https://contoso.sharepoint.com/sites/Operations" value={src.site_url} onChange={(e) => setSrc({ ...src, site_url: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label>{L.folder}</Label><Input value={src.folder_path} onChange={(e) => setSrc({ ...src, folder_path: e.target.value })} /></div>
                  <Button disabled={busy !== null || !src.label || !src.site_url} onClick={() => run("add", async () => { await add({ data: { ...src, category: "sharepoint" } }); setSrc({ label: "", site_url: "", folder_path: "" }); }, L.saved)}>{L.add}</Button>
                </div>
                <ul className="divide-y rounded-md border">
                  {q.data.sources.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{s.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{s.site_url}{s.folder_path ? ` / ${s.folder_path}` : ""}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : L.never}
                          {s.last_counts ? ` · +${s.last_counts.added ?? 0} ~${s.last_counts.updated ?? 0} −${s.last_counts.removed ?? 0}` : ""}
                          {s.last_error ? <span className="text-destructive"> · {s.last_error}</span> : null}
                        </div>
                      </div>
                      {s.last_status && <Badge variant={s.last_status === "error" ? "destructive" : "secondary"}>{s.last_status}</Badge>}
                      <Switch checked={s.enabled} onCheckedChange={(v) => run(`t${s.id}`, () => toggle({ data: { id: s.id, enabled: v } }))} />
                      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run(`s${s.id}`, () => sync({ data: { id: s.id } }), L.saved)}>
                        <RefreshCw className={`mr-1 h-4 w-4 ${busy === `s${s.id}` ? "animate-spin" : ""}`} />{L.sync}
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Remove" disabled={busy !== null} onClick={() => run(`r${s.id}`, () => remove({ data: { id: s.id } }))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel className="p-5 space-y-4">
            <div><h2 className="font-semibold">{L.teams}</h2><p className="text-sm text-muted-foreground">{L.teamsDesc}</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{L.teamsApp}</Label>
                <Input value={teamsApp} onChange={(e) => setTeamsApp(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{L.teamsSecret}</Label>
                <Input type="password" autoComplete="off" value={teamsSecret} placeholder={qTeams.data?.hasSecret ? L.teamsSecretKeep : ""} onChange={(e) => setTeamsSecret(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{L.teamsHook}</Label>
              <div className="flex gap-2">
                <Input readOnly value={hook} className="font-mono text-xs" />
                <Button variant="outline" size="icon" aria-label="Copy" onClick={() => { void navigator.clipboard.writeText(hook); toast.success("OK"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md border p-3">
              <Switch checked={teamsEnabled} onCheckedChange={setTeamsEnabled} id="teams-enabled" />
              <div><Label htmlFor="teams-enabled">{L.teamsEnabled}</Label><p className="text-xs text-muted-foreground">{L.teamsDesc}</p></div>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy !== null || !teamsApp} onClick={() => run("teams-save", async () => {
                await saveTeams({ data: { appId: teamsApp, appSecret: teamsSecret || undefined, enabled: teamsEnabled } });
                setTeamsSecret("");
                await qc.invalidateQueries({ queryKey: ["teams-settings"] });
              }, L.saved)}>{L.teamsSave}</Button>
              <Button variant="outline" disabled={busy !== null || !qTeams.data?.configured} onClick={() => run("teams-test", async () => {
                const r = await testTeams();
                if (!r.ok) throw new Error(r.error);
              }, L.teamsOk)}>{L.teamsTest}</Button>
            </div>
          </Panel>
        </div>
      )}
    </ModulePage>
  );
}
