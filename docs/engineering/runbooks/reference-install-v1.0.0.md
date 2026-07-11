# Reference install acceptance — v1.0.0

Executed on a clean Linux x86_64 host. Result attached to the GA tag.

1. **Install**
   - `curl` tarball, verify SHA-256 against manifest.
   - `docker compose up -d`.
   - Note `install_id` printed by entrypoint.

2. **Setup wizard** — resume-tested by force-restarting between steps.
   - DB check pass.
   - Object storage check pass.
   - SMTP check pass.
   - AI provider probe latency ≤ 2 s.
   - First admin created.

3. **License activation**
   - Installation License pasted → verified → activated.
   - Module Licenses (Knowledge, Chat) pasted → activated.
   - Alternate path: Activation bundle imported from Customer Portal.

4. **Doctor** — all checks green, exit code 0.

5. **Smoke tests**
   - Ingest one PDF + one DOCX; embeddings created.
   - Chat query returns grounded answer with citations.
   - Academy lesson viewable.
   - Audit log shows all above actions.

6. **DR-Verify** — all seven scenarios pass.

7. **Docs** — every book renders at `/app/docs/<slug>` and exports as PDF.

8. **Update dry-run** — apply a synthetic `1.0.1` manifest → rollback → doctor green.

Sign-off recorded in `docs/engineering/runbooks/reference-install-v1.0.0.md`.
