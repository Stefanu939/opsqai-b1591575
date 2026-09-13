# Readuc funcțiile Core lipsă în Self-Hosted (Dashboard, Operations, Users, Organization)

## Ce s-a întâmplat

Meniul Self-Hosted afișează acum doar: AI Chat, Calendar, Knowledge, FAQ, Knowledge Gaps, Academy, AI Audit, Updates, License & Entitlements.

Lipsesc exact funcțiile Core care nu fac parte din vechea listă „Basic”:
- Dashboard (management overview)
- Operations
- Users
- Organization

Cauza confirmată din cod: licența instalării nu conține încă lista de funcții Core (`core_capabilities`). În acest caz codul cade pe o listă istorică scurtă („legacy included”: chat, kb, faq, academy, audit_log, notifications, knowledge_gaps, bilingual_ui, pwa) — exact ce se vede în captura ta. Restul funcțiilor Core sunt tratate greșit ca nelicențiate și meniul le ascunde.

Asta contrazice regula stabilită: toate funcțiile Core există mereu, nu se cumpără și nu se activează separat.

## Ce voi face

1. Licență fără listă Core (instalări existente): în loc de lista istorică scurtă, se consideră disponibile toate funcțiile Core canonice. Astfel Dashboard, Operations, Users și Organization reapar imediat, fără reemitere de licență.
2. Funcțiile Core devin nenegociabile în verificarea de licență: o funcție Core este mereu disponibilă, inclusiv când licența este expirată/revocată (atunci produsele plătite rămân blocate, Core nu). Doar Produsele (Transport, HR etc.) și add-on-urile rămân controlate de licență.
3. „Users”: rămâne condiționat de drepturile utilizatorului, dar se adaugă și dreptul de citire a utilizatorilor / rolurile de administrator, ca un admin de workspace să nu îl piardă din meniu.
4. Aceeași regulă și pe server (rezolvarea modulelor licențiate folosește aceeași funcție), deci accesul direct pe URL rămâne consecvent cu meniul.
5. Teste de regresie: o licență fără `core_capabilities` și una expirată trebuie să păstreze toate funcțiile Core; produsele rămân blocate.
6. Verificare în aplicație: intru autenticat pe `/app` și confirm în captură că cele patru intrări sunt din nou în meniu; apoi rulez typecheck, teste și build.

## Detalii tehnice

- `effectiveModules()` în `src/lib/license-modules.ts`: fallback-ul pentru `coreCapabilities == null` devine setul canonic `CORE_CAPABILITY_KEYS` (mapat pe cheile legacy `ModuleKey`), nu `LEGACY_INCLUDED_MODULE_KEYS`; capabilitățile incluse derivate rămân adăugate automat.
- `hasModule()` în `src/lib/license.tsx`: `true` pentru orice cheie clasificată Core (`classifyLegacy(key) === "core"`), înaintea verificărilor `revoked` / `modules`.
- `src/components/app/app-shell.tsx`: itemul Users primește `hasAnyPermission("user.read", "user.create", "user.update", "user.delete", "rbac.manage")`; restul structurii de meniu rămâne neschimbată.
- `getLicensedModules()` din `src/lib/module-access.server.ts` folosește deja `effectiveModules`, deci se aliniază automat.
- Test nou/extins în `src/lib/__tests__/core-entitlements.test.ts`.
- Fără migrație de bază de date și fără schimbări de design.
