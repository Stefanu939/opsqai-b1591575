# MC Cloud — Redesign complet (Violet/Indigo Dark) + Restrângere la funcțiile din PDF

Aplic **doar pe Cloud MC** (`/app/platform/*` și `/app/admin/*`). Zero atingere pe self-hosted (`opsqai-windows/*`, `installer/*`, `src/routes/demo/*`, `src/components/app/*` care e user app).

## 1. Paleta nouă (Violet Noir) — înlocuiește Noir & Gold & Blue concepts complet

Rescriu tokenii `--mc-*` din `src/styles.css`:

```
--mc-bg          #0a0a1a   (aproape negru cu tentă indigo)
--mc-surface-1   #12122a   (carduri)
--mc-surface-2   #1a1a3d   (hover/active)
--mc-surface-3   #23234d   (elevated)
--mc-violet      #7c5cff   (accent principal — buton primary, active nav)
--mc-violet-glow #a78bfa   (highlight, iconuri active)
--mc-cyan        #22d3ee   (accent secundar — sparklines, deltas pozitive)
--mc-magenta     #ec4899   (accent terțiar — alerte soft)
--mc-line        rgba(124,92,255,0.14)
--mc-line-strong rgba(124,92,255,0.28)
--mc-fg          #e8e8ff
--mc-fg-muted    #9a9ac8
--mc-fg-dim      #6666a0
--mc-success     #34d399
--mc-warning     #fbbf24
--mc-danger      #f87171
```

Elimin toate referințele `--mc-gold*` din componente (search & replace) — le mapez pe `--mc-violet*`. Șterg `mc-gold-text`, o redenumesc `mc-accent-text`.

Fonts: păstrez **Urbanist + Epilogue** (rămân "enterprise, nu cheap").

## 2. Meniu MC redus la ce spune PDF-ul

Restructurez `AppSidebar.tsx` să afișeze **DOAR**:

```
DASHBOARD
  Overview            (redesign complet — vezi §3)

COMPANIES
  Companies           (fuzionează Customers + Licenses + Releases  + subscription +release management + module -catalog , într-un singur ecran)

COMMERCIAL
  Billing             (wizard nou — vezi §5)
  Support Inbox       (WhatsApp premium — vezi §4)

INTELLIGENCE
  Audit AI            (health scoring firme — vezi §6)

OPERATIONS
  Recovery & Maintenance   (combinate — vezi §7)

SYSTEM
  Platform Administration  (organigramă + governance — vezi §8)
```

Restul rutelor (`/app/admin/installations`, `/contacts`, `/monitoring`, `/downloads`, `/platform-admins`, `/customers`, `/setup`, `/doctor`, `/recovery` separat) **rămân în cod și accesibile prin URL direct**, dar dispar din meniu. Nu șterg fișierele.

## 3. Dashboard nou (`/app/platform/overview`)

Layout inspirat din poza atașată:

- **Header**: "Salut, {nume}" + eyebrow "Mission Control · {data}"
- **Row 1 — 4 KPI cards** cu sparklines: MRR, Active Subscriptions, Companies at Risk, Pending Updates
- **Row 2 — Chart mare stânga** (area chart MRR 12 luni, gradient violet→cyan) + **Donut dreapta** (% subscripții healthy vs at-risk)
- **Row 3 — 3 coloane**:
  - "Puncte pe ordinea de zi" (task list azi)
  - "Firma care are nevoie de update" (top 3 clienți fără ultima versiune)
  - "AI Suggestions" (audit-generated, cu iconițe și severity)
- **Row 4** — activity feed subscripții-problemă

Date mock deocamdată (nu ating backend-ul acum).

## 4. Support Inbox — WhatsApp premium

Rescriu `/app/admin/support`:

- Layout 3 coloane: **listă conversații** (stânga, avatar + last message + unread badge) | **thread activ** (mijloc, bule cu tail, timestamps discrete, tick-uri) | **panel client** (dreapta: company info, plan, quick actions)
- Bule assistant fără background (per instrucțiuni chat-ui), bule user cu `--mc-violet` fill
- Composer jos cu attach + emoji + send
- Search global sus, filtre "Unread / Assigned to me / All"

## 5. Billing wizard (ecran flagship)

`/app/admin/billing` — wizard 4 pași:

1. **Select company** (autocomplete)
2. **Base package**: card mare "OPSQAI Self-Hosted · €15,000 one-time" (toggle include/exclude)
3. **Maintenance slider**: 0 → 500 €/lună, cu preview live pe 12 luni
4. **Modules**: grid de module (Warehouse AI, Academy, Analytics etc.), fiecare cu **slider individual 500 → 2000 €/lună** sau input numeric
5. **Rezumat 12 luni**: total, breakdown, buton "Emit contract & subscription"

Persistenta: `platform_billing_quotes` table (Cloud) — schemă nouă. Vizibil pentru toți userii MC (owner → sales agent).

## 6. Audit AI (`/app/platform/audit-ai` — rută nouă)

- Grid firme cu **health score 0-100** (donut mic per rând)
- Detaliu firmă: chart heartbeat, pie chart plăți (paid/late/unpaid), sugestii AI ("Client X — 2 payments late, offer retention discount")
- Filter: at-risk / healthy / churned

## 7. Recovery & Maintenance combinat (`/app/platform/ops`)

Un singur ecran cu 2 tab-uri:

- **Maintenance**: ferestre programate, expirări licențe, renewals
- **Recovery**: bootstrap tokens, disaster recovery keys, restore packages

## 8. Platform Administration — Organigramă

`/app/admin/platform` rescris:

- **Organigramă vizuală** de sus în jos: Owner → Superadmin → Admin → Sales Agent
- Fiecare nod: avatar + nume + rol, click deschide detail panel
- Buton "Add person" → modal cu rol picker
- Governance: matrice permisiuni per rol (read/write pe module)

## 9. Chrome global MC

- **Topbar dreapta**: profile avatar (upload poză), 🔔 notifications bell, language switcher **RO / DE / EN**, sign-out button
- **Bottom bar**: "Recent modules" — ultimele 5 module vizitate, chip-uri clicabile
- **Sidebar stânga**: rămâne colapsabilă; când modul e activ, sidebar se blend-uiește (opacity 0.6 până la hover)
- Traducere aplicație: extind `src/i18n/*` pentru toate stringurile MC noi

## 10. Detalii tehnice

- Fișiere modificate principale:
  - `src/styles.css` — tokeni violet
  - `src/components/platform/AppSidebar.tsx` — meniu redus
  - `src/components/platform/PlatformTopbar.tsx` — bell + profile + lang
  - `src/routes/_authenticated/app.platform.overview.tsx` — dashboard nou
  - `src/routes/_authenticated/app.admin.support.tsx` — inbox WhatsApp
  - `src/routes/_authenticated/app.admin.billing.tsx` — wizard
  - `src/routes/_authenticated/app.admin.platform.tsx` — organigramă
  - Rute noi: `app.platform.audit-ai.tsx`, `app.platform.ops.tsx`, `app.platform.companies.tsx` (fuzionare)
- Zero migrations noi acum — folosesc date mock pentru dashboard/audit. Billing wizard va cere schema `platform_billing_quotes` — o adaug într-un al doilea pas dacă confirmi.
- Nu ating: `opsqai-windows/*`, `installer/*`, self-hosted routes, demo.
- i18n: adaug `mc.` namespace nou cu 3 limbi.

## Livrare

Împart în 2 turnee de implementare ca să văd progresul:

1. **Turn 1** (acum): paletă violet aplicată global + sidebar redus + Overview redesignat + topbar chrome (profile/bell/lang/signout) + bottom recent modules.
2. **Turn 2** (după validare vizuală): Billing wizard + Support inbox + Audit AI + Recovery+Maintenance + Organigramă.

Confirmă și pornesc **Turn 1** — sau spune-mi să merg tot dintr-o dată.