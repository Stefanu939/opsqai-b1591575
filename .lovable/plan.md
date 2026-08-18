# Basic modules always available in Self-Hosted

## Problema (verificată în cod)

În build-ul Self-Hosted, modulele Basic (AI Chat, Knowledge, FAQ, Academy, AI Audit, Knowledge Gaps, Notifications, Bilingual UI, PWA) sunt tratate ca fiind blocate până când există o licență de instalare activată local:

- `src/lib/license-enforcement.server.ts` → `evaluateModuleAccess()` returnează `no_install_license` și oprește TOT (inclusiv Basic) când nu găsește un rând `install`. În Self-Hosted rândurile vin din `selfHostLicenseRows()`, care returnează listă goală când `entitlements().installId` este `null` (instalare fără licență, sau verificare eșuată).
- Efect: apelurile server pentru Academy (`academy.functions.ts`, `academy-lms.functions.ts`, `api/academy-chat.ts`) și Export dau 403 `license_denied`, iar ecranele apar goale.
- `src/lib/module-access.functions.ts` → `getMyModuleAccess` returnează `modules: []` când utilizatorul nu are `company_id`, deci nav-ul și gating-ul per-user se pot restrânge la zero în instalări on-prem.
- Partea de client e deja corectă: `effectiveModules()` adaugă mereu `BASIC_MODULES`, deci sidebar-ul afișează item-ele Basic — dar acțiunile din spate sunt refuzate, ceea ce arată exact ca „nu apar".
- Cardurile noi de dashboard (`getManagementOverview`) rulează într-un singur `Promise.all`; dacă rezolvarea companiei sau licența eșuează pe on-prem, întreaga interogare cade și blocul rămâne în skeleton.

## Ce se schimbă

1. **Basic = inclus prin definiție, nu prin licență (Self-Hosted).**
   - `evaluateModuleAccess()`: modulele din `BASIC_MODULES` se evaluează înainte de verificarea rândului `install` — sunt permise chiar și fără licență de instalare, revocare sau expirare. Add-on-urile rămân strict gated (nicio relaxare pentru module plătite).
   - `selfHostLicenseRows()`: când nu există `installId`, se întoarce un rând `install` sintetic „community" (nerevocat, fără expirare) ca să nu mai existe starea „totul blocat".
   - Rezultat: Academy, Chat, Knowledge, FAQ, Knowledge Gaps, AI Audit, notificări funcționează imediat după instalare, offline, fără bundle de activare.

2. **Acces per-user fără companie.**
   - `getMyModuleAccess` (și `resolveModuleAccessForUser` unde e relevant) returnează presetul de rol intersectat cu modulele licențiate în loc de `[]` când nu se poate rezolva compania — astfel Basic rămâne vizibil pe on-prem.

3. **Dashboard „management overview" robust pe Self-Hosted.**
   - Fiecare sursă (seats/licență, doctor, snapshots, integrări, repos) se izolează, ca o eroare de licență să nu golească tot cardul.
   - Când nu există limită de seats (community), cardul „User capacity" arată doar utilizatorii activi, fără procent inventat; maintenance rămâne „Not scheduled"/„Unknown" onest.

4. **Verificare pe module Basic în UI.**
   - Se confirmă că fiecare item Basic din sidebar (`src/components/app/app-shell.tsx`) are rută existentă și se încarcă în modul `selfhost`: `/app/chat`, `/app/knowledge`, `/app/faq`, `/app/gaps`, `/app/academy`, `/app/audit`, `/app/calendar`, `/app`.
   - Pagina `/app/modules` marchează explicit modulele Basic ca „Included" (nu „Locked"), iar panoul de activare licență rămâne pentru add-on-uri.

## Ce NU se schimbă

- Modulele plătite (analytics, compliance_center, rbac, ai_sop_generator, sop_versioning, reports etc.) rămân blocate fără token de modul semnat.
- Nicio relaxare a verificării Ed25519/JWT a licențelor și niciun ocol al `verify-bundle` / guardrail-urilor de migrare.
- Management Center și Customer Portal nu sunt atinse.

## Detalii tehnice

Fișiere atinse:
- `src/lib/license-enforcement.server.ts` — Basic-first în `evaluateModuleAccess`, rând `install` community în `selfHostLicenseRows`, teste unitare noi pentru „Basic fără licență = permis" și „add-on fără licență = refuzat".
- `src/lib/module-access.server.ts` / `src/lib/module-access.functions.ts` — fallback fără companie.
- `src/lib/dashboard.functions.ts` — izolare per-sursă în `getManagementOverview`.
- `src/components/dashboard/management-overview.tsx` — degradare grațioasă când lipsesc seats/maintenance.
- `src/routes/_authenticated/app.modules.tsx` — badge „Included in Basic".

La final: `tsgo` curat + rularea testelor de enforcement.
