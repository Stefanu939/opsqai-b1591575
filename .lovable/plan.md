# Update automatic Self-Hosted: MC ca sursă + descărcare din aplicație

Alegerea ta: **A + B**, plus descărcarea installerului direct din Self-Hosted (manual sau automat).

## Cum va funcționa

1. **Când apare o versiune nouă pe GitHub**, un pas automat o înregistrează în Management Center (Releases) și, dacă pachetul e încărcat, îl marchează ca publicat pe canalul `stable` sau `beta`.
2. **Management Center devine sursa de adevăr.** Self-Hosted întreabă MC „există o versiune mai nouă pentru licența mea?” și primește versiunea, notele și un link de descărcare valabil temporar.
3. **Self-Hosted descarcă singur pachetul**, verifică semnătura și amprenta fișierului, apoi îl instalează automat în fereastra de mentenanță (implicit 02:00–04:00), cu backup și revenire automată dacă eșuează.
4. **Buton manual în aplicație**: „Verifică actualizări” → „Descarcă acum” → „Instalează acum sau la 02:00”. Cine nu vrea automat poate opri comutatorul.
5. Dacă MC nu e accesibil, se folosește ca rezervă vechea adresă de actualizări, ca instalările izolate să nu rămână blocate.

## Ce vede utilizatorul

- În Self-Hosted, pagina Actualizări arată: versiunea instalată, versiunea disponibilă, notele versiunii, stadiul descărcării (bară de progres), ora ferestrei de mentenanță, rezultatul ultimei actualizări și istoricul.
- În Management Center, la Releases: canal (stabil/beta), publicare/retragere, procent de adopție pe clienți și cine a instalat ce versiune.

## Detalii tehnice

- Endpoint public nou `src/routes/api/public/v1/updates/check.ts`: primește tokenul semnat al instalării (același mecanism ca heartbeat), validează licența/mentenanța, citește `installer_releases` filtrat pe canal + stare publicat și întoarce `{version, notes, url, sha256, signature, channel}`. URL-ul e un link semnat, cu expirare, către pachetul din storage.
- `installer_releases`: se adaugă coloanele `channel` (`stable|beta`), `published_at`, `min_version`, `sha256`, `signature`, `notes`, plus indexul pe (channel, published_at). Migrație aditivă, cu GRANT-uri; citirea se face doar prin endpointul public (service role), nu direct de client.
- `github-installer-release.server.ts`: după preluarea release-ului, completează canalul și amprenta; dacă lipsește pachetul, rămâne `draft` până la upload din MC.
- `opsqai-windows/services/updater/index.js`: sursa primară devine endpointul MC (`cfg.mc.baseUrl` + tokenul instalării), cu fallback pe manifestul semnat existent. Verificarea Ed25519 și SHA-256 rămâne obligatorie — un pachet fără semnătură validă nu se instalează niciodată.
- Descărcare manuală declanșată din UI: server function nouă `triggerSelfHostUpdateDownload` scrie o comandă în `%ProgramData%\OPSQAI\updates\command.json`; updaterul o preia la următorul ciclu (max 60s) și raportează progresul în `state.json`, citit de `selfhost-updates.functions.ts`.
- `src/routes/_authenticated/app.updates.tsx`: în `AutoUpdatePanel` se adaugă versiunea disponibilă, butoanele „Verifică”/„Descarcă”/„Instalează acum”, progres și note; acces doar pentru proprietarul platformei.
- Adopție în MC: instalările raportează deja versiunea prin heartbeat; pagina Releases o agregă pe versiune și client.
- Traduceri EN/DE/RO pentru toate textele noi.

## Verificare

- Typecheck, build și testele existente.
- Test unitar pentru selecția versiunii (canal, versiune minimă, „mai nou decât cel instalat”) și pentru respingerea unui pachet cu semnătură invalidă.
- Test pe endpointul public: token invalid → refuz; licență fără mentenanță activă → fără actualizare.
