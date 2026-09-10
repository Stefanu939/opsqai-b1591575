// OPSQAI Core — Operational Intelligence types (client-safe).

export const CORE_OPS_GRANTS = [
  "view",
  "create",
  "edit",
  "delete",
  "analyse",
  "settings",
  "export",
  /** Dedicated right for financial values (cost, impact, annualised loss). */
  "costs",
] as const;
export type CoreOpsGrantKey = (typeof CORE_OPS_GRANTS)[number];

export const INCIDENT_KINDS = [
  "damage",
  "accident",
  "process_error",
  "system_error",
  "quality",
  "other",
] as const;
export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export const INCIDENT_STATUSES = ["open", "analysed", "action", "closed"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export type CoreLinkType = "violated_sop" | "related_sop" | "faq" | "incident";

export interface CoreIncidentLink {
  id: string;
  incident_id: string;
  link_type: CoreLinkType;
  target_id: string | null;
  target_title: string | null;
  note: string | null;
  created_at: string;
}

export interface CoreAttachment {
  id: string;
  incident_id: string;
  filename: string;
  mime_type: string;
  bytes: number;
  created_at: string;
}

export interface CoreIncident {
  id: string;
  ref: string | null;
  kind: IncidentKind;
  title: string;
  description: string | null;
  occurred_at: string;
  department_id: string | null;
  department_name: string | null;
  location: string | null;
  cost_amount: number;
  currency: string;
  lost_minutes: number;
  frequency_per_month: number;
  status: IncidentStatus;
  involved_person: string | null;
  involved_role: string | null;
  immediate_cause: string | null;
  created_at: string;
  updated_at: string;
  /** Aggregates used by the card list. */
  link_count?: number;
  attachment_count?: number;
  has_analysis?: boolean;
  open_actions?: number;
}

export interface CoreWhyStep {
  question: string;
  answer: string;
  supported: boolean;
}

export interface CoreSourceRef {
  type: "document" | "faq" | "incident";
  id: string | null;
  title: string;
}

export interface CoreRootCause {
  id: string;
  incident_id: string;
  problem: string | null;
  immediate_cause: string | null;
  root_cause: string | null;
  sop_violation: string | null;
  process_failure: string | null;
  related_processes: string | null;
  financial_impact: number;
  frequency: number;
  why_steps: CoreWhyStep[];
  lean_class: string | null;
  corrective: string | null;
  preventive: string | null;
  sources: CoreSourceRef[];
  /** Steps the knowledge base could not support — never invented. */
  unsupported: string[];
  generated_at: string | null;
  edited_at: string | null;
}

export interface CoreAction {
  id: string;
  incident_id: string;
  kind: "corrective" | "preventive";
  title: string;
  detail: string | null;
  owner_name: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  sources: CoreSourceRef[];
  created_at: string;
  updated_at: string;
}

export interface CoreIncidentDetail {
  incident: CoreIncident;
  links: CoreIncidentLink[];
  attachments: CoreAttachment[];
  rootCause: CoreRootCause | null;
  actions: CoreAction[];
}

export interface CoreOpsFilters {
  departmentId?: string | null;
  kind?: IncidentKind | null;
  status?: IncidentStatus | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
}

export interface CoreAnalytics {
  totals: {
    incidents: number;
    cost: number;
    lostMinutes: number;
    annualImpact: number;
    openActions: number;
    overdueActions: number;
    openGaps: number;
    answerQuality: number | null;
  };
  byDepartment: Array<{ label: string; incidents: number; cost: number }>;
  byKind: Array<{ label: string; incidents: number; cost: number }>;
  topRootCauses: Array<{ label: string; incidents: number; cost: number }>;
  topViolatedSops: Array<{ label: string; incidents: number }>;
  trend: Array<{ month: string; incidents: number; cost: number }>;
  currency: string;
}

export function costOfIncident(i: {
  cost_amount: number;
  frequency_per_month: number;
}): number {
  const monthly = Number(i.cost_amount || 0) * Math.max(Number(i.frequency_per_month || 0), 0);
  return Math.round(monthly * 12 * 100) / 100;
}
