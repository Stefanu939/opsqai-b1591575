// Server-only: premium enterprise DOCX generator.
// Cover page, running header/footer with page numbers, banded tables,
// callout panels (shaded single-cell tables), KPI grids.

export type DocxBlock =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | {
      type: "callout";
      kind?:
        | "recommendation"
        | "risk"
        | "opportunity"
        | "key-takeaway"
        | "best-practice"
        | "note"
        | "executive";
      title?: string;
      text: string;
    }
  | { type: "kpis"; items: Array<{ label: string; value: string; sub?: string }> }
  | { type: "divider" }
  | { type: "pagebreak" };

export interface DocxMeta {
  customerName?: string;
  workspaceName?: string;
  documentType?: string;
  version?: string;
  date?: string;
  confidentiality?: string;
  brand?: string;
  revision?: string;
}

export interface DocxSpec {
  title: string;
  subtitle?: string;
  author?: string;
  blocks: DocxBlock[];
  meta?: DocxMeta;
}

// Calm enterprise palette (hex without #)
const C = {
  ink: "0F1729",
  sub: "50607A",
  brand: "3A5BB8",
  brandSoft: "6A82C8",
  teal: "1F9485",
  amber: "B8862E",
  red: "B94545",
  line: "E4E7EC",
  panel: "F7F8FA",
  panelDeep: "EDEFF4",
};

function calloutColor(kind?: string) {
  switch (kind) {
    case "recommendation": return { bar: C.brand, tag: "RECOMMENDATION" };
    case "risk": return { bar: C.red, tag: "RISK" };
    case "opportunity": return { bar: C.teal, tag: "OPPORTUNITY" };
    case "key-takeaway": return { bar: C.brandSoft, tag: "KEY TAKEAWAY" };
    case "best-practice": return { bar: C.teal, tag: "BEST PRACTICE" };
    case "executive": return { bar: C.ink, tag: "EXECUTIVE NOTE" };
    default: return { bar: C.sub, tag: "NOTE" };
  }
}

export async function generateDocx(spec: DocxSpec): Promise<Uint8Array> {
  const docx = await import("docx");
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    WidthType, AlignmentType, BorderStyle, ShadingType, PageNumber, Header, Footer,
    PageBreak, LevelFormat, convertInchesToTwip,
  } = docx;

  const meta = {
    customerName: spec.meta?.customerName ?? "",
    workspaceName: spec.meta?.workspaceName ?? spec.meta?.customerName ?? "",
    documentType: spec.meta?.documentType ?? spec.title,
    version: spec.meta?.version ?? "1.0",
    date: spec.meta?.date ?? new Date().toISOString().slice(0, 10),
    confidentiality: spec.meta?.confidentiality ?? "Confidential — for the named recipient only",
    brand: spec.meta?.brand ?? "OPSQAI",
    revision: spec.meta?.revision ?? "R1",
  };

  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
  const thinBorders = {
    top: { style: BorderStyle.SINGLE, size: 4, color: C.line },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line },
    left: { style: BorderStyle.SINGLE, size: 4, color: C.line },
    right: { style: BorderStyle.SINGLE, size: 4, color: C.line },
  };

  // ---------- Cover ----------
  const cover: any[] = [];
  cover.push(
    new Paragraph({
      spacing: { before: 800, after: 200 },
      children: [
        new TextRun({ text: meta.brand, bold: true, color: C.brand, size: 26 }),
        new TextRun({ text: meta.customerName ? `        ${meta.customerName}` : "", bold: true, color: C.ink, size: 22 }),
      ],
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.brand, space: 1 } },
      spacing: { after: 600 },
    }),
    new Paragraph({
      spacing: { before: 1200, after: 120 },
      children: [new TextRun({ text: meta.documentType.toUpperCase(), bold: true, color: C.brandSoft, size: 18, characterSpacing: 80 })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: spec.title, bold: true, color: C.ink, size: 56 })],
    }),
  );
  if (spec.subtitle) {
    cover.push(new Paragraph({
      spacing: { after: 600 },
      children: [new TextRun({ text: spec.subtitle, italics: true, color: C.sub, size: 24 })],
    }));
  }

  const coverMetaRow = (k: string, v: string) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: k.toUpperCase(), bold: true, color: C.sub, size: 16 })] })],
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          borders: noBorders,
          children: [new Paragraph({ children: [new TextRun({ text: v, color: C.ink, size: 20 })] })],
        }),
      ],
    });

  cover.push(
    new Paragraph({ spacing: { before: 2200, after: 100 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: C.line, space: 1 } } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        coverMetaRow("Prepared for", meta.customerName || "—"),
        coverMetaRow("Workspace", meta.workspaceName || "—"),
        coverMetaRow("Document", `${meta.documentType} · ${meta.revision}`),
        coverMetaRow("Version", `v${meta.version}`),
        coverMetaRow("Date", meta.date),
      ],
    }),
    // Confidentiality strip
    new Paragraph({ spacing: { before: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          shading: { type: ShadingType.SOLID, color: C.panel, fill: C.panel },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.SINGLE, size: 24, color: C.amber },
          },
          children: [new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [new TextRun({ text: `  ${meta.confidentiality}`, italics: true, color: C.sub, size: 18 })],
          })],
        })],
      })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ---------- Body blocks ----------
  type Child = any;
  const body: Child[] = [];

  const heading = (text: string, level: 1 | 2 | 3) =>
    new Paragraph({
      heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
      spacing: { before: level === 1 ? 360 : 240, after: level === 1 ? 160 : 100 },
      children: [new TextRun({ text, bold: true, color: C.ink, size: level === 1 ? 32 : level === 2 ? 24 : 20 })],
      border: level === 1
        ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.brand, space: 4 } }
        : undefined,
    });

  const para = (text: string) =>
    new Paragraph({
      spacing: { after: 120, line: 320 },
      children: [new TextRun({ text, color: C.ink, size: 22 })],
    });

  const calloutBlock = (b: Extract<DocxBlock, { type: "callout" }>) => {
    const theme = calloutColor(b.kind);
    const inner: any[] = [
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: theme.tag, bold: true, color: theme.bar, size: 16, characterSpacing: 60 })],
      }),
    ];
    if (b.title) {
      inner.push(new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: b.title, bold: true, color: C.ink, size: 22 })],
      }));
    }
    inner.push(new Paragraph({
      children: [new TextRun({ text: b.text, color: C.ink, size: 20 })],
    }));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [new TableCell({
          shading: { type: ShadingType.SOLID, color: C.panel, fill: C.panel },
          borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.SINGLE, size: 24, color: theme.bar },
          },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: inner,
        })],
      })],
    });
  };

  const kpiGrid = (items: Array<{ label: string; value: string; sub?: string }>) => {
    const cols = Math.min(items.length, 4);
    const cells = items.slice(0, cols).map((it) => new TableCell({
      width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 24, color: C.brand },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line },
        left: { style: BorderStyle.SINGLE, size: 4, color: C.line },
        right: { style: BorderStyle.SINGLE, size: 4, color: C.line },
      },
      margins: { top: 140, bottom: 140, left: 160, right: 160 },
      children: [
        new Paragraph({ children: [new TextRun({ text: it.label.toUpperCase(), bold: true, color: C.sub, size: 14, characterSpacing: 40 })] }),
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: it.value, bold: true, color: C.ink, size: 36 })] }),
        ...(it.sub ? [new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: it.sub, color: C.sub, size: 16 })] })] : []),
      ],
    }));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: cells })],
    });
  };

  const dataTable = (headers: string[], rows: string[][]) => {
    const header = new TableRow({
      tableHeader: true,
      children: headers.map((h) => new TableCell({
        shading: { type: ShadingType.SOLID, color: C.panelDeep, fill: C.panelDeep },
        borders: thinBorders,
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: C.ink, size: 18 })] })],
      })),
    });
    const body = rows.map((r, idx) => new TableRow({
      children: r.map((c) => new TableCell({
        shading: idx % 2 === 0
          ? { type: ShadingType.SOLID, color: C.panel, fill: C.panel }
          : { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
        borders: thinBorders,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: c ?? "", color: C.ink, size: 18 })] })],
      })),
    }));
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] });
  };

  for (const b of spec.blocks) {
    if (b.type === "h1") body.push(heading(b.text, 1));
    else if (b.type === "h2") body.push(heading(b.text, 2));
    else if (b.type === "h3") body.push(heading(b.text, 3));
    else if (b.type === "p") body.push(para(b.text));
    else if (b.type === "bullets") {
      for (const it of b.items) {
        body.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80, line: 300 },
          children: [new TextRun({ text: it, color: C.ink, size: 22 })],
        }));
      }
    } else if (b.type === "numbered") {
      b.items.forEach((it, i) => {
        body.push(new Paragraph({
          spacing: { after: 80, line: 300 },
          children: [
            new TextRun({ text: `${i + 1}.  `, bold: true, color: C.brand, size: 22 }),
            new TextRun({ text: it, color: C.ink, size: 22 }),
          ],
        }));
      });
    } else if (b.type === "table") {
      body.push(dataTable(b.headers, b.rows));
      body.push(new Paragraph({ spacing: { after: 160 } }));
    } else if (b.type === "callout") {
      body.push(calloutBlock(b));
      body.push(new Paragraph({ spacing: { after: 160 } }));
    } else if (b.type === "kpis") {
      body.push(kpiGrid(b.items));
      body.push(new Paragraph({ spacing: { after: 200 } }));
    } else if (b.type === "divider") {
      body.push(new Paragraph({
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.line, space: 1 } },
      }));
    } else if (b.type === "pagebreak") {
      body.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // ---------- Header / Footer (applied to body section) ----------
  const runningHeader = new Header({
    children: [new Paragraph({
      tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
      children: [
        new TextRun({ text: meta.brand, bold: true, color: C.brand, size: 16 }),
        new TextRun({ text: `\t${meta.customerName || ""}`, color: C.sub, size: 16 }),
      ],
    })],
  });
  const runningFooter = new Footer({
    children: [new Paragraph({
      tabStops: [
        { type: AlignmentType.CENTER, position: 4500 },
        { type: AlignmentType.RIGHT, position: 9000 },
      ],
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
      children: [
        new TextRun({ text: meta.confidentiality, italics: true, color: C.sub, size: 14 }),
        new TextRun({ text: `\t${meta.documentType} · v${meta.version} · ${meta.date}\t`, color: C.sub, size: 14 }),
        new TextRun({ children: ["Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], bold: true, color: C.sub, size: 14 }),
      ],
    })],
  });

  const doc = new Document({
    creator: spec.author ?? "OPSQAI",
    title: spec.title,
    description: meta.documentType,
    styles: {
      default: {
        document: { run: { font: "Calibri", color: C.ink } },
      },
    },
    numbering: {
      config: [{
        reference: "opsqai-num",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.3) } } } }],
      }],
    },
    sections: [
      // Cover section — no header/footer
      {
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children: cover,
      },
      // Body section
      {
        properties: { page: { margin: { top: 1600, bottom: 1600, left: 1440, right: 1440 } } },
        headers: { default: runningHeader },
        footers: { default: runningFooter },
        children: body,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
