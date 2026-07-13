// Service worker cleanup wrapper.
//
// The app does not currently ship an offline / app-shell service worker.
// A previous build did register `/sw.js`, so some browsers still have a
// stale registration that can serve outdated HTML/CSS from cache and cause
// bugs like the mobile two-finger-scroll regression.
//
// This wrapper never registers a new SW. Instead it unregisters any
// existing `/sw.js` on load; a matching kill-switch worker is shipped at
// `public/sw.js` for one release cycle so that returning browsers pick it
// up, clear their Workbox caches, and unregister themselves.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      for (const r of regs) {
        const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
        if (url.endsWith("/sw.js") || url.endsWith("/service-worker.js")) {
          r.unregister().catch(() => {});
        }
      }
    })
    .catch(() => {});
}
