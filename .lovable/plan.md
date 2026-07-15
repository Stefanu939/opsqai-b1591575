
# Preview Self-Hosted pe Management Center

Deblocare `/app/*` pe cloud (`OPSQAI_MODE=mc`) doar pentru `platform_owner` + `platform_admin`, cu o organizație-demo seed în DB. Clienții rămân blocați exact ca acum.

## 1. Gate-ul pe `/app/*` (frontend)

Fișier: `src/routes/_authenticated/app.tsx`

Comportamentul curent: pe MC → redirect necondiționat la `/windows-only`.

Comportamentul nou pe MC:
1. Dacă user-ul nu e autentificat → deja gestionat de layout-ul `_authenticated`.
2. Citește rolurile din `user_roles`.
3. Dacă `platform_owner` sau `platform_admin` → lasă să treacă și setează în context `staff_preview: true`.
4. Altfel (client / member / manager / guest) → redirect la `/windows-only` (comportament actual, neschimbat pentru clienți).

Pe self-host (`OPSQAI_MODE=selfhost`) nimic nu se schimbă — toți utilizatorii intră normal.

## 2. Banner vizibil de mod preview

Componentă nouă `src/components/app/staff-preview-banner.tsx`, montată în `app-shell.tsx` doar când `staff_preview === true`. Text scurt, culoare de avertisment din tokenii MC (Noir/Gold):

> **STAFF PREVIEW — Demo Sandbox.** You are viewing the Self-Hosted product from the Management Center. Data here is demo-only. Customers cannot see this view.

Rol: elimină riscul ca un staff să creadă că vede date reale de client.

## 3. Server-side hardening

Toate `createServerFn` care servesc modulele Self-Hosted (chat, knowledge, faq, academy, audit, users, org, subscription) trebuie să accepte apeluri de la staff pe MC **doar pentru organizația demo**. Trei modificări:

- Un helper nou `src/lib/staff-preview.server.ts`:
  - `isStaffPreviewCaller(context)` — verifică `has_role(auth.uid(), 'platform_admin')` sau `platform_owner`.
  - `getDemoOrgId()` — citește `demo_org_id` din tabelul nou `platform_config` (vezi §4).
- Elimină `assertMode('selfhost')` acolo unde blochează staff-ul pe MC și înlocuiește cu:
  ```
  if (mode === 'mc' && !(await isStaffPreviewCaller(context))) throw ModeAssertionError
  ```
- Pentru staff pe MC, forțează `organization_id = demoOrgId` la citiri/scrieri prin RLS. Datele reale ale clienților nu există oricum pe cloud (AD-009), dar previne accidente dacă în viitor cineva pune ceva sensibil în DB.

## 4. Organizația-demo (seed)

Migrare nouă: `supabase/migrations/*_staff_preview_demo_org.sql`
- Inserează un rând în `organizations` cu id fix (constant `DEMO_ORG_ID` în cod), name = "OPSQAI Demo Company".
- Inserează în `platform_config`: `demo_org_id`.
- Seed determinist (INSERT în aceeași migrație, conform regulii proiectului — fără server-fn de seed):
  - 3 documente knowledge base cu conținut fictiv despre o companie manufacturing generică.
  - 10 FAQ-uri.
  - 1 curs Academy cu 2 lecții.
  - 1 thread AI Chat cu 2 mesaje de exemplu.
  - Câțiva "useri" fictivi în tabela care ține membership-uri pe org (fără `auth.users` reali — doar rânduri pentru display).
- Nu se inserează nicio licență reală. `subscription` afișează un mock "Demo — nu se aplică billing".

RLS: policies existente rămân. Staff-ul MC accesează org-ul demo pentru că `has_role('platform_admin')` va fi adăugat ca ramură de acces în policy-urile modulelor SH, `AND organization_id = demoOrgId`.

## 5. Chat AI pe demo

Endpoint-ul `src/routes/api/chat.ts` folosește deja Lovable AI Gateway. Nu se schimbă — merge nativ pe cloud.

## 6. Ce NU se atinge

- `/portal/*` (Customer Portal) — clientul continuă să intre acolo pe cloud.
- `/management/*` — neschimbat.
- Instalările Windows reale ale clienților — nu se conectează la MC pentru asta (rămâne AD-009).
- Rolurile clienților (member/manager/admin/guest) — nu primesc niciun acces nou.

## Tehnic — fișiere atinse

```text
src/routes/_authenticated/app.tsx           ← noul gate cu ramură staff
src/components/app/app-shell.tsx            ← montează banner-ul
src/components/app/staff-preview-banner.tsx ← nou
src/lib/staff-preview.server.ts             ← nou (isStaffPreviewCaller, getDemoOrgId)
src/lib/deployment-mode.server.ts           ← assertMode acceptă bypass staff
src/lib/{chat,knowledge,faq,academy,audit,users,organization,subscription}
  .functions.ts                             ← ramură staff-preview pe MC → demoOrgId
supabase/migrations/*_staff_preview.sql     ← platform_config.demo_org_id + seed
```

Testare:
- Login ca `platform_admin` pe opsqai.de → `/app` deschide UI-ul Self-Hosted cu banner și date demo.
- Login ca client normal pe opsqai.de → `/app` redirectează la `/windows-only` (regresie zero).
- Pe build self-host → `/app` merge exact ca înainte, fără banner.

## În afara scope-ului

- Un rol nou dedicat (`staff_preview`) — folosim rolurile existente.
- Editarea datelor demo dintr-un UI dedicat (staff poate deja edita direct în MC dacă e nevoie).
- Multiplu tenant demo (o singură companie demo, suficientă pentru sales/QA).
