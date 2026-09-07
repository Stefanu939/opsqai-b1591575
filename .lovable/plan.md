# OPSQAI HR — Employee Lifecycle Engine (Self-Hosted)

HR devine al doilea produs "greu" din OPSQAI, construit ca *un singur motor de
ciclu de viață* — de la candidat la angajat. Cheia care leagă totul:
**Employee ID** (`EMP-000123`), refolosibil de Transport, Academy, Compliance.
**Candidatul și angajatul sunt entități diferite**; candidatul devine angajat
doar la „Hire".

Toate ecranele sunt pe jurisdicție: **Germania / România** (tipuri de contract,
adeverințe, retenție date, câmpuri obligatorii), plus UI EN/DE/RO real.

## Arhitectură

```text
                    OPSQAI HR
        ┌───────────────┴────────────────┐
   CANDIDATE                          EMPLOYEE (EMP-000123)
   CV / Screening                ┌───────┼────────┐
   Job Profile               Contract  Onboard  Assets
   Criteria / Score              │       │        │
   Evidence / Shortlist      Training  Incidents  Offboard
        └──────► HIRE ──────────┴───────┼────────┘
                                 HR INTELLIGENCE
                       Database  |  RAG  |  Analytics
```

Un singur motor de task-uri (`hr_tasks`) alimentează onboarding, offboarding,
expirări contracte, aprobări documente, incidente, retur echipament, training,
remindere HR — nu 5 sisteme separate.

## Faze

### Faza 1 — Employee Core (prima livrare)
- Tabele: `hr_employees`, `hr_departments`, `hr_positions`, `hr_locations`,
  `hr_tasks`, `hr_employee_events` (timeline), `hr_employee_audit_log`.
- Employee ID secvențial per companie: `EMP-000001`.
- Formular „New Employee": date personale + date de angajare.
- Employee List: căutare + filtre Department / Position / Location / Status /
  Contract; coloane EMP ID, nume, poziție, status. Export **Excel/CSV** al
  tabelului (nu PDF de listă); PDF doar pentru profilul individual.
- Employee 360° cu tab-uri (Overview, Contract, Documents, Onboarding, Training,
  Equipment, Incidents, Activity/Timeline, AI) + **Status Timeline** alimentat
  automat din contracte, onboarding, training, assets, incidente, documente.
- Drepturi: `HR_ADMIN`, `HR_MANAGER`, `HR_SPECIALIST`, `MANAGER`, `EMPLOYEE`,
  `AUDITOR`, mapate pe area-rights existente. Salariu / medical / note HR izolate.

### Faza 2 — Contracte & Documente
- `hr_templates` cu variabile `{{EMPLOYEE_FULL_NAME}}`, `{{START_DATE}}`, …
- Tipuri document: contract, demisie, încetare, act adițional, avertisment,
  adeverință de salariat/salariu, confirmare concediu, altele.
- Tipuri contract per țară (DE: unbefristet/befristet/Teilzeit/Minijob/Ausbildung;
  RO: nedeterminat/determinat/part-time/ucenicie).
- Flux: Generate → Preview → validare AI (doar avertismente) → aprobare umană →
  PDF → semnătură → arhivă + versionare.

### Faza 3 — Onboarding
- Template-uri **pe poziție**, task-uri pe echipe (HR/IT/Warehouse/Manager),
  responsabil, termen, progres, remindere — toate prin `hr_tasks`.

### Faza 4 — Offboarding
- Generat la „Terminate Employee": documente finale, revocare acces, predare
  echipament, checklist final, arhivare.

### Faza 5 — Assets
- `hr_assets` cu Asset ID (`LAP-000291`), tip, marcă, model, serie, stare, status.
- Atribuiri + istoric; pachete predefinite (Picker / Office / Manager).
- Echipament nepredat la plecare → alertă + task automat.

### Faza 6 — Incidente & Conformitate
- Incidente (tip, severitate, locație, dovezi, investigație, responsabil),
  avertismente, note HR restricționate, politici de retenție configurabile
  (ex. 9 luni după încetare), alerte, audit log.

### Faza 7 — HR Intelligence
```text
HR Intelligence
├── AI Assistant           (angajați, proceduri, căutare KB, interogări structurate)
├── Candidate Intelligence (Job Profiles, criterii, CV upload, analiză AI,
│                           scor, evidence, comparare, shortlist)
├── Employee Intelligence
├── HR Analytics
└── AI Alerts
```
- Date: `hr_job_profiles`, `hr_screening_profiles`, `hr_candidates`,
  `hr_candidate_documents`, `hr_candidate_scores`, `hr_candidate_evidence`,
  `hr_candidate_status_history`.
- **Job Profile** salvat o dată (poziție, departament, locație, tip contract,
  criterii MANDATORY cu prag: ani experiență, limbă min. B2, SAP, leadership;
  criterii PREFERRED), refolosit pe requisition pentru încărcări în masă de CV-uri.
- Flux: Candidate → CV → extracție AI → screening → scor → HR review → shortlist
  → interviu → ofertă → **Create Employee** (EMP-000123).
- **Scoring transparent**: mandatory 4/4, preferred 3/4, puncte pe criteriu, iar
  fiecare criteriu are **Evidence** (citat + „CV — pagina 2"). Lipsa informației =
  `UNKNOWN` cu motiv, niciodată „nu are".
- **Blind Screening** (opțional pe politica firmei): fără nume, foto, vârstă, sex,
  naționalitate; buton „Reveal Candidate".
- **AI nu decide angajarea**: poate extrage, potrivi, evidenția dovezi, calcula
  scorul configurat, semnala informații lipsă, recomanda pentru review. Nu poate
  respinge/angaja automat. În UI: „AI recommendation — final decision remains with HR."
- Întrebări de procedură → RAG grounded pe Knowledge Base HR (aceleași reguli
  anti-halucinație ca chatul actual); întrebări de date → interogări structurate
  filtrate pe permisiuni.

### Faza 8 — Analytics & Alerts
- Alerte proactive (contracte care expiră, documente lipsă, onboarding incomplet,
  echipament nepredat, training expirat), sumar „HR record", analitice de turnover,
  absență, training, onboarding, incidente, pierderi de echipament.

## Dashboard HR
Total / activi / onboarding / offboarding, banda „Action required" (contracte care
expiră, onboarding incomplet, echipament nepredat, documente de aprobat) și
lifecycle (angajări noi / activi / plecări).

## Tehnic (scurt)
- Self-Hosted: migrații pe faze începând cu `migrations/selfhost/0042_hr_core.sql`;
  acces prin `src/lib/hr/*.server.ts` + `src/lib/hr.functions.ts` (server functions
  autentificate), pe modelul Transport.
- UI: `src/components/app/hr/*` montat pe rutele existente `/app/products/hr/*`.
- Traduceri reale în `src/i18n/pages/hr.ts` (EN/DE/RO).
- Fiecare fază se încheie cu typecheck + build + verificare în browser.
