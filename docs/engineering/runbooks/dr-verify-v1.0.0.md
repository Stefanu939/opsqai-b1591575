# DR-Verify runbook — v1.0.0

Executed on a clean reference host before every GA. Every scenario is timed and evidence is captured (screenshot + `opsqai doctor --json` before/after).

## Scenario 1 — Full DB loss

1. `docker compose down`.
2. `rm -rf pg-data/*`.
3. `docker compose up -d postgres`.
4. `pg_restore` from encrypted backup.
5. `docker compose start app`.
6. **Expect:** app boots normally, `install_id` unchanged, licenses re-verify, doctor green.
7. **SLA:** ≤ 4 h.

## Scenario 2 — Lost admin

1. Delete every user with `platform_admin` role.
2. Attempt sign-in fails.
3. Redeem previously generated break-glass secret at `/app/platform/recovery`.
4. **Expect:** recovery mode enters, break-glass creates a temporary admin, exit-recovery-mode logs the event.
5. **SLA:** ≤ 15 min.

## Scenario 3 — Expired license on an offline install

1. Advance clock to past `expires_at`.
2. Modules lock.
3. Import a fresh activation bundle (issued by MC with renewed dates).
4. **Expect:** modules unlock, doctor green.

## Scenario 4 — Erroneous revocation

1. Revoke a license on MC by mistake.
2. Install imports next bundle → module locks.
3. MC un-revokes; a fresh bundle is issued.
4. Install re-imports.
5. **Expect:** module unlocks; audit log shows the mistake + reversal.

## Scenario 5 — Object storage loss

1. Wipe `minio-data`.
2. Restart.
3. **Expect:** documents show "asset missing" states; re-mirror from off-site restores originals; `workspace_artifacts` regenerate on demand.

## Scenario 6 — `install_id` drift after restore

1. Restore a dump that was taken from a different install.
2. Boot.
3. **Expect:** doctor E2010 red; app refuses to enter normal mode; only Recovery Mode + Bootstrap Recovery Token can re-anchor.

## Scenario 7 — Emergency signing-key rotation

1. Simulate compromise of `key_id=K1`.
2. MC deactivates K1, activates K2, adds all K1-signed tokens to CRL.
3. MC re-issues every affected license with K2 and generates fresh bundles.
4. Customer imports bundle at `/app/platform/license-activation`.
5. **Expect:** old tokens rejected; new tokens accepted; doctor green.

## Sign-off

Runbook is signed by the release engineer and archived under `docs/engineering/runbooks/dr-verify-<version>.md` after each execution.
