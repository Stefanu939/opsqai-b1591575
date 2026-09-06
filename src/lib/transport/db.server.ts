// OPSQAI Transport — Self-Hosted PostgreSQL data access (server only).
//
// Transport is a Self-Hosted product workspace: it talks to the installation's
// local PostgreSQL instance through DATABASE_URL. On Cloud there is no
// DATABASE_URL, so every entry point fails loudly instead of silently
// touching Management Center data.

import { Pool, type QueryResultRow } from "pg";
import type {
  Carrier,
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

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "OPSQAI Transport is available on Self-Hosted installations only (no local database configured).",
    );
  }
  pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  return pool;
}

async function q<T extends QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(sql, params);
  return res.rows;
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
  mapEnabled: true,
  mapTileUrl: null,
  geocodeUrl: null,
  allowExternalLookups: false,
  cmrPrefix: "CMR",
};

interface SettingsRow {
  country: string;
  language: string;
  units: string;
  alert_windows: number[] | null;
  map_enabled: boolean;
  map_tile_url: string | null;
  geocode_url: string | null;
  allow_external_lookups: boolean;
  cmr_prefix: string;
}

export async function getSettings(companyId: string): Promise<TransportSettings> {
  const row = await one<SettingsRow>(
    `SELECT country, language, units, alert_windows, map_enabled, map_tile_url,
            geocode_url, allow_external_lookups, cmr_prefix
       FROM public.transport_settings WHERE company_id = $1`,
    [companyId],
  );
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    country: row.country,
    language: row.language,
    units: row.units === "imperial" ? "imperial" : "metric",
    alertWindows: row.alert_windows ?? [30, 60, 90],
    mapEnabled: row.map_enabled,
    mapTileUrl: row.map_tile_url,
    geocodeUrl: row.geocode_url,
    allowExternalLookups: row.allow_external_lookups,
    cmrPrefix: row.cmr_prefix,
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
       (company_id, country, language, units, alert_windows, map_enabled,
        map_tile_url, geocode_url, allow_external_lookups, cmr_prefix)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (company_id) DO UPDATE SET
       country = EXCLUDED.country,
       language = EXCLUDED.language,
       units = EXCLUDED.units,
       alert_windows = EXCLUDED.alert_windows,
       map_enabled = EXCLUDED.map_enabled,
       map_tile_url = EXCLUDED.map_tile_url,
       geocode_url = EXCLUDED.geocode_url,
       allow_external_lookups = EXCLUDED.allow_external_lookups,
       cmr_prefix = EXCLUDED.cmr_prefix,
       updated_at = now()`,
    [
      companyId,
      next.country,
      next.language,
      next.units,
      next.alertWindows,
      next.mapEnabled,
      next.mapTileUrl,
      next.geocodeUrl,
      next.allowExternalLookups,
      next.cmrPrefix,
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
            COALESCE(NULLIF(full_name, ''), email, 'User') AS name,
            email
       FROM public.profiles
      WHERE company_id = $1
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
    `SELECT id, label, hint, scope, position, required, active
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
  },
): Promise<void> {
  if (input.id) {
    await q(
      `UPDATE public.transport_checklist_items
          SET label = $3, hint = $4, scope = $5, position = $6, required = $7, active = $8
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
      ],
    );
    return;
  }
  await q(
    `INSERT INTO public.transport_checklist_items
       (company_id, label, hint, scope, position, required, active, created_by)
     VALUES ($1,$2,$3,$4,COALESCE($5, (
        SELECT COALESCE(MAX(position),0)+1 FROM public.transport_checklist_items WHERE company_id = $1
     )),$6,$7,$8)`,
    [
      companyId,
      input.label,
      input.hint ?? null,
      input.scope ?? "general",
      input.position ?? null,
      input.required ?? true,
      input.active ?? true,
      userId,
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
    `SELECT id, period_start, status, summary, ran_by_name, completed_at, created_at
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
): Promise<string> {
  const existing = await one<{ id: string }>(
    `SELECT id FROM public.transport_checks
      WHERE company_id = $1 AND period_start = $2 AND status = 'in_progress'
      LIMIT 1`,
    [companyId, periodStart],
  );
  if (existing) return existing.id;

  const created = await one<{ id: string }>(
    `INSERT INTO public.transport_checks (company_id, period_start, ran_by, ran_by_name)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [companyId, periodStart, userId, who],
  );
  if (!created) throw new Error("Could not start the weekly audit.");

  await q(
    `INSERT INTO public.transport_check_results (check_id, item_id, item_label)
     SELECT $2, id, label FROM public.transport_checklist_items
      WHERE company_id = $1 AND active = true
      ORDER BY position`,
    [companyId, created.id],
  );
  return created.id;
}

export async function listCheckResults(checkId: string): Promise<CheckResult[]> {
  return q<CheckResult>(
    `SELECT r.id, r.check_id, r.item_id, r.item_label, r.outcome, r.note, r.checked_at
       FROM public.transport_check_results r
      WHERE r.check_id = $1
      ORDER BY r.created_at`,
    [checkId],
  );
}

export async function setCheckResult(
  companyId: string,
  resultId: string,
  outcome: CheckResult["outcome"],
  note: string | null,
  userId: string,
): Promise<void> {
  await q(
    `UPDATE public.transport_check_results r
        SET outcome = $3, note = $4, checked_by = $5, checked_at = now()
      WHERE r.id = $1
        AND EXISTS (SELECT 1 FROM public.transport_checks c
                     WHERE c.id = r.check_id AND c.company_id = $2)`,
    [resultId, companyId, outcome, note, userId],
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

/**
 * Resolve a free-text location to coordinates. Cached locally; an external
 * lookup only happens when the installation explicitly allows it and
 * configures an endpoint (offline installs stay offline).
 */
export async function geocode(
  companyId: string,
  query: string,
): Promise<{ lat: number; lng: number; label: string | null; source: string } | null> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;
  const cached = await one<{
    latitude: number;
    longitude: number;
    label: string | null;
    source: string;
  }>(
    `SELECT latitude, longitude, label, source FROM public.transport_places WHERE query = $1`,
    [normalized],
  );
  if (cached) {
    return {
      lat: cached.latitude,
      lng: cached.longitude,
      label: cached.label,
      source: cached.source,
    };
  }

  const settings = await getSettings(companyId);
  if (!settings.allowExternalLookups || !settings.geocodeUrl) return null;

  try {
    const url = settings.geocodeUrl.includes("{q}")
      ? settings.geocodeUrl.replace("{q}", encodeURIComponent(query))
      : `${settings.geocodeUrl}${settings.geocodeUrl.includes("?") ? "&" : "?"}q=${encodeURIComponent(query)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "OPSQAI-Transport" } });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const hit = Array.isArray(body) ? body[0] : null;
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    await q(
      `INSERT INTO public.transport_places (company_id, query, label, latitude, longitude, source)
       VALUES ($1,$2,$3,$4,$5,'geocode')
       ON CONFLICT (query) DO NOTHING`,
      [companyId, normalized, hit.display_name ?? query, lat, lng],
    );
    return { lat, lng, label: hit.display_name ?? query, source: "geocode" };
  } catch {
    return null;
  }
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
    `SELECT id, period_start, status, summary, ran_by_name, completed_at, created_at
       FROM public.transport_checks WHERE company_id = $1
      ORDER BY created_at DESC LIMIT 1`,
    [companyId],
  );
}
