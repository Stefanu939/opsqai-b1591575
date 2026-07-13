import PptxGenJS from "pptxgenjs";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_WIDE";
pres.title = "OPSQAI — Enterprise AI Operations Platform";
pres.author = "OPSQAI";
pres.company = "OPSQAI";

const NAVY = "0F1729";
const NAVY2 = "1A2340";
const BLUE = "3A5BB8";
const BLUE_L = "6E86D6";
const TEAL = "0E7D6F";
const ICE = "E8ECF5";
const MUTED = "8892A6";
const WHITE = "FFFFFF";
const LINE = "24304E";

const H = "Calibri";
const B = "Calibri";

const W = 13.333,
  HGT = 7.5;

function bgDark(s) {
  s.background = { color: NAVY };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE } });
}
function bgLight(s) {
  s.background = { color: WHITE };
  s.addShape("rect", { x: 0, y: 0, w: W, h: 0.06, fill: { color: BLUE } });
}
function footer(s, page, total, dark = false) {
  const c = dark ? MUTED : "8892A6";
  s.addText("OPSQAI · Vertraulich — für Kundenpräsentation", {
    x: 0.5,
    y: HGT - 0.4,
    w: 8,
    h: 0.3,
    fontFace: B,
    fontSize: 9,
    color: c,
  });
  s.addText(`${page} / ${total}`, {
    x: W - 1.0,
    y: HGT - 0.4,
    w: 0.5,
    h: 0.3,
    fontFace: B,
    fontSize: 9,
    color: c,
    align: "right",
  });
}
function eyebrow(s, text, y = 0.55, color = TEAL) {
  s.addText(text.toUpperCase(), {
    x: 0.6,
    y,
    w: 10,
    h: 0.3,
    fontFace: B,
    fontSize: 10,
    bold: true,
    color,
    charSpacing: 4,
  });
}
function title(s, t, y = 0.9, dark = false) {
  s.addText(t, {
    x: 0.6,
    y,
    w: W - 1.2,
    h: 1.0,
    fontFace: H,
    fontSize: 34,
    bold: true,
    color: dark ? WHITE : NAVY,
  });
}
function subtitle(s, t, y = 1.7, dark = false) {
  s.addText(t, {
    x: 0.6,
    y,
    w: W - 1.2,
    h: 0.55,
    fontFace: B,
    fontSize: 15,
    color: dark ? ICE : "4A5570",
  });
}
function logoMark(s, x, y, size = 0.4, color = WHITE) {
  s.addShape("oval", {
    x,
    y,
    w: size,
    h: size,
    line: { color, width: 2 },
    fill: { color: NAVY, transparency: 100 },
  });
  s.addShape("oval", {
    x: x + size * 0.35,
    y,
    w: size,
    h: size,
    line: { color: BLUE_L, width: 2 },
    fill: { color: NAVY, transparency: 100 },
  });
}
function brandBar(s, dark = true) {
  logoMark(s, 0.6, 0.25, 0.28, dark ? WHITE : NAVY);
  s.addText("OPSQAI", {
    x: 1.15,
    y: 0.2,
    w: 2,
    h: 0.35,
    fontFace: H,
    fontSize: 12,
    bold: true,
    color: dark ? WHITE : NAVY,
    charSpacing: 2,
  });
}
function card(s, x, y, w, h, opts = {}) {
  s.addShape("roundRect", {
    x,
    y,
    w,
    h,
    fill: { color: opts.fill || "F7F8FA" },
    line: { color: opts.line || "E4E7EC", width: 0.75 },
    rectRadius: 0.12,
  });
}
function darkCard(s, x, y, w, h) {
  s.addShape("roundRect", {
    x,
    y,
    w,
    h,
    fill: { color: NAVY2 },
    line: { color: LINE, width: 0.75 },
    rectRadius: 0.12,
  });
}

// SLIDE 1: COVER
{
  const s = pres.addSlide();
  bgDark(s);
  s.addShape("oval", {
    x: 9.5,
    y: -1.8,
    w: 6,
    h: 6,
    line: { color: BLUE, width: 1 },
    fill: { color: NAVY, transparency: 100 },
  });
  s.addShape("oval", {
    x: 10.5,
    y: -1.2,
    w: 5,
    h: 5,
    line: { color: TEAL, width: 1 },
    fill: { color: NAVY, transparency: 100 },
  });
  s.addShape("oval", {
    x: 11.2,
    y: -0.6,
    w: 4,
    h: 4,
    line: { color: BLUE_L, width: 1 },
    fill: { color: NAVY, transparency: 100 },
  });
  brandBar(s, true);
  s.addText("ENTERPRISE AI OPERATIONS PLATFORM", {
    x: 0.6,
    y: 2.1,
    w: 10,
    h: 0.35,
    fontFace: B,
    fontSize: 11,
    bold: true,
    color: TEAL,
    charSpacing: 5,
  });
  s.addText("OPSQAI", {
    x: 0.6,
    y: 2.5,
    w: 10,
    h: 1.4,
    fontFace: H,
    fontSize: 88,
    bold: true,
    color: WHITE,
  });
  s.addText(
    "Das Wissen Ihres Unternehmens — sofort verfügbar.\nAI-Assistent, Academy, Dokumente und Governance — in einer Plattform.",
    {
      x: 0.6,
      y: 4.2,
      w: 10.5,
      h: 1.4,
      fontFace: B,
      fontSize: 18,
      color: ICE,
      lineSpacingMultiple: 1.25,
    },
  );
  s.addText("Produktpräsentation · 2026", {
    x: 0.6,
    y: HGT - 0.7,
    w: 5,
    h: 0.3,
    fontFace: B,
    fontSize: 10,
    color: MUTED,
    charSpacing: 3,
  });
  s.addText("opsqai.de", {
    x: W - 2.0,
    y: HGT - 0.7,
    w: 1.5,
    h: 0.3,
    fontFace: B,
    fontSize: 10,
    color: BLUE_L,
    align: "right",
  });
}

// SLIDE 2: AGENDA
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Agenda");
  title(s, "Was wir gemeinsam durchgehen");
  const items = [
    [
      "01",
      "Operativer Kontext",
      "Warum Unternehmenswissen der am meisten unterschätzte Vermögenswert ist.",
    ],
    [
      "02",
      "Die OPSQAI-Lösung",
      "Einheitliche Plattform: Assistant, Academy, Documents, Governance.",
    ],
    ["03", "Module & Funktionen", "Was Sie ab Tag eins erhalten und wie es genutzt wird."],
    ["04", "Sicherheit & Multi-Tenant", "Vollständige Isolation, RLS, Audit, DSGVO."],
    ["05", "Impact & ROI", "Messbare Ergebnisse in Onboarding, Qualität und Compliance."],
    ["06", "Pläne & nächste Schritte", "So sieht ein 30-Tage-Pilot aus."],
  ];
  const startY = 2.0;
  items.forEach((it, i) => {
    const y = startY + i * 0.72;
    s.addText(it[0], {
      x: 0.6,
      y,
      w: 0.8,
      h: 0.6,
      fontFace: H,
      fontSize: 22,
      bold: true,
      color: BLUE,
    });
    s.addText(it[1], {
      x: 1.5,
      y: y - 0.02,
      w: 5,
      h: 0.4,
      fontFace: H,
      fontSize: 16,
      bold: true,
      color: NAVY,
    });
    s.addText(it[2], {
      x: 1.5,
      y: y + 0.32,
      w: 10,
      h: 0.4,
      fontFace: B,
      fontSize: 12,
      color: "556080",
    });
  });
  footer(s, 2, 16);
}

// SLIDE 3: PROBLEM
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Das Problem");
  title(s, "SOPs überall. Antworten nirgends.");
  subtitle(
    s,
    "Operatives Wissen ist fragmentiert in PDFs, Chats und Köpfen. Das Ergebnis: Fehler, Verzögerungen, langsames Onboarding.",
  );
  const stats = [
    ["47%", "der Arbeitszeit eines Mitarbeiters gehen\nmit Suche und Rückfragen verloren."],
    ["3–6 Monate", "dauert im Schnitt das vollständige\nOnboarding eines neuen Mitarbeiters."],
    ["1 von 3", "operativen Vorfällen entsteht durch\nveraltete oder unbekannte SOPs."],
  ];
  stats.forEach((st, i) => {
    const x = 0.6 + i * 4.15;
    card(s, x, 3.0, 3.9, 2.3);
    s.addText(st[0], {
      x: x + 0.3,
      y: 3.15,
      w: 3.4,
      h: 0.9,
      fontFace: H,
      fontSize: 40,
      bold: true,
      color: BLUE,
    });
    s.addText(st[1], {
      x: x + 0.3,
      y: 4.15,
      w: 3.4,
      h: 1.1,
      fontFace: B,
      fontSize: 12,
      color: "4A5570",
      lineSpacingMultiple: 1.3,
    });
  });
  s.addText("Quellen: interne operative Analysen im Bereich Logistik & Supply Chain.", {
    x: 0.6,
    y: 5.6,
    w: 10,
    h: 0.3,
    fontFace: B,
    fontSize: 9,
    italic: true,
    color: MUTED,
  });
  footer(s, 3, 16);
}

// SLIDE 4: SOLUTION
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Die Lösung", 0.55, TEAL);
  title(s, "Eine Plattform. Das gesamte Unternehmenswissen.", 0.9, true);
  subtitle(
    s,
    "OPSQAI verwandelt Dokumente, Prozesse und internes Know-how in einen vertrauenswürdigen AI-Assistenten — mit Quellen, Audit und vollständiger Mandantentrennung.",
    1.7,
    true,
  );
  const pillars = [
    [
      "Quellenbasierte AI",
      "Antworten ausschließlich aus Ihren Dokumenten. Keine Halluzinationen. Mit Zitaten.",
    ],
    [
      "Multi-Tenant SaaS",
      "Vollständige Isolation auf Datenbankebene (RLS). Ihre Daten bleiben Ihre Daten.",
    ],
    ["Zwei- & mehrsprachig", "Oberfläche EN/DE/RO. Die AI antwortet in der Sprache des Nutzers."],
    ["Enterprise Governance", "RBAC mit 7 Rollen, Audit-Log, SOP-Versionierung, Confidence Score."],
  ];
  pillars.forEach((p, i) => {
    const x = 0.6 + (i % 2) * 6.2;
    const y = 3.0 + Math.floor(i / 2) * 1.9;
    darkCard(s, x, y, 6.0, 1.7);
    s.addShape("rect", {
      x: x + 0.2,
      y: y + 0.2,
      w: 0.08,
      h: 1.3,
      fill: { color: TEAL },
      line: { color: TEAL, width: 0 },
    });
    s.addText(p[0], {
      x: x + 0.45,
      y: y + 0.2,
      w: 5.4,
      h: 0.5,
      fontFace: H,
      fontSize: 16,
      bold: true,
      color: WHITE,
    });
    s.addText(p[1], {
      x: x + 0.45,
      y: y + 0.75,
      w: 5.4,
      h: 0.9,
      fontFace: B,
      fontSize: 12,
      color: ICE,
      lineSpacingMultiple: 1.3,
    });
  });
  footer(s, 4, 16, true);
}

// SLIDE 5: PRODUCT MAP
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Die OPSQAI-Plattform");
  title(s, "Vier Module. Ein operatives Gehirn.");
  const mods = [
    [
      "Assistant",
      "AI-Chat mit Quellen",
      "Sofortige Antworten aus der Wissensbasis, mit Zitaten und Confidence Score.",
    ],
    [
      "Academy",
      "Onboarding & Training",
      "Lernpfade, AI-Lektionen, Quizze und automatische PDF-Zertifikate.",
    ],
    [
      "Enterprise Docs",
      "Premium-Deliverables",
      "Berichte, SOPs und Angebote im Stil einer Tier-1-Beratung.",
    ],
    [
      "Governance",
      "Audit & Kontrolle",
      "Rollen, Audit-Log, Knowledge Gaps, SOP-Versionierung, Benachrichtigungen.",
    ],
  ];
  mods.forEach((m, i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 2.4, 2.9, 3.6);
    s.addShape("roundRect", {
      x: x + 0.3,
      y: 2.65,
      w: 0.55,
      h: 0.55,
      fill: { color: ICE },
      line: { color: BLUE_L, width: 0.5 },
      rectRadius: 0.1,
    });
    s.addText(String(i + 1), {
      x: x + 0.3,
      y: 2.65,
      w: 0.55,
      h: 0.55,
      fontFace: H,
      fontSize: 18,
      bold: true,
      color: BLUE,
      align: "center",
      valign: "middle",
    });
    s.addText(m[0], {
      x: x + 0.3,
      y: 3.3,
      w: 2.5,
      h: 0.4,
      fontFace: H,
      fontSize: 18,
      bold: true,
      color: NAVY,
    });
    s.addText(m[1], {
      x: x + 0.3,
      y: 3.7,
      w: 2.5,
      h: 0.3,
      fontFace: B,
      fontSize: 10,
      bold: true,
      color: TEAL,
      charSpacing: 2,
    });
    s.addText(m[2], {
      x: x + 0.3,
      y: 4.05,
      w: 2.5,
      h: 1.8,
      fontFace: B,
      fontSize: 11,
      color: "556080",
      lineSpacingMultiple: 1.35,
    });
  });
  footer(s, 5, 16);
}

// SLIDE 6: ASSISTANT
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Modul 01 · Assistant");
  title(s, "Der schnellste Weg zur richtigen Antwort.");
  const bullets = [
    [
      "Quellenbasiert",
      "Jede Antwort basiert ausschließlich auf Ihren Dokumenten — keine Erfindungen.",
    ],
    [
      "Sichtbare Zitate",
      "Panel mit den exakten Quellen zu jeder Aussage, Direktklick ins Dokument.",
    ],
    ["Confidence Score", "Vertrauensgrad je Antwort; niedriger Score → automatische Eskalation."],
    ["Mehrsprachig", "Erkennt die Sprache des Nutzers (DE/EN/RO) und antwortet konsistent."],
    [
      "Knowledge Gaps",
      "Wenn keine Quelle vorhanden ist, wird eine interne Anfrage für den Manager erstellt.",
    ],
  ];
  bullets.forEach((b, i) => {
    const y = 2.2 + i * 0.75;
    s.addShape("roundRect", {
      x: 0.6,
      y: y + 0.05,
      w: 0.35,
      h: 0.35,
      fill: { color: BLUE },
      line: { color: BLUE, width: 0 },
      rectRadius: 0.08,
    });
    s.addText("✓", {
      x: 0.6,
      y: y + 0.05,
      w: 0.35,
      h: 0.35,
      fontFace: H,
      fontSize: 14,
      bold: true,
      color: WHITE,
      align: "center",
      valign: "middle",
    });
    s.addText(b[0], {
      x: 1.1,
      y,
      w: 4.5,
      h: 0.35,
      fontFace: H,
      fontSize: 14,
      bold: true,
      color: NAVY,
    });
    s.addText(b[1], {
      x: 1.1,
      y: y + 0.35,
      w: 5.5,
      h: 0.5,
      fontFace: B,
      fontSize: 11,
      color: "556080",
    });
  });
  card(s, 7.3, 2.2, 5.4, 4.1, { fill: WHITE, line: "E4E7EC" });
  s.addText("● Assistant", {
    x: 7.55,
    y: 2.35,
    w: 3,
    h: 0.3,
    fontFace: B,
    fontSize: 10,
    bold: true,
    color: TEAL,
  });
  s.addShape("roundRect", {
    x: 7.55,
    y: 2.75,
    w: 4.9,
    h: 0.7,
    fill: { color: "F2F4F8" },
    line: { color: "E4E7EC", width: 0.5 },
    rectRadius: 0.08,
  });
  s.addText("Wie ist der Prozess für B2B-Retouren?", {
    x: 7.7,
    y: 2.8,
    w: 4.7,
    h: 0.6,
    fontFace: B,
    fontSize: 11,
    color: NAVY,
  });
  s.addShape("roundRect", {
    x: 7.55,
    y: 3.6,
    w: 4.9,
    h: 1.9,
    fill: { color: NAVY },
    line: { color: NAVY, width: 0 },
    rectRadius: 0.08,
  });
  s.addText(
    "Laut SOP-RET-014 §3.2 benötigen B2B-Retouren >500€ die Freigabe des Lagerleiters und eine physische Prüfung an Tor 7. Antwort-SLA: 24h.",
    {
      x: 7.7,
      y: 3.7,
      w: 4.7,
      h: 1.2,
      fontFace: B,
      fontSize: 11,
      color: WHITE,
      lineSpacingMultiple: 1.3,
    },
  );
  s.addText("Quellen: SOP-RET-014 · B2B-Handbuch v3", {
    x: 7.7,
    y: 5.0,
    w: 4.7,
    h: 0.3,
    fontFace: B,
    fontSize: 9,
    italic: true,
    color: BLUE_L,
  });
  s.addText("Confidence 92%", {
    x: 7.55,
    y: 5.7,
    w: 2,
    h: 0.3,
    fontFace: B,
    fontSize: 10,
    bold: true,
    color: TEAL,
  });
  footer(s, 6, 16);
}

// SLIDE 7: ACADEMY
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Modul 02 · Academy");
  title(s, "AI-geführtes Onboarding.");
  subtitle(
    s,
    "Von Abteilung → Lernpfad → Kapitel → Lektion → Quiz. Automatisch generierte, öffentlich verifizierbare PDF-Zertifikate.",
    1.55,
  );
  const steps = [
    ["Abteilung", "Vom Manager definiert", "Lager, Kommissionierung, Transport, Kundenservice…"],
    ["Lernpfad", "Automatisch strukturiert", "Kapitel, Lernziele, geschätzte Dauer."],
    [
      "AI-Lektion",
      "Mit virtuellem Trainer",
      "Dialogbasierte Erklärungen in der Sprache des Lernenden.",
    ],
    [
      "Quiz & Zertifikat",
      "Prüfung + PDF",
      "Öffentlich verifizierbare, von OPSQAI signierte Zertifikate.",
    ],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 3.2, 2.9, 3.2);
    s.addText(`Schritt ${i + 1}`, {
      x: x + 0.3,
      y: 3.35,
      w: 2,
      h: 0.3,
      fontFace: B,
      fontSize: 10,
      bold: true,
      color: TEAL,
      charSpacing: 2,
    });
    s.addText(st[0], {
      x: x + 0.3,
      y: 3.7,
      w: 2.5,
      h: 0.45,
      fontFace: H,
      fontSize: 16,
      bold: true,
      color: NAVY,
    });
    s.addText(st[1], {
      x: x + 0.3,
      y: 4.2,
      w: 2.5,
      h: 0.35,
      fontFace: B,
      fontSize: 11,
      bold: true,
      color: BLUE,
    });
    s.addText(st[2], {
      x: x + 0.3,
      y: 4.6,
      w: 2.5,
      h: 1.6,
      fontFace: B,
      fontSize: 11,
      color: "556080",
      lineSpacingMultiple: 1.35,
    });
  });
  footer(s, 7, 16);
}

// SLIDE 8: ENTERPRISE DOCS
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Modul 03 · Enterprise Documents", 0.55, TEAL);
  title(s, "Deliverables im Stil einer Tier-1-Beratung.", 0.9, true);
  subtitle(
    s,
    "Erzeugen Sie Berichte, SOPs, Angebote und Onboarding-Pakete — mit Cover, KPI-Cards, Tabellen und Export als DOCX / PDF / HTML / MD.",
    1.7,
    true,
  );
  const types = [
    "Executive Summary",
    "SOPs & Arbeitsanweisungen",
    "Kommerzielle Angebote",
    "Onboarding-Kit",
    "KPI-Berichte",
    "Richtlinien & Compliance",
    "Betriebshandbuch",
    "Implementierungsplan",
  ];
  types.forEach((t, i) => {
    const col = i % 4,
      row = Math.floor(i / 4);
    const x = 0.6 + col * 3.1;
    const y = 3.0 + row * 1.5;
    darkCard(s, x, y, 2.9, 1.3);
    s.addShape("rect", {
      x: x + 0.2,
      y: y + 0.25,
      w: 0.06,
      h: 0.8,
      fill: { color: BLUE_L },
      line: { color: BLUE_L, width: 0 },
    });
    s.addText(t, {
      x: x + 0.4,
      y: y + 0.3,
      w: 2.4,
      h: 0.7,
      fontFace: H,
      fontSize: 13,
      bold: true,
      color: WHITE,
      valign: "middle",
    });
  });
  s.addText(
    "Professionelles Format: editoriales Cover · Inhaltsverzeichnis · nummerierte Abschnitte · KPI-Cards · Callouts · Zebra-Rows · keine Schusterjungen.",
    {
      x: 0.6,
      y: 6.4,
      w: W - 1.2,
      h: 0.4,
      fontFace: B,
      fontSize: 11,
      italic: true,
      color: ICE,
    },
  );
  footer(s, 8, 16, true);
}

// SLIDE 9: GOVERNANCE
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Modul 04 · Governance");
  title(s, "Volle Kontrolle. Keine Überraschungen.");
  const rows = [
    [
      "RBAC mit 7 Rollen",
      "Platform Owner → Super Admin → Admin → Manager → Team Leader → Employee → Operator.",
    ],
    [
      "Vollständiges Audit-Log",
      "Wer, was, wann — für jede Frage, jeden Upload, jede Rollen- oder SOP-Änderung.",
    ],
    [
      "SOP-Versionierung",
      "Vollständige Historie, Versionsvergleich, Freigaben und Kenntnisnahmen.",
    ],
    [
      "Knowledge Gaps",
      "Kompletter Zyklus: AI-Ablehnung → interne Anfrage → Manager-Lösung → Übernahme in KB.",
    ],
    [
      "Benachrichtigungen",
      "Branded E-Mails für Einladungen, Eskalationen, Zertifikate und Sicherheitsmeldungen.",
    ],
  ];
  rows.forEach((r, i) => {
    const y = 2.2 + i * 0.85;
    s.addShape("roundRect", {
      x: 0.6,
      y,
      w: W - 1.2,
      h: 0.75,
      fill: { color: "F7F8FA" },
      line: { color: "E4E7EC", width: 0.5 },
      rectRadius: 0.08,
    });
    s.addShape("rect", {
      x: 0.6,
      y,
      w: 0.08,
      h: 0.75,
      fill: { color: TEAL },
      line: { color: TEAL, width: 0 },
    });
    s.addText(r[0], {
      x: 0.85,
      y: y + 0.1,
      w: 3.5,
      h: 0.55,
      fontFace: H,
      fontSize: 14,
      bold: true,
      color: NAVY,
      valign: "middle",
    });
    s.addText(r[1], {
      x: 4.5,
      y: y + 0.1,
      w: W - 5.3,
      h: 0.55,
      fontFace: B,
      fontSize: 12,
      color: "4A5570",
      valign: "middle",
    });
  });
  footer(s, 9, 16);
}

// SLIDE 10: SECURITY
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Sicherheit & Compliance", 0.55, TEAL);
  title(s, "Ihre Daten bleiben Ihre Daten.", 0.9, true);
  subtitle(
    s,
    "Multi-Tenant-Architektur mit Isolation auf Datenbankebene. Nichts verlässt die Grenzen Ihres Workspace.",
    1.7,
    true,
  );
  const items = [
    ["Row-Level Security", "RLS-Policies auf jeder Tabelle, gefiltert über current_company_id()."],
    [
      "Verschlüsselung",
      "TLS 1.2+ in Transit, Encryption at Rest, tägliche verschlüsselte Backups.",
    ],
    [
      "EU-gehostet",
      "DB auf Supabase in AWS eu-west-1 (Dublin, IE). AVV im Entwurf. Kein Training mit Ihren Daten (Google/OpenAI über Lovable AI Gateway).",
    ],
    [
      "Audit & Suppression",
      "Append-only Log pro Mandant. Suppression-Liste für E-Mail-Compliance.",
    ],
    [
      "Unterauftragsverarbeiter (3 Stufen)",
      "Cloudflare, Inc. (USA) — Edge/DNS/DDoS, ISO/IEC 27001, ISO/IEC 27701, SOC 2 Type II und PCI DSS Level 1 zertifiziert; Übermittlungen abgesichert durch SCC (Art. 46 DSGVO) oder das EU-U.S. Data Privacy Framework, gemäß Cloudflares AVV, akzeptiert durch OPSQAI. Lovable — DB/Auth/Speicher/AI-Gateway, SOC 2 Type II und ISO 27001:2022 auf Unternehmensebene; unser Abonnement ist Pro-Tarif, die vertragliche AVV-Abdeckung des Business-Tarifs wird bestätigt, Dokumentation auf Anfrage; OPSQAI selbst ist nicht SOC 2 / ISO 27001 zertifiziert. Google (gemini-3-flash-preview, gemini-2.5-flash) und OpenAI (gpt-5-mini, gpt-4o-mini-tts, text-embedding-3-small) — indirekt, über das Lovable AI Gateway; OPSQAI hat keinen Direktvertrag mit Google oder OpenAI; Kundeninhalte werden nicht zum Training von Foundation-Modellen verwendet.",
    ],
    ["Responsible AI", "Explizite Ablehnung ohne Quelle. Drittlandtransfers: SCC (Art. 46 DSGVO)."],
  ];
  items.forEach((it, i) => {
    const col = i % 3,
      row = Math.floor(i / 3);
    const x = 0.6 + col * 4.15;
    const y = 3.0 + row * 1.9;
    darkCard(s, x, y, 3.9, 1.7);
    s.addText(it[0], {
      x: x + 0.3,
      y: y + 0.25,
      w: 3.5,
      h: 0.4,
      fontFace: H,
      fontSize: 14,
      bold: true,
      color: WHITE,
    });
    s.addText(it[1], {
      x: x + 0.3,
      y: y + 0.7,
      w: 3.5,
      h: 0.9,
      fontFace: B,
      fontSize: 11,
      color: ICE,
      lineSpacingMultiple: 1.3,
    });
  });
  footer(s, 10, 16, true);
}

// SLIDE 11: ARCHITECTURE
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Architektur");
  title(s, "Modern. Schnell. Enterprise-ready.");
  const layers = [
    ["Oberfläche", "React 19 · TanStack Start · PWA · EN/DE/RO", ICE, NAVY],
    ["Anwendung", "Server Functions · RBAC · RLS Enforcement", BLUE_L, WHITE],
    ["AI Layer", "RAG · pgvector · Zitate · Confidence · mehrsprachig", BLUE, WHITE],
    ["Daten", "Postgres Multi-Tenant · RLS · Audit-Log · tägliches Backup", NAVY, WHITE],
  ];
  layers.forEach((l, i) => {
    const y = 2.3 + i * 1.05;
    s.addShape("roundRect", {
      x: 0.6,
      y,
      w: 6.5,
      h: 0.9,
      fill: { color: l[2] },
      line: { color: "E4E7EC", width: 0.5 },
      rectRadius: 0.1,
    });
    s.addText(l[0], {
      x: 0.85,
      y: y + 0.1,
      w: 2,
      h: 0.7,
      fontFace: H,
      fontSize: 14,
      bold: true,
      color: l[3],
      valign: "middle",
    });
    s.addText(l[1], {
      x: 2.9,
      y: y + 0.1,
      w: 4.1,
      h: 0.7,
      fontFace: B,
      fontSize: 11,
      color: l[3],
      valign: "middle",
    });
  });
  card(s, 7.5, 2.3, 5.2, 4.2);
  s.addText("Kernprinzipien", {
    x: 7.75,
    y: 2.45,
    w: 4,
    h: 0.4,
    fontFace: H,
    fontSize: 14,
    bold: true,
    color: NAVY,
  });
  const principles = [
    "Row-Level Security auf jeder Tabelle.",
    "Server-seitiges RAG mit rekursivem Chunking & Zitaten.",
    "Embeddings via pgvector, Cache & Re-Ranking.",
    "Edge-ready Runtime, TLS 1.2+, EU-Residency.",
    "Observability: Audit-Log, E-Mail-Logs, Analytics.",
  ];
  principles.forEach((p, i) => {
    const y = 3.0 + i * 0.6;
    s.addShape("oval", {
      x: 7.75,
      y: y + 0.1,
      w: 0.15,
      h: 0.15,
      fill: { color: TEAL },
      line: { color: TEAL, width: 0 },
    });
    s.addText(p, {
      x: 8.0,
      y,
      w: 4.6,
      h: 0.5,
      fontFace: B,
      fontSize: 11.5,
      color: "4A5570",
      valign: "middle",
    });
  });
  footer(s, 11, 16);
}

// SLIDE 12: ROI
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Impact & ROI");
  title(s, "Messbare Ergebnisse in den ersten 90 Tagen.");
  const kpis = [
    ["-60%", "Suchzeit für Informationen", TEAL],
    ["3×", "schnelleres Onboarding", BLUE],
    ["+40%", "Rate korrekter Antworten", TEAL],
    ["100%", "Nachvollziehbarkeit von Entscheidungen", BLUE],
  ];
  kpis.forEach((k, i) => {
    const x = 0.6 + i * 3.1;
    card(s, x, 2.3, 2.9, 2.0);
    s.addText(k[0], {
      x: x + 0.3,
      y: 2.45,
      w: 2.5,
      h: 1.0,
      fontFace: H,
      fontSize: 44,
      bold: true,
      color: k[2],
    });
    s.addText(k[1], {
      x: x + 0.3,
      y: 3.5,
      w: 2.5,
      h: 0.7,
      fontFace: B,
      fontSize: 12,
      color: "4A5570",
      lineSpacingMultiple: 1.3,
    });
  });
  card(s, 0.6, 4.6, W - 1.2, 2.0);
  s.addText("Was Sie konkret gewinnen", {
    x: 0.85,
    y: 4.75,
    w: 5,
    h: 0.4,
    fontFace: H,
    fontSize: 14,
    bold: true,
    color: NAVY,
  });
  const wins = [
    ["Operations", "Weniger Fehler, eingehaltene SLAs, weniger Eskalationen."],
    ["HR & Training", "Skalierbares Onboarding, automatische Zertifikate, vollständiger Nachweis."],
    ["Führung", "Echte Sichtbarkeit auf Wissenslücken und Compliance."],
  ];
  wins.forEach((w, i) => {
    const x = 0.85 + i * 4.1;
    s.addText(w[0].toUpperCase(), {
      x,
      y: 5.2,
      w: 4,
      h: 0.3,
      fontFace: B,
      fontSize: 10,
      bold: true,
      color: TEAL,
      charSpacing: 3,
    });
    s.addText(w[1], {
      x,
      y: 5.5,
      w: 3.9,
      h: 1.0,
      fontFace: B,
      fontSize: 11.5,
      color: "4A5570",
      lineSpacingMultiple: 1.3,
    });
  });
  footer(s, 12, 16);
}

// SLIDE 13: WHY OPSQAI
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Warum OPSQAI");
  title(s, "Der Unterschied zwischen Chatbot und Enterprise-Plattform.");
  const cols = ["Funktion", "Generischer Chatbot", "OPSQAI"];
  const rows = [
    ["Geprüfte Quellen & Zitate", "Nein", "Ja — verpflichtend"],
    ["Mandantenisolation (RLS)", "Nein", "Auf DB-Ebene"],
    ["Mehrsprachig DE/EN/RO", "Teilweise", "Nativ + Auto-Detect"],
    ["Academy & Zertifikate", "Nein", "Enthalten"],
    ["Audit-Log & Governance", "Nein", "Vollständig"],
    ["Premium-Dokumentenexport", "Nein", "PDF/DOCX/HTML/MD"],
  ];
  const startY = 2.2;
  const rowH = 0.55;
  cols.forEach((c, i) => {
    const x = 0.6 + [0, 5.6, 9.5][i];
    const w = [5.0, 3.9, 3.2][i];
    s.addShape("rect", {
      x,
      y: startY,
      w,
      h: 0.55,
      fill: { color: NAVY },
      line: { color: NAVY, width: 0 },
    });
    s.addText(c, {
      x: x + 0.15,
      y: startY,
      w: w - 0.3,
      h: 0.55,
      fontFace: H,
      fontSize: 12,
      bold: true,
      color: WHITE,
      valign: "middle",
    });
  });
  rows.forEach((r, i) => {
    const y = startY + 0.55 + i * rowH;
    const fill = i % 2 === 0 ? "F7F8FA" : WHITE;
    r.forEach((cell, j) => {
      const x = 0.6 + [0, 5.6, 9.5][j];
      const w = [5.0, 3.9, 3.2][j];
      s.addShape("rect", {
        x,
        y,
        w,
        h: rowH,
        fill: { color: fill },
        line: { color: "E4E7EC", width: 0.25 },
      });
      const color = j === 2 ? TEAL : j === 1 ? "8892A6" : NAVY;
      const bold = j === 0 || j === 2;
      s.addText(cell, {
        x: x + 0.15,
        y,
        w: w - 0.3,
        h: rowH,
        fontFace: B,
        fontSize: 11.5,
        bold,
        color,
        valign: "middle",
      });
    });
  });
  footer(s, 13, 16);
}

// SLIDE 14: PRICING
{
  const s = pres.addSlide();
  bgLight(s);
  brandBar(s, false);
  eyebrow(s, "Pläne");
  title(s, "Wählen Sie das Tempo Ihrer Organisation.");
  const plans = [
    {
      name: "Pilot",
      price: "30 Tage",
      desc: "Für die schnelle Validierung",
      features: ["Bis 25 Nutzer", "1 Workspace", "Assistant + Academy", "E-Mail-Support"],
      accent: BLUE_L,
    },
    {
      name: "Standard",
      price: "Team",
      desc: "Für operative Teams",
      features: ["Bis 100 Nutzer", "Alle Module", "SSO + volles RBAC", "Priority Support"],
      accent: BLUE,
      highlight: true,
    },
    {
      name: "Business",
      price: "Multi-Site",
      desc: "Für mehrere Standorte",
      features: ["Bis 500 Nutzer", "Multi-Workspace", "Erweitertes Audit", "SLA 99,9%"],
      accent: TEAL,
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "Für Gruppen & Netzwerke",
      features: [
        "Unbegrenzte Nutzer",
        "Dediziertes Deployment",
        "AVV & Compliance-Paket",
        "Dedizierter CSM",
      ],
      accent: NAVY,
    },
  ];
  plans.forEach((p, i) => {
    const x = 0.6 + i * 3.1;
    const y = 2.2;
    const isH = p.highlight;
    card(s, x, y, 2.9, 4.5, isH ? { fill: NAVY, line: BLUE } : {});
    if (isH) {
      s.addShape("roundRect", {
        x: x + 0.85,
        y: y - 0.2,
        w: 1.2,
        h: 0.35,
        fill: { color: TEAL },
        line: { color: TEAL, width: 0 },
        rectRadius: 0.05,
      });
      s.addText("EMPFOHLEN", {
        x: x + 0.85,
        y: y - 0.2,
        w: 1.2,
        h: 0.35,
        fontFace: B,
        fontSize: 8,
        bold: true,
        color: WHITE,
        align: "center",
        valign: "middle",
        charSpacing: 2,
      });
    }
    const fg = isH ? WHITE : NAVY;
    const sub = isH ? ICE : "4A5570";
    s.addText(p.name, {
      x: x + 0.3,
      y: y + 0.25,
      w: 2.5,
      h: 0.45,
      fontFace: H,
      fontSize: 18,
      bold: true,
      color: fg,
    });
    s.addText(p.price, {
      x: x + 0.3,
      y: y + 0.75,
      w: 2.5,
      h: 0.5,
      fontFace: H,
      fontSize: 22,
      bold: true,
      color: isH ? BLUE_L : p.accent,
    });
    s.addText(p.desc, {
      x: x + 0.3,
      y: y + 1.3,
      w: 2.5,
      h: 0.35,
      fontFace: B,
      fontSize: 10,
      italic: true,
      color: sub,
    });
    s.addShape("rect", {
      x: x + 0.3,
      y: y + 1.75,
      w: 2.3,
      h: 0.02,
      fill: { color: isH ? LINE : "E4E7EC" },
      line: { color: "E4E7EC", width: 0 },
    });
    p.features.forEach((f, j) => {
      const fy = y + 1.95 + j * 0.5;
      s.addText("✓", {
        x: x + 0.3,
        y: fy,
        w: 0.3,
        h: 0.35,
        fontFace: H,
        fontSize: 12,
        bold: true,
        color: TEAL,
      });
      s.addText(f, {
        x: x + 0.6,
        y: fy,
        w: 2.2,
        h: 0.35,
        fontFace: B,
        fontSize: 11,
        color: fg,
        valign: "middle",
      });
    });
  });
  s.addText("Endpreise richten sich nach Scope, Nutzerzahl und Compliance-Anforderungen.", {
    x: 0.6,
    y: HGT - 0.65,
    w: W - 1.2,
    h: 0.3,
    fontFace: B,
    fontSize: 9,
    italic: true,
    color: MUTED,
    align: "center",
  });
  footer(s, 14, 16);
}

// SLIDE 15: PILOT PLAN
{
  const s = pres.addSlide();
  bgDark(s);
  brandBar(s, true);
  eyebrow(s, "Nächste Schritte", 0.55, TEAL);
  title(s, "30-Tage-Pilot. Ohne Risiko. Mit Ergebnissen.", 0.9, true);
  subtitle(
    s,
    "Wir führen gemeinsam einen begleiteten Pilot durch: SOP-Ingestion, Academy für eine Abteilung, Impact-Messung.",
    1.7,
    true,
  );
  const phases = [
    [
      "Woche 1",
      "Kick-off & Ingestion",
      "Workspace-Bereitstellung · SOP-Import · Rollenkonfiguration.",
    ],
    ["Woche 2", "Assistant-Aktivierung", "Test mit Key-Usern · Feintuning der Quellen & FAQs."],
    ["Woche 3", "Academy & Training", "Ein vollständiger Lernpfad · Zertifikate · Feedback."],
    ["Woche 4", "Messung & Entscheidung", "KPI-Bericht · Skalierungsplan · kommerzielles Angebot."],
  ];
  phases.forEach((p, i) => {
    const x = 0.6 + i * 3.1;
    darkCard(s, x, 3.0, 2.9, 3.3);
    s.addText(p[0].toUpperCase(), {
      x: x + 0.3,
      y: 3.15,
      w: 2.5,
      h: 0.3,
      fontFace: B,
      fontSize: 10,
      bold: true,
      color: TEAL,
      charSpacing: 2,
    });
    s.addText(p[1], {
      x: x + 0.3,
      y: 3.5,
      w: 2.5,
      h: 0.5,
      fontFace: H,
      fontSize: 16,
      bold: true,
      color: WHITE,
    });
    s.addText(p[2], {
      x: x + 0.3,
      y: 4.15,
      w: 2.5,
      h: 2.0,
      fontFace: B,
      fontSize: 11.5,
      color: ICE,
      lineSpacingMultiple: 1.35,
    });
  });
  footer(s, 15, 16, true);
}

// SLIDE 16: CTA
{
  const s = pres.addSlide();
  bgDark(s);
  s.addShape("oval", {
    x: -2,
    y: 3,
    w: 5,
    h: 5,
    line: { color: BLUE, width: 1 },
    fill: { color: NAVY, transparency: 100 },
  });
  s.addShape("oval", {
    x: -1,
    y: 3.5,
    w: 4,
    h: 4,
    line: { color: TEAL, width: 1 },
    fill: { color: NAVY, transparency: 100 },
  });
  brandBar(s, true);
  s.addText("LASST UNS GEMEINSAM AUFBAUEN", {
    x: 0.6,
    y: 2.5,
    w: 12,
    h: 0.4,
    fontFace: B,
    fontSize: 11,
    bold: true,
    color: TEAL,
    charSpacing: 5,
  });
  s.addText("Unternehmenswissen\nwird zum Wettbewerbsvorteil.", {
    x: 0.6,
    y: 3.0,
    w: 12,
    h: 2.5,
    fontFace: H,
    fontSize: 48,
    bold: true,
    color: WHITE,
    lineSpacingMultiple: 1.05,
  });
  s.addShape("roundRect", {
    x: 0.6,
    y: 5.7,
    w: 3.2,
    h: 0.7,
    fill: { color: BLUE },
    line: { color: BLUE, width: 0 },
    rectRadius: 0.1,
  });
  s.addText("Demo vereinbaren →", {
    x: 0.6,
    y: 5.7,
    w: 3.2,
    h: 0.7,
    fontFace: H,
    fontSize: 14,
    bold: true,
    color: WHITE,
    align: "center",
    valign: "middle",
  });
  s.addText("opsqai.de   ·   hello@opsqai.de", {
    x: 4.0,
    y: 5.7,
    w: 8,
    h: 0.7,
    fontFace: B,
    fontSize: 14,
    color: ICE,
    valign: "middle",
  });
  s.addText("© 2026 OPSQAI · Enterprise AI Operations Platform", {
    x: 0.6,
    y: HGT - 0.4,
    w: 10,
    h: 0.3,
    fontFace: B,
    fontSize: 9,
    color: MUTED,
  });
}

await pres.writeFile({ fileName: "/mnt/documents/OPSQAI-Praesentation-DE.pptx" });
console.log("done");
