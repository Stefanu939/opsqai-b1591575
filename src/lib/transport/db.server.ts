// OPSQAI Transport — Self-Hosted PostgreSQL data access (server only).
//
// Transport is a Self-Hosted product workspace: it talks to the installation's
// local PostgreSQL instance through DATABASE_URL. On Cloud there is no
// DATABASE_URL, so every entry point fails loudly instead of silently
// touching Management Center data.

import { Pool, type QueryResultRow } from "pg";
import type {
  Carrier,
  AuditTrendPoint,
  CheckEvidence,
  ChecklistItem,
  CheckResult,
  CmrRecord,
  Driver,
  ExpiryAlert,
  Incident,
  MapPin,
  MapZone,
  TransportDocument,
  TransportGrantKey,
  TransportNote,
  TransportRequest,
  TransportSettings,
  Vehicle,
  WeeklyCheck,
} from "./types";
import { countryPack } from "./country-packs";
import { pgDateTypes } from "@/lib/providers/selfhost/pg-types.server";

let pool: Pool | null = null;

// Transport results cross the server-function boundary, so dates must be
// serializable. Normalize this repository's result values instead of changing
// node-postgres' process-wide type parsers (which broke unrelated repositories
// that correctly expect Date objects).
function browserSafe<T>(value: T): T {
  if (value instanceof Date) return value.toISOString() as T;
  if (Array.isArray(value)) return value.map(browserSafe) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, browserSafe(item)]),
    ) as T;
  }
  return value;
}


function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "OPSQAI Transport is available on Self-Hosted installations only (no local database configured).",
    );
  }
  pool = new Pool({ connectionString, types: pgDateTypes, max: 5, idleTimeoutMillis: 30_000 });
  return pool;
}

async function q<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(sql, params);
  return res.rows.map(browserSafe);
}

async function one<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

// ── Settings ──────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: TransportSettings = {
  country: "generic",
  language: "en",
  units: "metric",
  alertWindows: [30, 60, 90],
  docAlertWindows: {},
  mapEnabled: true,
  cmrPrefix: "CMR",
  timezone: "Europe/Berlin",
  weekStart: 1,
  auditDay: 1,
  auditRequired: true,
  mapCenterLat: null,
  mapCenterLng: null,
  mapZoom: 5,
  liveTracking: true,
  gpsPollMinutes: 10,
  searchProvider: "auto",
  auditCadence: "manual",
  auditOwnerUserId: null,
  auditReminder: false,
};

interface SettingsRow {
  country: string;
  language: string;
  units: string;
  alert_windows: number[] | null;
  doc_alert_windows: Record<string, number> | null;
  map_enabled: boolean;
  cmr_prefix: string;
  timezone: string;
  week_start: number;
  audit_day: number;
  audit_required: boolean;
  map_center_lat: number | null;
  map_center_lng: number | null;
  map_zoom: number;
  live_tracking: boolean;
  gps_poll_minutes: number;
  search_provider: string;
  audit_cadence: string;
  audit_owner_user_id: string | null;
  audit_reminder: boolean;
}

const SETTINGS_SELECT = `country, language, units, alert_windows, doc_alert_windows,
  map_enabled, cmr_prefix, timezone, week_start, audit_day, audit_required,
  map_center_lat, map_center_lng, map_zoom, live_tracking, gps_poll_minutes,
  search_provider, audit_cadence, audit_owner_user_id, audit_reminder`;

export async function getSettings(companyId: string): Promise<TransportSettings> {
  const row = await one<SettingsRow>(
    `SELECT ${SETTINGS_SELECT}
       FROM public.transport_settings WHERE company_id = $1`,
    [companyId],
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    country: row.country,
    language: row.language,
    units: row.units === "imperial" ? "imperial" : "metric",
    alertWindows: row.alert_windows ?? [30, 60, 90],
    docAlertWindows: row.doc_alert_windows ?? {},
    mapEnabled: row.map_enabled,
    cmrPrefix: row.cmr_prefix,
    timezone: row.timezone,
    weekStart: Number(row.week_start),
    auditDay: Number(row.audit_day),
    auditRequired: row.audit_required,
    mapCenterLat: row.map_center_lat,
    mapCenterLng: row.map_center_lng,
    mapZoom: Number(row.map_zoom),
    liveTracking: row.live_tracking,
    gpsPollMinutes: Number(row.gps_poll_minutes),
    searchProvider:
      row.search_provider === "osm" || row.search_provider === "off"
        ? row.search_provider
        : "auto",
    auditCadence:
      row.audit_cadence === "weekly" ||
      row.audit_cadence === "biweekly" ||
      row.audit_cadence === "monthly"
        ? row.audit_cadence
        : "manual",
    auditOwnerUserId: row.audit_owner_user_id,
    auditReminder: row.audit_reminder,
  };
}

export async function saveSettings(
  companyId: string,
  patch: Partial<TransportSettings>,
): Promise<TransportSettings> {
  const current = await getSettings(companyId);
  const next = { ...current, ...patch };
  await q(
    `INSERT INTO public.transport_settings
       (company_id, country, language, units, alert_windows, doc_alert_windows,
        map_enabled, cmr_prefix, timezone, week_start, audit_day, audit_required,
        map_center_lat, map_center_lng, map_zoom, live_tracking, gps_poll_minutes,
        search_provider, audit_cadence, audit_owner_user_id, audit_reminder)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     ON CONFLICT (company_id) DO UPDATE SET
       country = EXCLUDED.country,
       language = EXCLUDED.language,
       units = EXCLUDED.units,
       alert_windows = EXCLUDED.alert_windows,
       doc_alert_windows = EXCLUDED.doc_alert_windows,
       map_enabled = EXCLUDED.map_enabled,
       cmr_prefix = EXCLUDED.cmr_prefix,
       timezone = EXCLUDED.timezone,
       week_start = EXCLUDED.week_start,
       audit_day = EXCLUDED.audit_day,
       audit_required = EXCLUDED.audit_required,
       map_center_lat = EXCLUDED.map_center_lat,
       map_center_lng = EXCLUDED.map_center_lng,
       map_zoom = EXCLUDED.map_zoom,
       live_tracking = EXCLUDED.live_tracking,
       gps_poll_minutes = EXCLUDED.gps_poll_minutes,
       search_provider = EXCLUDED.search_provider,
       audit_cadence = EXCLUDED.audit_cadence,
       audit_owner_user_id = EXCLUDED.audit_owner_user_id,
       audit_reminder = EXCLUDED.audit_reminder,
       updated_at = now()`,
    [
      companyId,
      next.country,
      next.language,
      next.units,
      next.alertWindows,
      JSON.stringify(next.docAlertWindows ?? {}),
      next.mapEnabled,
      next.cmrPrefix,
      next.timezone,
      next.weekStart,
      next.auditDay,
      next.auditRequired,
      next.mapCenterLat,
      next.mapCenterLng,
      next.mapZoom,
      next.liveTracking,
      next.gpsPollMinutes,
      next.searchProvider,
      next.auditCadence,
      next.auditOwnerUserId,
      next.auditReminder,
    ],
  );
  return next;
}


// ── Grants ────────────────────────────────────────────────────────────────

export async function listGrants(userId: string): Promise<TransportGrantKey[]> {
  const rows = await q<{ grant_key: TransportGrantKey }>(
    `SELECT grant_key FROM public.transport_grants WHERE user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.grant_key);
}

export async function listAllGrants(): Promise<
  Array<{ userId: string; grants: TransportGrantKey[] }>
> {
  const rows = await q<{ user_id: string; grant_key: TransportGrantKey }>(
    `SELECT user_id, grant_key FROM public.transport_grants ORDER BY user_id`,
  );
  const map = new Map<string, TransportGrantKey[]>();
  for (const r of rows) {
    const list = map.get(r.user_id) ?? [];
    list.push(r.grant_key);
    map.set(r.user_id, list);
  }
  return [...map.entries()].map(([userId, grants]) => ({ userId, grants }));
}

export async function setGrant(
  userId: string,
  key: TransportGrantKey,
  enabled: boolean,
  grantedBy: string,
): Promise<void> {
  if (enabled) {
    await q(
      `INSERT INTO public.transport_grants (user_id, grant_key, granted_by)
       VALUES ($1,$2,$3) ON CONFLICT (user_id, grant_key) DO NOTHING`,
      [userId, key, grantedBy],
    );
  } else {
    await q(
      `DELETE FROM public.transport_grants WHERE user_id = $1 AND grant_key = $2`,
      [userId, key],
    );
  }
}

export async function listCompanyMembers(
  companyId: string,
): Promise<Array<{ id: string; name: string; email: string | null }>> {
  return q<{ id: string; name: string; email: string | null }>(
    `SELECT id,
            COALESCE(NULLIF(display_name, ''), email, 'User') AS name,
            email
       FROM public.users
      WHERE disabled = false AND company_id = $1
      ORDER BY name`,
    [companyId],
  );
}

// ── Registers (generic, column-whitelisted CRUD) ──────────────────────────

const COLUMNS = {
  vehicles: [
    "plate",
    "kind",
    "make",
    "model",
    "vin",
    "ownership",
    "odometer_km",
    "base_location",
    "latitude",
    "longitude",
    "assigned_driver_id",
    "status",
    "notes",
  ],
  drivers: [
    "full_name",
    "phone",
    "email",
    "licence_number",
    "licence_categories",
    "base_location",
    "latitude",
    "longitude",
    "assigned_vehicle_id",
    "status",
    "notes",
  ],
  carriers: [
    "name",
    "registration_no",
    "vat_no",
    "contact_name",
    "contact_email",
    "contact_phone",
    "address",
    "country",
    "latitude",
    "longitude",
    "requirements",
    "handling_rules",
    "rating",
    "status",
    "notes",
  ],
  documents: [
    "owner_kind",
    "owner_id",
    "doc_type",
    "label",
    "reference",
    "issued_on",
    "expires_on",
    "notes",
  ],
  incidents: [
    "reference",
    "title",
    "category",
    "severity",
    "status",
    "description",
    "location",
    "latitude",
    "longitude",
    "occurred_at",
    "vehicle_id",
    "driver_id",
    "carrier_id",
    "action_agreed",
  ],
  requests: [
    "title",
    "kind",
    "priority",
    "status",
    "description",
    "vehicle_id",
    "driver_id",
    "carrier_id",
    "incident_id",
    "due_on",
  ],
  zones: ["name", "color", "description", "center_lat", "center_lng", "radius_km"],
  fuel: [
    "vehicle_id",
    "driver_id",
    "entry_date",
    "route",
    "litres",
    "cost",
    "currency",
    "distance_km",
    "odometer_km",
    "supplier",
    "reference",
    "notes",
  ],
  duty: [
    "driver_id",
    "duty_date",
    "duty_kind",
    "route",
    "vehicle_id",
    "shift_start",
    "shift_end",
    "notes",
  ],
} as const;

export type RegisterName = keyof typeof COLUMNS;

const TABLE: Record<RegisterName, string> = {
  vehicles: "public.transport_vehicles",
  drivers: "public.transport_drivers",
  carriers: "public.transport_carriers",
  documents: "public.transport_documents",
  incidents: "public.transport_incidents",
  requests: "public.transport_requests",
  zones: "public.transport_zones",
  fuel: "public.transport_fuel_entries",
  duty: "public.transport_duty_days",
};


function pick(register: RegisterName, values: Record<string, unknown>) {
  const allowed = COLUMNS[register] as readonly string[];
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (!allowed.includes(k)) continue;
    if (v === undefined) continue;
    cols.push(k);
    params.push(v === "" ? null : v);
  }
  return { cols, params };
}

export async function createRecord(
  register: RegisterName,
  companyId: string,
  userId: string,
  values: Record<string, unknown>,
): Promise<{ id: string }> {
  const { cols, params } = pick(register, values);
  const all = ["company_id", "created_by", ...cols];
  const args = [companyId, userId, ...params];
  const row = await one<{ id: string }>(
    `INSERT INTO ${TABLE[register]} (${all.join(", ")})
     VALUES (${all.map((_, i) => `$${i + 1}`).join(", ")})
     ${
       register === "duty"
         ? `ON CONFLICT (driver_id, duty_date) DO UPDATE SET ${cols
             .map((c) => `${c} = EXCLUDED.${c}`)
             .join(", ")}, updated_at = now()`
         : ""
     }
     RETURNING id`,
    args,
  );

  if (!row) throw new Error("Insert failed");
  return row;
}

export async function updateRecord(
  register: RegisterName,
  companyId: string,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { cols, params } = pick(register, values);
  if (!cols.length) return;
  const sets = cols.map((c, i) => `${c} = $${i + 3}`);
  await q(
    `UPDATE ${TABLE[register]} SET ${sets.join(", ")}
      WHERE id = $1 AND company_id = $2`,
    [id, companyId, ...params],
  );
}

export async function deleteRecord(
  register: RegisterName,
  companyId: string,
  id: string,
): Promise<void> {
  await q(`DELETE FROM ${TABLE[register]} WHERE id = $1 AND company_id = $2`, [
    id,
    companyId,
  ]);
}

export async function listVehicles(companyId: string): Promise<Vehicle[]> {
  return q<Vehicle>(
    `SELECT id, plate, kind, make, model, vin, ownership, odometer_km, base_location,
            latitude, longitude, assigned_driver_id, status, notes, created_at, updated_at
       FROM public.transport_vehicles
      WHERE company_id = $1 AND archived_at IS NULL
      ORDER BY plate`,
    [companyId],
  );
}

export async function listDrivers(companyId: string): Promise<Driver[]> {
  return q<Driver>(
    `SELECT id, full_name, phone, email, licence_number, licence_categories,
            base_location, latitude, longitude, assigned_vehicle_id, status, notes,
            created_at, updated_at
       FROM public.transport_drivers
      WHERE company_id = $1 AND archived_at IS NULL
      ORDER BY full_name`,
    [companyId],
  );
}

export async function listCarriers(companyId: string): Promise<Carrier[]> {
  return q<Carrier>(
    `SELECT id, name, registration_no, vat_no, contact_name, contact_email,
            contact_phone, address, country, latitude, longitude, requirements,
            handling_rules, rating, status, notes, created_at, updated_at
       FROM public.transport_carriers
      WHERE company_id = $1 AND archived_at IS NULL
      ORDER BY name`,
    [companyId],
  );
}

export async function listDocuments(
  companyId: string,
  owner?: { kind: string; id: string },
): Promise<TransportDocument[]> {
  if (owner) {
    return q<TransportDocument>(
      `SELECT id, owner_kind, owner_id, doc_type, label, reference, issued_on,
              expires_on, notes, created_at
         FROM public.transport_documents
        WHERE company_id = $1 AND owner_kind = $2 AND owner_id = $3
        ORDER BY expires_on NULLS LAST`,
      [companyId, owner.kind, owner.id],
    );
  }
  return q<TransportDocument>(
    `SELECT id, owner_kind, owner_id, doc_type, label, reference, issued_on,
            expires_on, notes, created_at
       FROM public.transport_documents
      WHERE company_id = $1
      ORDER BY expires_on NULLS LAST`,
    [companyId],
  );
}

export async function listIncidents(companyId: string): Promise<Incident[]> {
  return q<Incident>(
    `SELECT id, reference, title, category, severity, status, description, location,
            latitude, longitude, occurred_at, vehicle_id, driver_id, carrier_id,
            action_agreed, approved_by, approved_at, created_at, updated_at
       FROM public.transport_incidents
      WHERE company_id = $1
      ORDER BY COALESCE(occurred_at, created_at) DESC`,
    [companyId],
  );
}

export async function listRequests(companyId: string): Promise<TransportRequest[]> {
  return q<TransportRequest>(
    `SELECT id, title, kind, priority, status, description, vehicle_id, driver_id,
            carrier_id, incident_id, due_on, decision_note, approved_by, approved_at,
            created_at, updated_at
       FROM public.transport_requests
      WHERE company_id = $1
      ORDER BY created_at DESC`,
    [companyId],
  );
}

// ── Fleet day: fuel entries and driver duty days ──────────────────────────

export async function listFuelEntries(
  companyId: string,
  sinceDays = 90,
): Promise<import("./types").FuelEntry[]> {
  return q<import("./types").FuelEntry>(
    `SELECT f.id, f.vehicle_id, v.plate AS vehicle_plate, f.driver_id,
            d.full_name AS driver_name, f.entry_date, f.route,
            f.litres::float8 AS litres, f.cost::float8 AS cost, f.currency,
            f.distance_km::float8 AS distance_km, f.odometer_km,
            f.supplier, f.reference, f.notes, f.created_at, f.updated_at
       FROM public.transport_fuel_entries f
       LEFT JOIN public.transport_vehicles v ON v.id = f.vehicle_id
       LEFT JOIN public.transport_drivers d ON d.id = f.driver_id
      WHERE f.company_id = $1 AND f.archived_at IS NULL
        AND f.entry_date >= current_date - ($2 || ' days')::interval
      ORDER BY f.entry_date DESC, f.created_at DESC`,
    [companyId, sinceDays],
  );
}

export async function listDutyDays(
  companyId: string,
  fromDays = 0,
  toDays = 7,
): Promise<import("./types").DutyDay[]> {
  return q<import("./types").DutyDay>(
    `SELECT u.id, u.driver_id, d.full_name AS driver_name, u.duty_date, u.duty_kind,
            u.route, u.vehicle_id, v.plate AS vehicle_plate,
            u.shift_start::text AS shift_start, u.shift_end::text AS shift_end,
            u.notes, u.created_at, u.updated_at
       FROM public.transport_duty_days u
       LEFT JOIN public.transport_drivers d ON d.id = u.driver_id
       LEFT JOIN public.transport_vehicles v ON v.id = u.vehicle_id
      WHERE u.company_id = $1 AND u.archived_at IS NULL
        AND u.duty_date >= current_date - ($2 || ' days')::interval
        AND u.duty_date <= current_date + ($3 || ' days')::interval
      ORDER BY u.duty_date DESC, d.full_name`,
    [companyId, fromDays, toDays],
  );
}

// ── Approvals ─────────────────────────────────────────────────────────────


export async function decideRequest(
  companyId: string,
  id: string,
  decision: "approved" | "rejected" | "closed",
  userId: string,
  note: string | null,
): Promise<void> {
  await q(
    `UPDATE public.transport_requests
        SET status = $3,
            decision_note = $4,
            approved_by = $5,
            approved_at = now(),
            closed_at = CASE WHEN $3 = 'closed' THEN now() ELSE closed_at END
      WHERE id = $1 AND company_id = $2`,
    [id, companyId, decision, note, userId],
  );
}

export async function decideIncident(
  companyId: string,
  id: string,
  status: Incident["status"],
  userId: string,
  actionAgreed: string | null,
): Promise<void> {
  await q(
    `UPDATE public.transport_incidents
        SET status = $3,
            action_agreed = COALESCE($4, action_agreed),
            approved_by = $5,
            approved_at = now(),
            closed_at = CASE WHEN $3 IN ('closed','cancelled') THEN now() ELSE closed_at END
      WHERE id = $1 AND company_id = $2`,
    [id, companyId, status, actionAgreed, userId],
  );
}

// ── Notes ─────────────────────────────────────────────────────────────────

export async function listNotes(
  companyId: string,
  ownerKind: string,
  ownerId: string,
): Promise<TransportNote[]> {
  return q<TransportNote>(
    `SELECT id, owner_kind, owner_id, body, author_name, created_at
       FROM public.transport_notes
      WHERE company_id = $1 AND owner_kind = $2 AND owner_id = $3
      ORDER BY created_at DESC`,
    [companyId, ownerKind, ownerId],
  );
}

export async function addNote(
  companyId: string,
  ownerKind: string,
  ownerId: string,
  body: string,
  userId: string,
  authorName: string | null,
): Promise<void> {
  await q(
    `INSERT INTO public.transport_notes
       (company_id, owner_kind, owner_id, body, author_user_id, author_name)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [companyId, ownerKind, ownerId, body, userId, authorName],
  );
}

// ── Weekly audit ──────────────────────────────────────────────────────────

export async function listChecklistItems(companyId: string): Promise<ChecklistItem[]> {
  return q<ChecklistItem>(
    `SELECT id, label, hint, scope, position, required, active, value_kind, value_unit,
            value_min, value_max, per_asset, template_key
       FROM public.transport_checklist_items
      WHERE company_id = $1
      ORDER BY position, created_at`,
    [companyId],
  );
}

export async function upsertChecklistItem(
  companyId: string,
  userId: string,
  input: {
    id?: string;
    label: string;
    hint?: string | null;
    scope?: ChecklistItem["scope"];
    position?: number;
    required?: boolean;
    active?: boolean;
    valueKind?: ChecklistItem["value_kind"];
    valueUnit?: string | null;
    valueMin?: number | null;
    valueMax?: number | null;
    perAsset?: boolean;
    templateKey?: string | null;
  },
): Promise<void> {
  if (input.id) {
    await q(
      `UPDATE public.transport_checklist_items
          SET label = $3, hint = $4, scope = $5, position = $6, required = $7, active = $8,
              value_kind = $9, value_unit = $10, value_min = $11, value_max = $12,
              per_asset = $13
        WHERE id = $1 AND company_id = $2`,
      [
        input.id,
        companyId,
        input.label,
        input.hint ?? null,
        input.scope ?? "general",
        input.position ?? 0,
        input.required ?? true,
        input.active ?? true,
        input.valueKind ?? "none",
        input.valueUnit ?? null,
        input.valueMin ?? null,
        input.valueMax ?? null,
        input.perAsset ?? false,
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.transport_checklist_items
       (company_id, label, hint, scope, position, required, active, created_by,
        value_kind, value_unit, value_min, value_max, per_asset, template_key)
     VALUES ($1,$2,$3,$4,COALESCE($5, (
        SELECT COALESCE(MAX(position),0)+1 FROM public.transport_checklist_items WHERE company_id = $1
     )),$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      companyId,
      input.label,
      input.hint ?? null,
      input.scope ?? "general",
      input.position ?? null,
      input.required ?? true,
      input.active ?? true,
      userId,
      input.valueKind ?? "none",
      input.valueUnit ?? null,
      input.valueMin ?? null,
      input.valueMax ?? null,
      input.perAsset ?? false,
      input.templateKey ?? null,
    ],
  );
}

export async function deleteChecklistItem(companyId: string, id: string): Promise<void> {
  await q(
    `DELETE FROM public.transport_checklist_items WHERE id = $1 AND company_id = $2`,
    [id, companyId],
  );
}

export async function listChecks(companyId: string): Promise<WeeklyCheck[]> {
  return q<WeeklyCheck>(
    `SELECT id, period_start, due_on, status, summary, ran_by_name, completed_at, created_at,
            signed_by_name, signed_at, approved_by_name, approved_at
       FROM public.transport_checks
      WHERE company_id = $1
      ORDER BY period_start DESC, created_at DESC
      LIMIT 30`,
    [companyId],
  );
}

/** Start (or reuse) the audit run for the given week and seed its results. */
export async function startCheck(
  companyId: string,
  userId: string,
  who: string | null,
  periodStart: string,
  dueOn?: string | null,
): Promise<string> {
  const existing = await one<{ id: string }>(
    `SELECT id FROM public.transport_checks
      WHERE company_id = $1 AND period_start = $2 AND status = 'in_progress'
      LIMIT 1`,
    [companyId, periodStart],
  );
  if (existing) return existing.id;

  await ensureStarterChecklist(companyId, userId);

  const created = await one<{ id: string }>(
    `INSERT INTO public.transport_checks
       (company_id, period_start, due_on, ran_by, ran_by_name)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [companyId, periodStart, dueOn ?? null, userId, who],
  );
  if (!created) throw new Error("Could not start the weekly audit.");

  // Plain lines: one per checklist item.
  await q(
    `INSERT INTO public.transport_check_results
       (check_id, item_id, item_label, value_kind, value_unit, value_min, value_max)
     SELECT $2, id, label, value_kind, value_unit, value_min, value_max
       FROM public.transport_checklist_items
      WHERE company_id = $1 AND active = true AND per_asset = false
      ORDER BY position`,
    [companyId, created.id],
  );

  // Per-asset lines: one per active vehicle / driver in the item's scope.
  await q(
    `INSERT INTO public.transport_check_results
       (check_id, item_id, item_label, value_kind, value_unit, value_min, value_max,
        subject_kind, subject_id, subject_label)
     SELECT $2, i.id, i.label, i.value_kind, i.value_unit, i.value_min, i.value_max,
            'vehicle', v.id, v.plate
       FROM public.transport_checklist_items i
       JOIN public.transport_vehicles v
         ON v.company_id IS NOT DISTINCT FROM i.company_id
        AND v.archived_at IS NULL AND v.status <> 'inactive'
      WHERE i.company_id = $1 AND i.active = true AND i.per_asset = true AND i.scope = 'vehicle'
      ORDER BY i.position, v.plate`,
    [companyId, created.id],
  );
  await q(
    `INSERT INTO public.transport_check_results
       (check_id, item_id, item_label, value_kind, value_unit, value_min, value_max,
        subject_kind, subject_id, subject_label)
     SELECT $2, i.id, i.label, i.value_kind, i.value_unit, i.value_min, i.value_max,
            'driver', d.id, d.full_name
       FROM public.transport_checklist_items i
       JOIN public.transport_drivers d
         ON d.company_id IS NOT DISTINCT FROM i.company_id
        AND d.archived_at IS NULL AND d.status <> 'inactive'
      WHERE i.company_id = $1 AND i.active = true AND i.per_asset = true AND i.scope = 'driver'
      ORDER BY i.position, d.full_name`,
    [companyId, created.id],
  );
  return created.id;
}

export async function listCheckResults(checkId: string): Promise<CheckResult[]> {
  const rows = await q<Omit<CheckResult, "evidence">>(
    `SELECT r.id, r.check_id, r.item_id, r.item_label, r.outcome, r.note, r.checked_at,
            r.incident_id, r.request_id, r.value_kind, r.value_unit,
            r.value_text, r.value_number, r.value_min, r.value_max, r.out_of_range,
            r.subject_kind, r.subject_id, r.subject_label
       FROM public.transport_check_results r
      WHERE r.check_id = $1
      ORDER BY r.created_at`,
    [checkId],
  );
  const evidence = await listCheckEvidence(checkId);
  return rows.map((row) => ({
    ...row,
    evidence: evidence.filter((e) => e.result_id === row.id),
  }));
}

/** Evidence metadata for every line of a run (never the bytes). */
export async function listCheckEvidence(checkId: string): Promise<CheckEvidence[]> {
  return q<CheckEvidence>(
    `SELECT e.id, e.result_id, e.filename, e.mime, e.size_bytes,
            e.uploaded_by_name, e.created_at
       FROM public.transport_check_evidence e
       JOIN public.transport_check_results r ON r.id = e.result_id
      WHERE r.check_id = $1
      ORDER BY e.created_at`,
    [checkId],
  );
}

export async function addCheckEvidence(
  companyId: string,
  resultId: string,
  file: { filename: string; mime: string; bytes: Buffer },
  userId: string,
  who: string | null,
): Promise<{ id: string }> {
  const owned = await one<{ id: string }>(
    `SELECT r.id FROM public.transport_check_results r
       JOIN public.transport_checks c ON c.id = r.check_id
      WHERE r.id = $1 AND c.company_id = $2`,
    [resultId, companyId],
  );
  if (!owned) throw new Error("Checklist line not found.");
  const created = await one<{ id: string }>(
    `INSERT INTO public.transport_check_evidence
       (company_id, result_id, filename, mime, size_bytes, data, uploaded_by, uploaded_by_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      companyId,
      resultId,
      file.filename,
      file.mime,
      file.bytes.byteLength,
      file.bytes,
      userId,
      who,
    ],
  );
  if (!created) throw new Error("Could not store the evidence file.");
  return { id: created.id };
}

export async function deleteCheckEvidence(
  companyId: string,
  evidenceId: string,
): Promise<void> {
  await q(
    `DELETE FROM public.transport_check_evidence e
      WHERE e.id = $1
        AND EXISTS (SELECT 1 FROM public.transport_check_results r
                      JOIN public.transport_checks c ON c.id = r.check_id
                     WHERE r.id = e.result_id AND c.company_id = $2)`,
    [evidenceId, companyId],
  );
}

/** Evidence bytes, for download or PDF embedding. */
export async function getCheckEvidenceFile(
  companyId: string,
  evidenceId: string,
): Promise<{ filename: string; mime: string; bytes: Buffer } | null> {
  const row = await one<{ filename: string; mime: string; data: Buffer }>(
    `SELECT e.filename, e.mime, e.data
       FROM public.transport_check_evidence e
       JOIN public.transport_check_results r ON r.id = e.result_id
       JOIN public.transport_checks c ON c.id = r.check_id
      WHERE e.id = $1 AND c.company_id = $2`,
    [evidenceId, companyId],
  );
  if (!row) return null;
  return { filename: row.filename, mime: row.mime, bytes: Buffer.from(row.data) };
}

/** Aggregated audit history for trend charts (oldest first). */
export async function auditTrends(
  companyId: string,
  limit = 12,
): Promise<AuditTrendPoint[]> {
  const rows = await q<AuditTrendPoint>(
    `SELECT c.id AS check_id, c.period_start, c.status,
            count(r.id)::int AS total,
            count(r.id) FILTER (WHERE r.outcome = 'ok')::int AS ok,
            count(r.id) FILTER (WHERE r.outcome = 'issue')::int AS issues,
            count(r.id) FILTER (WHERE r.outcome = 'not_applicable')::int AS not_applicable,
            count(r.id) FILTER (WHERE r.outcome = 'pending')::int AS pending,
            count(r.id) FILTER (WHERE r.out_of_range)::int AS out_of_range,
            CASE WHEN count(r.id) = 0 THEN 0
                 ELSE round(100.0 * count(r.id) FILTER (WHERE r.outcome <> 'pending')
                            / count(r.id))::int END AS completion
       FROM public.transport_checks c
       LEFT JOIN public.transport_check_results r ON r.check_id = c.id
      WHERE c.company_id = $1
      GROUP BY c.id, c.period_start, c.status
      ORDER BY c.period_start DESC
      LIMIT $2`,
    [companyId, limit],
  );
  return rows.reverse();
}

export async function setCheckResult(
  companyId: string,
  resultId: string,
  outcome: CheckResult["outcome"],
  note: string | null,
  userId: string,
  value?: { text?: string | null; number?: number | null },
): Promise<void> {
  await q(
    `UPDATE public.transport_check_results r
        SET outcome = $3, note = $4, checked_by = $5, checked_at = now(),
            value_text = COALESCE($6, r.value_text),
            value_number = COALESCE($7, r.value_number)
      WHERE r.id = $1
        AND EXISTS (SELECT 1 FROM public.transport_checks c
                     WHERE c.id = r.check_id AND c.company_id = $2)`,
    [resultId, companyId, outcome, note, userId, value?.text ?? null, value?.number ?? null],
  );
}

/** Record only the measured value for a checklist line (keeps the outcome). */
export async function setCheckResultValue(
  companyId: string,
  resultId: string,
  value: { text?: string | null; number?: number | null },
  userId: string,
): Promise<void> {
  // Out-of-range numeric readings fail the line automatically, so an audit
  // cannot be closed with a measured value outside the accepted limits.
  await q(
    `UPDATE public.transport_check_results r
        SET value_text = $3, value_number = $4, checked_by = $5, checked_at = now(),
            out_of_range = (
              $4::double precision IS NOT NULL
              AND ((r.value_min IS NOT NULL AND $4::double precision < r.value_min)
                OR (r.value_max IS NOT NULL AND $4::double precision > r.value_max))
            ),
            outcome = CASE
              WHEN $4::double precision IS NOT NULL
               AND ((r.value_min IS NOT NULL AND $4::double precision < r.value_min)
                 OR (r.value_max IS NOT NULL AND $4::double precision > r.value_max))
              THEN 'issue'
              WHEN r.outcome = 'pending' AND ($3 IS NOT NULL OR $4::double precision IS NOT NULL)
              THEN 'ok'
              ELSE r.outcome END
      WHERE r.id = $1
        AND EXISTS (SELECT 1 FROM public.transport_checks c
                     WHERE c.id = r.check_id AND c.company_id = $2)`,
    [resultId, companyId, value.text ?? null, value.number ?? null, userId],
  );
}

/** Auditor signature at closure (who performed the audit). */
export async function signCheck(
  companyId: string,
  checkId: string,
  userId: string,
  who: string | null,
): Promise<void> {
  await q(
    `UPDATE public.transport_checks
        SET signed_by = $3, signed_by_name = $4, signed_at = now()
      WHERE id = $1 AND company_id = $2`,
    [checkId, companyId, userId, who],
  );
}

/** Approver signature (second pair of eyes) on a completed audit. */
export async function approveCheck(
  companyId: string,
  checkId: string,
  userId: string,
  who: string | null,
): Promise<void> {
  await q(
    `UPDATE public.transport_checks
        SET approved_by = $3, approved_by_name = $4, approved_at = now()
      WHERE id = $1 AND company_id = $2 AND status = 'completed'`,
    [checkId, companyId, userId, who],
  );
}

/** Stop an in-progress run for the period without completing it. */
export async function cancelCheck(
  companyId: string,
  checkId: string,
  reason: string | null,
): Promise<void> {
  await q(
    `UPDATE public.transport_checks
        SET status = 'cancelled', summary = COALESCE($3, summary), completed_at = now()
      WHERE id = $1 AND company_id = $2 AND status = 'in_progress'`,
    [checkId, companyId, reason],
  );
}

export async function completeCheck(
  companyId: string,
  checkId: string,
  summary: string | null,
): Promise<void> {
  await q(
    `UPDATE public.transport_checks
        SET status = 'completed', summary = $3, completed_at = now()
      WHERE id = $1 AND company_id = $2`,
    [checkId, companyId, summary],
  );
}

/** Editable starter checklist, seeded once when a company has no items yet. */
const STARTER_CHECKLIST: ReadonlyArray<{
  label: string;
  hint: string;
  scope: ChecklistItem["scope"];
}> = [
  {
    label: "Vehicle inspections (ITP / TUV) valid",
    hint: "No vehicle inspection expired or expiring inside the alert window.",
    scope: "vehicle",
  },
  {
    label: "Driver documents valid",
    hint: "Licences, medical certificates and driver cards are in date.",
    scope: "driver",
  },
  {
    label: "Vehicle condition and equipment checked",
    hint: "Tyres, lights, load securing and mandatory equipment present.",
    scope: "vehicle",
  },
  {
    label: "Open incidents reviewed",
    hint: "Every open incident has an owner and an agreed action.",
    scope: "general",
  },
  {
    label: "Carrier documents and insurance valid",
    hint: "Licences and insurance for subcontracted carriers are current.",
    scope: "carrier",
  },
];

export async function ensureStarterChecklist(
  companyId: string,
  userId: string,
): Promise<number> {
  const existing = await one<{ n: string }>(
    `SELECT count(*)::text AS n FROM public.transport_checklist_items WHERE company_id = $1`,
    [companyId],
  );
  if (Number(existing?.n ?? "0") > 0) return 0;
  let position = 1;
  for (const item of STARTER_CHECKLIST) {
    await q(
      `INSERT INTO public.transport_checklist_items
         (company_id, label, hint, scope, position, required, active, created_by)
       VALUES ($1,$2,$3,$4,$5,true,true,$6)`,
      [companyId, item.label, item.hint, item.scope, position, userId],
    );
    position += 1;
  }
  return STARTER_CHECKLIST.length;
}

/** Reusable audit templates a company can add on top of its own checklist. */
export const CHECKLIST_TEMPLATES: ReadonlyArray<{
  key: string;
  label: string;
  items: ReadonlyArray<{
    label: string;
    hint: string;
    scope: ChecklistItem["scope"];
    perAsset?: boolean;
    valueKind?: ChecklistItem["value_kind"];
    valueUnit?: string;
    valueMin?: number;
    valueMax?: number;
  }>;
}> = [
  {
    key: "roadworthiness",
    label: "Roadworthiness (ITP / TUV)",
    items: [
      {
        label: "Inspection certificate valid",
        hint: "Certificate present and not expiring inside the alert window.",
        scope: "vehicle",
        perAsset: true,
      },
      {
        label: "Tyre tread depth",
        hint: "Minimum legal tread depth on all axles.",
        scope: "vehicle",
        perAsset: true,
        valueKind: "number",
        valueUnit: "mm",
        valueMin: 1.6,
        valueMax: 20,
      },
      {
        label: "Brake test result",
        hint: "Service brake efficiency from the last test.",
        scope: "vehicle",
        perAsset: true,
        valueKind: "number",
        valueUnit: "%",
        valueMin: 50,
        valueMax: 100,
      },
      {
        label: "Lights and signalling working",
        hint: "All lamps, indicators and reflectors operational.",
        scope: "vehicle",
        perAsset: true,
      },
    ],
  },
  {
    key: "cargo_safety",
    label: "Cargo safety",
    items: [
      {
        label: "Load securing equipment complete",
        hint: "Straps, bars and mats present and undamaged.",
        scope: "vehicle",
        perAsset: true,
      },
      {
        label: "Gross weight within limit",
        hint: "Loaded weight of the last trip.",
        scope: "vehicle",
        perAsset: true,
        valueKind: "number",
        valueUnit: "t",
        valueMax: 40,
      },
      {
        label: "Dangerous goods documents",
        hint: "ADR paperwork and equipment where applicable.",
        scope: "general",
      },
      {
        label: "Temperature log reviewed",
        hint: "Reefer readings for temperature-controlled loads.",
        scope: "general",
        valueKind: "number",
        valueUnit: "degC",
        valueMin: -25,
        valueMax: 8,
      },
    ],
  },
  {
    key: "tachograph",
    label: "Tachograph & driving hours",
    items: [
      {
        label: "Driver card downloaded",
        hint: "Data downloaded inside the legal interval.",
        scope: "driver",
        perAsset: true,
      },
      {
        label: "Driving-time infringements reviewed",
        hint: "Count of infringements in the period.",
        scope: "driver",
        perAsset: true,
        valueKind: "number",
        valueUnit: "count",
        valueMax: 0,
      },
      {
        label: "Weekly rest respected",
        hint: "Reduced rests compensated as required.",
        scope: "driver",
        perAsset: true,
      },
      {
        label: "Tachograph calibration valid",
        hint: "Two-year calibration seal in date.",
        scope: "vehicle",
        perAsset: true,
      },
    ],
  },
];

/** Add a template's lines, skipping labels the company already has. */
export async function applyChecklistTemplate(
  companyId: string,
  userId: string,
  key: string,
): Promise<number> {
  const template = CHECKLIST_TEMPLATES.find((t) => t.key === key);
  if (!template) throw new Error("Unknown checklist template.");
  const existing = await q<{ label: string }>(
    `SELECT label FROM public.transport_checklist_items WHERE company_id = $1`,
    [companyId],
  );
  const have = new Set(existing.map((r) => r.label.trim().toLowerCase()));
  let added = 0;
  for (const item of template.items) {
    if (have.has(item.label.trim().toLowerCase())) continue;
    await upsertChecklistItem(companyId, userId, {
      label: item.label,
      hint: item.hint,
      scope: item.scope,
      required: true,
      active: true,
      perAsset: item.perAsset ?? false,
      valueKind: item.valueKind ?? "none",
      valueUnit: item.valueUnit ?? null,
      valueMin: item.valueMin ?? null,
      valueMax: item.valueMax ?? null,
      templateKey: template.key,
    });
    added += 1;
  }
  return added;
}

/** Turn a failed checklist line into an incident or a request, and link it. */
export async function escalateCheckResult(
  companyId: string,
  resultId: string,
  kind: "incident" | "request",
  userId: string,
): Promise<{ id: string; kind: "incident" | "request" }> {
  const row = await one<{
    item_label: string;
    note: string | null;
    period_start: string;
    incident_id: string | null;
    request_id: string | null;
  }>(
    `SELECT r.item_label, r.note, c.period_start, r.incident_id, r.request_id
       FROM public.transport_check_results r
       JOIN public.transport_checks c ON c.id = r.check_id
      WHERE r.id = $1 AND c.company_id = $2`,
    [resultId, companyId],
  );
  if (!row) throw new Error("Checklist line not found.");
  const existing = kind === "incident" ? row.incident_id : row.request_id;
  if (existing) return { id: existing, kind };

  const period =
    typeof row.period_start === "string" ? row.period_start.slice(0, 10) : String(row.period_start);
  const title = `${row.item_label} (audit ${period})`;
  const description = row.note ?? "Raised from the periodic transport audit.";

  if (kind === "incident") {
    const created = await createRecord("incidents", companyId, userId, {
      title,
      category: "compliance",
      severity: "medium",
      status: "reported",
      description,
    });
    await q(
      `UPDATE public.transport_check_results SET incident_id = $2 WHERE id = $1`,
      [resultId, created.id],
    );
    return { id: created.id, kind };
  }

  const created = await createRecord("requests", companyId, userId, {
    title,
    kind: "exception",
    priority: "high",
    status: "open",
    description,
  });
  await q(
    `UPDATE public.transport_check_results SET request_id = $2 WHERE id = $1`,
    [resultId, created.id],
  );
  return { id: created.id, kind };
}

/** Everything the compliance report needs for one audit run. */
export async function getCheckForReport(
  companyId: string,
  checkId: string,
): Promise<{ check: WeeklyCheck; results: CheckResult[] } | null> {
  const check = await one<WeeklyCheck>(
    `SELECT id, period_start, due_on, status, summary, ran_by_name, completed_at, created_at,
            signed_by_name, signed_at, approved_by_name, approved_at
       FROM public.transport_checks WHERE id = $1 AND company_id = $2`,
    [checkId, companyId],
  );
  if (!check) return null;
  const results = await listCheckResults(checkId);
  return { check, results };
}

// ── Map ───────────────────────────────────────────────────────────────────

export async function listZones(companyId: string): Promise<MapZone[]> {
  return q<MapZone>(
    `SELECT id, name, color, description, center_lat, center_lng, radius_km
       FROM public.transport_zones WHERE company_id = $1 ORDER BY name`,
    [companyId],
  );
}

export async function listMapPins(companyId: string): Promise<MapPin[]> {
  const [vehicles, drivers, carriers, incidents] = await Promise.all([
    q<MapPin>(
      `SELECT id, 'vehicle'::text AS kind, plate AS label, base_location AS sub,
              latitude AS lat, longitude AS lng, status
         FROM public.transport_vehicles
        WHERE company_id = $1 AND archived_at IS NULL
          AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [companyId],
    ),
    q<MapPin>(
      `SELECT id, 'driver'::text AS kind, full_name AS label, base_location AS sub,
              latitude AS lat, longitude AS lng, status
         FROM public.transport_drivers
        WHERE company_id = $1 AND archived_at IS NULL
          AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [companyId],
    ),
    q<MapPin>(
      `SELECT id, 'carrier'::text AS kind, name AS label, address AS sub,
              latitude AS lat, longitude AS lng, status
         FROM public.transport_carriers
        WHERE company_id = $1 AND archived_at IS NULL
          AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [companyId],
    ),
    q<MapPin>(
      `SELECT id, 'incident'::text AS kind, title AS label, location AS sub,
              latitude AS lat, longitude AS lng, severity, status
         FROM public.transport_incidents
        WHERE company_id = $1 AND status NOT IN ('closed','cancelled')
          AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      [companyId],
    ),
  ]);
  return [...vehicles, ...drivers, ...carriers, ...incidents];
}

export interface PlaceHit {
  lat: number;
  lng: number;
  label: string;
  source: string;
}

/**
 * Search a free-text location. Local cache first (works offline), then the
 * public OpenStreetMap search service unless the installation switched the
 * search provider off.
 */
export async function searchPlaces(
  companyId: string,
  query: string,
  limit = 6,
): Promise<PlaceHit[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const cached = await q<{
    latitude: number;
    longitude: number;
    label: string | null;
    source: string;
  }>(
    `SELECT latitude, longitude, label, source
       FROM public.transport_places
      WHERE query LIKE '%' || $1 || '%' OR lower(COALESCE(label,'')) LIKE '%' || $1 || '%'
      ORDER BY pinned DESC, created_at DESC
      LIMIT $2`,
    [normalized, limit],
  );
  const local: PlaceHit[] = cached.map((c) => ({
    lat: Number(c.latitude),
    lng: Number(c.longitude),
    label: c.label ?? query,
    source: c.source,
  }));

  const settings = await getSettings(companyId);
  if (settings.searchProvider === "off") return local;

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "OPSQAI-Transport", Accept: "application/json" },
    });
    if (!res.ok) return local;
    const body = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const remote: PlaceHit[] = [];
    for (const hit of Array.isArray(body) ? body : []) {
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      remote.push({
        lat,
        lng,
        label: hit.display_name ?? query,
        source: "geocode",
      });
    }
    if (remote[0]) {
      await q(
        `INSERT INTO public.transport_places (company_id, query, label, latitude, longitude, source)
         VALUES ($1,$2,$3,$4,$5,'geocode')
         ON CONFLICT (query) DO NOTHING`,
        [companyId, normalized, remote[0].label, remote[0].lat, remote[0].lng],
      );
    }
    const seen = new Set(local.map((l) => `${l.lat.toFixed(4)}:${l.lng.toFixed(4)}`));
    return [
      ...local,
      ...remote.filter(
        (r) => !seen.has(`${r.lat.toFixed(4)}:${r.lng.toFixed(4)}`),
      ),
    ].slice(0, limit * 2);
  } catch {
    return local;
  }
}

/** Backwards-compatible single-hit lookup. */
export async function geocode(
  companyId: string,
  query: string,
): Promise<PlaceHit | null> {
  const hits = await searchPlaces(companyId, query, 1);
  return hits[0] ?? null;
}


export async function savePlace(
  companyId: string,
  query: string,
  lat: number,
  lng: number,
): Promise<void> {
  await q(
    `INSERT INTO public.transport_places (company_id, query, label, latitude, longitude, source)
     VALUES ($1,$2,$2,$3,$4,'manual')
     ON CONFLICT (query) DO UPDATE SET latitude = EXCLUDED.latitude,
                                       longitude = EXCLUDED.longitude,
                                       source = 'manual'`,
    [companyId, query.trim().toLowerCase(), lat, lng],
  );
}

// ── CMR ───────────────────────────────────────────────────────────────────

const CMR_COLUMNS = [
  "country",
  "language",
  "sender_name",
  "sender_address",
  "consignee_name",
  "consignee_address",
  "carrier_id",
  "carrier_name",
  "carrier_address",
  "successive_carrier",
  "vehicle_id",
  "vehicle_plate",
  "trailer_plate",
  "driver_id",
  "driver_name",
  "place_of_loading",
  "loading_on",
  "place_of_delivery",
  "delivery_on",
  "goods",
  "packages",
  "gross_weight_kg",
  "volume_m3",
  "instructions",
  "payment_terms",
  "reservations",
  "documents_attached",
  "special_agreements",
  "established_at",
  "established_in",
  "signature_sender",
  "signature_carrier",
  "signature_consignee",
];

const CMR_SELECT = `id, number, country, language, status, sender_name, sender_address,
  consignee_name, consignee_address, carrier_id, carrier_name, carrier_address,
  successive_carrier, vehicle_id, vehicle_plate, trailer_plate, driver_id, driver_name,
  place_of_loading, loading_on, place_of_delivery, delivery_on, goods, packages,
  gross_weight_kg, volume_m3, instructions, payment_terms, reservations,
  documents_attached, special_agreements, established_at, established_in,
  signature_sender, signature_carrier, signature_consignee, issued_at,
  created_at, updated_at`;

export async function listCmr(companyId: string): Promise<CmrRecord[]> {
  return q<CmrRecord>(
    `SELECT ${CMR_SELECT} FROM public.transport_cmr
      WHERE company_id = $1 ORDER BY created_at DESC LIMIT 200`,
    [companyId],
  );
}

export async function getCmr(companyId: string, id: string): Promise<CmrRecord | null> {
  return one<CmrRecord>(
    `SELECT ${CMR_SELECT} FROM public.transport_cmr WHERE id = $1 AND company_id = $2`,
    [id, companyId],
  );
}

function pickCmr(values: Record<string, unknown>) {
  const cols: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (!CMR_COLUMNS.includes(k) || v === undefined) continue;
    cols.push(k);
    params.push(k === "goods" ? JSON.stringify(v ?? []) : v === "" ? null : v);
  }
  return { cols, params };
}

export async function createCmr(
  companyId: string,
  userId: string,
  values: Record<string, unknown>,
): Promise<{ id: string }> {
  const { cols, params } = pickCmr(values);
  const all = ["company_id", "created_by", ...cols];
  const row = await one<{ id: string }>(
    `INSERT INTO public.transport_cmr (${all.join(", ")})
     VALUES (${all.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
    [companyId, userId, ...params],
  );
  if (!row) throw new Error("Could not create the consignment note.");
  return row;
}

export async function updateCmr(
  companyId: string,
  id: string,
  values: Record<string, unknown>,
): Promise<void> {
  const { cols, params } = pickCmr(values);
  if (!cols.length) return;
  await q(
    `UPDATE public.transport_cmr SET ${cols.map((c, i) => `${c} = $${i + 3}`).join(", ")}
      WHERE id = $1 AND company_id = $2 AND status <> 'cancelled'`,
    [id, companyId, ...params],
  );
}

/** Allocate the next number in the local series and mark the note as issued. */
export async function issueCmr(companyId: string, id: string): Promise<string> {
  const settings = await getSettings(companyId);
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO public.transport_cmr_series (company_id, prefix)
       VALUES ($1,$2) ON CONFLICT (company_id) DO NOTHING`,
      [companyId, settings.cmrPrefix],
    );
    const seq = await client.query<{ prefix: string; next_number: number }>(
      `UPDATE public.transport_cmr_series
          SET next_number = next_number + 1, updated_at = now()
        WHERE company_id = $1
        RETURNING prefix, next_number - 1 AS next_number`,
      [companyId],
    );
    const row = seq.rows[0];
    const number = `${row?.prefix ?? settings.cmrPrefix}-${String(row?.next_number ?? 1).padStart(5, "0")}`;
    await client.query(
      `UPDATE public.transport_cmr
          SET number = COALESCE(number, $3), status = 'issued', issued_at = now()
        WHERE id = $1 AND company_id = $2`,
      [id, companyId, number],
    );
    await client.query("COMMIT");
    return number;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function cancelCmr(companyId: string, id: string): Promise<void> {
  await q(
    `UPDATE public.transport_cmr SET status = 'cancelled', cancelled_at = now()
      WHERE id = $1 AND company_id = $2`,
    [id, companyId],
  );
}

// ── Expiry alerts ─────────────────────────────────────────────────────────

export async function expiryAlerts(companyId: string): Promise<ExpiryAlert[]> {
  const settings = await getSettings(companyId);
  const horizon = Math.max(...settings.alertWindows, 30);
  const rows = await q<{
    document_id: string;
    owner_kind: ExpiryAlert["ownerKind"];
    owner_id: string;
    owner_label: string | null;
    doc_type: string;
    doc_label: string | null;
    expires_on: string;
    days_left: number;
  }>(
    `SELECT d.id AS document_id, d.owner_kind, d.owner_id,
            COALESCE(v.plate, dr.full_name, c.name) AS owner_label,
            d.doc_type, d.label AS doc_label,
            to_char(d.expires_on, 'YYYY-MM-DD') AS expires_on,
            (d.expires_on - CURRENT_DATE) AS days_left
       FROM public.transport_documents d
       LEFT JOIN public.transport_vehicles v
              ON d.owner_kind = 'vehicle' AND v.id = d.owner_id
       LEFT JOIN public.transport_drivers dr
              ON d.owner_kind = 'driver' AND dr.id = d.owner_id
       LEFT JOIN public.transport_carriers c
              ON d.owner_kind = 'carrier' AND c.id = d.owner_id
      WHERE d.company_id = $1
        AND d.expires_on IS NOT NULL
        AND d.expires_on <= CURRENT_DATE + ($2 || ' days')::interval
      ORDER BY d.expires_on`,
    [companyId, horizon],
  );

  const pack = countryPack(settings.country);
  return rows.map((r) => ({
    documentId: r.document_id,
    ownerKind: r.owner_kind,
    ownerId: r.owner_id,
    ownerLabel: r.owner_label ?? "—",
    docType: r.doc_type,
    docLabel:
      r.doc_label ??
      pack.docTypes.find((d) => d.key === r.doc_type)?.label.en ??
      r.doc_type,
    expiresOn: r.expires_on,
    daysLeft: Number(r.days_left),
    level:
      Number(r.days_left) < 0
        ? "expired"
        : Number(r.days_left) <= 14
          ? "critical"
          : Number(r.days_left) <= 30
            ? "warning"
            : "watch",
  }));
}

export async function counts(companyId: string) {
  const row = await one<{
    vehicles: string;
    drivers: string;
    carriers: string;
    open_incidents: string;
    open_requests: string;
    pending_approvals: string;
    documents: string;
  }>(
    `SELECT
       (SELECT count(*) FROM public.transport_vehicles WHERE company_id = $1 AND archived_at IS NULL) AS vehicles,
       (SELECT count(*) FROM public.transport_drivers WHERE company_id = $1 AND archived_at IS NULL) AS drivers,
       (SELECT count(*) FROM public.transport_carriers WHERE company_id = $1 AND archived_at IS NULL) AS carriers,
       (SELECT count(*) FROM public.transport_incidents WHERE company_id = $1 AND status NOT IN ('closed','cancelled')) AS open_incidents,
       (SELECT count(*) FROM public.transport_requests WHERE company_id = $1 AND status IN ('open','in_review')) AS open_requests,
       (SELECT count(*) FROM public.transport_requests WHERE company_id = $1 AND status = 'in_review') AS pending_approvals,
       (SELECT count(*) FROM public.transport_documents WHERE company_id = $1) AS documents`,
    [companyId],
  );
  return {
    vehicles: Number(row?.vehicles ?? 0),
    drivers: Number(row?.drivers ?? 0),
    carriers: Number(row?.carriers ?? 0),
    openIncidents: Number(row?.open_incidents ?? 0),
    openRequests: Number(row?.open_requests ?? 0),
    pendingApprovals: Number(row?.pending_approvals ?? 0),
    documents: Number(row?.documents ?? 0),
  };
}

export async function lastCheck(companyId: string): Promise<WeeklyCheck | null> {
  return one<WeeklyCheck>(
    `SELECT id, period_start, due_on, status, summary, ran_by_name, completed_at, created_at,
            signed_by_name, signed_at, approved_by_name, approved_at
       FROM public.transport_checks WHERE company_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [companyId],
  );
}

// ── GPS / telematics devices ──────────────────────────────────────────────

export interface GpsDevice {
  id: string;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  provider: string;
  device_id: string;
  label: string | null;
  api_base_url: string | null;
  poll_minutes: number;
  active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_speed_kph: number | null;
  last_fix_at: string | null;
}

const GPS_SELECT = `d.id, d.vehicle_id, v.plate AS vehicle_plate, d.provider, d.device_id,
  d.label, d.api_base_url, d.poll_minutes, d.active, d.last_sync_at, d.last_error,
  d.last_lat, d.last_lng, d.last_speed_kph, d.last_fix_at`;

export async function listGpsDevices(companyId: string): Promise<GpsDevice[]> {
  return q<GpsDevice>(
    `SELECT ${GPS_SELECT}
       FROM public.transport_gps_devices d
       LEFT JOIN public.transport_vehicles v ON v.id = d.vehicle_id
      WHERE d.company_id = $1
      ORDER BY d.active DESC, COALESCE(v.plate, d.device_id)`,
    [companyId],
  );
}

export async function saveGpsDevice(
  companyId: string,
  userId: string,
  input: {
    id?: string;
    vehicleId?: string | null;
    provider: string;
    deviceId: string;
    label?: string | null;
    apiBaseUrl?: string | null;
    apiToken?: string | null;
    pollMinutes?: number;
    active?: boolean;
  },
): Promise<{ id: string }> {
  if (input.id) {
    await q(
      `UPDATE public.transport_gps_devices
          SET vehicle_id = $3, provider = $4, device_id = $5, label = $6,
              api_base_url = $7,
              api_token = COALESCE($8, api_token),
              poll_minutes = $9, active = $10, updated_at = now()
        WHERE id = $1 AND company_id = $2`,
      [
        input.id,
        companyId,
        input.vehicleId ?? null,
        input.provider,
        input.deviceId,
        input.label ?? null,
        input.apiBaseUrl ?? null,
        input.apiToken || null,
        input.pollMinutes ?? 10,
        input.active ?? true,
      ],
    );
    return { id: input.id };
  }
  const row = await one<{ id: string }>(
    `INSERT INTO public.transport_gps_devices
       (company_id, vehicle_id, provider, device_id, label, api_base_url,
        api_token, poll_minutes, active, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (company_id, provider, device_id) DO UPDATE
       SET vehicle_id = EXCLUDED.vehicle_id, label = EXCLUDED.label,
           api_base_url = EXCLUDED.api_base_url, updated_at = now()
     RETURNING id`,
    [
      companyId,
      input.vehicleId ?? null,
      input.provider,
      input.deviceId,
      input.label ?? null,
      input.apiBaseUrl ?? null,
      input.apiToken || null,
      input.pollMinutes ?? 10,
      input.active ?? true,
      userId,
    ],
  );
  if (!row) throw new Error("Could not save the GPS device.");
  return row;
}

export async function deleteGpsDevice(companyId: string, id: string): Promise<void> {
  await q(
    `DELETE FROM public.transport_gps_devices WHERE id = $1 AND company_id = $2`,
    [id, companyId],
  );
}

/** Record a position (manual correction, CSV import or a provider poll). */
export async function recordPosition(
  companyId: string,
  input: {
    vehicleId: string;
    deviceId?: string | null;
    lat: number;
    lng: number;
    speedKph?: number | null;
    heading?: number | null;
    source?: "manual" | "gps" | "import";
  },
): Promise<void> {
  await q(
    `INSERT INTO public.transport_positions
       (company_id, vehicle_id, device_id, latitude, longitude, speed_kph, heading, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      companyId,
      input.vehicleId,
      input.deviceId ?? null,
      input.lat,
      input.lng,
      input.speedKph ?? null,
      input.heading ?? null,
      input.source ?? "manual",
    ],
  );
  await q(
    `UPDATE public.transport_vehicles
        SET latitude = $3, longitude = $4, updated_at = now()
      WHERE id = $1 AND company_id = $2`,
    [input.vehicleId, companyId, input.lat, input.lng],
  );
  if (input.deviceId) {
    await q(
      `UPDATE public.transport_gps_devices
          SET last_lat = $3, last_lng = $4, last_speed_kph = $5,
              last_fix_at = now(), last_sync_at = now(), last_error = NULL,
              updated_at = now()
        WHERE id = $1 AND company_id = $2`,
      [input.deviceId, companyId, input.lat, input.lng, input.speedKph ?? null],
    );
  }
}

export async function listTrack(
  companyId: string,
  vehicleId: string,
  limit = 200,
): Promise<Array<{ lat: number; lng: number; recorded_at: string; speed_kph: number | null }>> {
  const rows = await q<{
    latitude: number;
    longitude: number;
    recorded_at: string;
    speed_kph: number | null;
  }>(
    `SELECT latitude, longitude, recorded_at, speed_kph
       FROM public.transport_positions
      WHERE company_id = $1 AND vehicle_id = $2
      ORDER BY recorded_at DESC
      LIMIT $3`,
    [companyId, vehicleId, limit],
  );
  return rows
    .map((r) => ({
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      recorded_at: r.recorded_at,
      speed_kph: r.speed_kph == null ? null : Number(r.speed_kph),
    }))
    .reverse();
}

/**
 * Poll a telematics provider for the current position of every active device.
 * Providers expose different shapes, so we read the common fields defensively
 * and keep the failure on the device instead of breaking the whole sync.
 */
export async function syncGpsDevices(
  companyId: string,
): Promise<{ updated: number; failed: number }> {
  const devices = await q<{
    id: string;
    vehicle_id: string | null;
    provider: string;
    device_id: string;
    api_base_url: string | null;
    api_token: string | null;
  }>(
    `SELECT id, vehicle_id, provider, device_id, api_base_url, api_token
       FROM public.transport_gps_devices
      WHERE company_id = $1 AND active = true AND provider <> 'manual'
        AND api_base_url IS NOT NULL`,
    [companyId],
  );

  let updated = 0;
  let failed = 0;
  for (const device of devices) {
    try {
      const base = (device.api_base_url ?? "").replace(/\/$/, "");
      const url = base.includes("{id}")
        ? base.replace("{id}", encodeURIComponent(device.device_id))
        : `${base}/${encodeURIComponent(device.device_id)}`;
      const res = await fetch(url, {
        headers: device.api_token
          ? { Authorization: `Bearer ${device.api_token}`, Accept: "application/json" }
          : { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Record<string, unknown>;
      const pick = (...keys: string[]): number | null => {
        for (const k of keys) {
          const v = body[k] ?? (body["position"] as Record<string, unknown>)?.[k];
          const n = Number(v);
          if (Number.isFinite(n)) return n;
        }
        return null;
      };
      const lat = pick("lat", "latitude");
      const lng = pick("lng", "lon", "longitude");
      if (lat == null || lng == null) throw new Error("No position in the response");
      if (device.vehicle_id) {
        await recordPosition(companyId, {
          vehicleId: device.vehicle_id,
          deviceId: device.id,
          lat,
          lng,
          speedKph: pick("speed", "speed_kph"),
          source: "gps",
        });
      } else {
        await q(
          `UPDATE public.transport_gps_devices
              SET last_lat = $2, last_lng = $3, last_fix_at = now(),
                  last_sync_at = now(), last_error = NULL, updated_at = now()
            WHERE id = $1`,
          [device.id, lat, lng],
        );
      }
      updated += 1;
    } catch (e) {
      failed += 1;
      await q(
        `UPDATE public.transport_gps_devices
            SET last_sync_at = now(), last_error = $2, updated_at = now()
          WHERE id = $1`,
        [device.id, e instanceof Error ? e.message : "Sync failed"],
      );
    }
  }
  return { updated, failed };
}

// ── Transport audit (Intelligence) ────────────────────────────────────────

export interface AuditFinding {
  key: string;
  severity: "critical" | "high" | "medium" | "low";
  area: string;
  title: string;
  detail: string;
  count: number;
}

export interface AuditRun {
  id: string;
  score: number;
  findings: AuditFinding[];
  totals: Record<string, number>;
  ran_by_name: string | null;
  created_at: string;
}

export async function runAudit(
  companyId: string,
  userId: string,
  who: string | null,
): Promise<AuditRun> {
  const [alerts, vehicles, drivers, carriers, incidents, requests, check, devices] =
    await Promise.all([
      expiryAlerts(companyId),
      listVehicles(companyId),
      listDrivers(companyId),
      listCarriers(companyId),
      listIncidents(companyId),
      listRequests(companyId),
      lastCheck(companyId),
      listGpsDevices(companyId),
    ]);

  const findings: AuditFinding[] = [];
  const add = (f: AuditFinding) => {
    if (f.count > 0) findings.push(f);
  };

  add({
    key: "documents_expired",
    severity: "critical",
    area: "documents",
    title: "Expired documents",
    detail: "Documents past their end date must be renewed before further use.",
    count: alerts.filter((a) => a.level === "expired").length,
  });
  add({
    key: "documents_critical",
    severity: "high",
    area: "documents",
    title: "Documents expiring within 14 days",
    detail: "Plan the renewal now to avoid an operational stop.",
    count: alerts.filter((a) => a.level === "critical").length,
  });
  add({
    key: "vehicles_no_documents",
    severity: "high",
    area: "fleet",
    title: "Vehicles without any document",
    detail: "Every vehicle should carry at least an inspection and insurance record.",
    count: vehicles.filter(
      (v) => !alerts.some((a) => a.ownerKind === "vehicle" && a.ownerId === v.id),
    ).length,
  });
  add({
    key: "drivers_blocked",
    severity: "high",
    area: "drivers",
    title: "Drivers marked blocked or needing attention",
    detail: "Review their licence, medical validity and assignment.",
    count: drivers.filter((d) => d.status === "blocked" || d.status === "attention")
      .length,
  });
  add({
    key: "carriers_no_requirements",
    severity: "medium",
    area: "carriers",
    title: "Carriers without agreed requirements",
    detail: "Record insurance, licence and handling requirements per subcontractor.",
    count: carriers.filter((c) => !c.requirements).length,
  });
  add({
    key: "incidents_open_critical",
    severity: "critical",
    area: "incidents",
    title: "Open critical incidents",
    detail: "Critical incidents need an agreed action and an owner.",
    count: incidents.filter(
      (i) =>
        i.severity === "critical" && i.status !== "closed" && i.status !== "cancelled",
    ).length,
  });
  add({
    key: "incidents_no_action",
    severity: "medium",
    area: "incidents",
    title: "Open incidents without an agreed action",
    detail: "Close the loop: what was decided, by whom and by when.",
    count: incidents.filter(
      (i) => !i.action_agreed && i.status !== "closed" && i.status !== "cancelled",
    ).length,
  });
  add({
    key: "requests_overdue",
    severity: "high",
    area: "requests",
    title: "Requests past their due date",
    detail: "These requests are still open after the agreed date.",
    count: requests.filter(
      (r) =>
        r.due_on != null &&
        r.due_on < new Date().toISOString().slice(0, 10) &&
        (r.status === "open" || r.status === "in_review"),
    ).length,
  });
  add({
    key: "vehicles_no_position",
    severity: "low",
    area: "map",
    title: "Vehicles without a position",
    detail: "Add coordinates or connect a GPS device to see them on the map.",
    count: vehicles.filter((v) => v.latitude == null || v.longitude == null).length,
  });
  add({
    key: "gps_failing",
    severity: "medium",
    area: "map",
    title: "GPS devices reporting an error",
    detail: "The last synchronisation failed for these devices.",
    count: devices.filter((d) => d.active && d.last_error).length,
  });
  if (!check || check.status !== "completed") {
    findings.push({
      key: "audit_not_completed",
      severity: "medium",
      area: "procedures",
      title: "No completed weekly audit",
      detail: "Run and complete the weekly checklist to close the procedural loop.",
      count: 1,
    });
  }

  const weight = { critical: 12, high: 7, medium: 4, low: 2 } as const;
  const penalty = findings.reduce(
    (sum, f) => sum + weight[f.severity] * Math.min(f.count, 5),
    0,
  );
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const totals = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    vehicles: vehicles.length,
    drivers: drivers.length,
    carriers: carriers.length,
  };

  const row = await one<{ id: string; created_at: string }>(
    `INSERT INTO public.transport_audit_runs
       (company_id, score, findings, totals, ran_by, ran_by_name)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
    [companyId, score, JSON.stringify(findings), JSON.stringify(totals), userId, who],
  );
  return {
    id: row?.id ?? "",
    score,
    findings,
    totals,
    ran_by_name: who,
    created_at: row?.created_at ?? new Date().toISOString(),
  };
}

export async function listAuditRuns(companyId: string, limit = 20): Promise<AuditRun[]> {
  const rows = await q<{
    id: string;
    score: number;
    findings: AuditFinding[];
    totals: Record<string, number>;
    ran_by_name: string | null;
    created_at: string;
  }>(
    `SELECT id, score, findings, totals, ran_by_name, created_at
       FROM public.transport_audit_runs
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [companyId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    score: Number(r.score),
    findings: r.findings ?? [],
    totals: r.totals ?? {},
    ran_by_name: r.ran_by_name,
    created_at: r.created_at,
  }));
}

// ── Overview trends ───────────────────────────────────────────────────────

/** Counts for the last N days plus the previous window, so the UI can show a trend. */
export async function trends(
  companyId: string,
  days: number,
): Promise<{
  incidents: { current: number; previous: number };
  requests: { current: number; previous: number };
  approvals: { current: number; previous: number };
  closedIncidents: { current: number; previous: number };
}> {
  const row = await one<Record<string, string>>(
    `WITH win AS (SELECT ($2 || ' days')::interval AS d)
     SELECT
       (SELECT count(*) FROM public.transport_incidents, win
         WHERE company_id = $1 AND created_at >= now() - d) AS inc_cur,
       (SELECT count(*) FROM public.transport_incidents, win
         WHERE company_id = $1 AND created_at >= now() - d * 2
           AND created_at < now() - d) AS inc_prev,
       (SELECT count(*) FROM public.transport_requests, win
         WHERE company_id = $1 AND created_at >= now() - d) AS req_cur,
       (SELECT count(*) FROM public.transport_requests, win
         WHERE company_id = $1 AND created_at >= now() - d * 2
           AND created_at < now() - d) AS req_prev,
       (SELECT count(*) FROM public.transport_requests, win
         WHERE company_id = $1 AND approved_at >= now() - d) AS app_cur,
       (SELECT count(*) FROM public.transport_requests, win
         WHERE company_id = $1 AND approved_at >= now() - d * 2
           AND approved_at < now() - d) AS app_prev,
       (SELECT count(*) FROM public.transport_incidents, win
         WHERE company_id = $1 AND closed_at >= now() - d) AS clo_cur,
       (SELECT count(*) FROM public.transport_incidents, win
         WHERE company_id = $1 AND closed_at >= now() - d * 2
           AND closed_at < now() - d) AS clo_prev`,
    [companyId, days],
  );
  const n = (k: string) => Number(row?.[k] ?? 0);
  return {
    incidents: { current: n("inc_cur"), previous: n("inc_prev") },
    requests: { current: n("req_cur"), previous: n("req_prev") },
    approvals: { current: n("app_cur"), previous: n("app_prev") },
    closedIncidents: { current: n("clo_cur"), previous: n("clo_prev") },
  };
}
