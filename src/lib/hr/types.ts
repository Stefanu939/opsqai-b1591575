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

export interface HrTask {
  id: string;
  employee_id: string | null;
  employee_no: string | null;
  title: string;
  category: string;
  team: string | null;
  assigned_to: string | null;
  due_date: string | null;
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
