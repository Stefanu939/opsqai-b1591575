# Mission Control — Onboarding premium & shell navigabil

## Direcție vizuală (locked)

- **Paletă Noir & Gold**: fundal `#0d0d0d`, suprafețe `#1a1a1a`/`#242424`, accent auriu `#c9a84c`, glow `#f0d78c`. Text primar off-white `#f5f0e0`, muted `#8a8578`.
- **Tipografie**: Urbanist (headings, tracking strâns, uppercase pentru labels) + Epilogue (body, tabular numerals pentru cifre).
- **Densitate 5 (Bloomberg-style)**: multe carduri simultan, grid-uri 3–4 coloane, sparklines inline, tabele compacte, KPI-uri stacked. Fără spații mari goale.
- **Efecte premium**:
  - Butoane cu shadow dublu (`0 1px 0 rgba(255,255,255,.05) inset, 0 8px 24px -8px rgba(201,168,76,.45)`).
  - Carduri cu border `1px solid rgba(201,168,76,.15)`, hover ridicat `translateY(-2px)` + glow auriu.
  - Hover popovers (shadcn HoverCard) pe fiecare KPI, buton acțiune și rând din tabel — arată context (definiție, sursă, trend, quick actions).
  - Gradient hairline auriu deasupra cardurilor importante.
  - Micro-animații fade-in + scale-in la mount.

Tokens noi în `src/styles.css` (`--gold`, `--gold-glow`, `--surface-1/2/3`, `--shadow-premium`, `--shadow-gold`, `--gradient-gold`) + variante `premium` pe Button și Card.

## Shell MC navigabil

Refactor `src/routes/_authenticated/app.platform.tsx` (layout) → sidebar premium fix + topbar.

```text
┌─ TOPBAR ─────────────────────────────────────────────────┐
│ [OPSQAI] search…   env·prod   ⌘K   notif  user ▾         │
├──────────┬───────────────────────────────────────────────┤
│ SIDEBAR  │  Breadcrumb › Platform › Onboarding           │
│          │                                               │
│ Overview │  <Outlet />                                   │
│ Onboard  │                                               │
│ Clients  │                                               │
│ Licenses │                                               │
│ Orders   │                                               │
│ Releases │                                               │
│ Installs │                                               │
│ Billing  │                                               │
│ Settings │                                               │
└──────────┴───────────────────────────────────────────────┘
```

- `AppSidebar` premium: collapsible icon-only, secțiuni grupate (Growth / Operations / System), badge auriu pe item activ, hover reveal descriere.
- Topbar: căutare globală ⌘K (stub), selector environment, avatar cu meniu.
- Breadcrumb auto din matches TanStack Router.

## `/app/platform/overview` — dashboard premium

Ecran nou dens, cu carduri și charts (nu doar linii):

- **4 KPI carduri sus** (Recharts sparkline embed): MRR, Licențe active, Instalări self-hosted online, Trials expirând. Fiecare cu HoverCard: definiție + comparație lună precedentă.
- **Row 2**: 
  - `AreaChart` gradient auriu — evoluție licențe pe tier (basic/pro/enterprise stack).
  - `RadialBarChart` — mix pe tier (%).
  - `BarChart` — instalări noi/săptămână.
- **Row 3**:
  - Tabel compact "Ultimele onboarding-uri" (7 rânduri, hover row → quick actions popover).
  - Card "Heartbeat health" — donut + listă instalări offline.
  - Card "Releases live" — versiune curentă + linkuri.

## `/app/platform/onboarding` — Wizard 4 pași (premium)

Reia planul aprobat, îmbrăcat premium:

- **Layout**: stepper orizontal sus (4 pin-uri aurii cu tick), card mare central (`surface-2`), sidebar rezumat live dreapta (client, tier, module, seats, preț estimat).
- **Step 1 — Client & tier**: form dens, radio-card pentru tier (3 carduri side-by-side cu iconă, preț, module incluse listate cu ✓, hover → tooltip module description).
- **Step 2 — Add-ons**: matrice module (checkbox-cards grid 3 col), fiecare cu hover popover (ce face modulul, dependințe).
- **Step 3 — Emitere**: progress bar auriu cu 3 sub-taskuri (Issue license → Generate package → Sign bundle), fiecare cu spinner/tick.
- **Step 4 — Livrare**: card cu preview email, buton "Trimite email" (shadow premium), fallback "Copiază link + PIN" cu HoverCard explicativ.

## Server (fără schimbări backend majore)

- `src/lib/onboarding.functions.ts` — `onboardCustomer` compune `issueLicense` + `generateInstallationPackage` (fără rollback pe generation fail).
- `src/lib/license-modules.ts` — `TIER_PRESETS` (Basic/Pro/Enterprise → module + seats + 12 luni).
- Query nou pentru overview: `getPlatformOverviewStats` (KPI + serii timeline agregate din `licenses`, `license_installs`, `license_orders`).

## Fișiere atinse

**Noi**
- `src/routes/_authenticated/app.platform.overview.tsx`
- `src/routes/_authenticated/app.platform.onboarding.tsx`
- `src/components/platform/AppSidebar.tsx`
- `src/components/platform/PlatformTopbar.tsx`
- `src/components/platform/KpiCard.tsx`, `PremiumCard.tsx`, `SparkChart.tsx`
- `src/components/platform/onboarding/{Stepper,Step1Client,Step2Addons,Step3Emit,Step4Deliver,SummaryRail}.tsx`
- `src/lib/onboarding.functions.ts`
- `src/lib/platform-overview.functions.ts`
- `src/lib/license-modules.ts` (constante TIER_PRESETS)

**Modificate**
- `src/styles.css` — tokens Noir & Gold, `@theme inline` mapping, utilities `.shadow-premium`, `.shadow-gold`, `.gradient-gold`, `.hairline-gold`.
- `src/routes/__root.tsx` — link Google Fonts Urbanist + Epilogue.
- `src/routes/_authenticated/app.platform.tsx` — shell nou cu sidebar + topbar.
- `src/routes/_authenticated/app.platform.licenses.tsx` — buton primar "Onboard client nou" → `/app/platform/onboarding`.
- `src/components/ui/button.tsx`, `card.tsx` — variantă `premium`.

## Ce NU face acest plan

- Nu schimbă backend-ul de licențiere / bundle signing.
- Nu atinge portalul client sau self-hosted UI.
- Nu implementează ⌘K funcțional (doar shell vizual).
- Nu adaugă billing/facturare — doar item în sidebar (disabled/coming soon).

Confirmi și trec pe build?
