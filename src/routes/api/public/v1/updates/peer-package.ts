// LAN peer distribution of an already verified update package.
//
// When one installation on a customer server has downloaded and verified a
// release, other installations on the same server can pull the identical bytes
// from it instead of each reaching the internet. Disabled by default: the
// endpoint only answers when `updates.peerServe` is true and the caller
// presents the configured shared token.
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const Route = createFileRoute("/api/public/v1/updates/peer-package")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { currentServerMode } = await import("@/lib/deployment-mode.server");
        if (currentServerMode() !== "selfhost") return new Response("Not found", { status: 404 });

        const { readPeerUpdateSettings, storedPackage } = await import(
          "@/lib/providers/selfhost/update-discovery.server"
        );
        const peer = await readPeerUpdateSettings();
        if (!peer.serve || !peer.token) return new Response("Not found", { status: 404 });

        const presented = request.headers.get("x-opsqai-peer-token") ?? "";
        if (!presented || !sameToken(presented, peer.token)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const version = new URL(request.url).searchParams.get("version")?.trim();
        if (!version) return new Response("version required", { status: 400 });

        const pkg = await storedPackage(version);
        if (!pkg) return new Response("Not staged", { status: 404 });

        const { readFile } = await import("node:fs/promises");
        let bytes: Buffer;
        try {
          bytes = await readFile(pkg.path);
        } catch {
          return new Response("Not staged", { status: 404 });
        }
        return new Response(new Uint8Array(bytes), {
          headers: {
            "content-type": "application/octet-stream",
            "content-length": String(bytes.byteLength),
            "x-opsqai-sha256": pkg.sha256,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
