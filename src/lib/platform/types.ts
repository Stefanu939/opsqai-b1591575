// OPSQAI Platform primitives.
//
// These four enums are the load-bearing types for the Cloud vs. Self-Hosted
// architecture. All feature code MUST read these enums, never raw strings
// like "selfhost" or "cloud" — that indirection is what lets us add a
// Hybrid or Dedicated-SaaS distribution later without a codebase rewrite.
//
// Governing principle:
//   Cloud and Self-Hosted are independent deployment targets that share
//   business logic, not infrastructure. Infrastructure-specific behaviour
//   (auth, storage, migrations, licensing, updates, background services)
//   lives behind provider interfaces. Feature code asks the capability
//   registry, not the mode.

/**
 * How the product is distributed.
 *
 * Distribution shape — answers "who ships this and how does the customer
 * receive it?". Kept separate from PlatformMode so that future
 * distributions (Hybrid, DedicatedSaaS) can pick their own runtime mode.
 */
export enum DeploymentType {
  Cloud = "cloud",
  SelfHosted = "self-hosted",
  // Future: Hybrid, DedicatedSaaS
}

/**
 * The application's internal runtime mode.
 *
 * Today this mirrors DeploymentType 1:1, but a future Hybrid distribution
 * could run in either Cloud or SelfHosted mode depending on which node
 * boots. Never inline the raw string.
 */
export enum PlatformMode {
  Cloud = "cloud",
  SelfHosted = "self-hosted",
}

/**
 * Feature-level capabilities advertised by providers.
 *
 * Feature code asks the capability registry ("is SSO available?"), never
 * `mode === PlatformMode.Cloud`. Adding a capability to Self-Hosted (e.g.
 * SAML in v1.1) then does not require touching call sites.
 */
export enum Capability {
  Authentication = "authentication",
  Storage = "storage",
  SMTP = "smtp",
  AI = "ai",
  Updates = "updates",
  Licensing = "licensing",
  OfflineMode = "offline-mode",
  Telemetry = "telemetry",
  SSO = "sso",
}

/**
 * Product edition, read from the validated license.
 *
 * Feature gates key off Edition (+ Capability), never off PlatformMode.
 * Community is the free/eval tier; Professional and Enterprise unlock
 * additional feature-flag rows.
 */
export enum Edition {
  Community = "community",
  Professional = "professional",
  Enterprise = "enterprise",
}
