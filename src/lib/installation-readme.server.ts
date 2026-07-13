// Server-only: render the installation package README as a PDF.
// Uses pdf-lib (pure JS, Cloudflare Worker-compatible).

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export interface ReadmePdfInput {
  install_id: string;
  installer_version: string;
  company_name: string;
  generated_at: string;
}

// A4 in points (pdf-lib default unit)
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 56;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

// Colors
const INK = rgb(0.11, 0.13, 0.16);
const MUTED = rgb(0.42, 0.46, 0.52);
const ACCENT = rgb(0.16, 0.42, 0.86);
const RULE = rgb(0.82, 0.85, 0.9);
const CODE_BG = rgb(0.96, 0.97, 0.98);

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN_TOP;
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN_BOTTOM) newPage(ctx);
}

// Helvetica/Courier are WinAnsi-encoded standard fonts; they don't cover
// Romanian diacritics. Transliterate to plain Latin so text renders correctly.
const DIACRITIC_MAP: Record<string, string> = {
  "ă": "a", "â": "a", "î": "i", "ș": "s", "ş": "s", "ț": "t", "ţ": "t",
  "Ă": "A", "Â": "A", "Î": "I", "Ș": "S", "Ş": "S", "Ț": "T", "Ţ": "T",
  "„": '"', "”": '"', "“": '"', "’": "'", "‘": "'", "–": "-", "—": "-", "…": "...",
  "→": "->", "←": "<-", "✓": "OK", "✗": "X", "•": "-",
};
function ascii(s: string): string {
  // Map known glyphs, then strip diacritics via NFD, then replace any
  // remaining non-WinAnsi codepoint with '?'.
  const mapped = s.replace(/./gu, (c) => DIACRITIC_MAP[c] ?? c);
  const stripped = mapped.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return stripped.replace(/[^\x09\x0a\x0d\x20-\x7e\xa0-\xff]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  text = ascii(text);
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawParagraph(
  ctx: Ctx,
  text: string,
  opts: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; x?: number; maxWidth?: number; lineGap?: number } = {},
): void {
  const font = opts.font ?? ctx.regular;
  const size = opts.size ?? 10.5;
  const color = opts.color ?? INK;
  const x = opts.x ?? MARGIN_X;
  const maxWidth = opts.maxWidth ?? CONTENT_W - (x - MARGIN_X);
  const lineGap = opts.lineGap ?? 3;
  const lines = wrapText(text, font, size, maxWidth);
  const lineH = size + lineGap;
  for (const line of lines) {
    ensureSpace(ctx, lineH);
    ctx.page.drawText(line, { x, y: ctx.y - size, size, font, color });
    ctx.y -= lineH;
  }
}

function h1(ctx: Ctx, text: string): void {
  ensureSpace(ctx, 32);
  ctx.y -= 6;
  ctx.page.drawText(ascii(text), { x: MARGIN_X, y: ctx.y - 18, size: 18, font: ctx.bold, color: INK });
  ctx.y -= 22;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y },
    end: { x: PAGE_W - MARGIN_X, y: ctx.y },
    thickness: 0.75,
    color: RULE,
  });
  ctx.y -= 10;
}

function h2(ctx: Ctx, text: string): void {
  ensureSpace(ctx, 28);
  ctx.y -= 8;
  ctx.page.drawText(ascii(text), { x: MARGIN_X, y: ctx.y - 13, size: 13, font: ctx.bold, color: ACCENT });
  ctx.y -= 18;
}

function h3(ctx: Ctx, text: string): void {
  ensureSpace(ctx, 20);
  ctx.y -= 4;
  ctx.page.drawText(ascii(text), { x: MARGIN_X, y: ctx.y - 11, size: 11, font: ctx.bold, color: INK });
  ctx.y -= 15;
}

function bullet(ctx: Ctx, text: string): void {
  const size = 10.5;
  const x = MARGIN_X + 14;
  const lines = wrapText(text, ctx.regular, size, CONTENT_W - 14);
  const lineH = size + 3;
  ensureSpace(ctx, lineH);
  ctx.page.drawText("•", { x: MARGIN_X + 2, y: ctx.y - size, size, font: ctx.bold, color: ACCENT });
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ensureSpace(ctx, lineH);
    ctx.page.drawText(lines[i], { x, y: ctx.y - size, size, font: ctx.regular, color: INK });
    ctx.y -= lineH;
  }
}

function code(ctx: Ctx, text: string): void {
  const size = 9.5;
  const padX = 8;
  const padY = 5;
  const lines = ascii(text).split("\n");
  const lineH = size + 3;
  const boxH = lines.length * lineH + padY * 2;
  ensureSpace(ctx, boxH + 4);
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: ctx.y - boxH,
    width: CONTENT_W,
    height: boxH,
    color: CODE_BG,
    borderColor: RULE,
    borderWidth: 0.5,
  });
  let yy = ctx.y - padY;
  for (const line of lines) {
    ctx.page.drawText(line, { x: MARGIN_X + padX, y: yy - size, size, font: ctx.mono, color: INK });
    yy -= lineH;
  }
  ctx.y -= boxH + 6;
}

function spacer(ctx: Ctx, h: number): void {
  ctx.y -= h;
}

function metaRow(ctx: Ctx, label: string, value: string): void {
  const size = 10;
  ensureSpace(ctx, size + 4);
  ctx.page.drawText(ascii(label), { x: MARGIN_X, y: ctx.y - size, size, font: ctx.bold, color: MUTED });
  ctx.page.drawText(ascii(value), {
    x: MARGIN_X + 90,
    y: ctx.y - size,
    size,
    font: ctx.monoBold,
    color: INK,
  });
  ctx.y -= size + 5;
}

function table(ctx: Ctx, rows: [string, string][]): void {
  const size = 9.5;
  const lineGap = 3;
  const colW: [number, number] = [160, CONTENT_W - 160];
  // header
  const header: [string, string] = ["Fișier", "Descriere"];
  const drawRow = (r: [string, string], isHeader: boolean): void => {
    const font = isHeader ? ctx.bold : ctx.regular;
    const monoFont = isHeader ? ctx.monoBold : ctx.mono;
    const l1 = wrapText(r[0], monoFont, size, colW[0] - 8);
    const l2 = wrapText(r[1], font, size, colW[1] - 8);
    const rowLines = Math.max(l1.length, l2.length);
    const rowH = rowLines * (size + lineGap) + 6;
    ensureSpace(ctx, rowH);
    if (isHeader) {
      ctx.page.drawRectangle({
        x: MARGIN_X,
        y: ctx.y - rowH,
        width: CONTENT_W,
        height: rowH,
        color: CODE_BG,
      });
    }
    // bottom rule
    ctx.page.drawLine({
      start: { x: MARGIN_X, y: ctx.y - rowH },
      end: { x: PAGE_W - MARGIN_X, y: ctx.y - rowH },
      thickness: 0.4,
      color: RULE,
    });
    let yy = ctx.y - 4;
    for (let i = 0; i < rowLines; i++) {
      if (l1[i]) ctx.page.drawText(l1[i], { x: MARGIN_X + 6, y: yy - size, size, font: monoFont, color: INK });
      if (l2[i]) ctx.page.drawText(l2[i], { x: MARGIN_X + colW[0] + 6, y: yy - size, size, font, color: INK });
      yy -= size + lineGap;
    }
    ctx.y -= rowH;
  };
  drawRow(header, true);
  for (const r of rows) drawRow(r, false);
}

export async function renderReadmePdf(input: ReadmePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`OPSQAI Self-Hosted — Ghid de instalare (${input.install_id})`);
  doc.setAuthor("OPSQAI");
  doc.setSubject("Installation guide");
  doc.setCreator("OPSQAI installer");
  doc.setProducer("OPSQAI installer");
  doc.setCreationDate(new Date(input.generated_at));

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const monoBold = await doc.embedFont(StandardFonts.CourierBold);
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const ctx: Ctx = { doc, page, y: PAGE_H - MARGIN_TOP, regular, bold, mono, monoBold };

  // ── Title ──
  ctx.page.drawText("OPSQAI Self-Hosted", {
    x: MARGIN_X,
    y: ctx.y - 22,
    size: 22,
    font: bold,
    color: INK,
  });
  ctx.y -= 26;
  ctx.page.drawText("Ghid de instalare", {
    x: MARGIN_X,
    y: ctx.y - 14,
    size: 14,
    font: regular,
    color: MUTED,
  });
  ctx.y -= 24;
  ctx.page.drawLine({
    start: { x: MARGIN_X, y: ctx.y },
    end: { x: PAGE_W - MARGIN_X, y: ctx.y },
    thickness: 1,
    color: ACCENT,
  });
  ctx.y -= 14;

  metaRow(ctx, "Install ID", input.install_id);
  metaRow(ctx, "Client", input.company_name);
  metaRow(ctx, "Versiune", input.installer_version);
  metaRow(ctx, "Generat", input.generated_at);
  spacer(ctx, 6);

  // ── 1. Ce este acest pachet ──
  h1(ctx, "1. Ce este acest pachet");
  drawParagraph(
    ctx,
    "Această arhivă conține tot ce ai nevoie pentru a rula OPSQAI pe propriul tău server: instalatorul nativ pentru Windows / macOS / Linux, configurația Docker Compose, șablonul de variabile de mediu și bundle-ul de activare semnat digital. Instalatorul NU instalează Docker în locul tău — vezi capitolul 2.",
  );

  // ── 2. Prerechizite ──
  h1(ctx, "2. Prerechizite (ÎNAINTE de instalare)");
  drawParagraph(ctx, "OPSQAI rulează în containere Docker. Trebuie să ai Docker instalat și pornit înainte de a rula instalatorul.");
  spacer(ctx, 4);

  h3(ctx, "2.1 Windows");
  bullet(ctx, "Descarcă și instalează Docker Desktop de la: https://www.docker.com/products/docker-desktop/");
  bullet(ctx, "Pornește Docker Desktop și așteaptă până apare mesajul „Docker Desktop is running” (icon verde în system tray).");

  h3(ctx, "2.2 macOS");
  bullet(ctx, "Descarcă Docker Desktop for Mac (Apple Silicon sau Intel): https://www.docker.com/products/docker-desktop/");
  bullet(ctx, "Pornește Docker Desktop și așteaptă până iconul din bara de meniu devine verde.");

  h3(ctx, "2.3 Linux");
  bullet(ctx, "Instalează Docker Engine: https://docs.docker.com/engine/install/");
  bullet(ctx, "Instalează pluginul Docker Compose v2: https://docs.docker.com/compose/install/linux/");
  bullet(ctx, "Debian/Ubuntu: sudo apt-get install docker-ce docker-compose-plugin");

  h3(ctx, "2.4 Verificare rapidă");
  drawParagraph(ctx, "Deschide un terminal / CMD nou și rulează:");
  code(ctx, "docker --version\ndocker compose version");
  drawParagraph(ctx, "Ambele comenzi trebuie să răspundă cu un număr de versiune. Dacă nu, întoarce-te la pașii de mai sus.");

  // ── 3. Extragerea ──
  h1(ctx, "3. Cum extragi arhiva corect");
  h3(ctx, "3.1 Windows");
  bullet(ctx, "Click DREAPTA pe fișierul ZIP descărcat → alege „Extract All…” → selectează un folder.");
  bullet(ctx, "NU face dublu-click pe fișiere din interiorul preview-ului ZIP din Explorer — Windows extrage doar fișierul respectiv într-un folder temporar, iar install.exe nu va mai fi lângă install-windows.cmd.");
  h3(ctx, "3.2 macOS / Linux");
  code(ctx, `unzip opsqai-${input.installer_version}-${input.install_id}.zip\ncd opsqai-${input.installer_version}-${input.install_id}`);

  // ── 4. Verificare integritate ──
  h1(ctx, "4. Verificarea integrității (recomandat)");
  drawParagraph(ctx, "Fișierul CHECKSUMS.sha256 conține hash-urile SHA-256 ale tuturor fișierelor din arhivă. Verifică înainte de a rula orice binar.");
  h3(ctx, "macOS / Linux");
  code(ctx, "sha256sum -c CHECKSUMS.sha256");
  drawParagraph(ctx, "Fiecare linie trebuie să afișeze „OK”.");
  h3(ctx, "Windows");
  code(ctx, "certutil -hashfile install.exe SHA256");
  drawParagraph(ctx, "Compară hash-ul afișat cu linia corespunzătoare din CHECKSUMS.sha256.");

  // ── 5. Instalare ──
  h1(ctx, "5. Instalare pas cu pas");
  h3(ctx, "5.1 Windows (recomandat: dublu-click)");
  bullet(ctx, "Deschide folderul extras.");
  bullet(ctx, "Dublu-click pe install-windows.cmd (ține fereastra CMD deschisă ca să vezi mesajele).");
  bullet(ctx, "Alternativ, poți rula direct install.exe.");

  h3(ctx, "5.2 macOS");
  code(ctx, "chmod +x install-macos\n./install-macos");

  h3(ctx, "5.3 Linux desktop");
  code(ctx, "chmod +x install-linux\n./install-linux");

  h3(ctx, "5.4 Server headless / SSH");
  code(ctx, "chmod +x install.sh\n./install.sh");

  // ── 6. Ce face instalatorul ──
  h1(ctx, "6. Ce face instalatorul (transparent)");
  bullet(ctx, "Verifică prerechizitele: docker + plugin compose.");
  bullet(ctx, "Copiază .env.template în .env dacă nu există deja (idempotent — nu suprascrie).");
  bullet(ctx, "Pornește stack-ul cu: docker compose up -d");
  bullet(ctx, "Așteaptă până când endpoint-ul /health răspunde OK (până la ~2 minute).");
  bullet(ctx, "Afișează (și deschide în browser) URL-ul pentru Setup Wizard.");

  // ── 7. Setup Wizard ──
  h1(ctx, "7. Setup Wizard");
  bullet(ctx, "Deschide URL-ul afișat de instalator (implicit http://localhost:3000/first-run).");
  bullet(ctx, "Lipește conținutul fișierului activation-bundle.json când wizard-ul îl cere.");
  bullet(ctx, "Configurează administratorul principal și primul cont de utilizator.");

  // ── 8. Restaurare ──
  h1(ctx, "8. Restaurare dintr-un backup (DR)");
  drawParagraph(ctx, "Pentru a restaura o instalație existentă dintr-un backup (runbook DR 5.5.4), pasează --restore instalatorului:");
  code(ctx, "./install-linux --restore\n# sau\ninstall-windows.cmd --restore");
  drawParagraph(ctx, "Restore rulează doar peste o instalație existentă (cu .env prezent) — nu suprascrie o instalație funcțională.");

  // ── 9. Depanare ──
  h1(ctx, "9. Depanare — probleme frecvente");

  h3(ctx, "„docker is not installed or not on PATH”");
  drawParagraph(ctx, "Docker Desktop nu este instalat sau nu rulează. Întoarce-te la capitolul 2 și instalează Docker Desktop, apoi pornește-l și rulează din nou instalatorul.");

  h3(ctx, "„install.exe is missing from this folder”");
  drawParagraph(ctx, "Ai deschis install-windows.cmd direct din preview-ul ZIP. Extrage întâi arhiva complet (capitolul 3.1), apoi rulează .cmd-ul din folderul extras.");

  h3(ctx, "„App did not report healthy”");
  drawParagraph(ctx, "Stack-ul a pornit dar aplicația nu răspunde. Verifică log-urile:");
  code(ctx, "docker compose logs --tail=200 opsqai");

  h3(ctx, "Portul 3000 este ocupat");
  drawParagraph(ctx, "Editează .env și schimbă OPSQAI_PORT înainte de a rula instalatorul din nou.");

  // ── 10. Fișiere din pachet ──
  h1(ctx, "10. Fișierele din acest pachet");
  table(ctx, [
    ["install.exe", "Instalator nativ Windows (double-click)"],
    ["install-windows.cmd", "Wrapper Windows care ține fereastra CMD deschisă"],
    ["install-macos", "Instalator nativ macOS (universal)"],
    ["install-linux", "Instalator nativ Linux"],
    ["install.sh", "Fallback POSIX shell pentru servere headless"],
    ["docker-compose.yml", "Topologia containerelor (opsqai + postgres + minio)"],
    [".env.template", "Șablon de variabile de mediu; secretele marcate __CHANGE_ME__"],
    ["entrypoint.sh", "Rulează în container; generează secretele la prima pornire"],
    ["activation-bundle.json", "Bundle de licență semnat Ed25519 (install + module tokens + CRL)"],
    ["CHECKSUMS.sha256", "SHA-256 pentru toate fișierele de mai sus"],
    ["README.pdf", "Acest ghid"],
  ]);

  // ── 11. Suport ──
  h1(ctx, "11. Suport și referințe");
  bullet(ctx, "Ghidul complet al administratorului: docs/administrator-guide/02-installation.md");
  bullet(ctx, "Runbook DR: docs/engineering/runbooks/dr-verify-v1.0.0.md");
  bullet(ctx, `Instalarea este identificată de: ${input.install_id}`);

  const bytes = await doc.save();
  return bytes;
}
