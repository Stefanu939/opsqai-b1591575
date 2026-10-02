// Browser helper: send a knowledge file as raw multipart to /api/kb-upload.
import { getBrowserAuthProvider } from "@/lib/providers/registry";

export async function uploadKbFile(file: File, companyId: string | null): Promise<string> {
  const sess = await getBrowserAuthProvider().getSession();
  const fd = new FormData();
  fd.append("file", file);
  if (companyId) fd.append("company_id", companyId);
  const res = await fetch("/api/kb-upload", {
    method: "POST",
    headers: sess?.accessToken ? { Authorization: `Bearer ${sess.accessToken}` } : {},
    body: fd,
  });
  const body = (await res.json().catch(() => ({}))) as { file_path?: string; error?: string };
  if (!res.ok || !body.file_path) throw new Error(body.error || `Încărcarea a eșuat (${res.status})`);
  return body.file_path;
}
