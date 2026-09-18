# Reparăm Self-Hosted: elemente lipsă, HR „date parțiale”, aprobarea contractelor, actualizări

## Ce am verificat acum

- Codul din proiect e sănătos: verificarea de tipuri, toate testele (393) și pachetele trec. Munca întreruptă de credite nu a lăsat cod rupt.
- **Eroarea din HR e confirmată exact.** Lista „activitate recentă” cere o coloană `created_at` din tabelul de evenimente ale angajaților, dar acolo coloana se numește `occurred_at`. De aceea apare „Date parțiale — unele secțiuni nu s-au putut încărca”. O altă interogare, tot în HR, folosește deja numele corect — deci e o singură scăpare, nu o problemă de structură.
- **Aprobarea contractelor e blocată prin construcție.** Butonul „Aprobă și blochează” e dezactivat până când starea juridică a documentului este „verificat”. Butonul care pune documentul în starea „verificat” apare numai dacă starea e exact „în așteptare” **și** utilizatorul are dreptul special de revizie juridică. Dacă documentul nu are deloc stare juridică (instalare rămasă în urmă cu actualizările bazei) sau starea e „modificări cerute”, nu apare niciun buton — contractul rămâne permanent invalid, fără cale de ieșire. Exact ce descrii.
- **Instalarea nu se declară „on-premise” către partea de server.** Serviciul care pornește aplicația pe Windows setează `OPSQAI_PLATFORM_MODE` și `OPSQAI_DEPLOYMENT_TYPE`, dar **nu** `OPSQAI_MODE`. Tot ce citește `OPSQAI_MODE` (setup la prima pornire, verificările „doar on-premise”, funcția care spune interfeței în ce mod rulează) crede că aplicația e cea din cloud. De aici „funcțiile nu se încarcă”.
- **„Users” nu are plasa de siguranță pe care o au celelalte funcții Core**: apare doar dacă drepturile utilizatorului s-au încărcat. Când încărcarea eșuează, „Users” dispare și butoanele de adăugare (documente, licență) nu mai apar, fără mesaj.
- La actualizări există deja: descărcare cu procentaj real, verificare amprentă, sursă din Management Center cu rezervă pe manifest semnat, instalare prin serviciul de update. **Lipsesc**: alegerea manuală a unui pachet descărcat de pe site și distribuirea unui update către celelalte instalări din rețeaua clientului.

## Ce voi face

1. **Repar HR „date parțiale”** — corectez numele coloanei în interogarea de activitate recentă și trec prin restul interogărilor HR/Transport ca să prind aceeași scăpare oriunde mai apare.
2. **Diagnostic vizibil în instalare** — o verificare de sănătate care arată: modul detectat, dacă baza de date locală răspunde, dacă licența e citită, dacă drepturile s-au încărcat, plus lista secțiunilor care au eșuat cu motiv concret.
3. **Corectez declararea modului la pornire** — serviciul Windows trimite `OPSQAI_MODE=selfhost`, iar aplicația acceptă și variabilele deja trimise, ca instalările existente să se repare fără reinstalare.
4. **Elemente Core rezistente** — „Users”, Dashboard, Organization, Operations apar întotdeauna on-premise; drepturile controlează doar ce poți face în pagină.
5. **Fără eșecuri silențioase** — dacă drepturile nu se încarcă, apare mesaj clar cu „Reîncearcă”, nu butoane ascunse.
6. **Verific actualizările cap-coadă**: procentaj real, sursa afișată (versiune, canal, dimensiune, notițe), verificarea pachetului, instalarea — inclusiv cazul în care serviciul de update e oprit.
7. **Buton nou „Instalează din fișier”** — clientul descarcă pachetul de pe site și îl selectează din Self-Hosted. Aplicația verifică semnătura și amprenta înainte de a-l accepta, afișează versiunea, apoi permite instalarea; un fișier nepotrivit e refuzat cu motiv clar.
8. **Distribuire în rețeaua clientului** — instalarea principală poate servi pachetul verificat celorlalte instalări din aceeași rețea, cu aceeași verificare de semnătură; opțional, oprit implicit pentru instalări izolate.
9. **Verific cele trei lucruri reclamate**: apariția „Users”, încărcarea funcțiilor, adăugarea unei licențe, încărcarea unui document.
10. **La final** rulez verificarea de tipuri, toate testele și pachetul, plus teste noi pentru fiecare regresie de mai sus.

## Detalii tehnice

- `src/lib/hr/db.server.ts` (`recentEvents`): `ev.created_at` → `ev.occurred_at` (select + order by); audit al celorlalte interogări HR/Transport pentru nepotriviri de coloane.
- `opsqai-windows/services/platform/index.js`: adaug `OPSQAI_MODE: "selfhost"`; `src/lib/platform/mode.ts` și `src/lib/deployment-mode.server.ts` acceptă fallback pe `OPSQAI_PLATFORM_MODE` / `OPSQAI_DEPLOYMENT_TYPE`.
- `src/components/app/app-shell.tsx`: „Users” primește `show: mode === "selfhost" || hasAnyPermission(...)`.
- `src/lib/auth-context.tsx`: expun eșecul `bootstrapSession` ca banner cu reîncercare.
- Update din fișier: server fn nou în `src/lib/selfhost-updates.functions.ts` + helper în `src/lib/providers/selfhost/update-discovery.server.ts` (scriere în `%ProgramData%\OPSQAI\updates`, validare sha256 + semnătură Ed25519 cu `pubkey.pem` folosit de serviciul updater, apoi `available.json` / `command.json`); UI în `src/routes/_authenticated/app.updates.tsx`.
- Distribuire LAN: endpoint intern care servește pachetul deja verificat + opțiune `updates.peerSource` în config, încercată înainte de internet.
- Teste noi: interogarea de activitate HR, fallback de mod fără `OPSQAI_MODE`, Core prezent cu drepturi goale, refuzul unui pachet cu amprentă greșită, progres raportat corect.
- Fără migrație de bază de date și fără schimbări de design.

## Limitări

Nu am acces la mașina Windows a clientului: instalarea reală, serviciul de update și distribuirea în rețea se confirmă după instalarea pachetului actualizat. Diagnosticul de la pasul 2 arată exact ce mai rămâne greșit.
