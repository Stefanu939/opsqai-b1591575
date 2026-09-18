# Aprobarea contractelor și a celorlalte documente HR

## Cum funcționează acum (după corecturile din runda precedentă)

Un document generat (contract de muncă, adeverință, decizie etc.) trece prin patru pași:

1. **Generare** — documentul e creat din șablonul țării, cu datele angajatului și ale firmei.
2. **Completare** — câmpurile care nu s-au putut umple automat apar ca `[___]`. Cât timp există măcar unul, aprobarea e blocată, iar motivul e scris explicit în panoul de verificare.
3. **Verificare** — în panoul „Verificare” apeși **„Verific și accept”** (opțional cu o notă) sau **„Cer modificări”**, care trimite documentul înapoi în ciornă. Contractele DE/RO cer acest pas; documentele fără stare juridică sunt tratate ca simplă verificare și pot fi aprobate direct.
4. **Aprobare** — **„Aprobă și blochează”** finalizează documentul: se blochează editarea, se salvează cine și când a aprobat, iar PDF-ul se poate descărca și se poate încărca copia semnată.

Butonul de aprobare rămâne dezactivat doar din trei motive, fiecare afișat în clar: câmpuri `[___]` necompletate, verificare neefectuată, sau lipsa dreptului de aprobare.

Cine poate face pașii: drepturile pe zona HR cu acțiunea „aprobare” sau „administrare” dau atât verificarea, cât și aprobarea; dreptul separat pe zona juridică dă doar verificarea. Un cont fără drepturi HR explicite are doar vizualizare.

## Ce mai adaug acum

### 1. Aprobare externă (avocat / consultant din afara firmei)
Pentru firmele care vor confirmarea unui jurist extern, panoul de verificare primește opțiunea **„Verificat extern”**:
- se completează numele juristului/cabinetului, data verificării și, opțional, referința avizului;
- se poate încărca documentul de aviz (PDF/imagine), atașat la document;
- verificarea externă înregistrată contează ca pas de verificare îndeplinit, deci aprobarea se deblochează;
- totul intră în istoricul documentului, ca dovadă la audit.

### 2. Trimitere pentru verificare externă
Un buton **„Trimite pentru verificare”** generează un link temporar, valabil 14 zile, prin care persoana din exterior vede doar documentul respectiv și poate trimite verdictul: „verificat” sau „cer modificări”, cu o notă. Nu are nevoie de cont și nu vede nimic altceva din aplicație. Linkul se poate anula oricând.

### 3. Vizibilitate pe listă
În lista de documente apare starea reală a fiecăruia (ciornă / în verificare / verificat / verificat extern / modificări cerute / aprobat), ca să se vadă dintr-o privire ce așteaptă acțiune.

### 4. Cine are dreptul
În ecranul de drepturi, aprobarea documentelor și verificarea externă apar ca drepturi separate, cu explicație în limba aplicației, ca să nu mai fie nevoie de ghicit de ce un buton e gri.

## Detalii tehnice

- Migrație self-hosted nouă: coloane pentru verificarea externă (`external_reviewer_name`, `external_reviewer_org`, `external_reviewed_at`, `external_reference`, `external_evidence_id`) pe tabela documentelor HR, plus tabela linkurilor de verificare (token hash, document, expirare, folosit/anulat).
- Funcții de server noi în `src/lib/hr-ext.functions.ts`: `recordExternalHrReview`, `createHrReviewLink`, `revokeHrReviewLink`; logica în `src/lib/hr/db-ext.server.ts`.
- Rută publică pentru verificatorul extern sub `src/routes/api/public/...` plus o pagină minimală de verificare; tokenul e verificat pe server, comparat în timp constant, cu limită de încercări.
- Dovada încărcată intră în același mecanism de stocare de fișiere HR folosit pentru copiile semnate (limită 8 MB, tipuri PDF/imagine).
- UI: extinderea panoului de verificare din `src/components/app/hr/documents-section.tsx` și a coloanei de stare din listă; texte EN/DE/RO în `src/i18n/pages/hr-ws.ts`.
- Teste noi: aprobare deblocată după verificare externă, refuz la token expirat/anulat, și starea „modificări cerute” care readuce documentul în ciornă.

Fără schimbări de design și fără atingerea bazei de date cloud.
