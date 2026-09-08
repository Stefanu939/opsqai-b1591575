// OPSQAI HR — document signing (server only).
//
// A document can be sent for signature with a due date. The signed copy is
// either an uploaded scan/PDF or a PDF built from the approved text plus a
// signature drawn on screen. Every signed copy is kept as a version, so the
// employee file always shows the full history.

import { hrQuery as q, hrQueryOne as one } from "./db.server";
import type { HrDocumentVersion } from "./types-ext";

export async function requestSignature(
  companyId: string,
  id: string,
  values: { due: string | null; by: string },
) {
  await q(
    `UPDATE public.hr_documents
        SET signature_status = 'requested', signature_due = $3::date,
            signature_requested_at = now(), signature_requested_by = $4,
            signature_reminded_at = NULL, updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, values.due, values.by],
  );
}

export async function cancelSignature(companyId: string, id: string) {
  await q(
    `UPDATE public.hr_documents
        SET signature_status = 'none', signature_due = NULL, signature_requested_at = NULL,
            signature_requested_by = NULL, signature_reminded_at = NULL, updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

/** Keep the current signed copy as a version, then file the new signed copy. */
export async function applySignature(
  companyId: string,
  id: string,
  file: { filename: string; mime: string; data: Uint8Array },
  signer: { name: string; kind: "upload" | "drawn"; actor: string },
) {
  const current = await one<{ signed_filename: string | null; signed_mime: string | null; signed_data: Uint8Array | null }>(
    `SELECT signed_filename, signed_mime, signed_data FROM public.hr_documents WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
  if (!current) throw new Error("Document not found.");
  if (current.signed_data) {
    const next = await one<{ v: number }>(
      `SELECT COALESCE(max(version), 0) + 1 AS v FROM public.hr_document_versions WHERE document_id = $1`,
      [id],
    );
    await q(
      `INSERT INTO public.hr_document_versions
         (company_id, document_id, version, kind, filename, mime, data, created_by_name)
       VALUES ($1,$2,$3,'signed',$4,$5,$6,$7)`,
      [
        companyId,
        id,
        next?.v ?? 1,
        current.signed_filename,
        current.signed_mime,
        current.signed_data ? Buffer.from(current.signed_data) : null,
        signer.actor,
      ],
    );
  }
  await q(
    `UPDATE public.hr_documents
        SET signed_filename = $3, signed_mime = $4, signed_data = $5, signed_at = now(),
            signature_status = 'signed', signed_by_name = $6, signature_kind = $7, updated_at = now()
      WHERE company_id = $1 AND id = $2`,
    [companyId, id, file.filename, file.mime, Buffer.from(file.data), signer.name, signer.kind],
  );
}

export function listVersions(companyId: string, documentId: string) {
  return q<HrDocumentVersion>(
    `SELECT id, document_id, version, kind, filename, mime, signed_by_name, signature_kind,
            created_by_name, created_at
       FROM public.hr_document_versions
      WHERE company_id = $1 AND document_id = $2
      ORDER BY version DESC`,
    [companyId, documentId],
  );
}

export function getVersionFile(companyId: string, id: string) {
  return one<{ filename: string | null; mime: string | null; data: Uint8Array | null }>(
    `SELECT filename, mime, data FROM public.hr_document_versions WHERE company_id = $1 AND id = $2`,
    [companyId, id],
  );
}

export interface PendingSignature {
  id: string;
  title: string;
  employee_id: string | null;
  employee_no: string | null;
  employee_name: string | null;
  signature_due: string | null;
  days_left: number | null;
  overdue: boolean;
}

export async function pendingSignatures(companyId: string): Promise<PendingSignature[]> {
  const rows = await q<PendingSignature & { days_left: string | null }>(
    `SELECT d.id, COALESCE(d.draft_name, d.title) AS title, d.employee_id, e.employee_no,
            NULLIF(concat_ws(' ', e.first_name, e.last_name), '') AS employee_name,
            d.signature_due::text AS signature_due,
            CASE WHEN d.signature_due IS NULL THEN NULL
                 ELSE (d.signature_due - CURRENT_DATE) END AS days_left
       FROM public.hr_documents d
       LEFT JOIN public.hr_employees e ON e.id = d.employee_id
      WHERE d.company_id = $1 AND d.signature_status = 'requested'
      ORDER BY d.signature_due NULLS LAST, d.updated_at DESC
      LIMIT 200`,
    [companyId],
  );
  return rows.map((r) => {
    const days = r.days_left === null ? null : Number(r.days_left);
    return { ...r, days_left: days, overdue: days !== null && days < 0 };
  });
}

export async function markReminded(companyId: string, ids: string[]) {
  if (!ids.length) return;
  await q(
    `UPDATE public.hr_documents SET signature_reminded_at = now()
      WHERE company_id = $1 AND id = ANY($2::uuid[])`,
    [companyId, ids],
  );
}

/**
 * Build a signed PDF from the document text plus a signature drawn on screen.
 * The image is placed in a signature block on the last page.
 */
export async function renderDrawnSignaturePdf(input: {
  title: string;
  body: string;
  meta: string[];
  footer: string;
  signaturePngBase64: string;
  signerName: string;
  signedLabel: string;
}): Promise<Uint8Array> {
  const { renderDocumentPdf } = await import("./document-pdf.server");
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const base = await renderDocumentPdf({
    title: input.title,
    body: input.body,
    meta: input.meta,
    footer: input.footer,
    watermark: null,
  });
  const doc = await PDFDocument.load(base);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const png = await doc.embedPng(Buffer.from(input.signaturePngBase64, "base64"));
  const page = doc.addPage([595, 842]);
  const scale = Math.min(220 / png.width, 90 / png.height, 1);
  page.drawText(input.signedLabel, { x: 56, y: 700, size: 11, font, color: rgb(0.1, 0.1, 0.12) });
  page.drawImage(png, {
    x: 56,
    y: 590,
    width: png.width * scale,
    height: png.height * scale,
  });
  page.drawLine({ start: { x: 56, y: 580 }, end: { x: 320, y: 580 }, thickness: 0.6, color: rgb(0.6, 0.6, 0.65) });
  page.drawText(`${input.signerName} · ${new Date().toISOString().slice(0, 10)}`, {
    x: 56,
    y: 562,
    size: 9,
    font,
    color: rgb(0.4, 0.4, 0.45),
  });
  return doc.save();
}
