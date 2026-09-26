/**
 * Citation accuracy: chunk metadata (page, section) must come from the indexed
 * source, and the assistant must never invent step numbers, section names or
 * page references — including when the user asks it to correct itself.
 */
import { describe, expect, it } from "vitest";
import { chunkDocument, chunkText, type ExtractedDocument } from "@/lib/doc-processing.server";
import {
  citedStepsMatchEvidence,
  extractStepClaims,
  pageReference,
  pageUnavailableNote,
  sourceAttributionLine,
  type AttributionSource,
} from "@/lib/chat-grounding";

const SOP: ExtractedDocument = {
  paginated: true,
  text: "",
  pages: [
    {
      page: 3,
      text: [
        "INBOUND SOP",
        "",
        "Step 3 = Verify Shipment Accuracy",
        "",
        "Compare the packing list against the purchase order line by line and record every deviation in the inbound log before unloading continues.",
      ].join("\n"),
    },
    {
      page: 4,
      text: [
        "Step 4 = Assign Loading Dock",
        "",
        "Assign the dock published in the dock plan for the carrier and confirm the assignment to the driver at the gate before the truck moves.",
      ].join("\n"),
    },
  ],
};

describe("chunkDocument page + section metadata", () => {
  const chunks = chunkDocument(SOP, 1000, 200);

  it("keeps the real page number of every chunk", () => {
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) {
      expect(typeof c.pageStart).toBe("number");
      expect([3, 4]).toContain(c.pageStart);
    }
  });

  it("keeps the section heading verbatim, paired with its own page", () => {
    const step3 = chunks.find((c) => c.section?.includes("Step 3"));
    const step4 = chunks.find((c) => c.section?.includes("Step 4"));
    expect(step3?.section).toBe("Step 3 = Verify Shipment Accuracy");
    expect(step3?.pageStart).toBe(3);
    expect(step4?.section).toBe("Step 4 = Assign Loading Dock");
    expect(step4?.pageStart).toBe(4);
  });

  it("reports no page for sources that genuinely have none", () => {
    const docx: ExtractedDocument = {
      paginated: false,
      text: "PROCEDURE\n\nA short documented procedure body with enough text to chunk.",
      pages: [
        {
          page: null,
          text: "PROCEDURE\n\nA short documented procedure body with enough text to chunk.",
        },
      ],
    };
    for (const c of chunkDocument(docx)) expect(c.pageStart).toBeNull();
  });

  it("legacy chunkText still returns plain strings", () => {
    const out = chunkText("HEADER\n\nBody text that is long enough to be kept as a chunk.");
    expect(out.every((c) => typeof c === "string")).toBe(true);
  });
});

describe("page references", () => {
  const base: AttributionSource = { type: "document", title: "Inbound SOP", paginated: true };

  it("names a single page and a page range", () => {
    expect(pageReference({ ...base, page: 3 }, "en")).toBe("Page 3");
    expect(pageReference({ ...base, page: 3, pageEnd: 4 }, "en")).toBe("Pages 3–4");
    expect(pageReference({ ...base, page: 3 }, "ro")).toBe("Pagina 3");
  });

  it("never says 'Not applicable' for a paginated source without page metadata", () => {
    const ref = pageReference({ ...base, page: null }, "en");
    expect(ref).toBe(pageUnavailableNote("en"));
    expect(ref).toBe("Page number is unavailable in the indexed source metadata.");
    expect(ref?.toLowerCase()).not.toContain("not applicable");
  });

  it("omits a page entirely for non-paginated sources", () => {
    expect(pageReference({ ...base, paginated: false, page: null }, "en")).toBeNull();
  });
});

describe("sourceAttributionLine", () => {
  const sources: AttributionSource[] = [
    {
      type: "document",
      title: "Inbound SOP",
      code: "SOP-01",
      similarity: 0.71,
      section: "Step 3 = Verify Shipment Accuracy",
      page: 3,
      paginated: true,
      departmentName: "Logistics",
    },
  ];

  it("cites document, section and page from metadata", () => {
    const line = sourceAttributionLine(sources, "en");
    expect(line).toContain("SOP-01 — Inbound SOP");
    expect(line).toContain("Section: Step 3 = Verify Shipment Accuracy");
    expect(line).toContain("Page 3");
    expect(line).toContain("Department Logistics");
  });

  it("localizes the labels without translating the document title", () => {
    const line = sourceAttributionLine(sources, "de");
    expect(line).toContain("Quelle:");
    expect(line).toContain("Abschnitt:");
    expect(line).toContain("Seite 3");
    expect(line).toContain("Inbound SOP");
  });

  it("states the page is unavailable rather than inventing one", () => {
    const line = sourceAttributionLine([{ ...sources[0], page: null }], "en");
    expect(line).toContain("Page number is unavailable in the indexed source metadata.");
  });
});

describe("cited step validation", () => {
  const evidence = [
    "[Step 3 = Verify Shipment Accuracy]\nCompare the packing list against the purchase order line by line.",
    "[Step 4 = Assign Loading Dock]\nAssign the dock published in the dock plan for the carrier.",
  ];

  it("extracts step claims in several languages", () => {
    expect(extractStepClaims("Step 3 = Verify Shipment Accuracy")).toEqual([
      { step: 3, label: "Verify Shipment Accuracy" },
    ]);
    expect(extractStepClaims("Pasul 4 — Assign Loading Dock")[0].step).toBe(4);
  });

  it("accepts an answer whose steps match the retrieved chunks", () => {
    expect(
      citedStepsMatchEvidence(
        "Step 3 = Verify Shipment Accuracy, then Step 4: Assign Loading Dock.",
        evidence,
      ),
    ).toBe(true);
  });

  it("rejects a swapped step number", () => {
    expect(citedStepsMatchEvidence("Step 4 = Verify Shipment Accuracy", evidence)).toBe(false);
  });

  it("rejects an invented step label", () => {
    expect(citedStepsMatchEvidence("Step 3 = Print Customs Declaration", evidence)).toBe(false);
  });

  it("rejects a step that does not exist in the evidence at all", () => {
    expect(citedStepsMatchEvidence("Step 9 = Seal The Trailer", evidence)).toBe(false);
  });

  it("stays true for answers that make no step claims", () => {
    expect(citedStepsMatchEvidence("The packing list is compared to the purchase order.", evidence)).toBe(
      true,
    );
  });

  it("accepts a translated step label when the answer language differs from the evidence", () => {
    // Romanian answer over an English SOP: the label is translated, so only
    // the step number can be verified verbatim.
    expect(
      citedStepsMatchEvidence(
        "Pasul 3 = Verificarea acurateței expedierii, apoi Pasul 4 = Alocarea docului de încărcare.",
        evidence,
        "ro",
      ),
    ).toBe(true);
  });

  it("still rejects an invented step number in a translated answer", () => {
    expect(citedStepsMatchEvidence("Pasul 9 = Sigilarea remorcii.", evidence, "ro")).toBe(false);
  });

  it("accepts a same-language paraphrase of a step label", () => {
    expect(
      citedStepsMatchEvidence("Step 3: Verify the shipment for accuracy.", evidence, "en"),
    ).toBe(true);
  });

  it("holds when the user asks for a correction and the model re-cites", () => {
    // Simulated correction turn: the model's "corrected" answer must still be
    // checked against the SAME retrieved evidence.
    const wrongCorrection = "Sorry — Step 3 = Assign Loading Dock, on page 7.";
    const rightCorrection = "Correction: Step 4 = Assign Loading Dock.";
    expect(citedStepsMatchEvidence(wrongCorrection, evidence)).toBe(false);
    expect(citedStepsMatchEvidence(rightCorrection, evidence)).toBe(true);
  });
});
