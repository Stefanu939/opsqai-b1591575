// OPSQAI HR — shared types (client-safe).

export const HR_GRANTS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "sensitive",
  "settings",
  "export",
] as const;
export type HrGrantKey = (typeof HR_GRANTS)[number];

export type HrCountry = "de" | "ro" | "generic";

export type EmployeeStatus = "onboarding" | "active" | "leave" | "offboarding" | "terminated";

export interface HrSettings {
  company_id: string;
  country: HrCountry;
  employee_prefix: string;
  blind_screening: boolean;
  retention_months_after_exit: number;
  default_language: string;
  probation_months: number;
  notice_weeks: number;
  vacation_days: number;
  weekly_hours: number;
  contract_alert_days: number;
  document_alert_days: number;
  auto_onboarding: boolean;
  company_legal_name: string | null;
  company_address: string | null;
  company_signatory: string | null;
}

export interface HrRef {
  id: string;
  name: string;
  department_id?: string | null;
  country?: string | null;
}

export interface HrEmployee {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  position_id: string | null;
  location_id: string | null;
  department_name: string | null;
  position_name: string | null;
  location_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: EmployeeStatus;
  contract_type: string | null;
  employment_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HrTaskStep {
  title: string;
  done: boolean;
}

export type HrTaskPriority = "low" | "normal" | "high";

export interface HrTask {
  id: string;
  employee_id: string | null;
  employee_no: string | null;
  employee_name: string | null;
  title: string;
  description: string | null;
  category: string;
  team: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: HrTaskPriority;
  steps: HrTaskStep[];
  document_id: string | null;
  document_key: string | null;
  document_title: string | null;
  document_status: string | null;
  resolution: string | null;
  completed_at: string | null;
  completed_by: string | null;
  status: "pending" | "in_progress" | "done" | "cancelled";
  created_at: string;
}

export interface HrEmployeeEvent {
  id: string;
  kind: string;
  message: string;
  actor: string | null;
  occurred_at: string;
}

export interface HrEmployeeFilters {
  search?: string;
  departmentId?: string;
  positionId?: string;
  locationId?: string;
  status?: EmployeeStatus;
  contractType?: string;
}

export interface HrOverview {
  settings: HrSettings;
  grants: HrGrantKey[];
  counts: {
    total: number;
    active: number;
    onboarding: number;
    offboarding: number;
    leave: number;
    newHires30d: number;
    leaving: number;
  };
  actionRequired: {
    contractsExpiring: number;
    openTasks: number;
    overdueTasks: number;
    missingData: number;
  };
  tasks: HrTask[];
  refs: { departments: HrRef[]; positions: HrRef[]; locations: HrRef[] };
  /** Onboarding / offboarding progress per employee (from lifecycle tasks). */
  pipeline: HrPipelineRow[];
  /** Derived alerts (expiries, overdue, incomplete records). */
  alerts: Array<{ id: string; level: "critical" | "warning" | "info"; title: string; detail: string; employeeId?: string | null }>;
  /** Signals from the other HR workspaces. */
  signals: {
    openRequests: number;
    policiesPendingAck: number;
    trainingsExpired: number;
    trainingsPlanned: number;
    complianceOpen: number;
    complianceOverdue: number;
    positionChanges90d: number;
    candidatesNew: number;
    candidatesShortlisted: number;
    documentsDraft: number;
    documentsReview: number;
    documentsExpiring: number;
    incidents30d: number;
  };
  recentEvents: Array<{ id: string; employee_no: string; kind: string; message: string; actor: string | null; created_at: string }>;
}

export interface HrPipelineRow {
  employee_id: string;
  employee_no: string;
  name: string;
  kind: "onboarding" | "offboarding";
  anchor_date: string | null;
  total: number;
  done: number;
  overdue: number;
  next_task: string | null;
  next_due: string | null;
}

/** Country-aware contract types (Phase 2 generates documents from these). */
export function contractTypes(country: HrCountry): string[] {
  if (country === "de") {
    return ["Unbefristet", "Befristet", "Teilzeit", "Vollzeit", "Minijob", "Ausbildung", "Zeitarbeit"];
  }
  if (country === "ro") {
    return [
      "Perioadă nedeterminată",
      "Perioadă determinată",
      "Part-time",
      "Full-time",
      "Ucenicie",
      "Temporar",
    ];
  }
  return ["Permanent", "Fixed-term", "Part-time", "Full-time", "Temporary", "Apprenticeship"];
}
