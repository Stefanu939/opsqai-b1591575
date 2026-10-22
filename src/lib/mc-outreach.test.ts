import { describe, expect, it } from "vitest";
import { toneScripts, whatsappTemplate } from "./mc-outreach";

const v = { name: "Ion", company: "ARC GRUP", sender: "Ștefan Bari", role: "Fondator", email: "stefan@opsqai.de" };

describe("first-contact WhatsApp", () => {
  it("introduces the sender on behalf of the OPSQAI team and offers the 30-day pilot", () => {
    const t = whatsappTemplate("production", v);
    expect(t).toContain("Mă numesc Ștefan Bari, Fondator și vă contactez din partea echipei OPSQAI");
    expect(t).toContain("pilot gratuit de 30 de zile, dacă sunteți interesați");
    expect(t).not.toMatch(/pregătit/i);
  });
  it("lists email, Instagram and KAI below the message", () => {
    const t = whatsappTemplate("transport", v);
    expect(t).toContain("stefan@opsqai.de");
    expect(t).toContain("instagram.com/opsqai");
    expect(t).toContain("opsqai.de/kai");
  });
  it("custom domain description reaches the message", () => {
    const t = toneScripts("generic", "custom", v, "clinici veterinare").whatsapp;
    expect(t).toContain("clinici veterinare");
  });
  it("follow-up may include the KAI link but never Instagram", () => {
    const t = whatsappTemplate("followup", v);
    expect(t).toContain("opsqai.de/kai");
    expect(t).not.toContain("instagram");
  });
});

describe("outreach emails", () => {
  it("cold email offers the 30-day pilot and signs with name, role and KAI link", async () => {
    const { coldEmail } = await import("./mc-outreach");
    const m = coldEmail(v);
    expect(m.subject).toBe("Propunere pilot gratuit OPSQAI – ARC GRUP");
    expect(m.body).toContain("proiect pilot gratuit de 30 de zile");
    expect(m.body).toContain("Cu stimă,\nȘtefan Bari\nFondator | OPSQAI\n\nhttps://opsqai.de/kai");
  });
  it("follow-up email uses the same signature", async () => {
    const { followUpEmail } = await import("./mc-outreach");
    const m = followUpEmail(v, "offer");
    expect(m.subject).toBe("Revenire OPSQAI – ARC GRUP");
    expect(m.body).toContain("Fondator | OPSQAI");
  });
});
