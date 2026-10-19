import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  access: { isStaff: false, isCustomer: false },
}));
vi.mock("@/lib/cloud-access.functions", () => ({
  getCloudAccess: vi.fn(async () => state.access),
}));
vi.mock("@/lib/deployment-mode", () => ({ getClientDeploymentMode: () => "mc" }));
vi.mock("@/components/mc/mc-shell", () => ({ ManagementShell: () => null }));
vi.mock("@/components/app/account-menu", () => ({ AccountMenu: () => null }));
vi.mock("@/components/app/notifications-bell", () => ({ NotificationsBell: () => null }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({}) }));

import { Route as management } from "@/routes/_authenticated/management";
import { Route as portal } from "@/routes/_authenticated/portal";
import { Route as app } from "@/routes/_authenticated/app";
import { getCloudAccess } from "../cloud-access.functions";
import { cloudDestination, setCloudAudience } from "../cloud-access";

// Execute the actual route guards; no rendering or synthetic policy copy.
async function guard(route: typeof management | typeof portal | typeof app) {
  const beforeLoad = route.options.beforeLoad;
  if (!beforeLoad) throw new Error("Missing route guard");
  const invoke = beforeLoad as (context: { location: { pathname: string } }) => unknown;
  return invoke({ location: { pathname: "/app" } });
}

beforeEach(() => {
  state.access = { isStaff: false, isCustomer: false };
  vi.clearAllMocks();
  const values = new Map<string, string>();
  vi.stubGlobal("window", {});
  vi.stubGlobal("sessionStorage", {
    setItem: (key: string, value: string) => values.set(key, value),
    getItem: (key: string) => values.get(key) ?? null,
  });
  setCloudAudience("prospect");
});
afterEach(() => vi.unstubAllGlobals());

describe("explicit navigation after visiting Kai", () => {
  it("lets authorized staff enter MC despite prospect intent", async () => {
    state.access.isStaff = true;
    await expect(guard(management)).resolves.toBeUndefined();
    expect(getCloudAccess).toHaveBeenCalledOnce();
  });
  it("lets enrolled customers enter Portal despite prospect intent", async () => {
    state.access.isCustomer = true;
    await expect(guard(portal)).resolves.toBeUndefined();
    expect(getCloudAccess).toHaveBeenCalledOnce();
  });
  it("lets staff explicitly enter Portal", async () => {
    state.access.isStaff = true;
    await expect(guard(portal)).resolves.toBeUndefined();
  });
  it("keeps public Kai accounts out of MC", async () => {
    await expect(guard(management)).rejects.toMatchObject({ options: { to: "/kai" } });
    expect(getCloudAccess).toHaveBeenCalledOnce();
  });
  it("keeps public Kai accounts out of Portal", async () => {
    await expect(guard(portal)).rejects.toMatchObject({ options: { to: "/kai" } });
    expect(getCloudAccess).toHaveBeenCalledOnce();
  });
  it("sends customers attempting MC to Portal, not Kai", async () => {
    state.access.isCustomer = true;
    await expect(guard(management)).rejects.toMatchObject({ options: { to: "/portal" } });
  });
  it("keeps Self-Hosted app unavailable on Cloud regardless of Kai intent", async () => {
    await expect(guard(app)).rejects.toMatchObject({ options: { to: "/windows-only" } });
  });
  it("keeps explicitly selected Kai sign-in on Kai", () => {
    expect(cloudDestination("prospect", { isStaff: true, isCustomer: true })).toBe("/kai");
  });
  it("fails closed when access verification fails", async () => {
    vi.mocked(getCloudAccess).mockRejectedValueOnce(new Error("Access unavailable"));
    await expect(guard(management)).rejects.toThrow("Access unavailable");
  });
});