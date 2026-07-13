// Server-only: premium executive DOCX generator.
// Same API as before — only the visual presentation is elevated.
// Editorial cover, refined typography, premium KPI grid, chip-tagged callouts,
// horizontal-rule tables, elegant section dividers and footer chip.

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
  inkSoft: "2E3851",
  sub: "50607A",
  muted: "8C99B0",
  brand: "3A5BB8",
  brandSoft: "6A82C8",
  teal: "1F9485",
  amber: "B8862E",
  red: "B94545",
  line: "E4E7EC",
  lineSoft: "F1F3F7",
  panel: "F7F8FA",
  panelDeep: "EDEFF4",
  white: "FFFFFF",
};

function calloutColor(kind?: string) {
  switch (kind) {
    case "recommendation":
      return { bar: C.brand, tag: "RECOMMENDATION" };
    case "risk":
      return { bar: C.red, tag: "RISK" };
    case "opportunity":
      return { bar: C.teal, tag: "OPPORTUNITY" };
    case "key-takeaway":
      return { bar: C.brandSoft, tag: "KEY TAKEAWAY" };
    case "best-practice":
      return { bar: C.teal, tag: "BEST PRACTICE" };
    case "executive":
      return { bar: C.ink, tag: "EXECUTIVE NOTE" };
    default:
      return { bar: C.sub, tag: "NOTE" };
  }
}

export async function generateDocx(spec: DocxSpec): Promise<Uint8Array> {
  const docx = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    ShadingType,
    PageNumber,
    Header,
    Footer,
    PageBreak,
    LevelFormat,
    convertInchesToTwip,
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
    top: { style: BorderStyle.NONE, size: 0, color: C.white },
    bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
    left: { style: BorderStyle.NONE, size: 0, color: C.white },
    right: { style: BorderStyle.NONE, size: 0, color: C.white },
  };
  const hRuleOnly = (color = C.line, size = 4) => ({
    top: { style: BorderStyle.NONE, size: 0, color: C.white },
    bottom: { style: BorderStyle.SINGLE, size, color },
    left: { style: BorderStyle.NONE, size: 0, color: C.white },
    right: { style: BorderStyle.NONE, size: 0, color: C.white },
  });

  // ---------- Cover ----------
  const cover: any[] = [];
  // Top brand bar (full width via paragraph with thick top border)
  cover.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 36, color: C.brand, space: 1 } },
      spacing: { after: 0 },
    }),
  );
  cover.push(
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 18, color: C.brandSoft, space: 1 } },
      spacing: { after: 600 },
    }),
  );

  // Brand mark row
  cover.push(
    new Paragraph({
      spacing: { before: 200, after: 100 },
      tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
      children: [
        new TextRun({ text: meta.brand, bold: true, color: C.ink, size: 28 }),
        new TextRun({ text: "   Enterprise Document", color: C.muted, size: 18 }),
        new TextRun({
          text: meta.customerName ? `\t${meta.customerName}` : "",
          bold: true,
          color: C.ink,
          size: 22,
        }),
      ],
    }),
  );

  // Editorial eyebrow + accent rule
  cover.push(
    new Paragraph({
      spacing: { before: 2400, after: 80 },
      children: [
        new TextRun({
          text: meta.documentType.toUpperCase(),
          bold: true,
          color: C.brand,
          size: 18,
          characterSpacing: 80,
        }),
      ],
    }),
  );
  cover.push(
    new Paragraph({
      spacing: { after: 280 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.brand, space: 1 } },
      children: [new TextRun({ text: "", size: 2 })],
    }),
  );

  // Title
  cover.push(
    new Paragraph({
      spacing: { after: 240, line: 480 },
      children: [new TextRun({ text: spec.title, bold: true, color: C.ink, size: 64 })],
    }),
  );
  if (spec.subtitle) {
    cover.push(
      new Paragraph({
        spacing: { after: 600, line: 320 },
        children: [new TextRun({ text: spec.subtitle, italics: true, color: C.sub, size: 26 })],
      }),
    );
  }

  // Document details eyebrow
  cover.push(
    new Paragraph({
      spacing: { before: 2200, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.line, space: 4 } },
      children: [
        new TextRun({
          text: "DOCUMENT DETAILS",
          bold: true,
          color: C.muted,
          size: 14,
          characterSpacing: 60,
        }),
      ],
    }),
  );

  // Two-column meta grid
  const coverMetaCell = (k: string, v: string, isFirst = false) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: noBorders,
      margins: { top: 80, bottom: 80, left: isFirst ? 0 : 200, right: 100 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: k.toUpperCase(),
              bold: true,
              color: C.muted,
              size: 14,
              characterSpacing: 40,
            }),
          ],
        }),
        new Paragraph({
          spacing: { before: 40 },
          children: [new TextRun({ text: v, bold: true, color: C.ink, size: 22 })],
        }),
      ],
    });

  const metaRows: Array<[string, string]> = [
    ["Prepared for", meta.customerName || "—"],
    ["Workspace", meta.workspaceName || "—"],
    ["Document", `${meta.documentType} · ${meta.revision}`],
    ["Version", `v${meta.version}`],
    ["Date", meta.date],
    ["", ""],
  ];
  const gridRows: any[] = [];
  for (let i = 0; i < metaRows.length; i += 2) {
    const a = metaRows[i];
    const b = metaRows[i + 1] ?? ["", ""];
    gridRows.push(
      new TableRow({
        children: [coverMetaCell(a[0], a[1], true), coverMetaCell(b[0], b[1])],
      }),
    );
  }
  cover.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: gridRows,
    }),
  );

  // Confidentiality strip
  cover.push(new Paragraph({ spacing: { before: 360 } }));
  cover.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: C.panel, fill: C.panel },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: C.white },
                bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
                right: { style: BorderStyle.NONE, size: 0, color: C.white },
                left: { style: BorderStyle.SINGLE, size: 28, color: C.amber },
              },
              margins: { top: 140, bottom: 140, left: 240, right: 240 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "CONFIDENTIAL",
                      bold: true,
                      color: C.amber,
                      size: 14,
                      characterSpacing: 60,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: meta.confidentiality,
                      italics: true,
                      color: C.sub,
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  );
  cover.push(new Paragraph({ children: [new PageBreak()] }));

  // ---------- Body blocks ----------
  type Child = any;
  const body: Child[] = [];

  let h1Counter = 0;
  const heading = (text: string, level: 1 | 2 | 3): any[] => {
    if (level === 1) {
      h1Counter++;
      return [
        new Paragraph({
          spacing: { before: 480, after: 60 },
          children: [
            new TextRun({
              text: `SECTION ${String(h1Counter).padStart(2, "0")}`,
              bold: true,
              color: C.brand,
              size: 16,
              characterSpacing: 60,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text, bold: true, color: C.ink, size: 36 })],
        }),
        new Paragraph({
          spacing: { after: 240 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.brand, space: 4 } },
          children: [new TextRun({ text: "", size: 2 })],
        }),
      ];
    }
    if (level === 2) {
      return [
        new Paragraph({
          spacing: { before: 320, after: 120 },
          children: [
            new TextRun({ text: "▍ ", color: C.brandSoft, size: 24 }),
            new TextRun({ text, bold: true, color: C.ink, size: 26 }),
          ],
        }),
      ];
    }
    return [
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text, bold: true, color: C.inkSoft, size: 22 })],
      }),
    ];
  };

  const para = (text: string) =>
    new Paragraph({
      spacing: { after: 140, line: 340 },
      children: [new TextRun({ text, color: C.inkSoft, size: 22 })],
    });

  const calloutBlock = (b: Extract<DocxBlock, { type: "callout" }>) => {
    const theme = calloutColor(b.kind);
    // Chip-tag table inside
    const tagRow = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        ...noBorders,
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: C.white },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: C.white },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: theme.bar, fill: theme.bar },
              borders: noBorders,
              margins: { top: 40, bottom: 40, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: theme.tag,
                      bold: true,
                      color: C.white,
                      size: 14,
                      characterSpacing: 60,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: noBorders,
              children: [new Paragraph({})],
            }),
          ],
        }),
      ],
    });
    const inner: any[] = [tagRow, new Paragraph({ spacing: { before: 100 } })];
    if (b.title) {
      inner.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: b.title, bold: true, color: C.ink, size: 24 })],
        }),
      );
    }
    inner.push(
      new Paragraph({
        spacing: { line: 320 },
        children: [new TextRun({ text: b.text, color: C.inkSoft, size: 20 })],
      }),
    );
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.SOLID, color: C.panel, fill: C.panel },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: C.white },
                bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
                right: { style: BorderStyle.NONE, size: 0, color: C.white },
                left: { style: BorderStyle.SINGLE, size: 28, color: theme.bar },
              },
              margins: { top: 180, bottom: 200, left: 260, right: 260 },
              children: inner,
            }),
          ],
        }),
      ],
    });
  };

  const kpiGrid = (items: Array<{ label: string; value: string; sub?: string }>) => {
    const cols = Math.min(items.length, 4);
    const cells = items.slice(0, cols).map(
      (it) =>
        new TableCell({
          width: { size: Math.floor(100 / cols), type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: C.white, fill: C.white },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 28, color: C.brand },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line },
            left: { style: BorderStyle.SINGLE, size: 4, color: C.line },
            right: { style: BorderStyle.SINGLE, size: 4, color: C.line },
          },
          margins: { top: 220, bottom: 180, left: 200, right: 200 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: it.label.toUpperCase(),
                  bold: true,
                  color: C.muted,
                  size: 14,
                  characterSpacing: 60,
                }),
              ],
            }),
            new Paragraph({
              spacing: { before: 100, after: 80 },
              children: [new TextRun({ text: it.value, bold: true, color: C.ink, size: 44 })],
            }),
            new Paragraph({
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.lineSoft, space: 2 } },
              children: [new TextRun({ text: it.sub ?? " ", color: C.sub, size: 16 })],
            }),
          ],
        }),
    );
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: Array(cols).fill(Math.floor(9000 / cols)),
      rows: [new TableRow({ children: cells })],
    });
  };

  const dataTable = (headers: string[], rows: string[][]) => {
    const header = new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            shading: { type: ShadingType.SOLID, color: C.panelDeep, fill: C.panelDeep },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: C.white },
              bottom: { style: BorderStyle.SINGLE, size: 18, color: C.brand },
              left: { style: BorderStyle.NONE, size: 0, color: C.white },
              right: { style: BorderStyle.NONE, size: 0, color: C.white },
            },
            margins: { top: 140, bottom: 140, left: 160, right: 160 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: (h ?? "").toUpperCase(),
                    bold: true,
                    color: C.ink,
                    size: 17,
                    characterSpacing: 40,
                  }),
                ],
              }),
            ],
          }),
      ),
    });
    const bodyRows = rows.map(
      (r, idx) =>
        new TableRow({
          children: r.map(
            (c, ci) =>
              new TableCell({
                shading:
                  idx % 2 === 1
                    ? { type: ShadingType.SOLID, color: C.panel, fill: C.panel }
                    : { type: ShadingType.SOLID, color: C.white, fill: C.white },
                borders: hRuleOnly(C.lineSoft, 2),
                margins: { top: 120, bottom: 120, left: 160, right: 160 },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: c ?? "",
                        bold: ci === 0,
                        color: ci === 0 ? C.ink : C.inkSoft,
                        size: 19,
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
    );
    // Closing rule row (subtle)
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: C.white },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: C.line },
        left: { style: BorderStyle.NONE, size: 0, color: C.white },
        right: { style: BorderStyle.NONE, size: 0, color: C.white },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: C.white },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: C.white },
      },
      rows: [header, ...bodyRows],
    });
  };

  const dividerBlock = () =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 280 },
      children: [new TextRun({ text: "◆", color: C.brand, size: 18 })],
    });

  for (const b of spec.blocks) {
    if (b.type === "h1") body.push(...heading(b.text, 1));
    else if (b.type === "h2") body.push(...heading(b.text, 2));
    else if (b.type === "h3") body.push(...heading(b.text, 3));
    else if (b.type === "p") body.push(para(b.text));
    else if (b.type === "bullets") {
      for (const it of b.items) {
        body.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 100, line: 320 },
            children: [new TextRun({ text: it, color: C.inkSoft, size: 22 })],
          }),
        );
      }
      body.push(new Paragraph({ spacing: { after: 80 } }));
    } else if (b.type === "numbered") {
      b.items.forEach((it, i) => {
        body.push(
          new Paragraph({
            spacing: { after: 100, line: 320 },
            children: [
              new TextRun({
                text: `${String(i + 1).padStart(2, "0")}  `,
                bold: true,
                color: C.brand,
                size: 22,
              }),
              new TextRun({ text: it, color: C.inkSoft, size: 22 }),
            ],
          }),
        );
      });
      body.push(new Paragraph({ spacing: { after: 80 } }));
    } else if (b.type === "table") {
      body.push(dataTable(b.headers, b.rows));
      body.push(new Paragraph({ spacing: { after: 200 } }));
    } else if (b.type === "callout") {
      body.push(calloutBlock(b));
      body.push(new Paragraph({ spacing: { after: 200 } }));
    } else if (b.type === "kpis") {
      body.push(kpiGrid(b.items));
      body.push(new Paragraph({ spacing: { after: 240 } }));
    } else if (b.type === "divider") {
      body.push(dividerBlock());
    } else if (b.type === "pagebreak") {
      body.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // ---------- Header / Footer ----------
  const runningHeader = new Header({
    children: [
      new Paragraph({
        tabStops: [{ type: AlignmentType.RIGHT, position: 9000 }],
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } },
        children: [
          new TextRun({ text: meta.brand, bold: true, color: C.ink, size: 16 }),
          new TextRun({ text: `  ${meta.documentType}`, color: C.muted, size: 16 }),
          new TextRun({ text: `\t${meta.customerName || ""}`, color: C.sub, size: 16 }),
        ],
      }),
    ],
  });
  const runningFooter = new Footer({
    children: [
      new Paragraph({
        tabStops: [
          { type: AlignmentType.CENTER, position: 4500 },
          { type: AlignmentType.RIGHT, position: 9000 },
        ],
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 } },
        children: [
          new TextRun({ text: meta.confidentiality, italics: true, color: C.sub, size: 14 }),
          new TextRun({ text: `\tv${meta.version} · ${meta.date}\t`, color: C.sub, size: 14 }),
          new TextRun({
            children: ["Page ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
            bold: true,
            color: C.ink,
            size: 14,
          }),
        ],
      }),
    ],
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
      config: [
        {
          reference: "opsqai-num",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.3) },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
        children: cover,
      },
      {
        properties: { page: { margin: { top: 1680, bottom: 1680, left: 1440, right: 1440 } } },
        headers: { default: runningHeader },
        footers: { default: runningFooter },
        children: body,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
