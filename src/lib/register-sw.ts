// Service worker registration wrapper. Refuses in dev, preview iframes,
// Lovable preview hostnames, and when ?sw=off is set. Unregisters matching
// /sw.js registrations in any refused context.
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const host = window.location.hostname;
  const inIframe = window.self !== window.top;
  const swOff = new URL(window.location.href).searchParams.get("sw") === "off";
  const previewHost =
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" || host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev");

  const refuse = !import.meta.env.PROD || inIframe || previewHost || swOff;

  if (refuse) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const r of regs) {
        if (r.active?.scriptURL.endsWith("/sw.js") || r.installing?.scriptURL.endsWith("/sw.js")) {
          r.unregister().catch(() => {});
        }
      }
    }).catch(() => {});
    return;
  }

  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
    console.warn("[opsqai] sw registration failed", err);
  });
}
