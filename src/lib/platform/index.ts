// Public barrel for the OPSQAI platform primitives.
//
// Feature code imports from `@/lib/platform`, never from the individual
// files. Test-only helpers (`__reset*ForTests`) are intentionally NOT
// re-exported from here.

export { DeploymentType, PlatformMode, Capability, Edition } from "./types";
export {
  getPlatformMode,
  getDeploymentType,
  isSelfHosted,
  isCloud,
} from "./mode";
export {
  registerCapability,
  registerCapabilities,
  unregisterCapability,
  hasCapability,
  listActiveCapabilities,
} from "./capabilities";
export { setActiveEdition, getActiveEdition, atLeastEdition } from "./edition";
export { bootstrapPlatform, defaultCapabilitiesFor } from "./bootstrap";
export type { PlatformBootstrap } from "./bootstrap";
export { runHealthCheck } from "./health";
export type { HealthReport, HealthCheckResult, CheckStatus } from "./health";
export { runDoctor } from "./doctor";
export type { DoctorReport, DoctorFinding, DoctorSeverity } from "./doctor";
