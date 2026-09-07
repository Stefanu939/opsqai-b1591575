// OPSQAI HR — types for documents, checklists, assets, incidents, screening.

export interface HrDocumentTemplate {
  id: string;
  name: string;
  kind: string;
  country: string | null;
  contract_type: string | null;
  body: string;
  updated_at: string;
}

export interface HrDocument {
  id: string;
  employee_id: string | null;
  employee_no: string | null;
  employee_name: string | null;
  kind: string;
  title: string;
  filename: string | null;
  mime: string | null;
  has_file: boolean;
  body: string | null;
  valid_until: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

export interface HrChecklistItem {
  title: string;
  team?: string | null;
  offsetDays?: number | null;
}

export interface HrChecklistTemplate {
  id: string;
  kind: "onboarding" | "offboarding";
  name: string;
  position_id: string | null;
  position_name: string | null;
  items: HrChecklistItem[];
  updated_at: string;
}

export interface HrAsset {
  id: string;
  name: string;
  category: string | null;
  serial: string | null;
  status: "available" | "assigned" | "retired";
  notes: string | null;
  holder_employee_id: string | null;
  holder_name: string | null;
  holder_no: string | null;
  assigned_on: string | null;
}

export interface HrIncident {
  id: string;
  employee_id: string | null;
  employee_no: string | null;
  employee_name: string | null;
  kind: "incident" | "warning" | "accident";
  severity: "low" | "medium" | "high";
  title: string;
  description: string | null;
  action_taken: string | null;
  occurred_on: string;
  created_at: string;
}

export interface HrCriterion {
  label: string;
  weight: number;
  required: boolean;
}

export interface HrJobProfile {
  id: string;
  title: string;
  department_id: string | null;
  department_name: string | null;
  description: string | null;
  criteria: HrCriterion[];
  active: boolean;
  candidate_count: number;
  updated_at: string;
}

export interface HrCandidateEvidence {
  criterion: string;
  verdict: "met" | "partial" | "not_met" | "unknown";
  quote: string;
  note?: string | null;
}

export interface HrCandidate {
  id: string;
  job_profile_id: string | null;
  job_title: string | null;
  reference: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  cv_filename: string | null;
  has_cv: boolean;
  extracted: Record<string, string>;
  evidence: HrCandidateEvidence[];
  score: number | null;
  status: "new" | "screened" | "shortlisted" | "rejected" | "hired";
  decision_note: string | null;
  hired_employee_id: string | null;
  created_at: string;
}

export interface HrAnalytics {
  headcountByDepartment: Array<{ label: string; value: number }>;
  headcountByStatus: Array<{ label: string; value: number }>;
  contractsByType: Array<{ label: string; value: number }>;
  hiresByMonth: Array<{ label: string; value: number }>;
  exitsByMonth: Array<{ label: string; value: number }>;
  averageTenureMonths: number;
  turnover12m: number;
  incidents12m: number;
  assetsAssigned: number;
  assetsAvailable: number;
}

export interface HrAlert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  detail: string;
  employeeId?: string | null;
}
