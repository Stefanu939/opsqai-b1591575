// Server-only: generate a .docx Word document from a JSON spec.
export type DocxBlock =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

export interface DocxSpec {
  title: string;
  subtitle?: string;
  author?: string;
  blocks: DocxBlock[];
}

export async function generateDocx(spec: DocxSpec): Promise<Uint8Array> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType,
  } = await import("docx");

  const children: InstanceType<typeof Paragraph>[] | unknown[] = [];

  children.push(new Paragraph({ text: spec.title, heading: HeadingLevel.TITLE }));
  if (spec.subtitle) {
    children.push(new Paragraph({ children: [new TextRun({ text: spec.subtitle, italics: true, color: "6366F1" })] }));
  }
  children.push(new Paragraph({ text: "" }));

  for (const b of spec.blocks) {
    if (b.type === "h1") children.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_1 }));
    else if (b.type === "h2") children.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2 }));
    else if (b.type === "h3") children.push(new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_3 }));
    else if (b.type === "p") children.push(new Paragraph({ text: b.text }));
    else if (b.type === "bullets") {
      for (const item of b.items) children.push(new Paragraph({ text: item, bullet: { level: 0 } }));
    } else if (b.type === "numbered") {
      for (let i = 0; i < b.items.length; i++) {
        children.push(new Paragraph({ text: `${i + 1}. ${b.items[i]}` }));
      }
    } else if (b.type === "table") {
      const rows: InstanceType<typeof TableRow>[] = [];
      rows.push(new TableRow({
        children: b.headers.map((h) =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] }),
        ),
      }));
      for (const r of b.rows) {
        rows.push(new TableRow({
          children: r.map((c) => new TableCell({ children: [new Paragraph(c ?? "")] })),
        }));
      }
      children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(new Paragraph({ text: "" }));
    }
  }

  const doc = new Document({
    creator: spec.author ?? "OPSQAI",
    title: spec.title,
    sections: [{ properties: {}, children: children as InstanceType<typeof Paragraph>[] }],
  });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
