# 12. Disaster recovery & business continuity

## Recovery Time Objective (reference)

- Fresh restore into clean host: **≤ 4 h** with reference tooling.
- Break-glass redemption: **≤ 15 min**.
- Bootstrap token redemption: **≤ 1 h** end-to-end (including out-of-band verification).

## Recovery Point Objective

Governed by the customer's backup cadence. Reference schedule (chapter 10 of Admin Guide) gives ~24 h RPO.

## Seven canonical scenarios

Defined in `src/lib/dr-scenarios.ts` and rehearsed in the DR-Verify runbook shipped with every release:

1. Full DB loss — restore from encrypted backup.
2. Lost / disabled admin — break-glass or bootstrap token.
3. Expired Installation License on an offline install — bootstrap token or fresh bundle.
4. Erroneous revocation — MC-side reversal + fresh bundle.
5. Object storage loss — reprovision + re-mirror; artifacts regenerated on demand.
6. `install_id` drift after restore — abort and use bootstrap token to re-anchor.
7. Emergency signing-key rotation — MC issues fresh bundle to every install.

## BC posture

- No single vendor lock-in on the customer side: PG, S3-compatible storage, and AI provider are all customer-chosen.
- The Management Center can be re-deployed from source + database dump in under 2 h (internal RTO).
