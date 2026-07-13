import { createHash } from "crypto";

export type ApiAuthContext = {
  companyId: string;
  keyId: string;
  scopes: string[];
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...CORS_HEADERS,
    },
  });
}

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function authenticateApiRequest(
  request: Request,
): Promise<{ ctx: ApiAuthContext; supabaseAdmin: any } | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return jsonResponse({ error: "missing_bearer_token" }, 401);
  }
  const raw = match[1].trim();
  if (!raw.startsWith("opsq_")) {
    return jsonResponse({ error: "invalid_token_format" }, 401);
  }
  const hash = createHash("sha256").update(raw).digest("hex");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("verify_api_key", { _hash: hash });
  if (error) {
    return jsonResponse({ error: "auth_lookup_failed" }, 500);
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.company_id) {
    return jsonResponse({ error: "invalid_or_revoked_token" }, 401);
  }
  // Fire-and-forget last_used_at bump
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.key_id);

  return {
    ctx: { companyId: row.company_id, keyId: row.key_id, scopes: row.scopes ?? [] },
    supabaseAdmin,
  };
}

export function requireScope(ctx: ApiAuthContext, scope: string): Response | null {
  if (!ctx.scopes.includes(scope)) {
    return jsonResponse({ error: "insufficient_scope", required: scope }, 403);
  }
  return null;
}

export function parsePagination(url: URL) {
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);
  return { limit, offset };
}
