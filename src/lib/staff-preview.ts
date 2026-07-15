// Demo tenant used by the Staff Preview flow.
//
// A single seeded company ("Atlas Logistics GmbH") exists in the database
// with `is_demo_tenant = true`. Its UUID is stable — a migration created it
// with an explicit id and a partial unique index on `is_demo_tenant`
// guarantees exactly one demo tenant ever exists.
//
// This value is used by the Staff Preview banner to pin the active
// workspace of OPSQAI staff to the demo tenant while they are inside
// `/app/*` on the Management Center. Customers never see this constant —
// on their Windows install the preview banner is not mounted.
export const DEMO_COMPANY_ID = "00000000-0000-0000-0000-0000000d3110";
export const DEMO_COMPANY_DISPLAY_NAME = "Atlas Logistics GmbH";
