import { Link } from "@tanstack/react-router";
import { MottoBand } from "./motto-band";
import { useMarketing } from "@/i18n/marketing";
import { LogoMark } from "@/components/brand/logo";
import { useInvestNavLabel } from "@/i18n/pages/invest";
import { useT } from "@/i18n";
import { footerExtra } from "./footer-links";
import { COMPETITOR_NAMES, COMPETITOR_SLUGS } from "@/i18n/pages/competitors";

export function FooterOix() {
  const m = useMarketing();
  const { lang } = useT();
  const x = footerExtra[lang === "de" ? "de" : lang === "ro" ? "ro" : "en"];
  void useInvestNavLabel;

  const columns: Array<{ heading: string; items: Array<{ label: string; to: string }> }> = [
    {
      heading: m.footer.resources,
      items: [
        { label: m.nav.blog, to: "/blog" },
        { label: x.partner, to: "/partners" },
        { label: x.ambassador, to: "/partners#ambassador" },
        { label: x.licenses, to: "/pricing" },
        { label: x.docs, to: "/documentation" },
      ],
    },
    {
      heading: m.footer.company,
      items: [
        { label: m.footer.about, to: "/company" },
        { label: x.press, to: "/press" },
        { label: x.careers, to: "/press#careers" },
        { label: m.nav.contact, to: "/contact" },
        { label: m.footer.support, to: "/support" },
      ],
    },
    {
      heading: m.footer.legal,
      items: [
        { label: m.footer.terms, to: "/legal/terms" },
        { label: m.footer.privacy, to: "/legal/privacy" },
        { label: m.footer.imprint, to: "/legal/impressum" },
        { label: x.dpa, to: "/legal/dpa" },
      ],
    },
    {
      heading: x.comparison,
      items: COMPETITOR_SLUGS.map((s) => ({ label: `vs ${COMPETITOR_NAMES[s]}`, to: `/compare/${s}` })),
    },
  ];

  return (
    <footer className="oix-hairline-top mt-24 bg-[var(--oix-footer)] text-[var(--oix-footer-ink)]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-10 md:py-20">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 md:gap-16">
          {columns.map((col) => (
            <div key={col.heading}>
              <div className="mb-5 text-base font-semibold text-[var(--oix-footer-ink)]">{col.heading}</div>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-[var(--oix-cream-dim)]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 flex flex-col-reverse items-start justify-between gap-6 border-t border-[var(--oix-gold-line)] pt-8 md:flex-row md:items-center">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--oix-cream-dim)]">
            <LogoMark size={18} accent="var(--oix-gold-soft)" className="mr-2 align-[-3px] text-[var(--oix-gold)]" />© {new Date().getFullYear()} OPSQAI · {m.footer.rights}
          </p>
          <p className="oix-serif-italic text-sm">{m.footer.motto}</p>
        </div>
      </div>

      <MottoBand size="xl" compact />
    </footer>
  );
}
