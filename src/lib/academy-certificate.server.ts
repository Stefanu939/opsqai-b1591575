/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only: build a branded certificate PDF and store it in academy-certificates.

const BUCKET = "academy-certificates";

interface IssueOpts {
  enrollmentId: string;
  pathId: string;
  userId: string;
  companyId: string;
  finalScore: number;
}

export async function issueAcademyCertificate(supabase: any, opts: IssueOpts) {
  // 1) Insert DB row (gets certificate_code).
  const { data: insert, error } = await supabase
    .from("academy_certificates")
    .insert({
      company_id: opts.companyId,
      enrollment_id: opts.enrollmentId,
      path_id: opts.pathId,
      user_id: opts.userId,
      final_score: opts.finalScore,
    })
    .select("id, certificate_code")
    .single();
  if (error) throw new Error(error.message);
  const certId = insert.id as string;
  const code = insert.certificate_code as string;

  // 2) Read details for the certificate body.
  const [{ data: path }, { data: company }, { data: profile }] = await Promise.all([
    supabase.from("academy_learning_paths").select("title, academy_departments(name)").eq("id", opts.pathId).maybeSingle(),
    supabase.from("companies").select("name").eq("id", opts.companyId).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", opts.userId).maybeSingle(),
  ]);

  const recipient = profile?.full_name ?? "Learner";
  const courseName = path?.title ?? "Course";
  const department = (path as any)?.academy_departments?.name ?? "";
  const companyName = company?.name ?? "OPSQAI";

  // 3) Build PDF (A4 landscape).
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const QRCode = (await import("qrcode")).default;

  const verifyUrl = `https://opsqai.de/verify/${code}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { width: 220, margin: 1 });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`OPSQAI Certificate · ${courseName}`);
  pdf.setProducer("OPSQAI Academy");
  pdf.setCreator("OPSQAI Academy");

  const W = 841.89, H = 595.28; // A4 landscape
  const page = pdf.addPage([W, H]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Background frame
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: rgb(0.10, 0.51, 0.78), borderWidth: 2 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: rgb(0.10, 0.51, 0.78), borderWidth: 0.5 });

  // Header
  page.drawText("OPSQAI ACADEMY", { x: 60, y: H - 80, size: 12, font: bold, color: rgb(0.10, 0.51, 0.78) });
  page.drawText("Certificate of Completion", { x: 60, y: H - 130, size: 28, font: bold, color: rgb(0.06, 0.09, 0.16) });
  page.drawText("This certifies that", { x: 60, y: H - 175, size: 13, font: regular, color: rgb(0.3, 0.35, 0.42) });

  // Recipient
  page.drawText(recipient, { x: 60, y: H - 220, size: 32, font: bold, color: rgb(0.06, 0.09, 0.16) });
  page.drawText("has successfully completed", { x: 60, y: H - 255, size: 13, font: regular, color: rgb(0.3, 0.35, 0.42) });
  page.drawText(courseName, { x: 60, y: H - 295, size: 22, font: bold, color: rgb(0.10, 0.51, 0.78) });
  if (department) {
    page.drawText(`${department} · ${companyName}`, { x: 60, y: H - 320, size: 12, font: italic, color: rgb(0.4, 0.45, 0.5) });
  } else {
    page.drawText(companyName, { x: 60, y: H - 320, size: 12, font: italic, color: rgb(0.4, 0.45, 0.5) });
  }

  // Score + date
  const issued = new Date().toISOString().slice(0, 10);
  page.drawText(`Final score: ${opts.finalScore}%`, { x: 60, y: H - 380, size: 13, font: bold, color: rgb(0.06, 0.09, 0.16) });
  page.drawText(`Issued: ${issued}`, { x: 60, y: H - 400, size: 12, font: regular, color: rgb(0.3, 0.35, 0.42) });
  page.drawText(`Certificate ID: ${code}`, { x: 60, y: H - 420, size: 10, font: regular, color: rgb(0.4, 0.45, 0.5) });

  // Signature
  page.drawText("____________________________", { x: 60, y: 110, size: 10, font: regular, color: rgb(0.3, 0.35, 0.42) });
  page.drawText("Authorized Signature", { x: 60, y: 92, size: 10, font: regular, color: rgb(0.4, 0.45, 0.5) });

  // QR code
  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 130;
  page.drawImage(qrImage, { x: W - qrSize - 60, y: 60, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", { x: W - qrSize - 60, y: 50, size: 9, font: regular, color: rgb(0.4, 0.45, 0.5) });

  const pdfBytes = await pdf.save();

  // 4) Upload to storage.
  const pdfPath = `${opts.companyId}/${certId}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET).upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  await supabase.from("academy_certificates")
    .update({ pdf_path: pdfPath, qr_payload: verifyUrl })
    .eq("id", certId);

  return { id: certId, code, path: pdfPath };
}
