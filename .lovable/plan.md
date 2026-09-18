# Reparăm instalarea Self-Hosted + finalizăm fluxul de actualizare

## Ce am verificat acum

- Codul din proiect este sănătos: verificarea de tipuri, toate testele (393) și pachetele trec fără eroare. Munca întreruptă de credite nu a lăsat cod rupt.
- Am găsit două probleme reale care explică ce vezi pe instalarea de Windows:

1. **Instalarea nu se declară „on-premise” către partea de server.** Serviciul care pornește aplicația pe Windows setează `OPSQAI_PLATFORM_MODE` și `OPSQAI_DEPLOYMENT_TYPE`, dar **nu** `OPSQAI_MODE`. Toate locurile care citesc `OPSQAI_MODE` (setup la prima pornire, verificările „doar on-premise”, funcția care spune interfeței în ce mod rulează) cred că aplicația e varianta din cloud. De aici „funcțiile nu se încarcă” și acțiunile care nu merg.
2. **„Users” nu are plasa de siguranță pe care o au celelalte funcții Core.** Celelalte intrări Core apar automat on-premise; „Users” apare doar dacă drepturile utilizatorului s-au încărcat. Când încărcarea drepturilor eșuează (consecință a punctului 1), „Users” dispare, iar butoanele de adăugare (documente, licență) nu mai apar — fără mesaj, exact cum ai descris.

Despre actualizări, ce există deja în cod: descărcare cu procentaj real (bytes primiți / total), verificare sha256, sursa preluată din Management Center cu fallback pe manifest semnat, și instalare prin serviciul de update. Ce **lipsește**: alegerea manuală a unui fișier de update descărcat de pe site, și distribuirea automată a unui update către celelalte instalări din rețeaua clientului.

## Ce voi face

1. **Diagnostic vizibil în instalare** — o verificare de sănătate care arată: modul detectat (on-premise/cloud), dacă baza de date locală răspunde, dacă licența e citită, dacă drepturile s-au încărcat. Apare în pagina Updates/Health, ca să vedem exact ce e greșit.
2. **Corectez declararea modului la pornire** — serviciul Windows trimite `OPSQAI_MODE=selfhost`, iar aplicația acceptă și variabilele deja trimise, ca instalările existente să se repare fără reinstalare.
3. **Elemente Core rezistente** — „Users”, Dashboard, Organization, Operations apar întotdeauna on-premise; drepturile controlează doar ce poți face în pagină.
4. **Fără eșecuri silențioase** — dacă drepturile nu se încarcă, apare un mesaj clar cu buton „Reîncearcă”, nu butoane ascunse.
5. **Verific fluxul de actualizare cap-coadă**: procentajul real la descărcare, sursa afișată (versiune, canal, dimensiune, notițe), verificarea fișierului și instalarea; corectez ce nu merge (inclusiv cazul în care serviciul de update e oprit).
6. **Buton nou: „Instalează din fișier”** — clientul descarcă pachetul de pe site și îl selectează din Self-Hosted. Aplicația verifică semnătura și amprenta sha256 înainte de a accepta fișierul, afișează versiunea și abia apoi permite instalarea; un fișier nepotrivit sau neverificat este refuzat cu motiv clar.
7. **Distribuire în rețeaua clientului** — instalarea „principală” poate servi pachetul verificat celorlalte instalări din aceeași rețea: celelalte îl iau de la ea în loc de internet, cu aceeași verificare de semnătură. Activabil din setări, oprit implicit pentru instalări izolate. Îți spun explicit ce nu pot testa pe Linux.
8. **Verific și cele trei lucruri reclamate**: apariția „Users”, încărcarea funcțiilor, adăugarea unei licențe, încărcarea unui document.
9. **La final** rulez verificarea de tipuri, toate testele și pachetul, plus teste noi pentru regresiile de mai sus.

## Detalii tehnice

- `opsqai-windows/services/platform/index.js`: adaug `OPSQAI_MODE: "selfhost"`; `src/lib/platform/mode.ts` și `src/lib/deployment-mode.server.ts` acceptă fallback pe `OPSQAI_PLATFORM_MODE` / `OPSQAI_DEPLOYMENT_TYPE` pentru instalări deja livrate.
- `src/components/app/app-shell.tsx`: „Users” primește `show: mode === "selfhost" || hasAnyPermission(...)`.
- `src/lib/auth-context.tsx`: expun starea de eșec a `bootstrapSession` ca banner cu reîncercare.
- Update din fișier: server fn nou în `src/lib/selfhost-updates.functions.ts` + helper în `src/lib/providers/selfhost/update-discovery.server.ts` care scrie pachetul în `%ProgramData%\OPSQAI\updates`, validează sha256 + semnătura Ed25519 (același `pubkey.pem` folosit de `opsqai-windows/services/updater`), apoi setează `available.json` / `command.json`; UI în `src/routes/_authenticated/app.updates.tsx`.
- Distribuire LAN: endpoint intern care servește pachetul deja verificat + opțiune `updates.peerSource` în config; `checkForUpdateFromMc` încearcă peer-ul înainte de internet.
- Teste noi: fallback de mod fără `OPSQAI_MODE`, Core prezent în meniu cu drepturi goale, refuzul unui pachet cu amprentă greșită, progres raportat corect.
- Fără migrație de bază de date și fără schimbări de design.

## Limitări

Nu am acces la mașina Windows a clientului: instalarea reală, serviciul de update și distribuirea în rețea se confirmă după instalarea pachetului actualizat. Diagnosticul de la pasul 1 arată exact ce mai rămâne greșit.
