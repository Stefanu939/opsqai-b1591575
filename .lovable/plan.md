## Customer Workspace Manager — Simplification & AI Document Automation

Scope: keep all existing tabs, components, colors, navigation, and exports exactly as they are. Layer the new behavior on top of the current screens.

---

### 1. Access control

`src/lib/authorization.ts` → extend `requirePlatformAdmin` (or add `requirePlatformOrWorkspaceAdmin`) to also accept `workspace_owner`. Same gate is applied:

- in the route `beforeLoad` of `app.admin.customers.tsx`
- in every customer server function
- on the sidebar entry in `app/app-shell.tsx`

Roles `admin`, `manager`, `supervisor`, `operator` keep being denied.

---

### 2. Simplified Profile tab (same UI primitives)

Replace `GENERAL_FIELDS`, `COMMERCIAL_FIELDS`, `IMPLEMENTATION_FIELDS` content with a slim card layout — same `Card` / `Input` / `Select` components, just fewer fields:

- **Company**: companyName (read-only from `companies.name`), legalName, registrationNumber, vatNumber, address, country
- **Contact**: contactPerson, email, phone, website
- **Workspace**: workspaceName, language, timezone
- **Subscription**: single `Select` → Pilot / Standard / Business / Enterprise

All legacy `commercial.*`, `implementation.*`, `ai_config.*`, `sla.*` JSONB stays in the DB (no destructive migration); the simplified UI just stops writing/displaying them, and the document generator stops requiring them.

---

### 3. Subscription engine

New file `src/lib/subscription-plans.ts`:

```ts
export const SUBSCRIPTION_PLANS = {
  pilot:      { label: "Pilot",      maxUsers: 25,   storageGB: 5,   academy: false, aiFeatures: "basic",    analytics: "basic",    support: "email",          modules: [...] },
  standard:   { label: "Standard",   maxUsers: 100,  storageGB: 25,  academy: true,  aiFeatures: "standard", analytics: "standard", support: "business hours", modules: [...] },
  business:   { label: "Business",   maxUsers: 500,  storageGB: 100, academy: true,  aiFeatures: "advanced", analytics: "advanced", support: "24/5",           modules: [...] },
  enterprise: { label: "Enterprise", maxUsers: null, storageGB: 500, academy: true,  aiFeatures: "full",     analytics: "full",     support: "24/7 + CSM",     modules: [...] },
}
```

When the plan dropdown changes, `upsertCustomerProfile` also writes the derived values into `customer_profiles.commercial` and updates `companies.subscription_plan` + `max_users`. Feature matrix tab keeps working but is now read-only-by-default seeded from `SUBSCRIPTION_PLANS[plan].modules`.

---

### 4. Documents tab — keep current layout

No structural change to `DocumentsTab`. Add three things inline using the same buttons/cards that already exist:

- A grouping helper that splits the existing document list into folders by `metadata.category` — rendered as collapsible `Card` sections labeled **Commercial / Technical / Legal / Compliance / Customer Success / Custom Documents**.
- A `Generate All Standard Documents` button next to the existing **Generate** button (`Wand2` icon, same `Button` component).
- Two new buttons next to the existing per-doc Export menu: **Download Folder** and **Download All (.zip)**.

---

### 5. Intelligent, grounded document generation

Rewrite `generateCustomerDocument` in `src/lib/customers.functions.ts`:

1. Load profile + company + `SUBSCRIPTION_PLANS[plan]` + a curated `OPSQAI_FACTS` block (product description, branding, feature catalog summary, official template skeleton). These four are the **only** sources the AI may use.
2. Run the template's `build(ctx)` as a deterministic skeleton.
3. Call Lovable AI Gateway (`google/gemini-2.5-flash`) with a strict system prompt:
   - "Use ONLY the provided JSON sources. Never invent company info, contacts, features, prices or specifications. If a field is missing, write `**[MISSING: <field>]**` instead of guessing."
   - Input = `{ profile, plan, opsqai_facts, template_skeleton }`.
4. Store both the AI markdown and the resolved source set in `metadata.sources` for auditability.
5. Add `metadata.missing_fields[]` derived from `[MISSING: …]` matches so the UI can show a clear "Missing data" badge.

Determinism: temperature 0.2, deterministic prompt, identical `(profile, plan)` ⇒ identical output (verified by hashing inputs and storing the hash in `metadata.input_hash`; we skip regeneration if hash matches and content exists).

New server fn `generateAllStandardDocuments({ company_id })` — iterates the recommended template list for the active subscription and calls the same path. Returns the list of created/updated doc ids.

---

### 6. Document folders & bulk download

- Existing `metadata.category` already exists; just normalize to the six folder names above. Manual uploads land in `Custom Documents`.
- New server fn `downloadCustomerDocuments({ company_id, category? })`:
  - Renders each doc as PDF via the existing `generatePdf` pipeline.
  - Zips with `fflate` (already on the Worker — pure JS, edge-safe).
  - Returns base64 + mime to the client (same Blob-URL pattern we already use to dodge the ad-blocker on `*.supabase.co`).

---

### 7. "Needs Update" auto-flagging

Migration:

- Add `customer_documents.needs_update boolean default false`.
- Add `customer_documents.input_hash text`.
- Trigger `customer_profile_dirty_tracker` on `customer_profiles` UPDATE: when `general.legalName`, `general.address`, `general.registrationNumber`, `general.vatNumber`, contact person or `commercial.subscriptionPlan` change, set `needs_update = true` on every document for that company.
- Trigger on `companies` UPDATE for `name` → same effect.

UI: in `DocumentsTab` the existing row shows a small "Needs Update" `Badge` when set, plus a per-row **Regenerate** action and a top-level **Regenerate All** button (both reuse the existing generate flow, which clears `needs_update` on success).

---

### 8. Verification

- `bun run build` to ensure the new code typechecks and the bundle stays Worker-compatible.
- Playwright as `baristefan5@gmail.com` (`LOVABLE_BROWSER_AUTH_STATUS=injected`): navigate to `/app/admin/customers`, pick a workspace, run **Generate All Standard Documents**, then click **Export PDF** on one document and assert the Blob URL download works without error and without any `*.supabase.co` request.

---

### Technical notes

- No destructive schema changes; legacy JSONB columns are kept.
- All new fns are `requireSupabaseAuth` + `requirePlatformAdmin`-equivalent.
- `fflate` is pure JS (Worker-safe). PDF generation reuses the already-hardened `generatePdf` (sanitized for WinAnsi). Downloads stream through Blob URLs on the app origin.

### Out of scope (explicit)

- No UI redesign, color/typography/spacing changes, navigation changes.
- No removal of existing templates, tabs, or export formats.
- No external CRM/e-sign integrations.
