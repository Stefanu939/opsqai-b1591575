# SOW pilot completat + control de timp și audit de utilizare fără date de client

Două lucruri: un exemplu de SOW completat cu date fictive, și funcțiile din
aplicație care îți permit, la instalare, să pui o limită de timp și să vezi cât
și cum a fost folosită platforma — fără să vezi conținutul clientului.

## A. SOW pilot completat (exemplu fictiv)

Un PDF nou, în română, identic în structură cu modelul trimis, dar cu toate
câmpurile `[___]` completate cu un caz fictiv, clar marcat „EXEMPLU · date
fictive" pe copertă și în footer:

- Client: Transdacia Logistic SRL, Cluj-Napoca, CUI RO12345678
- Proprietarul problemei: Ioana Marcu, Director Operațiuni
- Obiectul pilotului: expirările de documente de flotă și șoferi ratate
- Perioada: 5 octombrie – 3 noiembrie 2026 (30 de zile)
- Taxa de pilot: 3.500 EUR fără TVA
- Volum: ~180 documente; 12 utilizatori nominalizați
- Suport: e-mail + telefon, răspuns în 8 ore lucrătoare
- Confidențialitate 3 ani, notificare de încetare 10 zile
- Indicator de bază: 9 expirări ratate în ultimele 3 luni → țintă 0

Modelul necompletat rămâne neschimbat; exemplul e un fișier separat, livrat ca
atașament în chat.

## B. Limită de timp pentru client (din Management Center)

Licențele au deja dată de expirare. Se completează cu:

1. **Buton „Licență de pilot"** la emitere: 14 / 30 / 60 / 90 de zile, cu dată
   calculată automat și marcare `kind = pilot`.
2. **Verificarea aplicării**: la expirare instalarea trece în stare „expirat" —
   citire și export permise, scriere blocată; dacă nu se comportă deja așa, se
   corectează.
3. **Avertizare în aplicația clientului**: bandă vizibilă cu „licența expiră în
   N zile" în ultimele 14 zile, plus aceeași informație în Management Center.
4. **Prelungire / trecere în producție** dintr-un singur ecran, fără reinstalare.

## C. Audit extern de utilizare, fără date de client

Raportul periodic trimis azi către OPSQAI conține doar stare, versiune și module.
Se adaugă un strat de **cifre agregate** — niciodată text, nume, documente sau
conținut:

- utilizatori activi pe zi și pe săptămână (numere, nu identități)
- sesiuni și timp total petrecut în aplicație, pe modul
- acțiuni pe modul (câte documente adăugate, câte aprobări, câte cursuri)
- întrebări puse asistentului AI, câte au primit răspuns cu sursă, timp mediu
  de răspuns
- alerte de expirare deschise / rezolvate și timpul până la rezolvare
- disponibilitate: repornirile, erorile, ultima copie de siguranță reușită
- adopție: câți dintre utilizatorii nominalizați au intrat efectiv

În Management Center: ecran **„Audit de utilizare"** per instalare — KPI-uri,
evoluție pe săptămâni, comparație față de săptămâna de start a pilotului, și
**export PDF** pe care îl poți trimite clientului ca raport final de pilot
(exact livrabilul 7 din SOW).

Protecția clientului, scrisă explicit: raportarea e pe „anonim" implicit,
se poate opri de client din aplicație, nu conține conținut sau date personale,
și se declară în SOW la secțiunea 7.

## Detalii tehnice

- `selfhost-heartbeat-schema.ts`: bloc `usage` opțional, validat strict (numere
  și chei dintr-o listă închisă; orice câmp necunoscut e respins).
- Agregare în Self-Hosted dintr-un modul nou `usage-metrics.server.ts` care
  citește doar `count(*)` / medii din PostgreSQL local; nicio coloană de text.
- Migrare Cloud: `selfhost_usage_snapshots` (install_id, period, metrici jsonb),
  RLS + GRANT, citire doar pentru echipa OPSQAI.
- `management.selfhost-fleet.tsx` → filă nouă „Utilizare" + rută
  `management.usage.$installId.tsx`; export prin generatorul PDF existent.
- Preset pilot în `management.licenses.tsx`; expirarea se verifică în
  `local-licensing.server.ts` și în gardul de scriere.
- Scripturi noi în `scripts/` pentru PDF-ul SOW completat, în linia celor
  existente.

## Ce nu se schimbă

Nicio funcție de lucru a clientului, nicio pagină publică de pe site.
