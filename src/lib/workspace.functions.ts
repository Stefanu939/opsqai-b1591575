/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { extractWorkspaceText } from "@/lib/workspace.extract.server";

const BUCKET = "workspace-temp";

function retentionToExpiry(retention: string | null | undefined): string | null {
  const now = Date.now();
  switch (retention) {
    case "immediate": return new Date(now + 30 * 60 * 1000).toISOString(); // 30-min safety net pre-cleanup
    case "1h": return new Date(now + 60 * 60 * 1000).toISOString();
    case "24h": return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case "7d": return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "manual": return null;
    default: return new Date(now + 60 * 60 * 1000).toISOString();
  }
}

async function profileCompany(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles").select("company_id").eq("id", userId).maybeSingle();
  return data?.company_id as string | undefined;
}

async function companyRetention(supabase: any, companyId: string): Promise<string> {
  const { data } = await supabase
    .from("companies").select("workspace_retention").eq("id", companyId).maybeSingle();
  return (data?.workspace_retention as string) ?? "immediate";
}

async function ensureWorkspaceRole(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  if (!(roles.includes("admin") || roles.includes("manager") || roles.includes("platform_admin"))) {
    throw new Error("AI Workspace is available to managers and admins only.");
  }
}

export const listWorkspaceSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureWorkspaceRole(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("workspace_sessions")
      .select("id, title, created_at, updated_at, user_id")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createWorkspaceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ title: z.string().trim().max(120).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureWorkspaceRole(context.supabase, context.userId);
    const companyId = await profileCompany(context.supabase, context.userId);
    if (!companyId) throw new Error("No company assigned");
    const { data: row, error } = await context.supabase
      .from("workspace_sessions")
      .insert({ company_id: companyId, user_id: context.userId, title: data.title || "New workspace" })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const getWorkspaceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureWorkspaceRole(context.supabase, context.userId);
    const { data: session } = await context.supabase
      .from("workspace_sessions").select("*").eq("id", data.id).maybeSingle();
    if (!session) throw new Error("Session not found");
    const [{ data: files }, { data: msgs }, { data: arts }, { data: company }] = await Promise.all([
      context.supabase.from("workspace_files")
        .select("id, file_name, mime, size_bytes, status, expires_at, created_at")
        .eq("session_id", data.id).order("created_at"),
      context.supabase.from("workspace_messages")
        .select("id, role, content, parts, attachments, created_at")
        .eq("session_id", data.id).order("created_at"),
      context.supabase.from("workspace_artifacts")
        .select("id, kind, file_name, storage_path, expires_at, created_at")
        .eq("session_id", data.id).order("created_at", { ascending: false }),
      context.supabase.from("companies")
        .select("workspace_retention").eq("id", (session as any).company_id).maybeSingle(),
    ]);
    return {
      session,
      files: files ?? [],
      messages: msgs ?? [],
      artifacts: arts ?? [],
      retention: (company as any)?.workspace_retention ?? "immediate",
    };
  });

export const renameWorkspaceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_sessions").update({ title: data.title }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteWorkspaceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Best-effort storage cleanup
    const { data: files } = await context.supabase
      .from("workspace_files").select("storage_path").eq("session_id", data.id);
    const { data: arts } = await context.supabase
      .from("workspace_artifacts").select("storage_path").eq("session_id", data.id);
    const paths = [
      ...(files ?? []).map((f: any) => f.storage_path),
      ...(arts ?? []).map((a: any) => a.storage_path),
    ].filter(Boolean) as string[];
    if (paths.length) await context.supabase.storage.from(BUCKET).remove(paths);
    const { error } = await context.supabase.from("workspace_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Client uploads the file to storage at `${companyId}/${sessionId}/${id}-${name}` then calls this.
export const registerWorkspaceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    session_id: z.string().uuid(),
    storage_path: z.string().min(1).max(500),
    file_name: z.string().min(1).max(255),
    mime: z.string().max(200).optional(),
    size_bytes: z.number().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureWorkspaceRole(context.supabase, context.userId);
    const companyId = await profileCompany(context.supabase, context.userId);
    if (!companyId) throw new Error("No company assigned");
    const retention = await companyRetention(context.supabase, companyId);
    const expires = retentionToExpiry(retention);

    // Download from storage to extract text
    const dl = await context.supabase.storage.from(BUCKET).download(data.storage_path);
    if (dl.error || !dl.data) throw new Error(dl.error?.message ?? "download failed");
    const buf = await dl.data.arrayBuffer();
    let extracted = "";
    try {
      extracted = await extractWorkspaceText(buf, data.file_name, data.mime ?? "");
    } catch (e) {
      extracted = `[extraction failed: ${(e as Error).message}]`;
    }

    const { data: row, error } = await context.supabase.from("workspace_files").insert({
      session_id: data.session_id,
      company_id: companyId,
      user_id: context.userId,
      file_name: data.file_name,
      mime: data.mime ?? null,
      size_bytes: data.size_bytes ?? null,
      storage_path: data.storage_path,
      extracted_text: extracted,
      status: "ready",
      expires_at: expires,
    } as any).select("id").single();
    if (error) throw new Error(error.message);

    await context.supabase.from("workspace_sessions")
      .update({ updated_at: new Date().toISOString() }).eq("id", data.session_id);

    return { id: (row as any).id as string, expires_at: expires };
  });

export const deleteWorkspaceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("workspace_files").select("storage_path").eq("id", data.id).maybeSingle();
    if ((row as any)?.storage_path) {
      await context.supabase.storage.from(BUCKET).remove([(row as any).storage_path]);
    }
    const { error } = await context.supabase.from("workspace_files").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const downloadArtifactUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: art } = await context.supabase
      .from("workspace_artifacts").select("storage_path, file_name").eq("id", data.id).maybeSingle();
    if (!art) throw new Error("Artifact not found");
    const { data: signed, error } = await context.supabase.storage
      .from(BUCKET)
      .createSignedUrl((art as any).storage_path, 60 * 10, { download: (art as any).file_name });
    if (error || !signed?.signedUrl) throw new Error(error?.message ?? "sign failed");
    return { url: signed.signedUrl };
  });

export const updateCompanyRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    retention: z.enum(["immediate", "1h", "24h", "7d", "manual"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const r = (roles ?? []).map((x: any) => x.role as string);
    if (!(r.includes("admin") || r.includes("platform_admin"))) throw new Error("Forbidden");
    const companyId = await profileCompany(context.supabase, context.userId);
    if (!companyId) throw new Error("No company assigned");
    const { error } = await context.supabase
      .from("companies").update({ workspace_retention: data.retention } as any).eq("id", companyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
