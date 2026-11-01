// Server-only: AI operational diagnostic, PDF rendering and Strato SMTP sending.
import { streamText } from "ai";
import { resolveChatModel } from "@/lib/ai-provider.server";
import { createSimplePdf, type SimplePdfLine } from "@/lib/simple-pdf.server";

export const DIAGNOSTIC_SUBJECT = "Diagnostic operațional AI";

const SYSTEM = `Ești consultant operațional OPSQAI. OPSQAI este o platformă AI self-hosted (rulează 100% local pe serverul Windows al clientului, datele nu pleacă din rețea).
Module standard disponibile (licențiate): AI Chat & Knowledge Base (proceduri, documente), FAQ, Academy (instruire angajați), SOP Versioning, Internal Requests, Internal Chat, Reports & Executive Dashboard, Compliance Center, OPSQAI Transport (flotă, CMR, ITP/roviniete, curse), OPSQAI Logistics, OPSQAI HR (angajați, concedii, documente), OPSQAI Finance (facturi, încasări), OPSQAI Inventory (stocuri, loturi), OPSQAI Operations.
Pe lângă acestea dezvoltăm module custom la cost fix (CRM, management center, gestiune marfă, devize service, fluxuri bancare etc.).
Reguli: nu inventa cifre despre client; estimările sunt marcate ca ipoteze. Nu promite certificări (DORA/NIS2 doar „controale aliniate cerințelor"). Scrie în limba mesajului clientului (implicit română), ton profesional, concret.
Răspunde DOAR în acest format text, fără markdown suplimentar:
## Rezumat
(2-3 fraze)
## Fricțiuni identificate
- ...
## Module standard recomandate
- Nume modul: de ce
## Soluție custom propusă
- ...
## Plan pilot 30 de zile
- ...
## Pași următori
- ...`;

export async function generateDiagnosticText(input: {
  company: string;
  contact: string | null;
  role: string | null;
  message: string;
}): Promise<string> {
  const result = streamText({
    model: resolveChatModel("chat"),
    system: SYSTEM,
    prompt: `Companie: ${input.company}\nPersoană: ${input.contact ?? "-"}\nFuncție: ${input.role ?? "-"}\n\nDescrierea clientului:\n${input.message.slice(0, 6000)}`,
  });
  const text = (await result.text).trim();
  if (!text) throw new Error("AI nu a returnat un diagnostic. Încearcă din nou.");
  return text;
}

export function diagnosticPdf(company: string, contact: string | null, text: string): Uint8Array {
  const lines: SimplePdfLine[] = [
    { kind: "title", text: "OPSQAI - Diagnostic operational" },
    { kind: "subtitle", text: `${company}${contact ? ` - ${contact}` : ""} - ${new Date().toISOString().slice(0, 10)}` },
  ];
  for (const raw of text.split("\n")) {
    const l = raw.trim();
    if (!l) continue;
    if (l.startsWith("##")) lines.push({ kind: "heading", text: l.replace(/^#+\s*/, "") });
    else lines.push({ kind: "text", text: l.startsWith("-") ? `• ${l.replace(/^-\s*/, "")}` : l });
  }
  lines.push({ kind: "note", text: "Diagnostic orientativ pe baza descrierii primite. Estimarile se confirma in pilotul de 30 de zile. opsqai.de" });
  return createSimplePdf({ title: `Diagnostic ${company}`, author: "OPSQAI", footer: "OPSQAI · opsqai.de", lines });
}

export function diagnosticEmailBody(contact: string | null, text: string, sender: string) {
  const first = (contact ?? "").split(/\s+/)[0];
  return `Bună ziua${first ? ` ${first}` : ""},\n\nVă mulțumim pentru descrierea procesului. Mai jos găsiți diagnosticul nostru operațional (și în PDF atașat):\n\n${text.replace(/^##\s*/gm, "")}\n\nPutem discuta pașii în 20 de minute, când vă este comod.\n\n${sender}\nOPSQAI · opsqai.de`;
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

const wrap76 = (b64: string) => b64.replace(/.{1,76}/g, "$&\r\n");
const encWord = (s: string) => `=?UTF-8?B?${toBase64(new TextEncoder().encode(s))}?=`;

export function stratoConfigured() {
  return Boolean(process.env.STRATO_SMTP_USER && process.env.STRATO_SMTP_PASSWORD);
}
export function stratoAutoSend() {
  return stratoConfigured() && (process.env.DIAGNOSTIC_AUTO_SEND ?? "").toLowerCase() === "true";
}

/** Minimal SMTP (implicit TLS, port 465) client for Strato over Worker sockets. */
export async function sendStratoMail(o: {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
  attachment?: { filename: string; bytes: Uint8Array };
}) {
  const user = process.env.STRATO_SMTP_USER;
  const pass = process.env.STRATO_SMTP_PASSWORD;
  if (!user || !pass) throw new Error("Contul Strato nu este configurat.");
  const host = process.env.STRATO_SMTP_HOST || "smtp.strato.de";
  const fromName = process.env.STRATO_FROM_NAME || "OPSQAI";
  const modName = "cloudflare:sockets";
  let connect: (a: { hostname: string; port: number }, o: { secureTransport: string }) => {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    close: () => Promise<void>;
  };
  try {
    ({ connect } = await import(/* @vite-ignore */ modName));
  } catch {
    throw new Error("Trimiterea directă prin Strato funcționează pe site-ul publicat (opsqai.de).");
  }
  const socket = connect({ hostname: host, port: 465 }, { secureTransport: "on" });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = "";
  const read = async (): Promise<string> => {
    for (;;) {
      const lines = buf.split("\r\n");
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i] ?? "")) {
          buf = lines.slice(i + 1).join("\r\n");
          return lines.slice(0, i + 1).join("\n");
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("Conexiunea SMTP s-a închis.");
      buf += dec.decode(value, { stream: true });
    }
  };
  const cmd = async (line: string | null, expect: string) => {
    if (line !== null) await writer.write(enc.encode(line + "\r\n"));
    const r = await read();
    if (!r.startsWith(expect)) throw new Error(`Strato a refuzat: ${r.slice(0, 160)}`);
    return r;
  };
  try {
    await cmd(null, "220");
    await cmd("EHLO opsqai.de", "250");
    await cmd("AUTH LOGIN", "334");
    await cmd(btoa(user), "334");
    await cmd(toBase64(enc.encode(pass)), "235");
    await cmd(`MAIL FROM:<${user}>`, "250");
    await cmd(`RCPT TO:<${o.to}>`, "25");
    await cmd("DATA", "354");
    const boundary = `opsqai-${crypto.randomUUID()}`;
    const headers = [
      `From: ${encWord(fromName)} <${user}>`,
      `To: <${o.to}>`,
      ...(o.replyTo ? [`Reply-To: <${o.replyTo}>`] : []),
      `Subject: ${encWord(o.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@opsqai.de>`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ];
    const parts = [
      `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(toBase64(enc.encode(o.text)))}`,
    ];
    if (o.attachment) {
      parts.push(
        `--${boundary}\r\nContent-Type: application/pdf; name="${o.attachment.filename}"\r\nContent-Disposition: attachment; filename="${o.attachment.filename}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(toBase64(o.attachment.bytes))}`,
      );
    }
    const msg = `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}\r\n--${boundary}--\r\n.`;
    await cmd(msg, "250");
    await writer.write(enc.encode("QUIT\r\n")).catch(() => {});
  } finally {
    await socket.close().catch(() => {});
  }
}

export function pdfFilename(company: string) {
  return `Diagnostic-OPSQAI-${company.replace(/[^\w-]+/g, "-").slice(0, 40)}.pdf`;
}
