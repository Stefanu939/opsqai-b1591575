// OPSQAI HR — types for the workspaces added in 0044 (client-safe).

export interface HrPositionChange {
  id: string;
  employee_id: string;
  employee_no: string | null;
  employee_name: string | null;
  kind: "promote" | "demote" | "transfer";
  from_position: string | null;
  to_position: string | null;
  criteria: Array<{ label: string; met: boolean; note?: string | null }>;
  reason: string | null;
  effective_on: string;
  decided_by: string | null;
  created_at: string;
}

export interface HrAssetPackage {
  id: string;
  name: string;
  category: string;
  items: Array<{ name: string; category: string }>;
  updated_at: string;
}

export interface HrPolicy {
  id: string;
  title: string;
  category: string;
  body: string;
  version: number;
  status: "draft" | "published" | "archived";
  requires_ack: boolean;
  effective_from: string | null;
  country: string | null;
  updated_at: string;
  ack_count: number;
  headcount: number;
}

export interface HrRequest {
  id: string;
  employee_id: string | null;
  employee_no: string | null;
  employee_name: string | null;
  kind: string;
  title: string;
  details: string | null;
  from_date: string | null;
  to_date: string | null;
  status: "open" | "in_review" | "approved" | "rejected" | "done";
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface HrKnowledgeArticle {
  id: string;
  title: string;
  category: string;
  body: string;
  tags: string[];
  country: string | null;
  updated_at: string;
}

export interface HrTraining {
  id: string;
  title: string;
  category: string;
  mandatory: boolean;
  valid_months: number | null;
  country: string | null;
  description: string | null;
  updated_at: string;
  valid_count: number;
  planned_count: number;
  expired_count: number;
}

export interface HrTrainingRecord {
  id: string;
  training_id: string;
  training_title: string;
  mandatory: boolean;
  employee_id: string;
  employee_no: string | null;
  employee_name: string | null;
  status: "planned" | "completed" | "expired";
  planned_on: string | null;
  completed_on: string | null;
  valid_until: string | null;
  score: string | null;
  notes: string | null;
  created_at: string;
}

export interface HrComplianceItem {
  id: string;
  item_key: string | null;
  title: string;
  category: string;
  country: string | null;
  employee_id: string | null;
  employee_no: string | null;
  employee_name: string | null;
  due_date: string | null;
  status: "open" | "done" | "not_applicable";
  notes: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
}

export interface HrWorkspaceSignals {
  openRequests: number;
  policiesPendingAck: number;
  trainingsExpired: number;
  trainingsPlanned: number;
  complianceOpen: number;
  complianceOverdue: number;
  positionChanges90d: number;
}
