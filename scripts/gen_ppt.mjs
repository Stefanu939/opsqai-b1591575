import PptxGenJS from "pptxgenjs";
import fs from "fs";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "OPSQAI — Enterprise AI Operations Platform";
pres.author = "OPSQAI";
pres.company = "OPSQAI";

// Brand
const NAVY   = "0F1729";
const NAVY2  = "1A2340";
const BLUE   = "3A5BB8";
const BLUE_L = "6E86D6";
const TEAL   = "0E7D6F";
const ICE    = "E8ECF5";
const MUTED  = "8892A6";
const WHITE  = "FFFFFF";
const LINE   = "24304E";

const H = "Calibri";      // safe cross-platform, close to Inter
const B = "Calibri";
const M = "Consolas";

const W = 13.333, HGT = 7.5;

function bgDark(s) {
  s.background = { color: NAVY };
  // subtle top accent bar
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE } });
}
function bgLight(s) {
  s.background = { color: WHITE };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE } });
}
function footer(s, page, total, dark = false) {
  const c = dark ? MUTED : "8892A6";
  s.addText("OPSQAI · Confidential — pentru prezentare client", {
    x: 0.5, y: HGT - 0.4, w: 8, h: 0.3,
    fontFace: B, fontSize: 9, color: c,
  });
  s.addText(`${page} / ${total}`, {
    x: W - 1.0, y: HGT - 0.4, w: 0.5, h: 0.3,
    fontFace: B, fontSize: 9, color: c, align: "right",
  });
}
function eyebrow(s, text, y = 0.55, color = TEAL) {
  s.addText(text.toUpperCase(), {
    x: 0.6, y, w: 10, h: 0.3,
    fontFace: B, fontSize: 10, bold: true, color, charSpacing: 4,
  });
}
function title(s, t, y = 0.9, dark = false) {
  s.addText(t, {
    x: 0.6, y, w: W - 1.2, h: 1.0,
    fontFace: H, fontSize: 34, bold: true,
    color: dark ? WHITE : NAVY,
  });
}
function subtitle(s, t, y = 1.7, dark = false) {
  s.addText(t, {
    x: 0.6, y, w: W - 1.2, h: 0.55,
    fontFace: B, fontSize: 15, color: dark ? ICE : "4A5570",
  });
}
function logoMark(s, x, y, size = 0.4, color = WHITE) {
  // Stylized "O" infinity-ish: two overlapping rings
  s.addShape("oval", { x, y, w: size, h: size, line: { color, width: 2 }, fill: { color: NAVY, transparency: 100 } });
  s.addShape("oval", { x: x + size * 0.35, y, w: size, h: size, line: { color: BLUE_L, width: 2 }, fill: { color: NAVY, transparency: 100 } });
}
function brandBar(s, dark = true) {
  logoMark(s, 0.6, 0.25, 0.28, dark ? WHITE : NAVY);
  s.addText("OPSQAI", {
    x: 1.15, y: 0.2, w: 2, h: 0.35, fontFace: H, fontSize: 12, bold: true,
    color: dark ? WHITE : NAVY, charSpacing: 2,
  });
}

// Card helper
function card(s, x, y, w, h, opts = {}) {
  s.addShape("roundRect", {
    x, y, w, h,
    fill: { color: opts.fill || "F7F8FA" },
    line: { color: opts.line || "E4E7EC", width: 0.75 },
    rectRadius: 0.12,
  });
}
function darkCard(s, x, y, w, h) {
  s.addShape("roundRect", {
    x, y, w, h,
    fill: { color: NAVY2 },
    line: { color: LINE, width: 0.75 },
    rectRadius: 0.12,
  });
}

// ---------- SLIDE 1: COVER ----------
{
  const s = pres.addSlide();
  bgDark(s);
  // decorative rings
  s.addShape("oval", { x: 9.5, y: -1.8, w: 6, h: 6, line: { color: BLUE, width: 1 }, fill: { color: NAVY, transparency: 100 } });
  s.addShape("oval", { x: 10.5, y: -1.2, w: 5, h: 5, line: { color: TEAL, width: 1 }, fill: { color: NAVY, transparency: 100 } });
  s.addShape("oval", { x: 11.2, y: -0.6, w: 4, h: 4, line: { color: BLUE_L, width: 1 }, fill: { color: NAVY, transparency: 100 } });

  brandBar(s, true);

  s.addText("ENTERPRISE AI OPERATIONS PLATFORM", {
    x: 0.6, y: 2.1, w: 10, h: 0.35,
    fontFace: B, fontSize: 11, bold: true, color: TEAL, charSpacing: 5,
  });
  s.addText("OPSQAI", {
    x: 0.6, y: 2.5, w: 10, h: 1.4,
    fontFace: H, fontSize: 88, bold: true, color: WHITE,
  });
  s.addText("Cunoașterea companiei tale, disponibilă instant.\nAsistent AI, Academy, Documente și Guvernanță — într-o singură platformă.", {
    x: 0.6, y: 4.2, w: 10.5, h: 1.4,
    fontFace: B, fontSize: 18, color: ICE, lineSpacingMultiple: 1.25,
  });

  s.addText("Prezentare produs · 2026", {
    x: 0.6, y: HGT - 0.7, w: 5, h: 0.3,
    fontFace: B, fontSize: 10, color: MUTED, charSpacing: 3,
  });
  s.addText("opsqai.de", {
    x: W - 2.0, y: HGT - 0.7, w: 1.5, h: 0.3,
    fontFace: B, fontSize: 10, color: BLUE_L, align: "right",
  });
}

// ---------- SLIDE 2: AGENDA ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Agendă");
  title(s, "Ce vom parcurge împreună");

  const items = [
    ["01", "Contextul operațional", "De ce cunoașterea companiei este cel mai subestimat activ."],
    ["02", "Soluția OPSQAI", "Platformă unificată: Assistant, Academy, Documents, Governance."],
    ["03", "Module & funcționalități", "Ce primești din prima zi și cum se folosește."],
    ["04", "Securitate & multi-tenant", "Izolare completă, RLS, audit, GDPR."],
    ["05", "Impact & ROI", "Rezultate măsurabile în onboarding, calitate și conformitate."],
    ["06", "Planuri & pași următori", "Cum arată un pilot de 30 de zile."],
  ];
  const startY = 2.0;
  items.forEach((it, i) => {
    const y = startY + i * 0.72;
    s.addText(it[0], { x: 0.6, y, w: 0.8, h: 0.6, fontFace: H, fontSize: 22, bold: true, color: BLUE });
    s.addText(it[1], { x: 1.5, y: y - 0.02, w: 5, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: NAVY });
    s.addText(it[2], { x: 1.5, y: y + 0.32, w: 10, h: 0.4, fontFace: B, fontSize: 12, color: "556080" });
  });
  footer(s, 2, 16);
}

// ---------- SLIDE 3: PROBLEM ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Problema");
  title(s, "SOP-uri peste tot. Răspunsuri nicăieri.");
  subtitle(s, "Cunoașterea operațională este fragmentată în PDF-uri, chat-uri și oameni. Rezultatul: erori, întârzieri, onboarding lent.");

  const stats = [
    ["47%", "din timpul unui operator se pierde\ncăutând informații și clarificări."],
    ["3–6 luni", "durează în medie onboarding-ul complet\nal unui angajat nou în operațiuni."],
    ["1 din 3", "incidente operaționale sunt cauzate\nde SOP-uri neactualizate sau necunoscute."],
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 3.0, 3.9, 2.3);
    s.addText(st[0], { x: x + 0.3, y: 3.15, w: 3.4, h: 0.9, fontFace: H, fontSize: 40, bold: true, color: BLUE });
    s.addText(st[1], { x: x + 0.3, y: 4.15, w: 3.4, h: 1.1, fontFace: B, fontSize: 12, color: "4A5570", lineSpacingMultiple: 1.3 });
  });
  s.addText("Surse: analize operaționale interne pe segmentul logistică & supply chain.", {
    x: 0.6, y: 5.6, w: 10, h: 0.3, fontFace: B, fontSize: 9, italic: true, color: MUTED,
  });
  footer(s, 3, 16);
}

// ---------- SLIDE 4: SOLUTION ----------
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Soluția", 0.55, TEAL);
  title(s, "O singură platformă. Toată cunoașterea companiei.", 0.9, true);
  subtitle(s, "OPSQAI transformă documentele, procedurile și expertiza internă într-un asistent AI de încredere — cu surse, audit și izolare totală per client.", 1.7, true);

  const pillars = [
    ["Source-grounded AI", "Răspunsuri doar din documentele tale. Fără halucinații. Cu citări."],
    ["Multi-tenant SaaS", "Izolare completă la nivel de bază de date (RLS). Datele tale rămân ale tale."],
    ["Bilingv & multilingv", "Interfață EN/DE/RO. AI-ul răspunde în limba utilizatorului."],
    ["Guvernanță enterprise", "RBAC pe 7 roluri, audit log, versionare SOP, confidence score."],
  ];
  pillars.forEach((p, i) => {
    const x = 0.6 + (i % 2) * 6.2;
    const y = 3.0 + Math.floor(i / 2) * 1.9;
    darkCard(s, x, y, 6.0, 1.7);
    s.addShape("rect", { x: x + 0.2, y: y + 0.2, w: 0.08, h: 1.3, fill: { color: TEAL }, line: { color: TEAL, width: 0 } });
    s.addText(p[0], { x: x + 0.45, y: y + 0.2, w: 5.4, h: 0.5, fontFace: H, fontSize: 16, bold: true, color: WHITE });
    s.addText(p[1], { x: x + 0.45, y: y + 0.75, w: 5.4, h: 0.9, fontFace: B, fontSize: 12, color: ICE, lineSpacingMultiple: 1.3 });
  });
  footer(s, 4, 16, true);
}

// ---------- SLIDE 5: PRODUCT MAP ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Platforma OPSQAI");
  title(s, "Patru module. Un singur creier operațional.");

  const mods = [
    ["Assistant", "Chat AI cu surse", "Răspunsuri instant din KB-ul companiei, cu citări și confidence score."],
    ["Academy", "Onboarding & training", "Learning paths, lecții AI, quiz-uri și certificate PDF automate."],
    ["Enterprise Docs", "Deliverabile premium", "Generare de rapoarte, SOP-uri și propuneri în stil consultanță Tier-1."],
    ["Governance", "Audit & control", "Roluri, audit log, knowledge gaps, versionare SOP, notificări."],
  ];
  mods.forEach((m, i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 2.4, 2.9, 3.6);
    s.addShape("roundRect", { x: x + 0.3, y: 2.65, w: 0.55, h: 0.55, fill: { color: ICE }, line: { color: BLUE_L, width: 0.5 }, rectRadius: 0.1 });
    s.addText(String(i + 1), { x: x + 0.3, y: 2.65, w: 0.55, h: 0.55, fontFace: H, fontSize: 18, bold: true, color: BLUE, align: "center", valign: "middle" });
    s.addText(m[0], { x: x + 0.3, y: 3.3, w: 2.5, h: 0.4, fontFace: H, fontSize: 18, bold: true, color: NAVY });
    s.addText(m[1], { x: x + 0.3, y: 3.7, w: 2.5, h: 0.3, fontFace: B, fontSize: 10, bold: true, color: TEAL, charSpacing: 2 });
    s.addText(m[2], { x: x + 0.3, y: 4.05, w: 2.5, h: 1.8, fontFace: B, fontSize: 11, color: "556080", lineSpacingMultiple: 1.35 });
  });
  footer(s, 5, 16);
}

// ---------- SLIDE 6: ASSISTANT DEEP DIVE ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Modul 01 · Assistant");
  title(s, "Cel mai rapid canal către răspunsul corect.");

  const bullets = [
    ["Source-grounded", "Fiecare răspuns este bazat exclusiv pe documentele companiei — fără invenții."],
    ["Citări la vedere", "Panel cu sursele exacte pentru fiecare afirmație, click direct în document."],
    ["Confidence score", "Nivel de încredere pentru fiecare răspuns; scor mic → escaladare automată."],
    ["Multilingv", "Detectează limba utilizatorului (RO/EN/DE) și răspunde consecvent."],
    ["Knowledge Gaps", "Când nu găsește sursă, deschide o cerere internă gestionată de manager."],
  ];
  bullets.forEach((b, i) => {
    const y = 2.2 + i * 0.75;
    s.addShape("roundRect", { x: 0.6, y: y + 0.05, w: 0.35, h: 0.35, fill: { color: BLUE }, line: { color: BLUE, width: 0 }, rectRadius: 0.08 });
    s.addText("✓", { x: 0.6, y: y + 0.05, w: 0.35, h: 0.35, fontFace: H, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });
    s.addText(b[0], { x: 1.1, y, w: 4.5, h: 0.35, fontFace: H, fontSize: 14, bold: true, color: NAVY });
    s.addText(b[1], { x: 1.1, y: y + 0.35, w: 5.5, h: 0.5, fontFace: B, fontSize: 11, color: "556080" });
  });

  // Mock chat card on right
  card(s, 7.3, 2.2, 5.4, 4.1, { fill: WHITE, line: "E4E7EC" });
  s.addText("● Assistant", { x: 7.55, y: 2.35, w: 3, h: 0.3, fontFace: B, fontSize: 10, bold: true, color: TEAL });
  s.addShape("roundRect", { x: 7.55, y: 2.75, w: 4.9, h: 0.7, fill: { color: "F2F4F8" }, line: { color: "E4E7EC", width: 0.5 }, rectRadius: 0.08 });
  s.addText("Care este procedura pentru retururile clasificate B2B?", {
    x: 7.7, y: 2.8, w: 4.7, h: 0.6, fontFace: B, fontSize: 11, color: NAVY,
  });
  s.addShape("roundRect", { x: 7.55, y: 3.6, w: 4.9, h: 1.9, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.08 });
  s.addText("Conform SOP-RET-014 §3.2, retururile B2B >500€ necesită aprobare Manager Depozit și verificare fizică la Doc 7. SLA răspuns: 24h.", {
    x: 7.7, y: 3.7, w: 4.7, h: 1.2, fontFace: B, fontSize: 11, color: WHITE, lineSpacingMultiple: 1.3,
  });
  s.addText("Surse: SOP-RET-014 · Manual B2B v3", {
    x: 7.7, y: 5.0, w: 4.7, h: 0.3, fontFace: B, fontSize: 9, italic: true, color: BLUE_L,
  });
  s.addText("Confidence 92%", { x: 7.55, y: 5.7, w: 2, h: 0.3, fontFace: B, fontSize: 10, bold: true, color: TEAL });
  footer(s, 6, 16);
}

// ---------- SLIDE 7: ACADEMY ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Modul 02 · Academy");
  title(s, "Onboarding condus de AI.");
  subtitle(s, "De la Department → Learning Path → Chapter → Lesson → Quiz. Certificate PDF verificabile, generate automat.", 1.55);

  const steps = [
    ["Departament", "Definit de manager", "Warehouse, Picker, Transport, Customer Care…"],
    ["Learning Path", "Structurat automat", "Capitole, obiective, durată estimată."],
    ["Lecție AI", "Cu profesor virtual", "Explicații conversaționale, în limba cursantului."],
    ["Quiz & Certificat", "Verificare + PDF", "Certificate verificabile public, semnate OPSQAI."],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 3.2, 2.9, 3.2);
    s.addText(`Pas ${i + 1}`, { x: x + 0.3, y: 3.35, w: 2, h: 0.3, fontFace: B, fontSize: 10, bold: true, color: TEAL, charSpacing: 2 });
    s.addText(st[0], { x: x + 0.3, y: 3.7, w: 2.5, h: 0.45, fontFace: H, fontSize: 16, bold: true, color: NAVY });
    s.addText(st[1], { x: x + 0.3, y: 4.2, w: 2.5, h: 0.35, fontFace: B, fontSize: 11, bold: true, color: BLUE });
    s.addText(st[2], { x: x + 0.3, y: 4.6, w: 2.5, h: 1.6, fontFace: B, fontSize: 11, color: "556080", lineSpacingMultiple: 1.35 });
  });
  footer(s, 7, 16);
}

// ---------- SLIDE 8: ENTERPRISE DOCS ----------
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Modul 03 · Enterprise Documents", 0.55, TEAL);
  title(s, "Deliverabile în stil consultanță Tier-1.", 0.9, true);
  subtitle(s, "Generează rapoarte, SOP-uri, propuneri comerciale și pachete de onboarding — cu copertă, KPI cards, tabele și export DOCX / PDF / HTML / MD.", 1.7, true);

  const types = [
    "Executive Summary",
    "SOP & Work Instructions",
    "Propuneri comerciale",
    "Onboarding Kit",
    "Rapoarte KPI",
    "Politici & Compliance",
    "Manual operațional",
    "Plan de implementare",
  ];
  types.forEach((t, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 0.6 + col * 3.1;
    const y = 3.0 + row * 1.5;
    darkCard(s, x, y, 2.9, 1.3);
    s.addShape("rect", { x: x + 0.2, y: y + 0.25, w: 0.06, h: 0.8, fill: { color: BLUE_L }, line: { color: BLUE_L, width: 0 } });
    s.addText(t, { x: x + 0.4, y: y + 0.3, w: 2.4, h: 0.7, fontFace: H, fontSize: 13, bold: true, color: WHITE, valign: "middle" });
  });
  s.addText("Format profesional: copertă editorială · TOC · secțiuni numerotate · KPI cards · callouts · zebra rows · fără orfane.", {
    x: 0.6, y: 6.4, w: W - 1.2, h: 0.4, fontFace: B, fontSize: 11, italic: true, color: ICE,
  });
  footer(s, 8, 16, true);
}

// ---------- SLIDE 9: GOVERNANCE ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Modul 04 · Governance");
  title(s, "Control complet. Zero suspans.");

  const rows = [
    ["RBAC pe 7 roluri", "Platform Owner → Super Admin → Admin → Manager → Team Leader → Employee → Operator."],
    ["Audit log complet", "Cine, ce, când — pentru fiecare întrebare, upload, schimbare de rol sau publicare SOP."],
    ["Versionare SOP", "Istoric complet, comparație între versiuni, aprobări și acknowledgments."],
    ["Knowledge Gaps", "Ciclu complet: refuz AI → cerere internă → rezolvare manager → promovare în KB."],
    ["Notificări", "Email branded pentru invitații, escaladări, certificate, alerte de securitate."],
  ];
  rows.forEach((r, i) => {
    const y = 2.2 + i * 0.85;
    s.addShape("roundRect", { x: 0.6, y, w: W - 1.2, h: 0.75, fill: { color: "F7F8FA" }, line: { color: "E4E7EC", width: 0.5 }, rectRadius: 0.08 });
    s.addShape("rect", { x: 0.6, y, w: 0.08, h: 0.75, fill: { color: TEAL }, line: { color: TEAL, width: 0 } });
    s.addText(r[0], { x: 0.85, y: y + 0.1, w: 3.5, h: 0.55, fontFace: H, fontSize: 14, bold: true, color: NAVY, valign: "middle" });
    s.addText(r[1], { x: 4.5, y: y + 0.1, w: W - 5.3, h: 0.55, fontFace: B, fontSize: 12, color: "4A5570", valign: "middle" });
  });
  footer(s, 9, 16);
}

// ---------- SLIDE 10: SECURITY ----------
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Securitate & conformitate", 0.55, TEAL);
  title(s, "Datele tale rămân ale tale.", 0.9, true);
  subtitle(s, "Arhitectură multi-tenant cu izolare la nivel de bază de date. Nimic nu părăsește granițele workspace-ului tău.", 1.7, true);

  const items = [
    ["Row-Level Security", "Politici RLS pe fiecare tabel, filtrate prin current_company_id()."],
    ["Encryption", "TLS 1.2+ în tranzit, encryption at rest, backup-uri criptate zilnic."],
    ["EU-hosted", "DB pe Supabase în AWS eu-west-1 (Dublin, IE). DPA în draft. Fără antrenare pe datele tale (Google/OpenAI via Lovable AI Gateway)."],
    ["Audit & suppression", "Log append-only per tenant. Suppression list pentru email compliance."],
    ["Certificări", "OPSQAI nu e SOC 2 / ISO 27001 certificat. Subprocesor Lovable: SOC 2 Type II + ISO 27001:2022 (aug. 2025)."],
    ["Responsible AI", "Refuz explicit când nu există sursă. Transferuri extra-UE: SCC (Art. 46 GDPR)."],
  ];
  items.forEach((it, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.15;
    const y = 3.0 + row * 1.9;
    darkCard(s, x, y, 3.9, 1.7);
    s.addText(it[0], { x: x + 0.3, y: y + 0.25, w: 3.5, h: 0.4, fontFace: H, fontSize: 14, bold: true, color: WHITE });
    s.addText(it[1], { x: x + 0.3, y: y + 0.7, w: 3.5, h: 0.9, fontFace: B, fontSize: 11, color: ICE, lineSpacingMultiple: 1.3 });
  });
  footer(s, 10, 16, true);
}

// ---------- SLIDE 11: ARCHITECTURE ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Arhitectură");
  title(s, "Modernă. Rapidă. Enterprise-ready.");

  // Left stack diagram
  const layers = [
    ["Interfață", "React 19 · TanStack Start · PWA · EN/DE/RO", ICE, NAVY],
    ["Aplicație", "Server Functions · RBAC · RLS enforcement", BLUE_L, WHITE],
    ["AI Layer", "RAG · pgvector · citations · confidence · multilingual", BLUE, WHITE],
    ["Date", "Postgres multi-tenant · RLS · audit log · backup zilnic", NAVY, WHITE],
  ];
  layers.forEach((l, i) => {
    const y = 2.3 + i * 1.05;
    s.addShape("roundRect", { x: 0.6, y, w: 6.5, h: 0.9, fill: { color: l[2] }, line: { color: "E4E7EC", width: 0.5 }, rectRadius: 0.1 });
    s.addText(l[0], { x: 0.85, y: y + 0.1, w: 2, h: 0.7, fontFace: H, fontSize: 14, bold: true, color: l[3], valign: "middle" });
    s.addText(l[1], { x: 2.9, y: y + 0.1, w: 4.1, h: 0.7, fontFace: B, fontSize: 11, color: l[3], valign: "middle" });
  });

  // Right callouts
  card(s, 7.5, 2.3, 5.2, 4.2);
  s.addText("Principii-cheie", { x: 7.75, y: 2.45, w: 4, h: 0.4, fontFace: H, fontSize: 14, bold: true, color: NAVY });
  const principles = [
    "Izolare la nivel de rând (RLS), pentru fiecare tabel.",
    "Server-side RAG cu chunking recursiv & citări.",
    "Embeddings prin pgvector, cache & re-ranking.",
    "Edge-ready runtime, TLS 1.2+, EU residency.",
    "Observabilitate: audit log, email logs, analytics.",
  ];
  principles.forEach((p, i) => {
    const y = 3.0 + i * 0.6;
    s.addShape("oval", { x: 7.75, y: y + 0.1, w: 0.15, h: 0.15, fill: { color: TEAL }, line: { color: TEAL, width: 0 } });
    s.addText(p, { x: 8.0, y, w: 4.6, h: 0.5, fontFace: B, fontSize: 11.5, color: "4A5570", valign: "middle" });
  });
  footer(s, 11, 16);
}

// ---------- SLIDE 12: ROI ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Impact & ROI");
  title(s, "Rezultate măsurabile în primele 90 de zile.");

  const kpis = [
    ["-60%", "timp de căutare informații", TEAL],
    ["3×", "viteza de onboarding", BLUE],
    ["+40%", "rata de răspuns corect", TEAL],
    ["100%", "trasabilitate a deciziilor", BLUE],
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 2.3, 2.9, 2.0);
    s.addText(k[0], { x: x + 0.3, y: 2.45, w: 2.5, h: 1.0, fontFace: H, fontSize: 44, bold: true, color: k[2] });
    s.addText(k[1], { x: x + 0.3, y: 3.5, w: 2.5, h: 0.7, fontFace: B, fontSize: 12, color: "4A5570", lineSpacingMultiple: 1.3 });
  });

  card(s, 0.6, 4.6, W - 1.2, 2.0);
  s.addText("Ce câștigi, concret", { x: 0.85, y: 4.75, w: 5, h: 0.4, fontFace: H, fontSize: 14, bold: true, color: NAVY });
  const wins = [
    ["Operațiuni", "Mai puține erori, SLA-uri respectate, mai puține escaladări."],
    ["HR & training", "Onboarding scalabil, certificate automate, evidență completă."],
    ["Conducere", "Vizibilitate reală asupra gap-urilor de cunoaștere și a conformității."],
  ];
  wins.forEach((w, i) => {
    const x = 0.85 + i * 4.1;
    s.addText(w[0].toUpperCase(), { x, y: 5.2, w: 4, h: 0.3, fontFace: B, fontSize: 10, bold: true, color: TEAL, charSpacing: 3 });
    s.addText(w[1], { x, y: 5.5, w: 3.9, h: 1.0, fontFace: B, fontSize: 11.5, color: "4A5570", lineSpacingMultiple: 1.3 });
  });
  footer(s, 12, 16);
}

// ---------- SLIDE 13: WHY OPSQAI ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "De ce OPSQAI");
  title(s, "Diferența dintre un chatbot și o platformă enterprise.");

  // Comparison table
  const cols = ["Capability", "Chatbot generic", "OPSQAI"];
  const rows = [
    ["Surse verificate & citări", "Nu", "Da — obligatoriu"],
    ["Izolare per client (RLS)", "Nu", "La nivel de DB"],
    ["Multilingv RO/EN/DE", "Parțial", "Nativ + auto-detect"],
    ["Academy & certificate", "Nu", "Inclus"],
    ["Audit log & guvernanță", "Nu", "Complet"],
    ["Documente premium export", "Nu", "PDF/DOCX/HTML/MD"],
  ];
  const startY = 2.2;
  const rowH = 0.55;
  // header
  cols.forEach((c, i) => {
    const x = 0.6 + [0, 5.6, 9.5][i];
    const w = [5.0, 3.9, 3.2][i];
    s.addShape("rect", { x, y: startY, w, h: 0.55, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addText(c, { x: x + 0.15, y: startY, w: w - 0.3, h: 0.55, fontFace: H, fontSize: 12, bold: true, color: WHITE, valign: "middle" });
  });
  rows.forEach((r, i) => {
    const y = startY + 0.55 + i * rowH;
    const fill = i % 2 === 0 ? "F7F8FA" : WHITE;
    r.forEach((cell, j) => {
      const x = 0.6 + [0, 5.6, 9.5][j];
      const w = [5.0, 3.9, 3.2][j];
      s.addShape("rect", { x, y, w, h: rowH, fill: { color: fill }, line: { color: "E4E7EC", width: 0.25 } });
      const color = j === 2 ? TEAL : (j === 1 ? "8892A6" : NAVY);
      const bold = j === 0 || j === 2;
      s.addText(cell, { x: x + 0.15, y, w: w - 0.3, h: rowH, fontFace: B, fontSize: 11.5, bold, color, valign: "middle" });
    });
  });
  footer(s, 13, 16);
}

// ---------- SLIDE 14: PRICING ----------
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Planuri");
  title(s, "Alege ritmul potrivit organizației tale.");

  const plans = [
    { name: "Pilot", price: "30 zile", desc: "Pentru validare rapidă", features: ["Până la 25 utilizatori", "1 workspace", "Assistant + Academy", "Suport email"], accent: BLUE_L },
    { name: "Standard", price: "Team", desc: "Pentru echipe operaționale", features: ["Până la 100 utilizatori", "Toate modulele", "SSO + RBAC complet", "Suport prioritar"], accent: BLUE, highlight: true },
    { name: "Business", price: "Multi-site", desc: "Pentru operațiuni multiple", features: ["Până la 500 utilizatori", "Multi-workspace", "Audit avansat", "SLA 99.9%"], accent: TEAL },
    { name: "Enterprise", price: "Custom", desc: "Pentru grupuri & rețele", features: ["Utilizatori nelimitați", "Deployment dedicat", "DPA & compliance pack", "CSM dedicat"], accent: NAVY },
  ];
  plans.forEach((p, i) => {
    const x = 0.6 + i * 3.1;
    const y = 2.2;
    const isH = p.highlight;
    card(s, x, y, 2.9, 4.5, isH ? { fill: NAVY, line: BLUE } : {});
    if (isH) {
      s.addShape("roundRect", { x: x + 0.85, y: y - 0.2, w: 1.2, h: 0.35, fill: { color: TEAL }, line: { color: TEAL, width: 0 }, rectRadius: 0.05 });
      s.addText("RECOMANDAT", { x: x + 0.85, y: y - 0.2, w: 1.2, h: 0.35, fontFace: B, fontSize: 8, bold: true, color: WHITE, align: "center", valign: "middle", charSpacing: 2 });
    }
    const fg = isH ? WHITE : NAVY;
    const sub = isH ? ICE : "4A5570";
    s.addText(p.name, { x: x + 0.3, y: y + 0.25, w: 2.5, h: 0.45, fontFace: H, fontSize: 18, bold: true, color: fg });
    s.addText(p.price, { x: x + 0.3, y: y + 0.75, w: 2.5, h: 0.5, fontFace: H, fontSize: 22, bold: true, color: isH ? BLUE_L : p.accent });
    s.addText(p.desc, { x: x + 0.3, y: y + 1.3, w: 2.5, h: 0.35, fontFace: B, fontSize: 10, italic: true, color: sub });
    s.addShape("rect", { x: x + 0.3, y: y + 1.75, w: 2.3, h: 0.02, fill: { color: isH ? LINE : "E4E7EC" }, line: { color: "E4E7EC", width: 0 } });
    p.features.forEach((f, j) => {
      const fy = y + 1.95 + j * 0.5;
      s.addText("✓", { x: x + 0.3, y: fy, w: 0.3, h: 0.35, fontFace: H, fontSize: 12, bold: true, color: TEAL });
      s.addText(f, { x: x + 0.6, y: fy, w: 2.2, h: 0.35, fontFace: B, fontSize: 11, color: fg, valign: "middle" });
    });
  });
  s.addText("Prețurile finale se stabilesc în funcție de scope, număr de utilizatori și cerințele de conformitate.", {
    x: 0.6, y: HGT - 0.65, w: W - 1.2, h: 0.3, fontFace: B, fontSize: 9, italic: true, color: MUTED, align: "center",
  });
  footer(s, 14, 16);
}

// ---------- SLIDE 15: PILOT PLAN ----------
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Pași următori", 0.55, TEAL);
  title(s, "Pilot de 30 de zile. Fără risc. Cu rezultate.", 0.9, true);
  subtitle(s, "Facem împreună un pilot ghidat: ingestie SOP-uri, activare Academy pentru un departament, măsurare impact.", 1.7, true);

  const phases = [
    ["Săptămâna 1", "Kick-off & ingestie", "Provizionare workspace · import SOP-uri · configurare roluri."],
    ["Săptămâna 2", "Activare Assistant", "Testare cu utilizatori-cheie · fine-tuning al surselor & FAQ."],
    ["Săptămâna 3", "Academy & training", "Un learning path complet · certificate · feedback."],
    ["Săptămâna 4", "Măsurare & decizie", "Raport KPI · plan de scalare · propunere comercială."],
  ];
  phases.forEach((p, i) => {
    const x = 0.6 + i * 3.1;
    darkCard(s, x, 3.0, 2.9, 3.3);
    s.addText(p[0].toUpperCase(), { x: x + 0.3, y: 3.15, w: 2.5, h: 0.3, fontFace: B, fontSize: 10, bold: true, color: TEAL, charSpacing: 2 });
    s.addText(p[1], { x: x + 0.3, y: 3.5, w: 2.5, h: 0.5, fontFace: H, fontSize: 16, bold: true, color: WHITE });
    s.addText(p[2], { x: x + 0.3, y: 4.15, w: 2.5, h: 2.0, fontFace: B, fontSize: 11.5, color: ICE, lineSpacingMultiple: 1.35 });
  });
  footer(s, 15, 16, true);
}

// ---------- SLIDE 16: CTA ----------
{
  const s = pres.addSlide();
  bgDark(s);
  // decorative rings
  s.addShape("oval", { x: -2, y: 3, w: 5, h: 5, line: { color: BLUE, width: 1 }, fill: { color: NAVY, transparency: 100 } });
  s.addShape("oval", { x: -1, y: 3.5, w: 4, h: 4, line: { color: TEAL, width: 1 }, fill: { color: NAVY, transparency: 100 } });

  brandBar(s, true);

  s.addText("SĂ CONSTRUIM ÎMPREUNĂ", {
    x: 0.6, y: 2.5, w: 12, h: 0.4, fontFace: B, fontSize: 11, bold: true, color: TEAL, charSpacing: 5,
  });
  s.addText("Cunoașterea companiei\ndevine avantaj competitiv.", {
    x: 0.6, y: 3.0, w: 12, h: 2.5,
    fontFace: H, fontSize: 48, bold: true, color: WHITE, lineSpacingMultiple: 1.05,
  });

  s.addShape("roundRect", { x: 0.6, y: 5.7, w: 3.2, h: 0.7, fill: { color: BLUE }, line: { color: BLUE, width: 0 }, rectRadius: 0.1 });
  s.addText("Programează un demo →", { x: 0.6, y: 5.7, w: 3.2, h: 0.7, fontFace: H, fontSize: 14, bold: true, color: WHITE, align: "center", valign: "middle" });

  s.addText("opsqai.de   ·   hello@opsqai.de", {
    x: 4.0, y: 5.7, w: 8, h: 0.7, fontFace: B, fontSize: 14, color: ICE, valign: "middle",
  });

  s.addText("© 2026 OPSQAI · Enterprise AI Operations Platform", {
    x: 0.6, y: HGT - 0.4, w: 10, h: 0.3, fontFace: B, fontSize: 9, color: MUTED,
  });
}

await pres.writeFile({ fileName: "/mnt/documents/OPSQAI-Prezentare-Client.pptx" });
console.log("done");
