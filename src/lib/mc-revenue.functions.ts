import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/providers/require-auth";
import { requirePlatformAdmin } from "@/lib/authorization";
import { getCloudSupabaseAdmin } from "@/lib/providers/not-available";
import { inRevenuePeriod, totalRevenueOffers, validateRevenuePeriod, type RevenueOffer, type RevenuePeriod } from "./mc-revenue";

const validate = (input: unknown) => validateRevenuePeriod(z.object({ from: z.string().optional(), to: z.string().optional() }).parse(input ?? {}));

async function loadReport(period: RevenuePeriod) {
  const admin = await getCloudSupabaseAdmin("crm");
  const [offerResult, paymentResult] = await Promise.all([
    admin.from("crm_offers").select("id, lead_id, title, currency, amount, setup_amount, monthly_amount, accepted_at, created_at, crm_leads(company_name)").eq("status", "accepted").order("accepted_at", { ascending: false, nullsFirst: false }),
    admin.from("license_orders").select("unit_price_cents, paid_at").eq("status", "paid"),
  ]);
  if (offerResult.error || paymentResult.error) throw new Error("Raportul financiar nu a putut fi încărcat. Încearcă din nou.");
  const offers: RevenueOffer[] = (offerResult.data ?? []).filter(o => inRevenuePeriod(o.accepted_at ?? o.created_at, period)).map(o => {
    const split = o.setup_amount != null || o.monthly_amount != null;
    const setup = Number(split ? o.setup_amount ?? 0 : o.amount ?? 0);
    const monthly = Number(split ? o.monthly_amount ?? 0 : 0);
    return { id: o.id, lead_id: o.lead_id, title: o.title, company: o.crm_leads?.company_name ?? "—", currency: o.currency, setup, monthly, firstYear: setup + monthly * 12, date: o.accepted_at ?? o.created_at, estimatedDate: !o.accepted_at };
  });
  const payments = (paymentResult.data ?? []).filter(o => inRevenuePeriod(o.paid_at, period));
  return { period, offers, totals: totalRevenueOffers(offers), receipts: payments.reduce((sum, o) => sum + Number(o.unit_price_cents ?? 0), 0) / 100, paymentCount: payments.length };
}

export const getMcRevenueReport = createServerFn({ method: "POST" }).middleware([requireAuth]).inputValidator(validate).handler(async ({ context, data }) => {
  await requirePlatformAdmin(context);
  return loadReport(data);
});

export const exportMcRevenuePdf = createServerFn({ method: "POST" }).middleware([requireAuth]).inputValidator(validate).handler(async ({ context, data }) => {
  await requirePlatformAdmin(context);
  const report = await loadReport(data);
  const { generatePdf } = await import("@/lib/generators/pdf.server");
  const money = (n: number, currency: string) => `${n.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} ${currency}`;
  const label = data.from || data.to ? `${data.from ?? "Inceput"} - ${data.to ?? "Prezent"}` : "Toata perioada";
  const bytes = await generatePdf({
    title: "Raport financiar", subtitle: label, meta: { brand: "OPSQAI", documentType: "Management Center - Raport financiar" },
    blocks: [
      { type: "p", text: "Ofertele aprobate reprezinta valoare comerciala, nu incasari. Recurentul lunar este valoarea contractata pe luna; primul an include implementarea plus 12 luni, nu venit realizat in perioada." },
      { type: "kpis", items: [{ label: "Incasari inregistrate", value: money(report.receipts, "EUR"), sub: `${report.paymentCount} plati` }, { label: "Oferte aprobate", value: String(report.offers.length) }] },
      { type: "table", headers: ["Moneda", "Implementare", "Recurent / luna", "Valoare primul an"], rows: report.totals.map(t => [t.currency, money(t.setup, t.currency), money(t.monthly, t.currency), money(t.firstYear, t.currency)]) },
      { type: "h2", text: "Defalcare pe client si oferta" },
      { type: "table", headers: ["Client / Oferta", "Aprobata", "Implementare", "Lunar", "Primul an"], rows: report.offers.map(o => [`${o.company} / ${o.title}`, `${o.date.slice(0, 10)}${o.estimatedDate ? "*" : ""}`, money(o.setup, o.currency), money(o.monthly, o.currency), money(o.firstYear, o.currency)]) },
      ...(report.offers.some(o => o.estimatedDate) ? [{ type: "p" as const, text: "* Oferta veche fara data aprobarii: este folosita data crearii. Sumele fara defalcare salvata sunt tratate ca implementare, fara recurent inventat." }] : []),
    ],
  });
  return { filename: `opsqai-financiar-${data.from ?? "inceput"}-${data.to ?? "prezent"}.pdf`, base64: Buffer.from(bytes).toString("base64") };
});