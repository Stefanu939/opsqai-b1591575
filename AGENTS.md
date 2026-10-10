<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Every /app page (Core and any workspace, current or future) renders inside `ModulePage` with `Panel` sections; page styling changes go into those shared components, never per page — keeps all screens identical.

- Self-Hosted default local AI engine is bundled llama.cpp run by the OpsqaiAi service behind one loopback OpenAI-compatible gateway (127.0.0.1:11440); Ollama stays a selectable alternative — one base URL keeps the app adapter unchanged.
- Self-Hosted multi-PC: the first install is the company server (DB, AI, first admin); other PCs install in Workstation mode (desktop app only, paired via /api/public/station-probe, config in station.json) — one database per company, accounts only created by the server's admin.
- Self-Hosted remote workstations: the main computer maps a router port via UPnP (platform service, remote.json) and pairs remote PCs with a one-time code carrying the local CA fingerprint, which the workstation pins — direct company-to-company traffic, no OPSQAI relay or VPN.
- Licence collision detection is alert-only (human-in-the-loop): heartbeats carry a hashed machine fingerprint, MC flags >1 machine per install_id in 48h and never auto-revokes — legit migrations/restores must not stop a customer.
- Kai's spoken replies use the authenticated /api/kai-voice route (neural TTS stream, staff-only, cloud-only) with the device voice as fallback — one place to change voice/model.
- Pin `@lovable.dev/vite-tanstack-config` to 2.25.2 (exact) and keep the `opsqai-worker-import-meta-url-fallback` plugin in vite.config.ts: 2.25.3/2.26.0 emit `createRequire(import.meta.url)` without fallback, which crashes every published page, and the pin has been silently reverted before.
- Windows builds reach MC via GitHub Actions → /api/public/v1/releases/ci (OPSQAI_CI_TOKEN) as channel "canary"; only an admin "Promote to stable" exposes them to customers — no manual download/re-upload, human approval kept.
- Kai confirmations resolve against existing action snapshots, share the click execution path, and persist per-proposal outcomes — prevents ambiguous approvals and repeat execution on re-entry.
- Kai keeps its existing conversation transport and browser history while composing its floating dialog with AI Elements — visual changes must not change model/provider routing.
- ManagementShell owns MC mobile navigation and consumes the authorized support unread counter — avoids leaking Self-Hosted navigation or fabricated badges into MC.
- MC client discovery reuses authenticated company/CRM reads and shared browser-safe matching; enrichment previews apply only to editable forms and never save automatically — preserves scope and human approval.
- Onboarding is resumable: `companies.onboarding_status` tracks progress and CUI uniqueness is a DB index — concurrent/partial enrolments must never create duplicates.
- Kai conversations live in `kai_conversations` (per user, RLS); localStorage is only an offline cache — memory must follow the account across devices.
- Colleague outreach uses compose deep-links into their own mailbox (`mc_sender_settings`), never server-side sending from personal accounts — keeps the human as sender.
- Android app (TWA): APK built by .github/workflows/build-android-app.yml, uploaded via /api/public/v1/android/ci to releases/android, downloaded through getAndroidAppDownload (AndroidAppCard in MC profile + portal downloads) — one signing key, matched by public/.well-known/assetlinks.json.
