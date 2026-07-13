# 15. Troubleshooting — top 20 issues

Errors carry a stable code `OPSQAI-Exxxx`. Reference these when opening a support ticket.

| Code  | Symptom                          | Cause                                          | Fix                                                    |
| ----- | -------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| E1001 | Boot loops in Recovery Mode      | Installation License missing                   | Activate license at `/app/platform/license-activation` |
| E1002 | "Unknown license_version"        | Token was issued for a different major         | Re-issue token from MC                                 |
| E1003 | Signature verification failed    | Signing key rotated, install has stale keys    | Import fresh activation bundle                         |
| E1004 | `install_id` mismatch            | Wrong install trying to redeem token           | Confirm `install_id` in Doctor and reissue from MC     |
| E1005 | CRL stale (> 30 days)            | No heartbeat reaching MC                       | Restore egress or import fresh bundle                  |
| E1010 | Break-glass rejected             | Wrong secret or already used                   | Generate a new one (if you still have Recovery access) |
| E1011 | Bootstrap token expired          | TTL passed                                     | Request a fresh token from OPSQAI                      |
| E2001 | pgvector extension missing       | Extension not installed                        | `CREATE EXTENSION vector`                              |
| E2002 | Migration pending                | New installer image but migrations not applied | Run `opsqai update apply`                              |
| E2010 | Duplicate `install_id` warning   | DB restored into a different install           | Stop — this is DR scenario 6                           |
| E3001 | AI provider probe failed         | Wrong key / wrong endpoint                     | Re-verify in Admin → AI                                |
| E3002 | Embedding model mismatch         | Model changed after ingest                     | Re-embed corpus or revert model                        |
| E4001 | SMTP handshake failed            | Wrong credentials or blocked port              | Verify at Admin → Email                                |
| E4002 | Bounce webhook signature invalid | Shared secret mismatch                         | Reset in Admin → Email                                 |
| E5001 | Object storage 403               | IAM policy                                     | See chapter 5                                          |
| E5002 | Object storage 5xx               | Provider outage                                | Retry / failover                                       |
| E6001 | Doctor warns update available    | Manifest fresher than installed version        | Plan update (chapter 12)                               |
| E6002 | Doctor red on backup age         | No backup in last 24 h before update           | Run backup                                             |
| E7001 | Portal download 403              | Session `contact_email` doesn't match license  | Contact OPSQAI                                         |
| E9999 | Unknown                          | —                                              | Attach `opsqai doctor --json` to the ticket            |
