export type RevenuePeriod = { from?: string; to?: string };
export type RevenueOffer = {
  id: string; lead_id: string; company: string; title: string; currency: string;
  setup: number; monthly: number; firstYear: number; date: string; estimatedDate: boolean;
};

export function validateRevenuePeriod(period: RevenuePeriod): RevenuePeriod {
  for (const value of [period.from, period.to]) {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value)) {
      throw new Error("Data selectată nu este validă.");
    }
  }
  if (period.from && period.to && period.from > period.to) throw new Error("Data de început trebuie să fie înaintea datei de sfârșit.");
  return period;
}

export function inRevenuePeriod(date: string | null, period: RevenuePeriod) {
  if (!date) return false;
  const day = date.slice(0, 10);
  return (!period.from || day >= period.from) && (!period.to || day <= period.to);
}

export function totalRevenueOffers(offers: RevenueOffer[]) {
  const groups = new Map<string, { currency: string; setup: number; monthly: number; firstYear: number; count: number }>();
  for (const offer of offers) {
    const group = groups.get(offer.currency) ?? { currency: offer.currency, setup: 0, monthly: 0, firstYear: 0, count: 0 };
    group.setup += offer.setup;
    group.monthly += offer.monthly;
    group.firstYear += offer.firstYear;
    group.count++;
    groups.set(offer.currency, group);
  }
  return [...groups.values()];
}

export function approvalDate(status: string, previous: { status: string; accepted_at: string | null } | null, now: string) {
  return status === "accepted" ? (previous?.status === "accepted" ? previous.accepted_at ?? now : now) : null;
}