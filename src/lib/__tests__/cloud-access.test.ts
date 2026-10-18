import { describe, expect, it } from "vitest";
import { cloudDestination, isEnrolledCustomerCompany, safeCloudNext } from "../cloud-access";

describe("Cloud surface separation", () => {
  it("sends unenrolled Portal visitors directly to Kai", () => {
    expect(cloudDestination("portal", { isStaff: false, isCustomer: false })).toBe("/prospect");
  });
  it("keeps enrolled customers in Portal", () => {
    expect(cloudDestination("portal", { isStaff: false, isCustomer: true })).toBe("/portal");
  });
  it("keeps explicit Kai sign-in on Kai even for staff or customers", () => {
    expect(cloudDestination("prospect", { isStaff: true, isCustomer: true })).toBe("/prospect");
  });
  it("allows only staff to land in MC", () => {
    expect(cloudDestination("mc", { isStaff: true, isCustomer: false })).toBe("/management");
    expect(cloudDestination("mc", { isStaff: false, isCustomer: false })).toBe("/prospect");
  });
  it("does not let a return URL escape Kai or the selected surface", () => {
    expect(safeCloudNext("/portal/downloads", "/prospect")).toBe("/prospect");
    expect(safeCloudNext("/management", "/portal")).toBe("/portal");
    expect(safeCloudNext("//evil.example", "/portal")).toBe("/portal");
    expect(safeCloudNext("/portal/downloads", "/portal")).toBe("/portal/downloads");
  });
  it("does not treat the default or demo company as customer enrolment", () => {
    expect(isEnrolledCustomerCompany({ id: "default", is_system: true, is_demo_tenant: false, owner_user_id: "staff", install_id: null })).toBe(false);
    expect(isEnrolledCustomerCompany({ id: "demo", is_system: false, is_demo_tenant: true, owner_user_id: "staff", install_id: "demo" })).toBe(false);
    expect(isEnrolledCustomerCompany(null)).toBe(false);
  });
  it("recognizes an MC-managed company without requiring a completed licence", () => {
    expect(isEnrolledCustomerCompany({ id: "customer", is_system: false, is_demo_tenant: false, owner_user_id: "staff", install_id: null })).toBe(true);
  });
});