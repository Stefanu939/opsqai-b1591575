# CRM în Management Center

Un CRM complet în Management Center (cloud, doar echipa OPSQAI — nu apare niciodată în Self-Hosted), cu pipeline drag & drop, activități, oferte/pilot, conversie în client + licență și rapoarte.

## Structura (ce vede utilizatorul)

Meniu nou `CRM` în secțiunea Customers, cu 4 ecrane:

1. **Pipeline (drag & drop)** — coloane pe etape:
   `Nou → Calificat → Demo → Pilot → Ofertă → Câștigat / Pierdut`
   Card lead: firmă, contact, țară/limbă, valoare estimată, responsabil, ultima activitate, semafor „fără activitate de X zile”.
2. **Lead / detaliu 360°** — date contact, sursă, produse de interes, valoare, probabilitate, notițe, istoric complet (timeline), activități, oferte, fișiere, legătură la client existent.
3. **Activități** — task-uri cu termen, apeluri, emailuri, întâlniri; „Ce am azi / întârziat”; apar și în Calendarul MC și în clopoțelul de notificări.
4. **Rapoarte** — pipeline pe etape și valoare, rata de conversie, leaduri pe sursă/țară/limbă, leaduri stagnante, activitate per coleg; export PDF.

## Cum intră leadurile

- **Formular de contact din site** — fiecare mesaj devine automat lead nou (nume, email, firmă, țară, subiect, limbă, cod referință), fără duplicate pe același email.
- **Cereri de pilot** — devin lead direct în etapa `Pilot`, marcat „calificat”.
- **Descărcări de resurse** — cine descarcă un ghid devine lead în `Nou`, cu ghidul descărcat notat ca interes; descărcări repetate se adaugă în timeline, nu creează lead nou.
- **Manual** — buton „Lead nou” cu formular scurt.

## Conversie în client + licență

Butonul **„Convertește în client”** pe un lead câștigat:
1. creează fișa de client (companie) cu numele, țara și produsele de interes preluate din lead;
2. leagă leadul de client și mută tot istoricul în fișa clientului;
3. deschide direct pasul de emitere a licenței, precompletat cu clientul și produsele;
4. dacă firma există deja, propune legarea la clientul existent în loc de dublare.

## Vizibilitate

- Toată echipa vede toate leadurile.
- Editează / mută în pipeline / șterge: doar responsabilul leadului sau SuperAdmin.
- Reatribuire responsabil: doar SuperAdmin (sau responsabilul actual).
- Fiecare modificare de etapă, responsabil sau valoare se scrie în jurnalul de audit.

## Detalii tehnice

Migrare nouă (Cloud/Supabase), toate tabelele cu GRANT + RLS:

- `crm_leads` — company_name, contact_name, email, phone, country, language, source, source_ref, stage, status, value_amount, currency, probability, products (text[]), owner_user_id, company_id (nullable), lost_reason, next_action_at, last_activity_at, timestamps.
- `crm_activities` — lead_id, kind (`note|call|email|meeting|task`), subject, body, due_at, done_at, owner_user_id.
- `crm_lead_events` — timeline append-only (creat, etapă schimbată, sursă nouă, convertit).
- `crm_offers` — lead_id, title, products, amount, currency, status (`draft|sent|accepted|declined`), valid_until, pdf_path.

RLS: SELECT pentru `authenticated` + `is_platform_admin()/is_platform_owner()`; INSERT/UPDATE/DELETE doar când `owner_user_id = auth.uid()` sau `is_platform_owner()`. `service_role` full.

Intake automat:
- trigger `AFTER INSERT` pe `contact_submissions` → upsert în `crm_leads` (stage `Pilot` când `subject = 'pilot'`, altfel `Nou`), plus rând în `crm_lead_events`; dacă emailul există deja, doar event nou.
- endpointul public `/api/public/resources/$file` primește un pas de captare lead (formularul existent din `/resources`) care scrie leadul prin server function publică, cu validare Zod și fără date sensibile.

Server functions noi în `src/lib/crm.functions.ts` (toate cu `requireSupabaseAuth` + verificare rol platform):
`listCrmLeads`, `getCrmLead`, `saveCrmLead`, `moveCrmLeadStage`, `assignCrmLead`, `saveCrmActivity`, `completeCrmActivity`, `saveCrmOffer`, `renderCrmOfferPdf`, `convertCrmLeadToCustomer`, `crmReports`, `exportCrmReportPdf`.
Conversia refolosește logica existentă de creare client și pasarea către emiterea de licență (nu se dublează logica de licențiere).

UI nou:
- `src/routes/_authenticated/management.crm.tsx` (pipeline), `management.crm.$leadId.tsx` (detaliu), `management.crm.activities.tsx`, `management.crm.reports.tsx`.
- `src/components/mc/crm/` — `pipeline-board.tsx` (drag & drop cu HTML5 dnd, ca la cuplarea remorcilor din Transport), `lead-card.tsx`, `lead-dialog.tsx`, `lead-detail.tsx`, `activity-panel.tsx`, `offer-dialog.tsx`, `reports-panel.tsx`.
- Intrare nouă în `SECTIONS` din `src/components/mc/mc-shell.tsx` și în Quick Search.
- Activitățile cu termen apar în `management.calendar.tsx` și generează notificări prin mecanismul existent.

Design: aceleași primitive Aurora Noir / carduri MC rotunjite; fără culori hardcodate.

## Verificare

- Typecheck + build.
- Un lead de test: creat din formularul de contact, mutat prin toate etapele, activitate cu termen, ofertă PDF, conversie în client și pornirea emiterii licenței.
- Test de vizibilitate: un coleg non-owner poate vedea dar nu poate muta/edita un lead al altcuiva; SuperAdmin poate.
