export const AREA_ACTIONS = ["view", "create", "edit", "delete", "approve", "administer"] as const;
export type AreaAction = (typeof AREA_ACTIONS)[number];

export interface AreaRightChoice {
  area: string;
  action: AreaAction;
  granted: boolean;
}

export const AREA_LABELS: Record<string, string> = {
  platform: "Platform",
  roles: "Roles",
  users: "Users",
  departments: "Departments",
  chat: "AI Chat",
  messages: "Messages",
  knowledge: "Knowledge",
  sop: "Procedures",
  faq: "FAQ",
  academy: "Academy",
  ai_audit: "AI Audit",
  notifications: "Notifications",
  analytics: "Analytics",
  dashboard: "Dashboard",
  feedback: "Feedback",
  transport: "Transport",
};

export const TRANSPORT_ACTION_TO_LEGACY: Record<AreaAction, string[]> = {
  view: ["view"],
  create: ["edit"],
  edit: ["edit", "cmr", "checklist"],
  delete: ["edit"],
  approve: ["approve"],
  administer: ["settings", "export"],
};