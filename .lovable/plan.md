# Fix: "Cloud provider was reached inside a Self-Hosted build" after login

## Ce se întâmplă

Ecranul de eroare vine din stub-ul de build Self-Hosted (`src/lib/providers/stubs/cloud-stub.ts`). În build-ul Self-Hosted, orice import de `@/integrations/supabase/*` sau `@/lib/providers/cloud/*` este redirectat către un Proxy care aruncă la prima utilizare. Deci eroarea nu e o problemă de instalare sau de licență — e cod de UI care încă folosește direct clientul Cloud, fără gating pe modul de platformă.

Confirmat prin citirea codului:

- `src/lib/auth-context.tsx` importă static `supabase` și îl folosește în:
  - un `useEffect` care citește `companies` după ce sesiunea se încarcă (linia ~148) — aici apelul aruncă **sincron în render/effect**, deci nu e prins de niciun `catch` și ajunge direct în error boundary. Acesta este crash-ul pe care îl vezi imediat după autentificare.
  - `loadProfile()` (citire `companies`) și `setActiveCompanyId()` (`rpc("log_workspace_switch")`).
- Aceleași importuri directe există în componente montate de shell/root, deci vor rupe alte ecrane chiar și după fix-ul principal:
  - `src/components/app/notifications-bell.tsx`
  - `src/components/app/subscription-status-banner.tsx`
  - `src/components/app/subscription-access-gate.tsx` (montat pe `/app/chat`)
  - `src/components/support/support-widget.tsx`, `src/components/support/chat-glider.tsx` (montat în `__root.tsx`)
  - rute: `app.updates.tsx`, `app.organization.tsx`, `app.knowledge.tsx`, `app.faq.tsx`, `app.chat.$threadId.tsx`, `app.academy.lesson.$lessonId.tsx`

## Soluția

Regula: în Self-Hosted, niciun modul Cloud nu trebuie atins. Deci fiecare utilizare devine (a) gated pe `isCloud()`/capability și (b) importată dinamic, ca stub-ul să nu fie nici măcar evaluat.

### 1. `auth-context.tsx` (fix-ul crash-ului)
- Se elimină importul static al lui `supabase`.
- Numele companiei: pe Cloud se citește ca acum, dar prin `await import("@/integrations/supabase/client")` într-o funcție async; pe Self-Hosted se folosește numele tenantului local (instalarea e single-tenant) fără nicio interogare.
- `log_workspace_switch`: se apelează doar pe Cloud (workspace switching nu există în Self-Hosted).
- Ambele efecte primesc guard, ca nimic să nu arunce sincron în render.

### 2. Componente de shell
- `notifications-bell`, `subscription-status-banner`, `subscription-access-gate`: pe Self-Hosted nu se randează / se rezolvă cu „acces permis" fără fetch (licența locală decide accesul, nu abonamentul din Cloud). Pe Cloud, comportament neschimbat, cu import dinamic.
- `support-widget` / `chat-glider`: ascunse în Self-Hosted (suportul e o funcție a portalului Cloud), deci și importul Cloud dispare.

### 3. Rute `/app/*` care mai folosesc direct Cloud
`app.updates`, `app.organization`, `app.knowledge`, `app.faq`, `app.chat.$threadId`, `app.academy.lesson.$lessonId`: aceeași tratare — import dinamic + ramură Self-Hosted care merge prin server functions/repository-urile deja existente (`knowledge`, `faq`, `threads`, `messages` au deja provideri Pg), sau empty-state acolo unde funcția e Cloud-only.

### 4. Guardrail ca să nu reapară
`opsqai-windows/build/verify-source-imports.mjs` deja blochează importuri directe de SDK Cloud; se extinde allowlist-ul strict la modulele rămase permise și se adaugă la listă fiecare fișier reparat, astfel încât un nou `import { supabase } from "@/integrations/supabase/client"` să rupă build-ul Self-Hosted în CI, nu în producție la client.

## Detalii tehnice

- Gating se face cu `isCloud()` / `isSelfHosted()` din `@/lib/platform` (deja existente și cache-uite la boot pe baza `window.__OPSQAI_MODE__`).
- Regula de aur: `if (!isCloud()) return;` **înainte** de `await import(...)`, nu după.
- Nu se atinge `verify-bundle.mjs` și nu se relaxează niciun guardrail.
- După merge e nevoie de un build nou de installer pentru ca fix-ul să ajungă în aplicația instalată.

## Definition of Done

- Login Self-Hosted → `/app` → chat se încarcă fără error boundary.
- Zero apariții ale mesajului stub în consola desktop shell-ului.
- `verify-source-imports` și `verify-bundle` trec pe build-ul Self-Hosted.
- Cloud (opsqai.de) rămâne funcțional identic: workspace switch, notificări, banner abonament, suport.
