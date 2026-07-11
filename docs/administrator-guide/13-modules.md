# 13. Modules — enable / disable

Modules become available automatically when a valid Module License is present. Manually disabling a licensed module is available at `/app/admin/platform` → Modules.

## Effect of expiry

- **`expires_at` passed:** module UI locked, retrieval blocked, existing data intact.
- **`maintenance_expires_at` passed:** module keeps running, updates blocked.

## Effect of revocation

Immediate lock on next heartbeat or bundle import. Data is not deleted.

## Data retention after lock

Locked-module data is retained indefinitely. Renewing the license restores access. If the customer decides to fully offboard from a module, they can purge module data from Admin → Modules → Purge (audit-logged).
