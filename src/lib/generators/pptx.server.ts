// Server-only: generate a .pptx from a JSON spec.
export interface PptxSlideSpec {
  title?: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
}
export interface PptxSpec {
  title: string;
  subtitle?: string;
  author?: string;
  slides: PptxSlideSpec[];
  theme?: "light" | "dark" | "corporate";
}

export async function generatePptx(spec: PptxSpec): Promise<Uint8Array> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.author = spec.author ?? "OPSQAI";
  pres.title = spec.title;

  const isDark = spec.theme === "dark";
  const bg = isDark ? "0F172A" : "FFFFFF";
  const fg = isDark ? "F8FAFC" : "0F172A";
  const accent = "6366F1";

  // Title slide
  const title = pres.addSlide();
  title.background = { color: bg };
  title.addText(spec.title, {
    x: 0.6,
    y: 2.2,
    w: 12,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: fg,
    fontFace: "Calibri",
  });
  if (spec.subtitle) {
    title.addText(spec.subtitle, {
      x: 0.6,
      y: 3.8,
      w: 12,
      h: 0.8,
      fontSize: 20,
      color: accent,
      fontFace: "Calibri",
    });
  }
  title.addText("OPSQAI", { x: 0.6, y: 6.6, w: 12, h: 0.4, fontSize: 10, color: accent });

  for (const slide of spec.slides) {
    const s = pres.addSlide();
    s.background = { color: bg };
    if (slide.title) {
      s.addText(slide.title, {
        x: 0.6,
        y: 0.4,
        w: 12,
        h: 0.8,
        fontSize: 28,
        bold: true,
        color: fg,
        fontFace: "Calibri",
      });
    }
    if (slide.subtitle) {
      s.addText(slide.subtitle, {
        x: 0.6,
        y: 1.2,
        w: 12,
        h: 0.5,
        fontSize: 16,
        color: accent,
        italic: true,
      });
    }
    if (slide.bullets && slide.bullets.length) {
      s.addText(
        slide.bullets.map((b) => ({ text: b, options: { bullet: true } })),
        { x: 0.7, y: 1.8, w: 12, h: 5.2, fontSize: 16, color: fg, paraSpaceAfter: 8 },
      );
    }
    if (slide.notes) s.addNotes(slide.notes);
  }

  const buf = (await pres.write({ outputType: "uint8array" })) as Uint8Array;
  return buf;
}
