// Public ANAF register lookup (TVA register + latest balance sheet). Server-only.

export async function anafLookup(raw: string) {
  const data = { cui: raw };
  if (!cui) return { ok: false as const, error: "CUI invalid" };
  try {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui, data: today }]),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { ok: false as const, error: "Serviciul ANAF nu răspunde acum. Completează manual." };
    const json = (await res.json()) as {
      found?: Array<Record<string, Record<string, unknown> | undefined>>;
    };
    const f = json.found?.[0];
    const g = f?.date_generale;
    if (!f || !g) return { ok: false as const, error: "CUI negăsit în registrul ANAF." };
    const sed = f.adresa_sediu_social ?? {};
    const inactiv = f.stare_inactiv ?? {};

    // Latest published balance sheet (try the last 3 years). Best-effort.
    let fin: {
      year: number; turnover: number | null; net_profit: number | null; net_loss: number | null;
      employees: number | null; caen_name: string;
    } | null = null;
    const y0 = new Date().getFullYear() - 1;
    for (const year of [y0, y0 - 1, y0 - 2]) {
      try {
        const b = await fetch(`https://webservicesp.anaf.ro/bilant?an=${year}&cui=${cui}`, {
          signal: AbortSignal.timeout(8_000),
        });
        if (!b.ok) continue;
        const bj = (await b.json()) as {
          den_caen?: string;
          i?: Array<{ indicator: string; val_indicator: number }>;
        };
        if (!bj.i?.length) continue;
        const val = (k: string) => bj.i!.find((x) => x.indicator === k)?.val_indicator ?? null;
        fin = {
          year, turnover: val("I13"), net_profit: val("I18"), net_loss: val("I19"),
          employees: val("I20"), caen_name: String(bj.den_caen ?? ""),
        };
        break;
      } catch { /* try previous year */ }
    }

    const regStatus = String(g["stare_inregistrare"] ?? "");
    return {
      ok: true as const,
      cui,
      name: String(g["denumire"] ?? ""),
      address: String(g["adresa"] ?? ""),
      reg_com: String(g["nrRegCom"] ?? ""),
      phone: String(g["telefon"] ?? ""),
      caen: String(g["cod_CAEN"] ?? ""),
      caen_name: fin?.caen_name ?? "",
      legal_form: String(g["forma_juridica"] ?? ""),
      registered_at: String(g["data_inregistrare"] ?? ""),
      county: String(sed["sdenumire_Judet"] ?? ""),
      city: String(sed["sdenumire_Localitate"] ?? ""),
      vat_payer: Boolean((f.inregistrare_scop_Tva ?? {})["scpTVA"]),
      e_invoice: Boolean(g["statusRO_e_Factura"]),
      inactive: Boolean(inactiv["statusInactivi"]),
      deregistered: Boolean(inactiv["dataRadiere"]) || /radiat/i.test(regStatus),
      reg_status: regStatus,
      financials: fin,
    };
  } catch {
    return { ok: false as const, error: "Serviciul ANAF nu răspunde acum. Completează manual." };
  }
}

export type AnafResult = Awaited<ReturnType<typeof anafLookup>>;
