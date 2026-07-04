/**
 * OPSQAI Permission Engine — frontend mirror of public.role_permissions.
 * Authoritative source is the database. This file documents the catalog
 * and provides ergonomic constants and helpers for UI gating.
 *
 * Backend enforcement is non-negotiable (RLS + has_permission()). UI gates
 * are for user experience only — never trust them for security decisions.
 */

export const PERMISSIONS = {
  // Platform-level
  PLATFORM_MANAGE: "platform.manage",
  COMPANY_MANAGE: "company.manage",
  COMPANY_DELETE: "company.delete",
  COMPANY_RESTORE: "company.restore",
  BILLING_VIEW: "billing.view",
  BILLING_MANAGE: "billing.manage",
  // Tenant
  DEPARTMENT_MANAGE: "department.manage",
  WAREHOUSE_MANAGE: "warehouse.manage",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  // Knowledge / SOPs
  KNOWLEDGE_MANAGE: "knowledge.manage",
  SOP_READ: "sop.read",
  SOP_CREATE: "sop.create",
  SOP_EDIT: "sop.edit",
  SOP_DELETE: "sop.delete",
  SOP_PUBLISH: "sop.publish",
  SOP_SUGGEST: "sop.suggest",
  SOP_ACKNOWLEDGE: "sop.acknowledge",
  // FAQ
  FAQ_READ: "faq.read",
  FAQ_CREATE: "faq.create",
  FAQ_EDIT: "faq.edit",
  FAQ_DELETE: "faq.delete",
  FAQ_SUGGEST: "faq.suggest",
  // Audit / governance
  AUDIT_VIEW: "audit.view",
  AUDIT_CREATE: "audit.create",
  AUDIT_UPDATE: "audit.update",
  AUDIT_CLOSE: "audit.close",
  // Analytics & dashboards
  ANALYTICS_VIEW: "analytics.view",
  DASHBOARD_VIEW: "dashboard.view",
  REPORTS_EXPORT: "reports.export",
  // Workspace & chat
  WORKSPACE_USE: "workspace.use",
  WORKSPACE_MANAGE: "workspace.manage",
  CHAT_USE: "chat.use",
  // Other
  TEMPLATE_MANAGE: "template.manage",
  NOTIFICATIONS_MANAGE: "notifications.manage",
  GAP_CREATE: "gap.create",
  FEEDBACK_SUBMIT: "feedback.submit",
  // Academy
  ACADEMY_LEARN: "academy.learn",
  ACADEMY_MANAGE: "academy.manage",
  ACADEMY_PUBLISH: "academy.publish",
  ACADEMY_CERTIFY: "academy.certify",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_LABELS: Record<string, string> = {
  platform_owner: "Platform Owner",
  platform_admin: "Platform Super Admin",
  admin: "Company Admin",
  manager: "Manager",
  // Renamed labels — DB role names are unchanged (supervisor/operator/viewer).
  supervisor: "Team Leader",
  operator: "Employee",
  viewer: "Operator",
  // legacy aliases still displayed with the new labels
  team_leader: "Team Leader (legacy)",
  employee: "Employee (legacy)",
};

