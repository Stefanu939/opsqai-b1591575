# Fișa angajatului: salarizare, documente semnate, tot editabil

Doar în OPSQAI HR (Self-Hosted). Nimic din aceste ecrane nu ajunge în Management Center sau pe site.

## 1. Fișa angajatului — reorganizare

Din listă, clic pe angajat deschide o fișă completă pe secțiuni (carduri):

- Date personale
- Contract și poziție
- Salarizare (vizibilă doar cu dreptul dedicat)
- Documente (inclusiv cele de semnat)
- Politici și confirmări
- Echipamente
- Instruiri
- Incidente
- Istoric (cine a schimbat ce și când)

Fiecare câmp se editează direct în card: clic pe valoare, se salvează, apare în istoric. Documentele au previzualizare PDF în pagină și miniaturi pentru cele semnate.

## 2. Salarizare (pachet complet)

- Buton „Salarizare” în fișa angajatului.
- Date: salariu brut, monedă, tip (lunar / oră), ore pe săptămână, valabil de la, motiv modificare.
- Istoric complet al modificărilor salariale, cu autor și dată; nimic nu se șterge, se adaugă versiune nouă.
- Adaosuri și rețineri introduse manual (bonus, diurnă, avans, penalizare) pe lună.
- Fluturaș lunar PDF pentru angajat: brut, adaosuri, rețineri, net calculat din valorile introduse.
- Export lunar PDF pentru contabilitate: toți angajații activi, cu totaluri.
- Nu se calculează taxe și contribuții de stat automat; se introduc manual ca rețineri, iar documentele conțin o notă clară în acest sens.

## 3. Drept dedicat de salarizare

- Se adaugă un drept nou „Salarizare” în sistemul de drepturi existent.
- Fără acest drept: butonul, cardul, cifrele, fluturașii și exportul nu se văd și nu se pot descărca deloc — nici din listă, nici din PDF-uri.
- Fiecare vizualizare și modificare de salariu se scrie în jurnalul de audit.

## 4. Documente semnate (compliance, fraudă, politici)

Ciclul complet per document și per angajat:

1. „Descarcă PDF de semnat” — se generează documentul cu datele angajatului și numele firmei, cu loc de semnătură și dată.
2. „Semnează pe ecran” — alternativă când angajatul e prezent: semnează cu mouse/deget, iar semnătura intră în PDF, care se salvează automat ca versiune semnată.
3. „Încarcă documentul semnat” — se atașează PDF-ul semnat pe hârtie (max 20 MB), rămâne în fișă cu dată și autor.
4. Stare vizibilă pe fiecare document: de semnat / semnat / expirat / aproape expirat, cu culori și dată de valabilitate.
5. Reamintiri automate: notificare pentru documentele nesemnate și pentru cele care expiră (în inbox-ul de notificări existent și în rezumatul zilnic), fără duplicate.
6. Versiuni: dacă politica se schimbă, documentul semnat vechi rămâne în istoric și se cere semnătură nouă.

## 5. Vizual

- Cardurile de documente arată tip, stare, dată, cine a semnat și o miniatură.
- Previzualizare PDF direct în pagină, cu descărcare.
- Semafoare pentru salarizare (modificare recentă), documente (expirate) și politici (neconfirmate).
- Tot textul în engleză, germană și română.

## Detalii tehnice

- Migrație Self-Hosted nouă (`migrations/selfhost/0045_hr_payroll_signing.sql`):
  - `hr_payroll_records` — versiuni salariale per angajat (brut, monedă, tip, ore, valabil de la, motiv, autor).
  - `hr_payroll_items` — adaosuri/rețineri pe lună (tip, etichetă, sumă, semn).
  - `hr_payslips` — fluturași generați (perioadă, totaluri, PDF stocat).
  - `hr_signature_requests` — documente de semnat per angajat: sursă (compliance / fraudă / politică / șablon), versiune, stare, termen, valabilitate.
  - Extindere `hr_documents` cu `signature_request_id`, `signed_at`, `signed_by_name`, `signature_kind` (`drawn` | `uploaded`).
- Server functions noi în `src/lib/hr/` plus rute în `hr.functions.ts`, toate cu verificare de companie și cu `requirePermission` pe noul drept de salarizare.
- Generare PDF cu `pdf-lib`, ca la certificatele Academy; stocare prin storage provider-ul existent, nu pe disc direct.
- Componente noi în `src/components/app/hr/`: `employee-file.tsx`, `payroll-card.tsx`, `signature-card.tsx`, `signature-pad.tsx`, `pdf-preview.tsx`; editare in-place printr-un câmp reutilizabil.
- Reamintirile folosesc mecanismul de notificări și digest deja existent, cu deduplicare pe zi.
- Traduceri EN/DE/RO în dicționarele HR existente.
- Verificare: typecheck, teste, build, plus parcurgerea fluxului (creare salariu → fluturaș → document de semnat → semnare pe ecran → încărcare PDF semnat) și confirmarea că un utilizator fără drept de salarizare nu vede nimic.
