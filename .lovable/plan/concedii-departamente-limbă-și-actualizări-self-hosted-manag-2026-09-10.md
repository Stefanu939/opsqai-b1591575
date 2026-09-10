# Concedii, departamente, limbă și actualizări — Self-Hosted + Management Center

## 1. Cererile de concediu: notificare + nume solicitant

Acum aprobatorul vede doar perioada ("Sep 11 – Sep 18") și nu primește nicio alertă.

- La crearea unei cereri, se trimite o notificare (clopoțelul din bara de sus + inbox) către toți cei care pot aproba din aceeași companie: „X a cerut concediu 11–18 sep.”
- Notificarea deschide direct dialogul Holidays.
- Fiecare cerere afișează numele și e-mailul solicitantului, departamentul, numărul de zile și motivul.
- Solicitantul primește la rândul lui o notificare când cererea e aprobată sau respinsă.
- Titlul evenimentului din calendar folosește numele real, nu „team member”.

## 2. Departamente în Knowledge Base, FAQ și fișa angajatului

- Departamentele create în Organization apar ca filtru și ca selector în Knowledge (încărcare document) și în FAQ (creare/editare întrebare).
- La încărcarea unui SOP sau a unui FAQ se poate alege: întreaga companie sau un departament anume.
- La crearea/editarea unui utilizator se alege departamentul (există deja în profil, se adaugă și în ecranul Users).
- Chat AI răspunde strict din documentele și FAQ-urile vizibile pentru departamentul persoanei: documentele generale ale companiei plus cele ale departamentului ei. Restul nu sunt nici măcar consultate.
- Managerii, team leaderii și administratorii văd în continuare tot.
- Dacă nu există nimic potrivit în departamentul respectiv, răspunsul rămâne un refuz explicit și se înregistrează un Knowledge Gap — fără invenții.

## 3. O singură bară de limbă

- Rămâne exclusiv selectorul din bara de sus.
- Se elimină: câmpul „Language” din profil (Organization → My profile) și dublurile din alte ecrane; preferința se salvează automat din selectorul de sus.
- Câmpul „Primary language” din Compliance rămâne, dar e redenumit clar ca setare de jurisdicție (nu schimbă limba interfeței).
- Verificare: fiecare pagină autentificată și publică se traduce la comutarea EN/DE/RO, inclusiv HR, Transport, Operations, Academy, Updates, dialoguri și mesaje de eroare. Textele lipsă se completează.

## 4. Eroarea la „Check for updates”

Cererea de verificare este respinsă cu 400 (`invalid_payload`) înainte să ajungă la Management Center, deci nu e o problemă de release lipsă.

- Se aliniază exact formatul trimis de instalare cu ce așteaptă Management Center: versiunea curentă normalizată (fără prefixul „v”), identificatorul instalării în formatul acceptat, canalul.
- Mesajele de eroare devin explicite în interfață: „instalare necunoscută”, „mentenanță expirată”, „nu există versiune mai nouă”, în loc de `http_400`.
- Se verifică în Management Center că release-ul încărcat produce un descriptor semnat valid, cu URL de descărcare și SHA-256, și că apare la „Latest available”.
- Se testează lanțul complet: verificare → descărcare → instalare, plus revenirea la versiunea anterioară dacă instalarea eșuează.

## 5. Verificare Management Center ↔ Self-Hosted

- Se verifică potrivirea între instalările înregistrate, licențe și release-uri publicate (heartbeat, identitate instalare, mentenanță), pentru că aceeași nepotrivire de identitate explică atât eroarea de update cât și lipsa unor date în Fleet/Installations.
- Se corectează ce nu se leagă, fără a modifica datele existente ale clienților.

## Detalii tehnice

- `src/lib/time-off.functions.ts`: emitere notificări prin helperul existent de notificări (Cloud: `notify_emit`; Self-Hosted: tabela de notificări din `0039`), plus returnarea numelui/e-mailului solicitantului în `listMyTimeOff` (join pe profil).
- `src/components/app/account-menu.tsx` (`HolidaysDialog`): afișare solicitant, zile, motiv; deschidere din clopoțel.
- Departamente: se folosește `knowledge_documents.department_id` (există) și se adaugă `department_id` pe FAQ prin migrare nouă `0047_department_scope.sql`, cu index și mapare de drepturi; fără modificări distructive.
- `src/lib/department-scope.server.ts` se extinde la FAQ, iar `src/routes/api/chat.ts` filtrează atât chunk-urile cât și FAQ-urile înainte de grounding.
- Limbă: eliminare `language_pref` din formularul de profil (coloana rămâne, scrisă de selectorul global), audit `rg` pentru orice alt `Select` de limbă.
- Updates: `src/lib/providers/selfhost/update-discovery.server.ts` + `src/routes/api/public/v1/updates/check.ts` — normalizare payload, coduri de eroare mapate la texte traduse.
- Verificare: typecheck, teste, build, plus parcurgere în browser a paginilor atinse. Rularea reală pe Windows nu poate fi testată din acest mediu și va fi semnalată.
