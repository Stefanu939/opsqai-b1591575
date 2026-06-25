// Server-only: generate an .xlsx workbook from a JSON spec.
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
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "OPSQAI";
  wb.created = new Date();

  for (const sheet of spec.sheets) {
    const ws = wb.addWorksheet(sheet.name.slice(0, 31) || "Sheet");
    if (sheet.headers.length) {
      const headerRow = ws.addRow(sheet.headers);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FF6366F1" },
      };
      headerRow.alignment = { vertical: "middle" };
    }
    for (const row of sheet.rows) ws.addRow(row);
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (c) => {
        const v = String(c.value ?? "");
        if (v.length > max) max = Math.min(60, v.length + 2);
      });
      col.width = max;
    });
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buf = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return new Uint8Array(buf);
}
