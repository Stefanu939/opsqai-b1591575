# Pachet complet de documente OPSQAI în română

Aceeași structură de documente ca setul trimis (one pager, customer deck,
investor deck, pricing, security & GDPR, pilot proposal, pilot SOW, legal & IP,
business plan, financial model), dar în română, mai adânc pe produs și strict
adevărat: doar funcții care există în cod și pe site, fără certificări pe care
OPSQAI nu le are.

## A. Documente pentru clienți și parteneri (RO)

1. **One Pager** — o pagină: ce este OPSQAI, problema, soluția, unde stau datele,
   preț de intrare, contact.
2. **Prezentare pentru client (Customer Deck)** — problemă, soluție, cum
   funcționează pas cu pas, funcții pe roluri, securitate, implementare, preț,
   pași următori.
3. **Prețuri** — exact pachetele și cifrele publicate pe opsqai.de (preluate din
   `src/i18n/pages/pricing.ts`): ce e inclus în Core, ce produse se licențiază,
   add-on-uri, pilot, ce se plătește separat.
4. **Securitate & GDPR** — instalare pe serverul firmei, date locale,
   autentificare Argon2id, roluri și drepturi pe zone, licență semnată Ed25519,
   jurnal de audit, backup/restaurare, furnizor AI configurabil inclusiv complet
   local; formulare corectă: GDPR prin design, OPSQAI nu este în prezent
   certificat SOC 2 sau ISO 27001.
5. **Propunere pilot** — obiective, durată, ce primește clientul, ce se măsoară,
   criterii de succes, preț pilot.
6. **Pilot SOW** — document de lucru: livrabile, responsabilități, calendar,
   condiții de intrare/ieșire, ce nu este inclus.
7. **Prezentare pentru investitori** — problemă, produs, diferențiere tehnică,
   model de business, stadiu, plan.
8. **Legal & proprietate intelectuală** — ce deține OPSQAI, structura codului și
   a licențierii, model de contractare, subprocesatori și transferuri (SCC),
   retenție și ștergere.
9. **Plan de afaceri** și **Sinteză model financiar** — în română, pe aceleași
   ipoteze ca versiunile trimise, marcate clar ca proiecții.

Ton: marketing clar + limbaj juridic prudent. Fără afirmații absolute de
securitate, fără promisiuni pe care produsul nu le face (AI-ul asistă, decizia
rămâne la om).

## B. Funcțiile aplicației, explicate (RO) — PDF separat

Fiecare funcție reală: ce face, la ce folosește clientului, cine o vede (rol /
licență), unde se găsește în aplicație. Grupat ca în produs:

- **Core** — Chat AI cu surse, Knowledge Base și SOP-uri, FAQ, Knowledge Gaps,
  AI Audit, Academy (cursuri, quiz, certificate), Calendar, notificări și
  Activity Center, documente și imagini, rapoarte, utilizatori/roluri/
  departamente, licență și entitlements, sănătatea instalării, actualizări,
  backup.
- **Operations** — incidente și daune, root cause, acțiuni corective, costuri.
- **Transport** — flotă, vehicule, șoferi, remorci și cuplaje, registre,
  audituri, CMR, hartă, expirări și risc, trenduri, digest e-mail.
- **HR** — angajați, contracte și șabloane, generare documente, verificare
  internă, verificare externă cu dovadă atașată, link temporar de verificare,
  aprobare și blocare, onboarding/offboarding, echipament, politici, cereri,
  training, conformitate, salarizare, screening candidați, analitice.

Sursa de adevăr: `src/lib/product-architecture.ts`, `src/lib/feature-catalog.ts`,
`src/lib/app-navigation.ts`, componentele din `src/components/app/*` și paginile
de documentație. Ce nu există în cod nu intră în document.

## C. Manual master de instalare și operare (doar pentru tine)

Marcat „uz intern — nu se trimite clientului". Pas cu pas, cu comenzi reale:

1. Cele două produse și limita dintre ele (Self-Hosted la client vs Management
   Center / Portal la OPSQAI).
2. Pregătirea serverului clientului: cerințe, porturi, conturi, antivirus.
3. Instalarea Windows: ce face installer-ul, serviciile create (OpsqaiPlatform,
   OpsqaiWorker, OpsqaiDatabase, OpsqaiCaddy, OpsqaiUpdater), variabile de mediu,
   modul `selfhost`.
4. Baza de date: PostgreSQL local, ordinea migrărilor `migrations/selfhost/
   0001…0051`, cum le aplici, cum verifici, ce faci când una eșuează, pgvector și
   dimensiunea embedding-urilor.
5. Primul boot: setup wizard, primul SuperAdmin, profilul firmei.
6. Licența: emitere din Management Center, ce conține JWT-ul semnat Ed25519,
   activare în instalare, reemitere la cumpărarea unui produs nou.
7. Furnizorul AI: configurare, varianta complet locală, comportament la eșec.
8. Backup și restaurare: ce se salvează, cum testezi restaurarea.
9. Actualizări: canal, descărcare cu verificare SHA-256, instalare din fișier
   descărcat de pe site, distribuție în rețeaua clientului, fereastra de restart.
10. Depanare: erorile reale și cauza lor (funcții care nu se încarcă, Users
    lipsă, permisiuni, descărcare oprită, aprobare document blocată).
11. Verificări finale înainte de predarea instalării.

## Detalii tehnice

- Scripturi noi în `scripts/` (ReportLab, font DejaVu pentru diacritice), în
  linia celor existente `gen_manual_complet_ro.py`, `gen_opsqai_pdfs.py`, deci
  ușor de reeditat: un script pentru pachetul client/partener, unul pentru
  funcții, unul pentru manualul master.
- Ieșire în `/mnt/documents`, livrate ca atașamente în chat. Nu se publică pe
  site.
- Design în linia brandului actual (Aurora Noir): copertă, titluri clare, blocuri
  ușor de parcurs, tabele pentru funcții și prețuri.
- QA obligatoriu: fiecare pagină rasterizată și verificată vizual (diacritice,
  text tăiat, suprapuneri, pagini goale) înainte de livrare.

## Ce nu se schimbă

Nicio funcționalitate a aplicației și nicio pagină din site. Doar documente noi.
