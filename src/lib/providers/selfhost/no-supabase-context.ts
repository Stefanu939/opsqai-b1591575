// Self-Hosted data context — the deliberate "no Supabase here" guard.
//
// Cloud's `IAuthProvider.getDataContext()` returns a user-scoped
// SupabaseClient. Self-Hosted has no Supabase at all: every feature must go
// through a repository backed by the embedded PostgreSQL pool. To make a
// missed migration fail loudly instead of silently corrupting data, the
// Self-Hosted provider returns a proxy that throws as soon as a caller tries
// to use it as a data client (`.from(...)`, `.rpc(...)`, `.storage`, ...).
//
// IMPORTANT — why there is an allow-list below.
//
// A bare `new Proxy({}, { get: () => { throw ... } })` is unusable as an
// async return value: `getDataContext()` is an `async` function, so the
// runtime resolves its return value through the thenable protocol, which
// READS `value.then`. The get trap fires for "then" and the promise rejects
// with the "not migrated" error — meaning EVERY server function using
// `requireAuth` failed on Self-Hosted before it ever ran its handler. That
// produced misleading symptoms: "Could not load your permissions" in the app
// shell, skeleton Knowledge/FAQ pages with no action buttons, and a
// "Wave C.2" error in AI Chat.
//
// The fix is not to weaken the guard: real data-client usage still throws.
// We only make the inert reflection/inspection keys that JavaScript itself,
// promise resolution, structured logging and test assertions perform return
// `undefined` instead of throwing.

/** Keys read by the language/runtime, never by feature data-access code. */
const INERT_KEYS = new Set<string>([
  // Promise resolution / await
  "then",
  "catch",
  "finally",
  // Object plumbing & serialisation
  "constructor",
  "toJSON",
  "toString",
  "valueOf",
  "inspect",
  // Common truthiness / shape probes in generic code
  "length",
  "name",
]);

function isInertKey(prop: string | symbol): boolean {
  // Every symbol probe (Symbol.toStringTag, Symbol.toPrimitive,
  // Symbol.asyncIterator, node's util.inspect.custom, vitest matchers, ...)
  // is reflection, never data access.
  if (typeof prop === "symbol") return true;
  return INERT_KEYS.has(prop);
}

export const SELF_HOSTED_DATA_CONTEXT_ERROR =
  "Self-Hosted: this code path still uses the Supabase data client and has " +
  "not been migrated to a repository. Use getXRepository() from " +
  "@/lib/providers/registry instead — Self-Hosted data access must go " +
  "through the embedded PostgreSQL pool.";

/**
 * Build the throwing Self-Hosted data context. Accessing any data-client
 * member throws {@link SELF_HOSTED_DATA_CONTEXT_ERROR}; inert runtime
 * reflection returns `undefined` so the object can be awaited, logged and
 * passed through repository factories that ignore it.
 */
export function createSelfHostedDataContext(): unknown {
  const fail = (prop: string | symbol): never => {
    const key = typeof prop === "symbol" ? prop.toString() : prop;
    const error = new Error(`${SELF_HOSTED_DATA_CONTEXT_ERROR} (accessed: ${key})`);
    error.name = "SelfHostedSupabaseAccessError";
    throw error;
  };

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (isInertKey(prop)) return undefined;
        return fail(prop);
      },
      // A missed migration may also do `"from" in ctx` or call the context.
      apply: () => fail("apply"),
      set: (_t, prop) => fail(prop),
    },
  );
}
