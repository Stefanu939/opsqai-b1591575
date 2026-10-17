import { describe, expect, it } from "vitest";
import { parseKaiRich } from "../kai-rich-format";

describe("Kai rich reply parsing", () => {
  it("preserves valid ROI values", () => {
    expect(parseKaiRich('```roi\n{"rows":[["Angajați","40"]],"result":"3.300 €/lună"}\n```')).toEqual([
      { kind: "roi", data: { rows: [["Angajați", "40"]], result: "3.300 €/lună" } },
    ]);
  });
  it.each(["null", "[]", '{"rows":[null]}', '{"rows":{}}', '{"title":{}}', '{"result":3}'])("rejects unsafe ROI data: %s", (json) => {
    expect(parseKaiRich(`Înainte\n\`\`\`roi\n${json}\n\`\`\`\nDupă`)).toEqual([
      { kind: "md", text: "Înainte\n" }, { kind: "md", text: "\nDupă" },
    ]);
  });
  it.each(['{"items":[null]}', '{"items":{}}', '{"items":[{"name":{}}]}', '{"items":[{"name":"HR","desc":[]}]}'])("rejects unsafe modules: %s", (json) => {
    expect(parseKaiRich(`\`\`\`modules\n${json}\n\`\`\``)).toEqual([]);
  });
  it("preserves valid module ideas", () => {
    expect(parseKaiRich('```modules\n{"items":[{"name":"Custom","desc":"Concept"}]}\n```')).toEqual([
      { kind: "modules", data: { items: [{ name: "Custom", desc: "Concept" }] } },
    ]);
  });
  it("keeps readable text when a block is incomplete", () => {
    expect(parseKaiRich('Bună\n```roi\n{"rows":')).toEqual([{ kind: "md", text: "Bună\n" }]);
  });
});