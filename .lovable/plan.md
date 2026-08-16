# Self-Hosted — AI Audit intelligence, Academy chat stability, runtime JWT licensing

Scope: Self-Hosted `/app/*` (AI Audit, Academy lesson chat, Knowledge Gaps, licensing surface) plus the shared module catalog and server-side enforcement. No Cloud/MC redesign, no AI-provider or installer changes, no reinstall for module upgrades.

## 1. AI Audit — health check, compliance, KPIs

The audit report already produces categories, statuses, risk, risk matrix, compliance readiness, KPIs and findings. The UI consumes it as the single source of truth — no thresholds or scores recomputed in components.

- **Health Check panel** — all 10 categories, worst-first, bar/radial view with name, score, status, risk. Clicking a category opens its findings and recommendations.
- **Compliance readiness panel** — ISO 9001, ISO 27001, ISO 45001, GDPR, EU AI Act with readiness %, progress bar, status, missing-item count; row click opens a detail sheet (missing item, affected category, impact, recommendation, priority).
- **KPI strip** — knowledge coverage, SOP coverage, training completion, AI readiness, document freshness, adoption. Deltas only when the report supplies history; never invented.
- **Maturity trend** — kept as-is (historical context next to current health).

Semantic design tokens only; light and dark verified.

## 2. Executive summary — structured drill-down

- Passed / Warnings / Critical become clickable cards showing count, short status and at most 3 inline previews (`MAX_INLINE_FINDINGS = 3`). Above that: first 3 plus "View all N". Warnings above 5 and critical above 10 are never dumped inline — the full list lives only in the detail sheet.
- Detail sheet per severity: title, description, affected category, impact, risk, recommendation, priority, evidence when available.
- The summary paragraph becomes a collapsible block with expandable Strengths / Opportunities / Priority Actions rows, using the report's existing wording — no second AI summary generated for the UI.

## 3. Recommendations — actionable remediation

`audit-recommendations.ts` gains `actionType` (`sop | faq | course | course_assignment | manual`), `sourceGapId`, and `suggestedSop` / `suggestedFaq` / `suggestedCourse` payloads, additively so existing consumers keep working. Card titles become concrete ("Create SOP: Warehouse Incident Escalation", "Add FAQ: How are damaged goods documented?") instead of generic advice.

Actions per card:

- **SOP → Generate automatically**: same permission as manual SOP publish; grounded in the source gap questions plus relevant existing KB content; reuses `generateSop` + `publishGeneratedSop`; goes through the existing chunk/embed/index pipeline; stores AI-origin metadata (generatedBy, timestamp, recommendation id, gap id) and links back to the gap.
- **FAQ → Generate automatically**: same permission as manual FAQ editing; answer grounded strictly in existing KB content (no unsupported facts); existing FAQ upsert path; same AI-origin metadata and gap link.
- **Course / assignment → Create in Academy**: opens the existing Academy creation flow pre-filled with title, format, difficulty, duration. No bypass of Academy permissions.
- **Generate all** (panel header): sequential, never parallel AI generation, per-item state (queued / generating / publishing / indexing / completed / failed / skipped), continues after failures, final summary with "Retry failed" and "View generated items", permission checked per item.

**Gap lifecycle**: `open → in_progress → pending_validation → resolved`. Requesting generation never resolves a gap. Only successful create + publish + index + link moves it to `pending_validation`; confirmation moves it to `resolved`. Failures keep the gap unresolved and retryable.

**Traceability** stored where supported: recommendationId, sourceGapId, generatedEntityType/Id, generatedBy, generatedAt, generationStatus, reviewStatus — so a future audit can follow finding → recommendation → gap → generated content → published → indexed → resolved.

## 4. Academy lesson chat — stable transport

Confirmed cause: the lesson page rebuilds the chat transport whenever the learner picks a language, so `useChat` receives a new transport around streaming and the composer stays disabled.

- Exactly one transport per lesson lifecycle; the selected language is read from a ref at send time and is not a transport dependency.
- The composer is disabled only while a request/stream is genuinely active.
- Watchdog on `streamStartedAt` / `lastChunkAt`: only chunk inactivity (not total elapsed time) unblocks the UI, cleans up the stale stream and shows retry. Slow-but-active streams are never interrupted.
- The "pick a language" `alert()` becomes the standard toast.
- On teacher-stream failure the original message, lesson context and language are retained and retry does not require retyping.

## 5. Module catalog — Knowledge Gaps in Basic

`knowledge_gaps` moves into the Basic bundle, is removed from the paid add-on presets, and the catalog version is bumped. Every install with a valid Basic entitlement reaches Knowledge Gaps in UI and server checks; existing installs migrate safely onto the new catalog version.

## 6. JWT licensing — end to end

Licenses are signed JWTs issued by the Management Center and verified locally by Self-Hosted, which never holds a signing key. Payload carries issuer, license id, organization, installation binding, catalog version, plan, module entitlements, issue and expiry.

Validation before activation: signature, issuer, expiry, not-before, organization binding, installation binding where applicable, catalog-version compatibility, and every module key against the known catalog. Malformed or unknown entitlement structures are rejected; a decoded payload is never trusted without signature verification.

The validated active license is persisted server-side and is the authority for entitlements. The client receives a safe projection only.

## 7. Runtime license management — no reinstall

A License Management area on `/app/subscription` shows status (Active / Expired / Revoked / Invalid), license id, organization, plan, catalog version, issued and expiry dates, active modules, and available-but-unlicensed modules, with actions: import new license, replace license, refresh status, view active modules.

- Admins import an upgraded/renewed/replacement JWT after installation; newly purchased modules unlock with no reinstall, DB reset, AI reconfiguration or installer rerun.
- **Atomic replacement**: validate everything and compute resulting entitlements first, then store the new license and entitlement state in one transaction. A failed import leaves the previous license untouched and returns a clear reason.
- After success, server-side entitlements, module availability, navigation and the module catalog UI refresh — live where the architecture allows it, otherwise on normal app refresh.
- Catalog (what exists) stays separate from entitlements (what is enabled).

## 8. Module UI states and server enforcement

Locked modules read "Not included in your license" with "View details" / "Import new license", and the UI distinguishes not-in-catalog vs unlicensed vs expired vs revoked.

`license-enforcement.server.ts` enforces entitlements on every protected server capability (audit generation, protected Academy actions, and each other catalog key), with Knowledge Gaps allowed through Basic. Module entitlement and RBAC stay separate checks — a license never bypasses roles.

Revoke / expire / invalid-signature / unknown-key paths are verified to deny on both UI and server and never silently grant access.

## 9. Offline verification and test matrix

After import, entitlements verify locally: issue JWT in MC → import → disconnect network → restart → licensed modules still available and server enforcement still correct, with no live MC call for ordinary checks.

Verification covers: Basic module, Knowledge Gaps in Basic, licensed add-on, missing add-on, upgrade JWT import, invalid replacement (old license survives), expired, revoked, invalid signature, offline valid JWT, catalog mismatch — each checked in UI and on the server. Plus the full MC → issue with add-ons → deliver → import → activate → unlock → enforce → second upgrade JWT → atomic replacement chain.

Then: typecheck, full test suite, new tests for JWT validation, atomic replacement, Basic knowledge_gaps entitlement, SOP generate→publish→chunk→embed, FAQ generation, gap lifecycle, Academy language-switch regression and the stream watchdog; manual pass over `/app`, `/app/audit`, `/app/knowledge`, knowledge gaps, `/app/faq`, `/app/academy`, a lesson, and `/app/subscription` in both themes.

## Technical targets

`src/routes/_authenticated/app.audit.tsx`, `src/lib/audit-recommendations.ts`, `src/lib/ai-features.functions.ts`, `src/routes/_authenticated/app.academy.lesson.$lessonId.tsx`, `src/lib/license-modules.ts`, `src/lib/license-enforcement.server.ts`, plus the existing licensing paths (`license-activation.functions.ts` / `license-activation-core.server.ts`, `license.tsx`, `app.subscription.tsx`, self-hosted licensing provider) for import, verification, persistence and runtime refresh. Existing code paths are reused: `generateSop`, `publishGeneratedSop`, FAQ upsert, KB ingestion/chunking/embedding, Academy course creation, permission checks, module-catalog infrastructure.
