// GET /api/public/tls-ask?domain=… — Caddy on-demand TLS gate (Self-Hosted).
//
// Caddy asks before issuing an internal certificate for a host name that a
// workstation used to reach the company server. Only private-network IPs,
// single-label LAN names, .local/.lan/.internal/.corp names, and names listed
// in OPSQAI_ALLOWED_HOSTS (comma separated) are approved.

import { createFileRoute } from "@tanstack/react-router";

function isPrivateIp(h: string): boolean {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(h);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export const Route = createFileRoute("/api/public/tls-ask")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (process.env.OPSQAI_MODE !== "selfhost") return new Response("no", { status: 404 });
        const host = (new URL(request.url).searchParams.get("domain") ?? "").trim().toLowerCase();
        if (!host || host.length > 253 || !/^[a-z0-9.-]+$/.test(host)) {
          return new Response("no", { status: 403 });
        }
        const extra = (process.env.OPSQAI_ALLOWED_HOSTS ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
        const { remoteHosts } = await import("@/lib/selfhost-remote.server");
        const remote = await remoteHosts().catch(() => [] as string[]);
        const ok =
          remote.includes(host) ||
          isPrivateIp(host) ||
          !host.includes(".") ||
          /\.(local|lan|internal|corp|home\.arpa)$/.test(host) ||
          extra.includes(host);
        return new Response(ok ? "ok" : "no", { status: ok ? 200 : 403 });
      },
    },
  },
});
