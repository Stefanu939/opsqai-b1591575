// Self-Hosted provider bundle barrel.
//
// Import surface for the Self-Hosted bootstrap. NEVER imported from
// Cloud code paths. All modules end in `.server.ts` so they cannot leak
// into any client bundle.

export { signJwtEd25519, verifyJwtEd25519 } from "./jwt-ed25519.server";
export type { JwtClaims, JwtHeader, VerifyOptions, Ed25519KeyPairPem } from "./jwt-ed25519.server";
export { createPgUserRepository } from "./pg-user-repository.server";
export { createLocalAuthProvider } from "./local-auth.server";
export type { LocalAuthDeps } from "./local-auth.server";
