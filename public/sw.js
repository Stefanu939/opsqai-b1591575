// Kill-switch service worker.
// Replaces a previously-shipped app service worker so returning browsers
// evict the stale registration, drop cached HTML/CSS/JS, and reload with
// fresh network content. Cache Storage is origin-scoped — only delete
// caches that belong to this registration; leave Firebase Messaging /
// OneSignal / other integrations alone.

function isWorkboxCacheForThisRegistration(name) {
  const hasWorkboxBucket = /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-/.test(name);
  const isThisAppsNamedRuntimeCache = name === "opsqai-pages" || name === "opsqai-assets";
  return (
    isThisAppsNamedRuntimeCache || (hasWorkboxBucket && name.endsWith(self.registration.scope))
  );
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const workboxCacheNames = cacheNames.filter(isWorkboxCacheForThisRegistration);
        await Promise.allSettled(workboxCacheNames.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);
