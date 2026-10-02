// Binary (multipart) upload for knowledge documents. Replaces the old
// base64-in-JSON server-fn payload, which broke on larger files (connection
// reset → "Failed to fetch"). Stores the blob only; indexing runs separately.
import { createFileRoute } from "@tanstack/react-router";
import { getAuthProvider, getStorageProvider } from "@/lib/providers/registry";
import { requireModuleAccess } from "@/lib/module-access.server";
import { requireAnyPermission, resolveCompanyForWrite } from "@/lib/authorization";

const MAX_BYTES = 60 * 1024 * 1024;

export const Route = createFileRoute("/api/kb-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get("authorization") ?? "";
        if (!header.startsWith("Bearer ")) return new Response("Unauthorized", { status: 401 });
        const token = header.slice(7);
        let identity;
        try {
          identity = await getAuthProvider().verifyAccessToken(token);
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }
        const supabase = await getAuthProvider().getDataContext(token);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const context = { supabase, userId: identity.userId, claims: identity.claims } as any;
        try {
          await requireModuleAccess(context, "kb");
          await requireAnyPermission(context, ["knowledge.manage", "sop.create", "sop.edit"]);
          const form = await request.formData();
          const file = form.get("file");
          if (!(file instanceof File)) return Response.json({ error: "Lipsește fișierul" }, { status: 400 });
          if (file.size > MAX_BYTES)
            return Response.json({ error: "Fișierul depășește 60 MB" }, { status: 413 });
          const companyRaw = form.get("company_id");
          const companyId = await resolveCompanyForWrite(
            context,
            typeof companyRaw === "string" && companyRaw ? companyRaw : null,
          );
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const key = `${companyId}/${Date.now()}-${safe}`;
          await getStorageProvider().put({
            bucket: "knowledge-docs",
            key,
            body: new Uint8Array(await file.arrayBuffer()),
            contentType: file.type || "application/octet-stream",
          });
          return Response.json({ file_path: key });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json({ error: msg }, { status: /forbidden|permission|unauthor/i.test(msg) ? 403 : 500 });
        }
      },
    },
  },
});
