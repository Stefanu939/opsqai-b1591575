import { describe, expect, it } from "vitest";
import { whatsappTemplate } from "./mc-outreach";

const v = { name: "Ion", company: "ARC GRUP", sender: "Ștefan Bari", role: "Fondator" };

describe("first-contact WhatsApp", () => {
  it("has no links and does not presume a prepared presentation", () => {
    const t = whatsappTemplate("production", v);
    expect(t).not.toMatch(/https?:\/\//);
    expect(t).not.toMatch(/pregătit/i);
  });
  it("follow-up may include the KAI link but never Instagram", () => {
    const t = whatsappTemplate("followup", v);
    expect(t).toContain("opsqai.de/kai");
    expect(t).not.toContain("instagram");
  });
});
