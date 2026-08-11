/* eslint-disable @typescript-eslint/no-explicit-any */
// Server-only: build a branded certificate PDF and store it via the storage provider.
import { getAcademyRepository, getCompanyRepository, getProfileRepository, getStorageProvider } from "@/lib/providers/registry";

const BUCKET = "academy-certificates";

interface IssueOpts {
  enrollmentId: string;
  pathId: string;
  userId: string;
  companyId: string;
  finalScore: number;
}

export async function issueAcademyCertificate(context: { supabase: any; userId: string }, opts: IssueOpts) {
  const academyRepo = getAcademyRepository(context);

  // 1) Idempotent upsert: one certificate per enrollment.
  const cert = await academyRepo.upsertCertificate({
    companyId: opts.companyId,
    enrollmentId: opts.enrollmentId,
    pathId: opts.pathId,
    userId: opts.userId,
    finalScore: opts.finalScore,
  });
  const certId = cert.id;
  const code = cert.certificate_code;
  const existingPath = cert.pdf_path ?? null;

  // 2) Read details for the certificate body.
  const [pathResult, company, profile] = await Promise.all([
    academyRepo.getLearningPath(opts.pathId),
    getCompanyRepository(context).findById(opts.companyId),
    getProfileRepository(context).findByUserId(opts.userId),
  ]);

  const recipient = profile?.fullName ?? "Learner";
  const courseName = pathResult?.path.title ?? "Course";
  const department = pathResult?.path.department_name ?? "";
  const companyName = company?.name ?? "OPSQAI";

  // 3) Build PDF (A4 landscape).
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib/es/index.js");
  const QRCode = (await import("qrcode")).default;

  const verifyUrl = `https://opsqai.de/verify/${code}`;
  const qrPng = await QRCode.toBuffer(verifyUrl, { width: 220, margin: 1 });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`OPSQAI Certificate · ${courseName}`);
  pdf.setProducer("OPSQAI Academy");
  pdf.setCreator("OPSQAI Academy");

  const W = 841.89,
    H = 595.28; // A4 landscape
  const page = pdf.addPage([W, H]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  page.drawRectangle({
    x: 24,
    y: 24,
    width: W - 48,
    height: H - 48,
    borderColor: rgb(0.1, 0.51, 0.78),
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: W - 64,
    height: H - 64,
    borderColor: rgb(0.1, 0.51, 0.78),
    borderWidth: 0.5,
  });

  page.drawText("OPSQAI ACADEMY", {
    x: 60,
    y: H - 80,
    size: 12,
    font: bold,
    color: rgb(0.1, 0.51, 0.78),
  });
  page.drawText("Certificate of Completion", {
    x: 60,
    y: H - 130,
    size: 28,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawText("This certifies that", {
    x: 60,
    y: H - 175,
    size: 13,
    font: regular,
    color: rgb(0.3, 0.35, 0.42),
  });

  page.drawText(recipient, {
    x: 60,
    y: H - 220,
    size: 32,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawText("has successfully completed", {
    x: 60,
    y: H - 255,
    size: 13,
    font: regular,
    color: rgb(0.3, 0.35, 0.42),
  });
  page.drawText(courseName, {
    x: 60,
    y: H - 295,
    size: 22,
    font: bold,
    color: rgb(0.1, 0.51, 0.78),
  });
  if (department) {
    page.drawText(`${department} · ${companyName}`, {
      x: 60,
      y: H - 320,
      size: 12,
      font: italic,
      color: rgb(0.4, 0.45, 0.5),
    });
  } else {
    page.drawText(companyName, {
      x: 60,
      y: H - 320,
      size: 12,
      font: italic,
      color: rgb(0.4, 0.45, 0.5),
    });
  }

  const issued = new Date().toISOString().slice(0, 10);
  page.drawText(`Final score: ${opts.finalScore}%`, {
    x: 60,
    y: H - 380,
    size: 13,
    font: bold,
    color: rgb(0.06, 0.09, 0.16),
  });
  page.drawText(`Issued: ${issued}`, {
    x: 60,
    y: H - 400,
    size: 12,
    font: regular,
    color: rgb(0.3, 0.35, 0.42),
  });
  page.drawText(`Certificate ID: ${code}`, {
    x: 60,
    y: H - 420,
    size: 10,
    font: regular,
    color: rgb(0.4, 0.45, 0.5),
  });

  page.drawText("____________________________", {
    x: 60,
    y: 110,
    size: 10,
    font: regular,
    color: rgb(0.3, 0.35, 0.42),
  });
  page.drawText("Authorized Signature", {
    x: 60,
    y: 92,
    size: 10,
    font: regular,
    color: rgb(0.4, 0.45, 0.5),
  });

  const qrImage = await pdf.embedPng(qrPng);
  const qrSize = 130;
  page.drawImage(qrImage, { x: W - qrSize - 60, y: 60, width: qrSize, height: qrSize });
  page.drawText("Scan to verify", {
    x: W - qrSize - 60,
    y: 50,
    size: 9,
    font: regular,
    color: rgb(0.4, 0.45, 0.5),
  });

  const pdfBytes = await pdf.save();

  // 4) Upload via the storage provider.
  const pdfPath = existingPath ?? `${opts.companyId}/${certId}.pdf`;
  await getStorageProvider().put({
    bucket: BUCKET,
    key: pdfPath,
    body: pdfBytes,
    contentType: "application/pdf",
  });

  await academyRepo.markCertificatePdf(certId, pdfPath, verifyUrl);

  return { id: certId, code, path: pdfPath };
}
