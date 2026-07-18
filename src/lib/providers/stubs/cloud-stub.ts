// Self-Hosted build stub.
//
// In Self-Hosted builds, Wave D aliases every Cloud-only module
// (`@/integrations/supabase/*` and `@/lib/providers/cloud/*`) to this
// file. Any runtime reference throws — but tree-shaking means reachable
// call sites should already be gated behind platform mode / capability
// checks, so this module's code is dropped from the final bundle.
//
// The stub exports a Proxy so property access, function calls, and
// `new` all resolve to the same throwing behavior regardless of which
// named export the caller expected.

const MESSAGE =
  "[opsqai] Cloud provider was reached inside a Self-Hosted build. " +
  "This is a gating bug — feature code must consult platform mode " +
  "or capabilities before importing/using a Cloud module.";

function boom(): never {
  throw new Error(MESSAGE);
}

const handler: ProxyHandler<() => never> = {
  get: () => boom(),
  apply: () => boom(),
  construct: () => boom(),
};

const stub = new Proxy(function () {
  boom();
} as unknown as () => never, handler);

// Common named exports used across the codebase — all resolve to the
// same throwing stub so `import { supabase } from ...` etc. compile but
// crash if actually invoked at runtime in a Self-Hosted bundle.
export const supabase = stub;
export const supabaseAdmin = stub;
export const createSupabaseBrowserAuthProvider = stub;
export const createSupabaseAuthProvider = stub;
export const createSupabaseAuthAdminProvider = stub;
export const createSupabaseStorageProvider = stub;
export const getCloudSupabase = stub;
export const getCloudSupabaseAdmin = stub;
export const requireSupabaseAuth = stub;
export const attachSupabaseAuth = stub;
export const bootstrapCloudProviders = stub;

export default stub;
