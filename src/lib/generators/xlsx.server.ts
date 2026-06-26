// Server-only: generate an .xlsx workbook from a JSON spec.
// Uses SheetJS (`xlsx`), a pure-JS library that works on the Cloudflare
// Workers runtime. The previously-used `exceljs` package depends on Node's
// `stream` / `util.inherits` and crashes on workerd with
// "superCtor.prototype must be of type object".

export interface XlsxSheetSpec {
  name: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null>>;
}
export interface XlsxSpec {
  title?: string;
  sheets: XlsxSheetSpec[];
}

export async function generateXlsx(spec: XlsxSpec): Promise<Uint8Array> {
  console.log("[xlsx:builder_init]", {
    sheets: spec.sheets.length,
    total_rows: spec.sheets.reduce((n, s) => n + s.rows.length, 0),
  });

  // Lazy import keeps the dependency out of the client bundle.
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();
  wb.Props = { Title: spec.title ?? "Workbook", Author: "OPSQAI", CreatedDate: new Date() };

  for (const sheet of spec.sheets) {
    const name = (sheet.name || "Sheet").slice(0, 31);
    console.log("[xlsx:worksheet_create]", { name, headers: sheet.headers.length, rows: sheet.rows.length });

    const aoa: Array<Array<string | number | boolean | null>> = [];
    if (sheet.headers.length) aoa.push(sheet.headers);
    for (const row of sheet.rows) aoa.push(row);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths: header length / longest cell, capped at 60.
    const colCount = Math.max(
      sheet.headers.length,
      ...sheet.rows.map((r) => r.length),
      1,
    );
    const widths: Array<{ wch: number }> = [];
    for (let c = 0; c < colCount; c++) {
      let max = sheet.headers[c]?.length ?? 10;
      for (const r of sheet.rows) {
        const v = r[c];
        if (v != null) {
          const s = String(v);
          if (s.length > max) max = s.length;
        }
      }
      widths.push({ wch: Math.min(60, Math.max(10, max + 2)) });
    }
    ws["!cols"] = widths;

    // Freeze the top row when headers exist.
    if (sheet.headers.length) {
      (ws as unknown as { "!freeze"?: unknown })["!freeze"] = { xSplit: 0, ySplit: 1 };
    }

    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx", compression: true }) as ArrayBuffer;
  const bytes = new Uint8Array(out);
  console.log("[xlsx:serialized]", { bytes: bytes.byteLength });
  return bytes;
}
