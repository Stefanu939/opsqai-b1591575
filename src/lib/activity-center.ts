/**
 * Activity Center — shared vocabulary for the notification/activity model.
 *
 * The DB `notifications` table carries `category`, `severity`, `entity_*`,
 * `assigned_to` and `resolved_at`. This module keeps labels and ordering in
 * one place so the bell and the Activity Center page agree.
 */

export const ACTIVITY_CATEGORIES = [
  "customers",
  "licenses",
  "timeoff",
  "releases",
  "health",
  "support",
  "billing",
  "knowledge",
  "academy",
  "general",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  customers: "Customers",
  licenses: "Licenses",
  timeoff: "Time off",
  releases: "Releases",
  health: "Installation health",
  support: "Support",
  billing: "Billing",
  knowledge: "Knowledge",
  academy: "Academy",
  general: "General",
};

export const SEVERITIES = ["critical", "warning", "info"] as const;
export type ActivitySeverity = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<ActivitySeverity, string> = {
  critical: "Critical",
  warning: "Needs attention",
  info: "For information",
};

export function severityRank(severity: string): number {
  const i = (SEVERITIES as readonly string[]).indexOf(severity);
  return i === -1 ? SEVERITIES.length : i;
}

export function isActivityCategory(value: string): value is ActivityCategory {
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(value: string): string {
  return isActivityCategory(value) ? CATEGORY_LABELS[value] : "General";
}

export function severityLabel(value: string): string {
  return value === "critical" || value === "warning" || value === "info"
    ? SEVERITY_LABELS[value]
    : SEVERITY_LABELS.info;
}

export interface ActivityRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  read_at: string | null;
  created_at: string;
  user_id: string;
}

export const ACTIVITY_SELECT =
  "id, kind, title, body, link, severity, category, entity_type, entity_id, entity_label, assigned_to, resolved_at, read_at, created_at, user_id";
