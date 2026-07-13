# MC — consolidare & un singur design

## De ce
Momentan MC arată în două designuri pentru că sidebar-ul Noir & Gold linkează spre pagini care trăiesc în shell-ul `/app/admin/*` (temă generală, light). Când dai click pe „Clienți" sau „Instalări" ești aruncat în alt shell.

În plus, mai multe module fac același lucru:
- **Customers vs Companies** — două pagini pentru aceeași entitate (tenant).
- **Licenses vs Subscriptions** — licența și facturarea sunt cuplate, dar apar în două ecrane.
- **Setup vs Releases** — în sidebar sunt două intrări care duc la aceeași rută.
- **Onboarding wizard vs "adaugă client" manual în admin/customers vs create-license în admin/subscriptions** — trei căi pentru aceeași operație.
- **Admin/platform tiles page** — duplică sidebar-ul MC.

## 1. Design — un singur set de culori
Păstrăm **Noir & Gold** (mai premium, editorial). Îl impunem pe TOT ce se accesează din sidebar-ul MC. Shell-ul `.mc-shell` devine obligatoriu pentru orice rută `/app/platform/*`. Nicio pagină linkată din MC sidebar nu mai trăiește în tema veche.

`/app/admin/*` rămâne pentru admin-ul din workspace-ul clientului (users, ai-audit, knowledge-gaps, sop-generator, academy, integrations, sso, webhooks, api-keys, email, audit-tenant) — acolo tema generală e ok, e alt public.

## 2. Consolidări de module

### Combinate
- **Clienți** = `admin/customers` + `admin/companies` → `/app/platform/customers`
  Un singur tabel (search, filter, tier), drawer/detaliu cu tab-uri: *Profile · Timeline · Compliance · Licenses · Support*.
- **Licențe & Billing** = `platform/licenses` + `admin/subscriptions` → `/app/platform/licenses`
  Tabel + drawer detaliu cu tab-uri: *License · Modules · Installs · Billing (grace/renewal/payment) · Events*.
- **Releases** = fostul dublu-entry "Releases + Setup" → o singură rută `/app/platform/releases` (versiuni installer). Setup MC devine `/app/platform/settings`.
- **Onboarding** rămâne unica cale pentru "client nou + licență + pachet + email". Butonul manual "add license" din admin/subscriptions dispare; se face doar prin wizard.

### Mutate în MC (aceeași funcționalitate, doar shell-ul se schimbă)
- `admin/platform` heartbeat/installs → `/app/platform/installs`
- `admin/support` → `/app/platform/support` (view platform-wide, toate tenants)
- `admin/platform-admins` → `/app/platform/team`
- `admin/audit` (view platform-wide) → `/app/platform/audit`

### Scoase din MC
- `admin/platform` tiles landing → **șters** (sidebar-ul MC îl înlocuiește).
- Duplicat sidebar "Releases" vs "Setup" pe aceeași rută → **fixat**.
- Butonul "adaugă licență manual" din pagina veche subscriptions → **scos**, redirect la wizard.

### Backend: consolidare funcții (partea despre care ai spus data trecută)
- `onboardCustomer` devine singurul orchestrator (create tenant + issue license + generate package + email). Îl folosesc și seed-urile.
- `TIER_PRESETS` din `license-modules.ts` devine sursa unică; se elimină hardcodările duplicate din admin/subscriptions și admin/customers.
- Un singur `sendLicenseBundleEmail` (înlocuiește cele 2 variante actuale).

## 3. Sidebar MC final

```text
Mission Control
├── Growth
│   ├── Overview
│   ├── Onboarding
│   └── Clienți
├── Operations
│   ├── Licențe & Billing
│   ├── Instalări
│   ├── Releases
│   ├── Support
│   └── Doctor
└── System
    ├── Team
    ├── Audit log
    ├── Recovery
    └── Settings
```

## 4. Ordine de execuție (2 pași mari)

**Pas A — design unificat + mutări pure de shell (zero risc funcțional)**
- Mut pagini existente sub `/app/platform/*` cu wrapper `.mc-shell`.
- Redirect-uri de la vechile rute `/app/admin/{customers,companies,subscriptions,platform,platform-admins,support,audit}` → noile locuri, ca linkurile vechi să nu se rupă.
- Fix duplicatul Releases/Setup din sidebar.
- Șterg `admin/platform` tiles page.

**Pas B — consolidări reale**
- Merge Customers + Companies (un tabel + drawer cu tab-uri).
- Merge Licenses + Subscriptions (drawer cu tab Billing).
- Refactor backend: un singur `onboardCustomer`, un singur `TIER_PRESETS`, un singur email helper.
- Scot butoanele manuale duplicate, las doar wizard-ul.

## Ce NU atingem
- Modulele per-tenant (users, ai-audit, academy, sop-generator, knowledge-gaps, analytics, integrations, sso, webhooks, api-keys, email settings) — sunt pentru workspace admin, nu pentru MC. Rămân în `/app/admin/*` cu tema generală.
- Self-hosted (Windows) — separat, nu se atinge.
- Auth, RLS, migrations de bază de date.

Confirmi și încep cu Pasul A?
