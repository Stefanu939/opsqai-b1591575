# 4. Modules

OPSQAI is organized into modules. Every install receives the **Basic** modules automatically; paid modules are unlocked via per-module licenses.

## Basic modules (always available)

- **Platform admin** — users, roles, integrations, health.
- **Audit log** — all governance-relevant events.
- **Docs viewer** — customer-facing documentation rendered in-app.
- **Setup wizard** — resumable install configuration.
- **Doctor** — self-diagnostics.
- **Recovery** — DR flows (break-glass + bootstrap token).

## Paid modules (per-module license)

| Module key | Name | What it does |
|---|---|---|
| `knowledge` | Knowledge Base | Document ingestion, chunking, retrieval |
| `academy` | Academy | Lessons, chapters, quizzes, certificates |
| `chat` | Chat | Grounded chat over knowledge |
| `faq` | FAQ | Curated FAQ with retrieval fallback |
| `sops` | SOPs | Versioned SOPs with acknowledgement |
| `brand` | Brand | Brand asset library, tone rules |
| `requests` | Internal Requests | Internal ticket triage |
| `workspace` | Workspace | Session-scoped AI workspace with file artifacts |

Enabling a module requires an active per-module license whose `expires_at` has not passed. Updates require `maintenance_expires_at` to be in the future.
