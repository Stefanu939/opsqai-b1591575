# OPSQAI Transport — make every section real (Self-Hosted only)

Today the Transport sections exist but only point back to the general platform tools. This turns all seven of them into working operational areas inside the installed Windows product. Nothing in the Management Center, the Customer Portal or the public website changes, and licensing stays exactly as it is: Transport still only opens when the customer's signed licence includes it.

## What each section will do

**1. Transport Overview**
Control panel for the whole domain: how many vehicles and drivers are active, what expires in the next 30/60/90 days, open incidents by severity, open requests, last weekly check result, and the top five things that need attention today. Each figure clicks through to the filtered list behind it.

**2. Transport Operations**
The registers, with full add / edit / archive:
- Vehicles: plate, type, ownership, odometer, assigned driver, status, notes, and a document/expiry list (roadworthiness ITP/TÜV, insurance, tachograph, transport licence, ADR — the exact set depends on the selected country).
- Drivers: name, licence categories and expiry, medical/professional certificates, assigned vehicle, status, notes.
Every record has its own notes timeline, attached documents and a link to the procedures that apply to it.

**3. Procedures**
Transport procedures, drawn from the existing knowledge and procedure library but scoped to this domain, plus the ability to attach a procedure to a vehicle, driver, carrier or incident type so people see the right instruction where the work happens.

**4. Incidents**
Report an incident (damage, delay, breakdown, dispute, safety), classify severity, attach vehicle/driver/carrier, add notes and files, then run it through an approval flow: reported → in review → action agreed → closed, with who approved and when kept in the audit trail.

**5. Carrier Knowledge**
Carrier records: contacts, requirements, handling rules, documents and expiry dates, performance notes, and linked procedures/FAQ entries.

**6. Requests**
Transport requests (vehicle needed, repair, document renewal, exception approval) with owner routing, status, comments and the same approval flow, connected to the existing request/notification system so the responsible person is alerted.

**7. Transport Intelligence**
Domain-restricted AI answers grounded only in the Transport data and procedures above, with the usual audit logging, plus short generated summaries for the weekly check.

## Weekly audit — editable by the customer

A checklist the company edits itself inside the installed product: they add, rename, reorder or remove the items to be verified each week (per vehicle, per driver, per carrier, or general). Anyone with the right granted to them can run the week's check, tick items, leave notes and attach evidence; the result is stored with date and author and shown on the Overview.

## Country and language

Transport settings get a country and language selector that can be changed at any time. The country decides which document and expiry types are proposed (for example ITP for Romania, TÜV/HU for Germany, generic for others) and the wording follows the selected language (EN/DE/RO). Changing the country never deletes existing records — it only changes what is proposed for new ones.

## Who can do what

The company's Admin or SuperAdmin grants Transport rights per person inside their own installation: view, edit registers, approve, manage the weekly checklist, manage settings, export. No new fixed job role is imposed; existing roles keep working and the per-person grants sit on top.

## Export

Every list (vehicles, drivers, incidents, carriers, requests, expiries, weekly check results) exports to CSV with the currently applied filters, and attached documents can be downloaded. Exports are recorded in the audit log.

## Map (new)

A real, interactive map inside Transport, added as an eighth section ("Transport Map") and also embedded as a panel on Overview and Operations:

- Pins for every place the Transport data already knows: vehicle base/home depot, driver base, carrier addresses and incident locations. Addresses are turned into coordinates once and stored, so the map keeps working without re-lookup.
- Filters and layers you can switch on and off: vehicles, drivers, carriers, incidents, expiring documents, and status colours (active / attention / blocked).
- Click a pin to open the record's side panel with its notes, documents and expiries, and jump straight into the full record.
- Draw or pick operating zones (regions, delivery areas) and see which vehicles, carriers and incidents fall inside; zone assignment is saved on the record.
- Optional route/distance view between two selected points for planning and dispatch discussions, plus a heat view of where incidents concentrate.
- Manual pin placement and drag-to-correct for addresses that cannot be resolved automatically, and coordinates included in the CSV export.
- Language and country follow the Transport settings; measurement units follow the selected country.

Because Self-Hosted installations can run without internet, the map degrades gracefully: when no map service is reachable it shows the same records as a grouped list by zone/city instead of failing, and the settings page states clearly whether map lookups are allowed to leave the installation.

## Technical notes

- New Self-Hosted migration `migrations/selfhost/0029_transport.sql`: `transport_vehicles`, `transport_drivers`, `transport_documents` (polymorphic owner + type + expiry), `transport_carriers`, `transport_incidents`, `transport_requests`, `transport_notes`, `transport_links` (procedure/KB links), `transport_checklist_items`, `transport_checks`, `transport_check_results`, `transport_settings` (country, language, notification windows), `transport_grants` (per-user rights). Indexed by expiry date and status.
- Provider contract `ITransportRepository` added to `src/lib/providers/interfaces.ts` with a Postgres implementation `src/lib/providers/selfhost/pg-transport-repository.server.ts`, following the existing calendar/presence repository pattern. Cloud gets a not-available stub so the shared code compiles; no Cloud tables are created.
- `src/lib/transport.functions.ts` — authenticated server functions for CRUD, approvals, checklist management, settings, grants and CSV export; every write authorised against `transport_grants` plus the existing role checks, and every state change written to the existing audit log.
- Country rule packs in `src/lib/transport/compliance-packs.ts` (RO/DE/generic), EN/DE/RO copy in `src/i18n/pages/product-workspaces.ts` (extended) plus a new Transport dictionary.
- The seven routes stay at `/app/products/transport/<workspace>`, implemented as dedicated components instead of the current generic placeholder; the generic placeholder route remains for all other products so nothing else regresses.
- Expiry alerts reuse the existing notification pipeline (30/60/90-day windows) and the Self-Hosted scheduled job runner.
- Verification: typecheck, production build, existing architecture/licensing test suites, plus new unit tests for the compliance packs and grant checks.
