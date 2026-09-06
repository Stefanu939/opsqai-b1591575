// OPSQAI Transport — shared types (client-safe).
//
// Self-Hosted only: the Transport product workspace runs against the local
// PostgreSQL instance. Cloud (Management Center / Customer Portal) never
// exposes these surfaces.

export type TransportGrantKey =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "checklist"
  | "settings"
  | "export"
  | "cmr";

export const TRANSPORT_GRANTS: readonly TransportGrantKey[] = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "checklist",
  "settings",
  "export",
  "cmr",
];

export type RecordStatus = "active" | "attention" | "blocked" | "inactive";

export interface TransportSettings {
  country: string;
  language: string;
  units: "metric" | "imperial";
  alertWindows: number[];
  /** Optional per-document-type alert window in days, keyed by doc type. */
  docAlertWindows: Record<string, number>;
  mapEnabled: boolean;
  cmrPrefix: string;
  timezone: string;
  /** 1 = Monday … 7 = Sunday */
  weekStart: number;
  auditDay: number;
  auditRequired: boolean;
  mapCenterLat: number | null;
  mapCenterLng: number | null;
  mapZoom: number;
  liveTracking: boolean;
  gpsPollMinutes: number;
  searchProvider: "auto" | "osm" | "off";
  /** How often the periodic audit is expected; "manual" = no schedule. */
  auditCadence: "manual" | "weekly" | "biweekly" | "monthly";
  auditOwnerUserId: string | null;
  auditReminder: boolean;
}

export interface TransportGpsDevice {
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

export interface TransportAuditFinding {
  key: string;
  severity: "critical" | "high" | "medium" | "low";
  area: string;
  title: string;
  detail: string;
  count: number;
}

export interface TransportAuditRun {
  id: string;
  score: number;
  findings: TransportAuditFinding[];
  totals: Record<string, number>;
  ran_by_name: string | null;
  created_at: string;
}

export interface TransportTrend {
  current: number;
  previous: number;
}


export interface Vehicle {
  id: string;
  plate: string;
  kind: string;
  make: string | null;
  model: string | null;
  vin: string | null;
  ownership: string;
  odometer_km: number | null;
  base_location: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_driver_id: string | null;
  status: RecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  licence_number: string | null;
  licence_categories: string | null;
  base_location: string | null;
  latitude: number | null;
  longitude: number | null;
  assigned_vehicle_id: string | null;
  status: RecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Carrier {
  id: string;
  name: string;
  registration_no: string | null;
  vat_no: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  requirements: string | null;
  handling_rules: string | null;
  rating: number | null;
  status: RecordStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransportDocument {
  id: string;
  owner_kind: "vehicle" | "driver" | "carrier";
  owner_id: string;
  doc_type: string;
  label: string | null;
  reference: string | null;
  issued_on: string | null;
  expires_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface Incident {
  id: string;
  reference: string | null;
  title: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "reported" | "in_review" | "action_agreed" | "closed" | "cancelled";
  description: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  occurred_at: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  carrier_id: string | null;
  action_agreed: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransportRequest {
  id: string;
  title: string;
  kind: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "open" | "in_review" | "approved" | "rejected" | "closed";
  description: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  carrier_id: string | null;
  incident_id: string | null;
  due_on: string | null;
  decision_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  hint: string | null;
  scope: "general" | "vehicle" | "driver" | "carrier";
  position: number;
  required: boolean;
  active: boolean;
}

export interface WeeklyCheck {
  id: string;
  period_start: string;
  due_on: string | null;
  status: "in_progress" | "completed" | "cancelled";
  summary: string | null;
  ran_by_name: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CheckResult {
  id: string;
  check_id: string;
  item_id: string | null;
  item_label: string;
  outcome: "pending" | "ok" | "issue" | "not_applicable";
  note: string | null;
  checked_at: string | null;
  incident_id: string | null;
  request_id: string | null;
}

export interface TransportNote {
  id: string;
  owner_kind: string;
  owner_id: string;
  body: string;
  author_name: string | null;
  created_at: string;
}

export interface MapZone {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
}

export interface MapPin {
  id: string;
  kind: "vehicle" | "driver" | "carrier" | "incident";
  label: string;
  sub: string | null;
  lat: number;
  lng: number;
  severity?: string | null;
  status?: string | null;
}

export interface CmrGoodsLine {
  marks?: string;
  packages?: string;
  packing?: string;
  description?: string;
  statistical?: string;
  weight?: string;
  volume?: string;
}

export interface CmrRecord {
  id: string;
  number: string | null;
  country: string;
  language: string;
  status: "draft" | "issued" | "cancelled";
  sender_name: string | null;
  sender_address: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  carrier_id: string | null;
  carrier_name: string | null;
  carrier_address: string | null;
  successive_carrier: string | null;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  trailer_plate: string | null;
  driver_id: string | null;
  driver_name: string | null;
  place_of_loading: string | null;
  loading_on: string | null;
  place_of_delivery: string | null;
  delivery_on: string | null;
  goods: CmrGoodsLine[];
  packages: string | null;
  gross_weight_kg: number | null;
  volume_m3: number | null;
  instructions: string | null;
  payment_terms: string | null;
  reservations: string | null;
  documents_attached: string | null;
  special_agreements: string | null;
  established_at: string | null;
  established_in: string | null;
  signature_sender: string | null;
  signature_carrier: string | null;
  signature_consignee: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpiryAlert {
  documentId: string;
  ownerKind: "vehicle" | "driver" | "carrier";
  ownerId: string;
  ownerLabel: string;
  docType: string;
  docLabel: string;
  expiresOn: string;
  daysLeft: number;
  level: "expired" | "critical" | "warning" | "watch";
}

export interface FuelEntry {
  id: string;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  driver_id: string | null;
  driver_name: string | null;
  entry_date: string;
  route: string | null;
  litres: number | null;
  cost: number | null;
  currency: string;
  distance_km: number | null;
  odometer_km: number | null;
  supplier: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DutyKind = "work" | "off" | "leave" | "sick" | "training" | "standby";

export interface DutyDay {
  id: string;
  driver_id: string;
  driver_name: string | null;
  duty_date: string;
  duty_kind: DutyKind;
  route: string | null;
  vehicle_id: string | null;
  vehicle_plate: string | null;
  shift_start: string | null;
  shift_end: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransportOverview {

  settings: TransportSettings;
  counts: {
    vehicles: number;
    drivers: number;
    carriers: number;
    openIncidents: number;
    openRequests: number;
    pendingApprovals: number;
    documents: number;
  };
  alerts: ExpiryAlert[];
  recentIncidents: Incident[];
  openRequests: TransportRequest[];
  vehicles: Vehicle[];
  drivers: Driver[];
  carriers: Carrier[];
  pins: MapPin[];
  trends: {
    incidents: TransportTrend;
    requests: TransportTrend;
    approvals: TransportTrend;
    closedIncidents: TransportTrend;
  };
  periodDays: number;
  lastAudit: TransportAuditRun | null;
  lastCheck: WeeklyCheck | null;
  /** Manually captured fuel entries for the selected period. */
  fuel: FuelEntry[];
  /** Driver duty days from yesterday to a week ahead. */
  duty: DutyDay[];


  grants: TransportGrantKey[];
  canManageGrants: boolean;
}
