# Roadmap

- [x] Redesign the public website with Graphite Precision, editorial typography, responsive navigation, scoped light/dark tokens, and canonical EN/DE/RO product copy
- [x] Plan demo video v2 (flicker fix, Self-Hosted scenes, EN narration, social formats, website embed)
- [x] Capture Self-Hosted app screens (dashboard, AI chat, Academy, audit, gaps, product workspace)
- [x] Remove zoom/pan flicker in Remotion (static screens, frozen grid, calmer aurora, CRF 14)
- [x] English narration via Lovable AI TTS + muxed audio
- [x] Export 16:9, 1:1, 9:16 to /mnt/documents
- [x] Embed 16:9 video on /product-overview (EN/DE/RO + VideoObject JSON-LD)
- [x] Remove non-blog marketing hover effects while preserving the blog exception
- [x] Make the four pricing cards direct, keyboard-accessible destinations
- [x] Replace moving public hero scenes with Enterprise Live Intelligence visuals
- [x] Align website copy, metadata and public documentation with Windows Self-Hosted as the customer product
- [x] Establish one product-wide Graphite Precision token and component system with light/dark parity
- [x] Align every Self-Hosted shell, dashboard, module, chat, Academy, product workspace, and utility state
- [x] Align the web first-run wizard and native Windows installer/desktop shell
- [x] Align every Management Center page and shared shell
- [x] Align every Customer Portal page and shared shell
- [x] Remove obsolete Aurora Noir, glass, glow, legacy gold, and excessive-radius presentation patterns
- [x] Update the current design documentation to make product-wide Graphite Precision authoritative
- [x] Verify representative and outlier screens on desktop/mobile in light/dark, plus typecheck/build/installer guards
- [x] Unify Self-Hosted Owner/SuperAdmin/Admin access and add named-user area rights
- [x] Repair Transport timestamp isolation and complete permission-aware Overview/Operations controls
- [x] Simplify Self-Hosted License & Entitlements to status, active rights, and verify/replace
- [x] Verify Self-Hosted authorization, Transport, licensing, typecheck, build, and boundary checks
- [x] Grade Academy quizzes by option identity so correct picks score correctly
- [x] Chat sources open the document inside the Knowledge Base (plus explicit file download)
- [x] Cut chat answer latency by parallelising thread/profile/history and image reads

## Cerere 2026-09-07 (Self-Hosted)
- [x] Academy: creare curs ducea la pagină goală → editor de capitole/lecții + mesaje de eroare
- [ ] Overview „control center” pe workspace-uri: grafice, KPI, deadline-uri, noutăți audit, concedii, evenimente, safety risk, 5S, widgets + carduri produse + export PDF
- [x] Chat AI: comparare între documente + bară de căutare
- [x] Traduceri reale RO/EN/DE în tot Self-Hosted (nu doar comutator)
- [x] Transport Overview: trimitere email (digest) nu funcționează corect
- [x] CMR: salvare date ca draft cu nume editabil

## OPSQAI HR (plan 2026-09-07)
- [x] Faza 1 — Employee Core (EMP ID, listă+filtre, Employee 360°, timeline, hr_tasks, permisiuni, export CSV/PDF, setări + date de referință)
- [x] Faza 2 — Contracte & documente (template engine, per țară DE/RO, aprobare umană)
- [x] Faza 3 — Onboarding pe poziție
- [x] Faza 4 — Offboarding
- [x] Faza 5 — Assets & pachete predefinite
- [x] Faza 6 — Incidente, avertismente, retenție, audit
- [x] Faza 7 — HR Intelligence (AI Assistant, Candidate Intelligence: Job Profiles, CV screening, scor cu evidence, blind screening, shortlist → hire)
- [x] Faza 8 — HR Analytics & AI Alerts

## Cerere 2026-09-08 (Self-Hosted HR)
- [x] Contracte: descărcare PDF reparată (atob eroare); flux angajat → tip document (per țară) → generare automată cu conținut → editare/draft cu nume → aprobare → PDF → atașare la fișă
- [x] HR Overview: rezumat complet (onboarding, offboarding, noi, în așteptare, CV-uri, expirări), taskuri deschise ca și card de lucru, marcare rezolvat, export PDF
- [x] HR Tasks: detaliu/editare, documente atașate, generare din șablon per țară
- [x] Onboarding/Offboarding: fluxuri reale per țară, căutare angajat, promote/demote cu criterii
- [x] Equipment: șabloane/categorii predefinite (safety, hardware…) + manual
- [x] Candidate screening: orice limbă, interogare/editare/analiză extinsă
- [x] HR Analytics & Alerts: reparat + complex
- [x] Settings: mai ample
- [x] Workspaces noi funcționale: Policies & Procedures, Employee Requests, HR Knowledge, Training, Compliance, HR Intelligence

## Core Operations (Self-Hosted) — done
- [x] Incidents & damages register with costs, downtime, evidence, statuses, departments (`0046_core_operations.sql`)
- [x] Grounded Root Cause Intelligence (5 Whys, Lean class, UNKNOWN, knowledge-gap recording)
- [x] Corrective/preventive actions + analytics, PDF-only reports
- [x] `/app/operations` in Self-Hosted navigation; rights `core_ops`, `core_costs`
- [x] Department isolation enforced server-side for chat retrieval (`src/lib/department-scope.server.ts`)
- [x] User-facing spreadsheet exports removed (HR employee list now PDF; CSV download helper deleted)
