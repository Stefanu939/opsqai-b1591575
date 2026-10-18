/** Navigation policy only. Access facts must come from authenticated server checks. */
export type CloudAudience = "mc" | "portal" | "prospect";
export type CloudAccess = { isStaff: boolean; isCustomer: boolean };
export type CloudDestination = "/management" | "/portal" | "/kai";

export function cloudDestination(audience: CloudAudience, access: CloudAccess): CloudDestination {
  if (audience === "prospect") return "/kai";
  if (audience === "mc" && access.isStaff) return "/management";
  if (audience === "portal" && access.isStaff) return "/portal";
  return access.isCustomer ? "/portal" : "/kai";
}

export function safeCloudNext(next: string | undefined, target: CloudDestination): string {
  if (target === "/kai" || !next || /[\\\u0000-\u001f]/.test(next)) return target;
  const prefix = target === "/management" ? "/management" : "/portal";
  return next === prefix || next.startsWith(`${prefix}/`) || next.startsWith(`${prefix}?`)
    ? next
    : target;
}

export type CustomerCompany = {
  id: string;
  is_system: boolean;
  is_demo_tenant: boolean;
  owner_user_id: string | null;
  install_id: string | null;
};

export function isEnrolledCustomerCompany(company: CustomerCompany | null): boolean {
  return Boolean(company && !company.is_system && !company.is_demo_tenant &&
    (company.owner_user_id || company.install_id));
}

// This marker expresses the selected surface, never a role or permission.
const INTENT_KEY = "opsqai.cloud.audience";
export function setCloudAudience(audience: CloudAudience) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(INTENT_KEY, audience); } catch { /* optional storage */ }
}
export function isKaiAudience(): boolean {
  if (typeof window === "undefined") return false;
  try { return sessionStorage.getItem(INTENT_KEY) === "prospect"; } catch { return false; }
}