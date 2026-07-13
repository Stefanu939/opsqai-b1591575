## De ce apare eroarea

Când regenerezi pachetul de instalare, `assembleInstallationPackage` (rulează în Cloudflare Worker) încearcă:

```ts
fetch("/__l5e/assets-v1/<uuid>/install.exe")
```

`fetch` în Worker **cere URL absolut**. Codul are un fallback pe `process.env.OPSQAI_ASSET_ORIGIN`, dar variabila nu e setată în producție → `origin = ""` → `fullUrl` rămâne `/__l5e/...` → aruncă `Invalid URL`. Fallback-ul local (`readFileSync` din `installer/dist/...`) nu există în Worker (fără filesystem real), deci eroarea originală bubble-up cu textul pe care îl vezi în toast.

## Fix propus (minimal, un singur fișier)

Derivă originul din requestul curent al server function-ului, în loc să te bazezi pe un env var neconfigurat.

**`src/lib/installation-package.server.ts`**
1. Import: `import { getWebRequest } from "@tanstack/react-start/server";`
2. În `fetchAsset`, ordinea de rezolvare a originii:
   1. dacă `url` e deja absolut → folosește-l direct;
   2. altfel încearcă `getWebRequest()` și extrage `new URL(req.url).origin`;
   3. dacă nu există request (ex. Vitest), încearcă `process.env.OPSQAI_ASSET_ORIGIN`;
   4. dacă tot nu-l are, sari direct pe fallback-ul `readFileSync(localFallback)` (path-ul dev/test existent) — fără să mai construiască un URL invalid.
3. Împachetează `fetch(fullUrl)` doar pe ramura (1)/(2)/(3); pe ramura (4), sari direct la filesystem.
4. Mesajul de eroare final rămâne descriptiv, dar acum ori merge fetch-ul via origin real, ori intră pe fallback curat.

Fără schimbări în UI, în ruta `/demo`, în asset JSON-uri, sau în binarul Go. Restul contractului (ZIP layout, checksums, teste) rămâne identic.

## Verificare

- Rebuild → apeși din nou "Regenerate": toast-ul de eroare dispare, download link-ul e emis, `install.exe` din ZIP are ~5.9 MB (nu 1 byte).
- `bunx vitest run src/lib/__tests__/installation-package.test.ts` continuă să treacă (folosește fallback-ul local — pasul 4).
