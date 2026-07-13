## Goal

1. `app-shell.tsx` deja are separare `isMC` vs self-host, dar:
   - MC nav îi lipsesc: Module Catalog, Release Management, Maintenance, Downloads, Monitoring, Billing.
   - Self-hosted nav arată tot admin-ul necondiționat — trebuie gate-uit pe module licențiate; doar Basic vizibil implicit.
2. Billing MC: modelul de preț nu e reflectat nicăieri — trebuie o pagină cu preț fix produs 15.000€ + abonament mentenanță 200–500€/lună + module extra cu preț per key.
3. Fiecare item/card trebuie verificat că ruta chiar există și functia din spate răspunde, apoi filtrat, nu șters.

Nu se șterge nicio rută sau definiție NavItem — doar filtrare la render, exact ca patternul existent `filterNav` + `gate(module)`.

---

## Step 1 — Audit nav items existente (fără edit)

Pentru fiecare item din cele 3 grupe self-host și 6 grupe MC din `app-shell.tsx` (liniile 137–468), verific:
- ruta există sub `src/routes/_authenticated/`
- pagina se randează (loader nu aruncă, componenta se montează)
- funcțiile server pe care le apelează sunt implementate

Raportez un tabel `route → exists? → renders? → server fn ok?` înainte de orice modificare. Orice item cu rută lipsă marcat `show: false` explicit cu comentariu, nu șters.

## Step 2 — MC nav: completare la lista cerută

Adaug NavItem-uri noi (rutele lipsă le creez ca stub route file + placeholder component; le pot construi pe rând ulterior). Structura finală MC:

```
Overview      : Dashboard, Executive Dashboard, Analytics, Monitoring*
Enterprise    : Companies, Enterprise Documents, Contacts*, Installations*, Customer Portal
Licensing     : Licenses & Releases, Activation Bundles, Module Catalog*, Release Management*, Maintenance*
Commercial    : Orders & Subscriptions, Billing*, Downloads*
Operations    : Support Inbox, Audit Log, Email Settings, Email Logs
Integrations  : Integrations, SSO/SAML/OAuth, Webhooks, API Keys, API Docs
Platform      : Platform Administration, Users & Roles, Directory, Branding, Setup, Doctor, Recovery
```

`*` = rută nouă, creez fișier de rută + pagină stub minimă (heading + descriere + link-uri către surfaces existente unde este cazul: Module Catalog citește `LICENSE_MODULE_CATALOG`; Downloads listează `installer_releases`; Monitoring pointează la Doctor/health; Maintenance listează licențele cu `maintenance_expires_at` iminent). Nu implementez business logic nouă în acest pas dincolo de citiri simple deja disponibile.

## Step 3 — Self-Hosted nav: license-gated by default

Regulă nouă: în self-host, doar **Basic bundle** vizibil din start. Restul apar când licența conține modulul corespunzător. Basic vizibil implicit:

- Dashboard (`/app`), Chat (`chat`), Knowledge Base (`kb`), FAQ (`faq`), Requests (`internal_requests` — actualmente Basic-adjacent; îl mut în Basic dacă user confirmă, altfel îl las gated), Knowledge Gaps (`knowledge_gaps`), AI Audit (`audit_log`), Users, Subscription/Billing view.

Mapare item → ModuleKey pentru gating (folosind `useHasModule` / `gate()` deja prezent):

| Nav item              | module gate               | vizibil în Basic? |
|-----------------------|---------------------------|-------------------|
| Chat                  | `chat`                    | da (Basic)        |
| Knowledge Base        | `kb`                      | da (Basic)        |
| FAQ                   | `faq`                     | da (Basic)        |
| Knowledge Gaps        | `knowledge_gaps`          | da (per cerință)  |
| AI Audit              | `audit_log`               | da (per cerință)  |
| Users                 | (permisiune, fără modul)  | da (Basic)        |
| Subscription/Billing  | (fără modul, mereu)       | da (Basic)        |
| Workspace             | `ai_workspace_audit`      | nu (hidden)       |
| Requests              | `internal_requests`       | nu                |
| Academy (learner)     | `academy`                 | nu                |
| Command Center        | `executive_dashboard`     | nu                |
| SOP Generator         | `ai_sop_generator`        | nu                |
| Academy Manager       | `academy`                 | nu                |
| Analytics             | `analytics`               | nu                |
| Integrations          | (admin + modul dedicat? — propun `rbac` sau nou key) | nu |
| SSO Setup             | `rbac`                    | nu                |
| Webhooks              | (admin) — propun gated de `rbac` sau always-admin | nu |
| API Keys              | idem                      | nu                |
| Brand Center          | `brand_center`            | nu                |

Pattern implementare: pentru items care actualmente au `module: null` dar trebuie hidden until licensed, actualizez cheia `module` la key-ul corect. `filterNav` deja face `show && gate(module)`, deci nu se schimbă logica — doar datele.

Adaug NavItem nou "Subscription" în self-host Workspace group care duce la o pagină `/app/subscription` (creez rută stub) care arată planul curent, mentenanța, modulele active/inactive și link "Cere modul suplimentar".

## Step 4 — Mode isolation (route access, nu doar nav)

`DeploymentModeGate` deja există și redirectează. Verific că lists `MC_ONLY_PREFIXES` / `SELFHOST_ONLY_PREFIXES` din `deployment-mode.ts` acoperă rutele noi din Step 2. Adaug prefixele noi (`/app/admin/module-catalog`, `/app/admin/downloads`, `/app/admin/maintenance`, `/app/admin/monitoring`, `/app/admin/billing`, `/app/admin/installations`, `/app/admin/contacts`) în `MC_ONLY_PREFIXES`. Rutele operaționale rămân doar în self-host.

## Step 5 — Billing model (MC)

Creez `/app/admin/billing` cu:
- **Product one-time**: `€15,000` fixed, incl. installation (constantă în `src/lib/pricing.ts` nou).
- **Maintenance subscription**: bandă `€200–€500 / lună`, custom per client (input în UI-ul MC billing per licență).
- **Extra modules**: derivate din `LICENSE_MODULE_CATALOG` — arăt tabel cu `label`, `defaultPriceCents`, editabil per client (override).
- Buton "Add custom line item" pentru pricing customizat.

Structura date: adaug tabel `license_pricing` (per install_id):
```
install_id text PK/FK, product_price_cents int default 1500000,
maintenance_monthly_cents int, currency text default 'EUR',
custom_lines jsonb default '[]', updated_at timestamptz
```
Cu GRANT + RLS (admin-only via `has_role`). Migration + server fn `getLicensePricing` / `saveLicensePricing`.

Self-host Subscription page (Step 3) citește read-only același rând pentru install-ul curent, prin server fn public (validat cu install_id din `platform_config`), fără să expună alte tenants.

## Step 6 — Verificare

- `bun run tsgo` clean.
- Playwright headless: setez `VITE_OPSQAI_MODE=mc` build, verific `/app/platform/*` render + capture nav; apoi `=selfhost`, verific `/app` cu licență Basic → doar items Basic; apoi injectez licență cu `analytics` → apare Analytics.
- Screenshot before/after pentru fiecare mod.
- Raport final: lista NavItem filtrată real pentru fiecare mod + screenshot-uri.

---

## Deliverables

- `src/components/app/app-shell.tsx` — grupuri MC completate, self-host items cu `module` corect.
- `src/lib/deployment-mode.ts` — prefixe noi.
- rute stub noi sub `src/routes/_authenticated/` (Module Catalog, Downloads, Maintenance, Monitoring, Billing, Installations, Contacts, Subscription).
- `src/lib/pricing.ts` + migration `license_pricing` + `pricing.functions.ts`.
- Playwright script sub `/tmp/browser/nav-modes/`.
- Raport în chat cu tabelele finale + screenshots.

## Întrebări înainte de build

1. **Requests (`internal_requests`)** — îl las gated (ascuns până la licență) sau îl mut în Basic alături de Chat/KB/FAQ? (ai listat "Knowledge Gap" în Basic, dar nu "Requests".)
2. **Integrations / Webhooks / API Keys** — le gate-uiez pe un modul nou `integrations` (nu există în catalog azi), pe `rbac`, sau le las always-admin fără modul? Propun adăugare `integrations` în `LICENSE_MODULE_CATALOG` (bump `MODULE_CATALOG_VERSION`).
3. **Currency billing** — EUR fix sau multi-currency? Confirm EUR-only.
4. **Maintenance range 200–500€** — input liber cu validare `>=200 && <=500`, sau slider fix cu 4 trepte (200/300/400/500)?