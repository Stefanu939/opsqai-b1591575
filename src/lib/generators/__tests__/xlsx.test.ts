import { describe, it, expect } from "vitest";
import { generateXlsx } from "../xlsx.server";
import * as XLSX from "xlsx";

describe("generateXlsx", () => {
  it("produces a valid .xlsx with a KPIs sheet", async () => {
    const bytes = await generateXlsx({
      title: "KPI Workbook",
      sheets: [
        {
          name: "KPIs",
          headers: ["KPI", "Value", "Target"],
          rows: [
            ["On-time delivery", 96.4, 98],
            ["Picking accuracy", 99.1, 99.5],
            ["Inventory turns", 8.2, 10],
          ],
        },
      ],
    });

    // XLSX files are ZIP archives — magic bytes "PK\x03\x04"
    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);

    // Round-trip: parse it back and confirm structure.
    const wb = XLSX.read(bytes, { type: "array" });
    expect(wb.SheetNames).toContain("KPIs");
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets.KPIs, { header: 1 });
    expect(aoa[0]).toEqual(["KPI", "Value", "Target"]);
    expect(aoa).toHaveLength(4);
    expect(aoa[1]).toEqual(["On-time delivery", 96.4, 98]);
  });
});
