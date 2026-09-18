# Reparăm instalarea Self-Hosted: elemente lipsă, funcții care nu se încarcă

## Ce am verificat acum

- Codul din proiect este sănătos: verificarea de tipuri, toate testele (393) și pachetele trec fără eroare. Deci munca întreruptă de credite nu a lăsat cod rupt în proiect.
- Am găsit însă două probleme reale care explică exact ce vezi pe instalarea de Windows:

1. **Instalarea nu se declară „on-premise” către partea de server.** Serviciul care pornește aplicația pe Windows transmite tipul instalării doar parțial: setează `OPSQAI_PLATFORM_MODE` și `OPSQAI_DEPLOYMENT_TYPE`, dar **nu** setează `OPSQAI_MODE`. Toate locurile din aplicație care citesc `OPSQAI_MODE` (primul pornire/setup, verificările „doar on-premise”, funcția care spune interfeței în ce mod rulează) cred că aplicația e varianta din cloud. De aici vin funcțiile care „nu se încarcă” și acțiunile care nu merg.

2. **„Users” din meniu nu are plasa de siguranță pe care o au celelalte funcții Core.** Toate celelalte intrări Core apar automat pe on-premise; „Users” apare numai dacă drepturile utilizatorului s-au încărcat corect. Când încărcarea drepturilor eșuează (consecință a punctului 1), „Users” dispare complet, iar butoanele de adăugare (documente, licență) nu mai apar — fără niciun mesaj, exact cum ai descris.

Cauza pentru „nu pot adăuga licențe / documente” este foarte probabil aceeași (drepturi neîncărcate + mod greșit), dar nu o pot confirma 100% fără o verificare pe instalarea ta; de aceea primul pas al planului produce dovada direct din instalare.

## Ce voi face

1. **Diagnostic vizibil în instalare** — adaug o verificare de sănătate care spune clar: modul detectat (on-premise/cloud), dacă baza de date locală răspunde, dacă licența e citită și dacă drepturile utilizatorului s-au încărcat. Apare în pagina de Updates/Health, ca să vedem imediat ce e greșit, nu să ghicim.
2. **Corectez declararea modului la pornire** — serviciul de Windows transmite `OPSQAI_MODE=selfhost` (plus variabilele existente), iar aplicația acceptă și valorile deja trimise, ca instalările existente să se repare fără reinstalare.
3. **Fac elementele Core rezistente** — „Users”, Dashboard, Organization, Operations apar întotdeauna pe on-premise; drepturile controlează doar ce poți face în pagină, nu dacă pagina există.
4. **Fără eșecuri silențioase** — dacă drepturile nu se încarcă, aplicația afișează un mesaj clar cu buton de reîncercare, în loc să ascundă butoanele.
5. **Verific concret cele trei lucruri reclamate**: apariția „Users”, încărcarea funcțiilor, adăugarea unei licențe și încărcarea unui document; corectez ce mai iese la iveală.
6. **Rulez la final** verificarea de tipuri, toate testele și pachetul, plus un test nou care prinde exact această regresie.

## Detalii tehnice

- `opsqai-windows/services/platform/index.js`: adaug `OPSQAI_MODE: "selfhost"` în env-ul copilului; `src/lib/platform/mode.ts` și `src/lib/deployment-mode.server.ts` acceptă ca fallback `OPSQAI_PLATFORM_MODE` / `OPSQAI_DEPLOYMENT_TYPE` pentru instalări deja livrate.
- `src/components/app/app-shell.tsx`: intrarea „Users” primește `show: mode === "selfhost" || hasAnyPermission(...)`, ca restul Core.
- `src/lib/auth-context.tsx`: expun starea de eșec a `bootstrapSession` și o afișez ca banner cu „Reîncearcă”, nu doar toast.
- Endpoint de self-check nou (server function, on-premise) care raportează mod, DB, licență, drepturi; consumat de pagina de health.
- Teste noi: fallback de mod pentru instalări fără `OPSQAI_MODE`, prezența Core în meniu când drepturile sunt goale.
- Fără migrație de bază de date și fără schimbări de design.

## Limitări

Nu am acces la mașina Windows a clientului; confirmarea finală se face după instalarea pachetului actualizat, iar diagnosticul de la pasul 1 arată exact ce rămâne greșit dacă mai rămâne ceva.
