## Diagnosis

**Do I know what the issue is?** Yes.

The problem is **not that `/health` is missing**. It is already wired:

- Caddy rewrites `/health` to `/api/public/ready`.
- The app has routes for `/api/public/ready` and `/api/public/health`.
- The browser/installer gets HTTP **500**, so Caddy/TLS is reaching the Node app.

The real issue is: **global TanStack Start request middleware runs before server routes**, including health routes. I verified this against the current code and TanStack docs. In `src/start.ts`, `providerBootstrapRequestMiddleware` runs `ensureServerProviders()` for every request. If provider bootstrap fails, the `/health` route handler never runs, and `errorMiddleware` returns the generic HTML page: **“This page didn’t load”**.

So `/health` is currently blocked by app bootstrap instead of being a simple diagnostic endpoint.

Also confirmed: the installer package still writes `activation-bundle.json` in `src/lib/installation-package.server.ts`, even though the portal path already signs activation bundles as JWT. That must be changed.

## Important answer about Publish vs Installer

**Publish will not fix `https://localhost/health` on the Windows machine.**

`https://localhost/health` is served by the self-hosted Windows installation from the code packaged inside `OPSQAI-Setup.exe`. Publishing updates `opsqai.de` / the cloud Management Center, not the already-built local installer payload.

So after this fix, we still need a **new Windows installer build**.

## Plan

### 1. Make `/health` a real self-hosted diagnostic endpoint

Create a top-level route for `GET /health` that returns JSON directly, not React HTML.

Expected responses:

```json
{ "ok": true, "ready": true, "mode": "selfhost", "at": "..." }
```

or, if app bootstrap/provider wiring is broken:

```json
{ "ok": false, "ready": false, "error": "...real error..." }
```

This makes browser testing simple: opening `https://localhost/health` should show JSON, never the generic “This page didn’t load” screen.

### 2. Bypass global provider bootstrap for health routes

Update `src/start.ts` so these paths do **not** call `ensureServerProviders()` before routing:

- `/health`
- `/api/public/ready`
- `/api/public/health`

This is the key fix. Health endpoints must diagnose bootstrap, not depend on bootstrap already working.

### 3. Preserve JSON error output for health routes

For those same health paths, `errorMiddleware` should not return `renderErrorPage()`.

Instead it should return a JSON failure response with the actual error message, so the installer log can show what is wrong.

### 4. Simplify Caddy routing

Remove the `/health → /api/public/ready` rewrite from the Caddyfile and let Caddy proxy `/health` directly to the app.

This avoids confusion: `/health` will be an actual route, not an alias hidden behind Caddy.

### 5. Improve final bootstrap probe logs

Update `opsqai-windows/services/bootstrap/init.js` to test in two steps:

1. `http://127.0.0.1:3000/health` — direct Node app check.
2. `https://localhost/health` — Caddy/TLS/proxy check.

If it fails again, the log will say whether the issue is:

- Node app not responding,
- app bootstrap/provider failure,
- Caddy not proxying,
- TLS/local certificate problem.

### 6. Convert initial installer activation bundle from JSON to JWT

Update `src/lib/installation-package.server.ts` so the ZIP contains:

```text
activation-bundle.jwt
```

not:

```text
activation-bundle.json
```

Implementation:

- Use the existing `signBundleAsJwt(bundle)` function.
- Store the compact JWT string in the ZIP.
- Update README text from `.json` to `.jwt`.
- Update tests to decode JWT payload instead of `JSON.parse` on a JSON file.

This keeps all license activation paths consistent with your Windows requirement: **JWT only, no JSON license bundle**.

### 7. Required result

After rebuild/reinstall:

- `https://localhost/health` returns JSON.
- Installer final step no longer waits 120 seconds on repeated HTTP 500 without details.
- Installer package contains `activation-bundle.jwt`, not `activation-bundle.json`.
- If health fails again, the log contains the exact underlying app/provider error.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>