# OPSQAI HR — Employee Lifecycle Engine (Self-Hosted)

HR devine al doilea produs "greu" din OPSQAI, construit ca *un singur motor de
ciclu de viață al angajatului* (nu 10 funcții separate). Cheia care leagă totul:
**Employee ID** (`EMP-000123`), refolosibil de Transport, Academy, Compliance.

Toate ecranele sunt bilingve pe jurisdicție: **Germania / România** (tipuri de
contract, adeverințe, retenție date, câmpuri obligatorii diferă), plus UI EN/DE/RO.

## Faze (livrate în această ordine)

### Faza 1 — Employee Core (prima livrare)
- Tabele: `hr_employees`, `hr_departments`, `hr_positions`, `hr_locations`.
- Employee ID generat automat, secvențial, per companie: `EMP-000001`.
- Formular „New Employee": date personale + date de angajare (ca în cerință).
- Listă cu căutare, filtre (departament, poziție, locație, status), export PDF.
- Pagina „Employee 360°" cu tab-uri (Overview, Contract, Documents, Onboarding,
  Training, Equipment, Incidents, Activity, AI) — tab-urile se umplu în fazele următoare.
- Drepturi: `HR_ADMIN`, `HR_MANAGER`, `HR_SPECIALIST`, `MANAGER`, `EMPLOYEE`,
  `AUDITOR` mapate pe sistemul de area-rights existent din Self-Hosted.
- Audit: fiecare scriere intră în `hr_employee_audit_log`.

### Faza 2 — Contracte & Documente
- `hr_templates` cu variabile `{{EMPLOYEE_FULL_NAME}}`, `{{START_DATE}}`, …
- Tipuri document: contract, demisie, încetare, act adițional, avertisment,
  adeverință de salariat/salariu, confirmare concediu, altele.
- Tipuri contract per țară (DE: unbefristet/befristet/Teilzeit/Minijob/Ausbildung;
  RO: nedeterminat/determinat/part-time/ucenicie).
- Flux: Generate → Preview → validare AI (doar avertismente) → aprobare umană →
  PDF → semnătură → arhivă + versionare.

### Faza 3 — Onboarding
- Template-uri de onboarding **pe poziție**, task-uri pe echipe (HR/IT/Warehouse/Manager),
  responsabil, termen, progres, remindere.

### Faza 4 — Offboarding
- Generat automat la „Terminate Employee": documente, revocare acces, predare
  echipament, checklist final, arhivare.

### Faza 5 — Assets
- Registru `hr_assets` cu Asset ID (`LAP-000291`), stare, serie, atribuiri, istoric.
- Pachete predefinite (Picker / Office / Manager) → creează atribuirile automat.
- La offboarding: echipament nepredat → alertă + task.

### Faza 6 — Incidente & Conformitate
- Incidente cu tip, severitate, locație, dovezi, investigație, responsabil.
- Avertismente, note HR (strict restricționate), politici de retenție configurabile
  (ex. 9 luni după încetare), alerte, audit log.

### Faza 7 — HR Intelligence
- Întrebări pe **date structurate** (contracte care expiră, onboarding incomplet,
  echipamente, training) traduse în interogări sigure, filtrate pe permisiuni.
- Întrebări de procedură → RAG pe Knowledge Base HR (grounded, zero halucinație,
  aceleași reguli ca chatul actual).
- **Citire CV**: încarci CV-ul, AI extrage câmpurile, se afișează într-un formular
  editabil, iar fișa angajatului se completează **doar după confirmarea HR**.

### Faza 8 — HR Intelligence PRO
- Alerte proactive, sumar „HR record" pe angajat, analitice (turnover, absență,
  training, expirări, incidente, pierderi de echipament).

## Dashboard HR
Înlocuiesc cardurile descriptive cu: total / activi / onboarding / offboarding,
banda „Action required" (contracte care expiră, onboarding incomplet, echipament
nepredat, documente de aprobat) și lifecycle (angajări noi / activi / plecări).

## Tehnic (scurt)
- Self-Hosted: migrații noi `migrations/selfhost/0042_hr_core.sql` … pe faze;
  acces prin `src/lib/hr/*.server.ts` + `src/lib/hr.functions.ts` (server functions
  autentificate), la fel ca modelul Transport.
- UI: `src/components/app/hr/*` montat pe rutele existente `/app/products/hr/*`.
- Datele sensibile (salariu, medical, note HR) sunt separate și gated pe rol.
- Traduceri în `src/i18n/pages/hr.ts` (EN/DE/RO reale).
- Fiecare fază se încheie cu typecheck + build + verificare în browser.
