# Pachet de documente OPSQAI în română

Trei documente PDF noi, toate în română, toate scrise strict din funcțiile reale
existente în cod și pe site — fără promisiuni inventate, fără certificări pe care
OPSQAI nu le are.

## 1. OPSQAI — Ghid complet pentru client (RO)

Documentul pe care îl trimiți unui client sau partener. După citire nu mai rămâne
întrebarea „ce este OPSQAI, ce face, cât costă, cât de sigur este".

Cuprins:
1. Ce este OPSQAI, în două fraze, și pentru cine
2. Problemele operaționale pe care le rezolvă (cunoștințe împrăștiate, răspunsuri
   greșite, instruire lentă, control lipsă)
3. Cum funcționează, pas cu pas: documentele intră → aplicația le pregătește
   pentru căutare → angajatul întreabă → răspuns cu sursă → ce nu are sursă nu
   primește răspuns inventat
4. Unde stau datele: instalare pe serverul firmei (Windows), baza de date locală,
   furnizorul de AI configurabil, inclusiv model complet local (Ollama)
5. Securitate, explicat pentru nespecialiști: autentificare (Argon2id), roluri și
   drepturi pe zone, licență semnată, jurnal de audit, backup și restaurare,
   protecția ultimului SuperAdmin
6. Ce spunem și ce NU spunem despre conformitate: GDPR prin design; OPSQAI nu
   este în prezent certificat SOC 2 sau ISO 27001 (formulare corectă juridic)
7. Structura produsului: Platforma Core + produse licențiate + add-on-uri
8. Preț — exact pachetele și cifrele publicate pe opsqai.de (preluate din
   `src/i18n/pages/pricing.ts`), plus ce e inclus și ce se plătește separat
9. Pilot: ce primește clientul, cât durează, ce se măsoară
10. Instalare și actualizări, din perspectiva clientului
11. 15 întrebări frecvente cu răspuns scurt
12. Contact: baristefan@opsqai.de, opsqai.de

## 2. OPSQAI — Funcțiile aplicației, explicate (RO)

PDF separat, dedicat funcțiilor: fiecare funcție reală, ce face, la ce folosește
clientului, cine o vede (rol / licență) și unde o găsește în aplicație.

Grupate ca în produs:
- Core: Chat AI cu surse, Knowledge Base și SOP-uri, FAQ, Knowledge Gaps, AI
  Audit, Academy (cursuri, quiz, certificate), Calendar, notificări și Activity
  Center, documente și imagini, rapoarte, utilizatori / roluri / departamente,
  licență și entitlements, sănătate instalare, actualizări, backup
- Operations / incidente, root cause, acțiuni corective, costuri
- Transport: flotă, vehicule, șoferi, remorci, registre, audituri, CMR, hartă,
  expirări și risc, trenduri, digest e-mail
- HR: angajați, contracte și șabloane, generare documente, verificare internă,
  verificare externă (jurist, cu dovadă atașată) și link temporar de verificare,
  aprobare și blocare, onboarding/offboarding, echipament, politici, cereri,
  training, conformitate, salarizare, screening candidați, analitice

Sursa de adevăr: `src/lib/product-architecture.ts`, `src/lib/feature-catalog.ts`,
`src/lib/app-navigation.ts`, componentele din `src/components/app/*` și paginile
de documentație. Ce nu există în cod nu intră în document.

## 3. OPSQAI — Manual master pentru instalare și operare (doar pentru tine)

Manualul tău tehnic, pas cu pas, complet, în română. Marcat „uz interna — nu se
trimite clientului".

Conținut:
1. Cele două produse și limita dintre ele (Self-Hosted la client vs Management
   Center / Portal la OPSQAI)
2. Pregătirea serverului clientului: cerințe, porturi, conturi, antivirus
3. Instalarea Windows: ce face installer-ul, serviciile create
   (OpsqaiPlatform, OpsqaiWorker, OpsqaiDatabase, OpsqaiCaddy, OpsqaiUpdater),
   variabilele de mediu, modul `selfhost`
4. Baza de date: PostgreSQL local, ordinea migrărilor din
   `migrations/selfhost/0001…0051`, cum se aplică, cum verifici că s-au aplicat,
   ce faci când una eșuează, pgvector și dimensiunea embedding-urilor
5. Primul boot: setup wizard, primul SuperAdmin, profilul firmei
6. Licența: cum o emiți din Management Center, ce conține JWT-ul semnat Ed25519,
   cum o activezi în instalare, cum reemiți când clientul cumpără un produs nou
7. Furnizorul AI: configurare, varianta complet locală, ce se întâmplă la eșec
8. Backup și restaurare: ce se salvează, cum se testează restaurarea
9. Actualizări: canal, descărcare cu verificare SHA-256, instalare din fișier
   descărcat de pe site, distribuție în rețeaua clientului, fereastra de restart
10. Depanare: lista erorilor reale și cauza lor (funcții care nu se încarcă,
    Users lipsă, permisiuni, descărcare oprită, aprobare document blocată)
11. Verificări finale înainte de a predă instalarea clientului

## Detalii tehnice

- Trei scripturi noi în `scripts/` (ReportLab, font DejaVu pentru diacritice),
  în linia scripturilor existente `gen_manual_complet_ro.py` /
  `gen_what_is_opsqai_ro.py`, deci ușor de reeditat mai târziu.
- Ieșire în `/mnt/documents` (fișiere pentru tine, livrate ca atașamente în
  chat). Nu se publică pe site.
- Design în linia brandului actual (Aurora Noir): copertă, titluri clare,
  blocuri ușor de parcurs, tabele pentru funcții și prețuri.
- QA obligatoriu: fiecare pagină se rasterizează și se verifică vizual
  (diacritice, text tăiat, suprapuneri, pagini goale) înainte de livrare.

## Ce nu se schimbă

Nicio funcționalitate a aplicației și nicio pagină din site. Doar documente noi.
