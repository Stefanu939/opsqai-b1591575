# Product-wide Graphite Precision alignment

## Goal
Align the complete OPSQAI experience with the approved website direction: Graphite Precision, European editorial typography, restrained enterprise surfaces, operational green and technical teal. This includes the Windows Self-Hosted product, its setup experiences, Management Center, and Customer Portal. Existing behavior, permissions, licensing, entitlements, data access, and product architecture remain unchanged.

## Scope

### 1. One shared visual foundation
- Promote Graphite Precision from a website-only scope into the semantic design tokens used by authenticated products.
- Preserve fully readable light and dark themes.
- Use Work Sans for operational UI and Instrument Serif selectively for high-level page titles, not dense controls or tables.
- Replace legacy Aurora violet/blue, ember/gold aliases, ambient glow, glass blur, oversized rounded cards, and decorative blobs with graphite/paper surfaces, thin rules, compact radii, green actions, and teal informational accents.
- Keep status colors semantically distinct for success, warning, danger, and neutral states.

### 2. Shared product components
- Update buttons, cards, panels, page headers, section cards, metric tiles, icon tiles, tables, tabs, forms, badges, charts, empty states, dialogs, and navigation primitives so existing and future screens inherit the same enterprise language.
- Keep controls accessible, keyboard-visible, responsive, and stable in size.
- Remove legacy `glass`, glow, and gold-edge presentation while preserving compatible component APIs where existing routes rely on them.

### 3. Self-Hosted application
- Align the desktop/mobile shell, navigation rail, top bars, dashboard, AI Chat, Knowledge, FAQ, Knowledge Gaps, Academy, AI Audit, Calendar, Users, Organization, Updates, License & Entitlements, and licensed Product Workspaces.
- Preserve every module gate, role permission, signed-license check, navigation rule, and local-only boundary.
- Give dense operational screens a consistent hierarchy: editorial page title, compact command controls, flat data panels, clear status signals, and restrained charts.
- Remove visual remnants in outlier screens that bypass shared primitives, especially chat, Academy lesson/teacher views, Knowledge, dashboard banners, and audit panels.

### 4. Setup and Windows installer
- Align the web first-run flow with the same Graphite Precision tokens and component rhythm.
- Replace the Electron installer’s separate deep-green/gold theme with the Graphite Precision palette, typography, compact radii, flat cards, clear progress rail, form states, checks, review, install progress, completion, and failure states.
- Align desktop shell splash/error window backgrounds and framing.
- Do not alter installer steps, validation, local Ed25519 licensing, service setup, paths, update behavior, or install logic.

### 5. Management Center
- Apply the shared product scope to the complete Management Center shell and every page: Overview, Calendar, Customers, customer detail/manage flows, Installations, Licenses, Releases, Team, Support, Ownership, Audit Logs, and Settings.
- Replace rounded floating shell cards and glow decoration with a structured enterprise workspace, compact navigation, strong data hierarchy, and consistent actions.
- Preserve staff-only access, customer/product configuration, licensing, heartbeat, releases, support, and audit workflows exactly.

### 6. Customer Portal
- Apply the same system to Overview, Calendar, News, Downloads, Subscription, Support, Release Notes, Documentation, and Admin surfaces.
- Keep the portal clearly customer-facing through labels and information hierarchy, while sharing the same brand primitives as Management Center and Self-Hosted.
- Preserve customer/staff filtering, download signing, installation visibility, support, and entitlement behavior.

### 7. Cleanup and documentation
- Remove or neutralize obsolete Aurora Noir, glass, glow, legacy gold, and excessive-radius styling from active product surfaces.
- Keep compatibility class names only where removing them would create unnecessary code churn; their rendered result must follow Graphite Precision.
- Update `docs/design/current-design.md` so Graphite Precision is the current source of truth for website, Self-Hosted, installer, Management Center, and Customer Portal.

## Technical approach
- Add explicit product scope classes to the Self-Hosted, Management Center, Portal, and first-run roots; use shared semantic tokens rather than per-route hardcoded colors.
- Refactor shared primitives first, then clean route-level exceptions identified by the audit.
- Keep the public `.oix-shell` behavior and blog interaction exception intact.
- Edit the Electron installer stylesheet independently because it does not consume the web application CSS.
- Do not modify database migrations, server functions, authentication, RBAC, license payloads, entitlement resolution, or deployment boundaries.

## Verification
- Run TypeScript checks and production build.
- Run focused existing tests for product architecture, licensing, auth/navigation, and Windows packaging guards where relevant.
- Check all active route families for forbidden legacy visual markers and unresolved hardcoded colors.
- Verify representative plus known outlier pages in light and dark, desktop and mobile: Self-Hosted dashboard/chat/Academy/license/product workspace; Management Overview/customers/licenses/support; Portal Overview/downloads/support; first-run; installer welcome/system/progress/finish/error states.
- Confirm no text contrast, clipping, overlap, broken navigation, or altered functional gating.
