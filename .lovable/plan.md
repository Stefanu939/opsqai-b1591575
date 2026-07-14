# Plan — Companies rewire + purge module vechi + palette cleanup

## 1. Companies → Open (per-client view)

Butonul **Open** din `app.platform.customers.tsx` navighează acum la `/app/admin/users` (ecran vechi). Îl rewire-uim:

- Open → `/app/platform/licenses?companyId=<id>&tab=licenses`
- `app.platform.licenses.tsx`:
  - Extindem `validateSearch` cu `companyId?: string`.
  - Header cu breadcrumb „Companies › {nume} · Back".
  - Filtrăm licențele după `companyId`.
  - Tabs regrupate: **Licenses** · **Bundle Release** (nou — grupăm `exportActivationBundle`, `exportRevocationList`, `getLicensePublicKey`, `issueBootstrapToken`) · **Billing**.
  - Toate acțiunile existente în `licenses.functions.ts` sunt expuse aici: issue install, issue module, revoke, transfer ownership, export bundle, export CRL, bootstrap token.

## 2. Companies → Client nou → Onboarding

Butonul „Client nou" din `app.platform.customers.tsx` navighează la `/app/platform/billing`.

- În `app.platform.billing.tsx`, sus, CTA vizibil: **„+ Adaugă firmă nouă"** → `/app/platform/onboarding`.
- După wizard, revenire în billing cu firma preselectată pentru configurare pachet.

## 3. Purge module vechi accesibile

Ecrane MC vechi care încă pot fi accesate direct prin URL (`/app/admin/*`) și trebuie eliminate din traseul MC:

- `/app/admin/users` — nu mai e destinația Open; redirect → `/app/platform/customers`.
- `/app/admin/companies` — deja redirect (OK).
- Verificăm în `AppSidebar.tsx`, `RecentModulesBar.tsx`, breadcrumbs și orice `navigate({ to: "/app/admin/..." })` din codul MC — orice link rămas către ecrane vechi devine fie redirect către echivalentul `/app/platform/*`, fie e șters.
- Rulez `rg "/app/admin/" src/components/platform src/routes/_authenticated/app.platform.*.tsx` și șterg toate referințele; înlocuiesc cu rutele noi (customers, licenses, billing, support, audit, ops, administration).

Ecranele `/app/admin/*` rămân în cod (pentru self-hosted / build separat), dar **nu mai sunt navigabile din shell-ul MC**.

## 4. Purge paletă veche (auriu + albastru vechi)

| Vechi | Nou |
|---|---|
| `#c9a84c` `#d4b458` `#a48633` `#a88a35` `#f0d78c` | `var(--mc-gold)` (=violet `#7c5cff`) / `#a78bfa` |
| gradient `from-[#d4b458] to-[#a48633]` (butoane onboarding — vizibil în screenshot pe „Continuă la module") | `from-[var(--mc-gold)] to-[#5b3fd9]` |
| `#0d0d0d` text pe gold | `#0a0a1a` |
| `#f5f0e0` / `#1a1a1a` (tooltip) | `var(--mc-fg)` / `var(--mc-surface-2)` |
| `#6a7db3` `#8fbf7a` (chart plans vechi) | `#7c5cff` / `#22d3ee` |

Fișiere afectate:
- `src/routes/_authenticated/app.platform.onboarding.tsx` (8 ocurențe — inclusiv butonul din screenshot)
- `src/routes/_authenticated/app.platform.licenses.tsx` (1)
- `src/routes/_authenticated/app.platform.customers.tsx` (3)
- `src/routes/_authenticated/app.platform.overview.tsx` (4)
- `src/components/platform/KpiCard.tsx` (4)

`#f59e0b` (warning amber) rămâne — semnalizare status, nu paletă principală.

## 5. Verificare

- `bunx tsgo --noEmit`
- Playwright screenshot pe `/app/platform/onboarding`, `/app/platform/licenses?companyId=…`, `/app/platform/billing` — verific că nu mai apare auriu și că fluxul Companies → Open → Licenses / Companies → Client nou → Onboarding funcționează.

## Fișiere modificate

- `src/routes/_authenticated/app.platform.customers.tsx` (rewire Open + Client nou + palette)
- `src/routes/_authenticated/app.platform.licenses.tsx` (companyId filter, breadcrumb, tab Bundle Release, palette)
- `src/routes/_authenticated/app.platform.billing.tsx` (CTA Adaugă firmă nouă)
- `src/routes/_authenticated/app.platform.onboarding.tsx` (palette purge complet)
- `src/routes/_authenticated/app.platform.overview.tsx` (palette purge chart)
- `src/components/platform/KpiCard.tsx` (palette purge chart)
- `src/routes/_authenticated/app.admin.users.tsx` (transform în redirect → `/app/platform/customers`)
- Orice link rămas către `/app/admin/*` în `src/components/platform/*` și `src/routes/_authenticated/app.platform.*.tsx`

Nu ating: tokenii din `src/styles.css` (deja violet), rutele `/app/admin/*` folosite de self-hosted în afara traseului MC.
