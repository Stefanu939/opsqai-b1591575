# Roadmap

## Public operational benchmarks (2026-10-25)
- [x] Verify Microsoft 2023 (62%) and Coveo 2025 (47%) primary sources, populations and limitations; distinguish external research from OPSQAI analysis
- [x] Add visible homepage benchmarks, /studies, navigation/footer links and two RO/EN/DE blog analyses with shareable links
- [x] Add editable annual search-cost and hypothetical capacity simulation; 4 calculation tests passed
- [x] Verify homepage → studies → custom inputs → article, RO/EN/DE and mobile menu/blog at 360px; no page errors or horizontal overflow

## MC revenue period report (2026-10-20)
- [x] Reconcile dashboard approved value versus recorded receipts; selectable inclusive dates and all-time
- [x] Download the same period and customer breakdown as PDF
- [x] Seven tests pass; authenticated dashboard shows approved 18,000 EUR vs 0 recorded receipts; custom 1–20 October selection and matching PDF verified, no browser errors, build OK

## Sales documents & approved revenue (2026-10-20)
- [x] Car Mode shows the interactive Kai face
- [x] One-pager is a solutions sheet with no prices; Kai attaches promised documents
- [x] Kai labels landlines, looks for mobile/email, never offers WhatsApp on a landline
- [x] Editable implementation fee; financial proposal PDF from calculator and CRM offers
- [x] Offers can be approved in CRM; dashboard shows approved one-off vs monthly with breakdown (2 tests)

## Monitoring findings (2026-10-19)
- [x] Verify owner signup evidence against live schema: superseded by nullable-company signup migrations
- [x] Remove sticky Kai navigation veto; 33 tests pass; signed-in staff navigates Kai → Prospect Radar (including reload) → Portal admin with prospect intent retained; build OK

## KAI public signup (2026-10-18)
- [x] Replace invite-only Cloud signup trigger with unprivileged profile creation; preserve authorized admin enrolment
- [x] Verify real email signup, real Kai reply (29/30), no company or roles, Portal/MC redirect to Kai; 28 regression tests; test accounts cleaned up
- [ ] Interactive Google account selection verification — requires user's Google session; provider enabled and trigger path tested

## KAI public entry and languages (2026-10-18)
- [x] Make KAI the homepage primary action and a visible navigation action
- [x] Move public chat to /kai, preserving old links and access separation
- [x] Romanian first visit; complete RO/EN/DE chat, login and contact interface with selected-language answers
- [x] 20 focused tests; desktop/mobile navigation, translated authenticated contact forms, three real AI replies, selected language and conversation history retained after reload

## Cloud access separation (2026-10-18)
- [x] Resolve Portal eligibility before rendering; visitors without customer enrolment go directly to Kai
- [x] Keep explicit Kai sessions on Kai; separate MC and Portal login destinations
- [x] 26 focused tests passed; real staff session verified Portal entry, Kai isolation from Portal/MC/app, reload and sign-out without page errors; unenrolled customer rules covered by server tests

## Romania market study (2026-10-26)
- [x] Eurostat DII 2024 source verified: 72% of Romanian enterprises very low digital intensity, last in EU (~27% SMEs basic, 1.3% very high)
- [x] Third study in shared registry (RO/EN/DE) with honest limitations; auto-published on /studies, /blog index and /blog/digitalizarea-firmelor-romanesti
- [x] Verified on 360px mobile: study card, article and blog listing render; build OK

## Prospect Kai stability (2026-10-17)
- [x] Keep chat controls and contact form outside reply-render boundaries; display request failures separately
- [x] Validate rich reply data before rendering; guard repeated submissions and registration errors
- [x] Verify focused tests (19 passed) and authenticated mobile failure/contact flow (simulated network failure; no provider or contact submission)
- [x] Verified real AI replies in RO/EN/DE after renewal (2026-10-18); history and remaining-message counter retained after reload

## MC client discovery (2026-10-09)
- [x] Universal search across customers and CRM with contextual quick actions (Ctrl+Shift+K; Kai keeps Ctrl+K)
- [x] ANAF enrichment preview in CRM, duplicate detection and explicit application
- [x] Customer list search, industry filters, sorting and polished grid/table controls
- [x] Focused verification: search results, Sales prefill, grid/table, duplicate warning and invalid CUI; live ANAF availability remains unverified

## Kai companion update (2026-10-09)
- [x] Friendly floating Kai conversation window with action status cards
- [x] Spoken/text confirmation executes the exact pending action once
- [x] Car Mode resumes the same conversation after closing/reopening
- [x] MC mobile icon-and-label navigation with real notification badges
- [x] Verify focused tests and desktop/mobile presentation (browser action, reload and mode re-entry; real microphone/audio still requires user's device)

- [x] Academy: auto-complete + redirect to diploma
- [x] Multi-PC: main computer vs workstation, station identity, "Calculatoare conectate"
- [x] Installer in RO/DE/EN + language picker, firewall rules (removed on uninstall)
- [x] Same-network discovery of the main computer
- [x] Workstation heartbeat (revoked PC is cut off), main PC kept awake
- [x] App menu + page titles in RO/DE
- [ ] Full translation of texts inside every app page (ongoing, module by module)
- [x] Different-location link without VPN (router auto-setup + one-time pairing code + pinned certificate)
- [ ] Real Windows test of installer, workstation pairing, Academy flow — needs user's PC
- [x] MC Etapa 1: Sales Cockpit, cartonașe clienți, formular client nou, acțiuni rapide CRM
- [x] MC: Onboarding wizard 3 pași (firmă → pachet → licență + kit + mesaj gata de trimis)
- [x] MC: Ofertă oficială + ROI în PDF cu 1 click
- [x] MC: Schema calculatoarelor clientului (server + stații)
- [x] MC: Calculator de preț live → salvează ca ofertă
- [x] MC: Copilot Cmd+K cu comenzi (expiră luna asta, servere offline)
- [x] MC: Cronologia relației cu clientul

## Management Center Stage 2 (done)
- [x] Onboarding wizard 3 pași (CUI manual + buton ANAF opțional)
- [x] Calculator preț & ofertă PDF (12.000 € / 500 € / 400 €)
- [x] Topologie flotă, cronologie client, comenzi Cmd+K
- [x] CRM lead câștigat → buton „Client” deschide wizard-ul completat
- [x] Kai — Management Center AI assistant (side panel, ⌘K, ANAF CUI analysis, one-click WhatsApp/email/call/CRM actions; human-triggered)
- [x] Kai web research (internet search + CUI discovery + ANAF verification)

## Kai executive (2026-10-07)
- [x] Verified CUIs only (control digit + name match), CRM CUI in Kai
- [x] Onboarding auto-fills from CRM lead + ANAF
- [x] Kai: time off, meetings, tasks, team email (@opsqai.de, superadmin)
- [x] Kai JARVIS persona, neural voice, Car Mode

## Local AI quality (2026-10-07)
- [x] Qwen 2.5 auto-downloaded by the installer (no manual step for customers)
- [x] Lower temperature (0.2) + strict native-language quality rule for knowledge chat

## MC integrity & continuity (2026-10-09)
- [x] CUI unique per active company (DB index) + friendly concurrent-enrolment error
- [x] Idempotent onboarding: resumes from onboarding_status, skips already-issued licences
- [x] Kai conversations synced per account in the cloud (laptop ↔ phone)
- [x] Personal sender email/WhatsApp per colleague; Kai opens compose in own mailbox (human sends)
