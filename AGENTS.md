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
