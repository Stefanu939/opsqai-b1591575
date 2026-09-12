import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { documentLibrary, fillTemplate } from "../library";
import { renderDocumentPdf } from "../document-pdf.server";

const values = new Proxy<Record<string, string>>({}, { get: (_target, key) => String(key) });

describe("country legal HR documents", () => {
  for (const country of ["de", "ro"] as const) {
    it(`${country} contracts require legal review and render 8–10 pages`, async () => {
      const contracts = documentLibrary(country).filter((doc) =>
        doc.key === "employment_contract" || doc.key === "fixed_term_contract",
      );
      expect(contracts).toHaveLength(2);
      for (const contract of contracts) {
        expect(contract.legalReviewRequired).toBe(true);
        expect(contract.legalSources?.length).toBeGreaterThanOrEqual(3);
        expect(contract.expectedPages).toBe("8–10");
        const bytes = await renderDocumentPdf({
          title: contract.label[country],
          body: fillTemplate(contract.body, values),
          meta: ["EMP-0001 · Test Employee"],
          footer: "OPSQAI HR · legal review required",
          watermark: "DRAFT",
        });
        const pdf = await PDFDocument.load(bytes);
        expect(pdf.getPageCount()).toBeGreaterThanOrEqual(8);
        expect(pdf.getPageCount()).toBeLessThanOrEqual(10);
      }
    });
  }

  it("generic templates remain explicitly non-validated", () => {
    expect(documentLibrary("generic").every((doc) => !doc.legalReviewRequired)).toBe(true);
  });
});