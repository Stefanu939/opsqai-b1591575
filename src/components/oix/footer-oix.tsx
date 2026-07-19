import { Link } from "@tanstack/react-router";
import { MottoBand } from "./motto-band";

const columns: Array<{ heading: string; items: Array<{ label: string; to: string }> }> = [
  {
    heading: "Platform",
    items: [
      { label: "Product", to: "/product" },
      { label: "Modules", to: "/modules" },
      { label: "Self-Hosted", to: "/self-hosted" },
      { label: "Security", to: "/security" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", to: "/company" },
      { label: "Blog", to: "/blog" },
      { label: "Contact", to: "/contact" },
      { label: "Support", to: "/support" },
    ],
  },
  {
    heading: "Resources",
    items: [
      { label: "Documentation", to: "/documentation" },
      { label: "Pricing", to: "/pricing" },
      { label: "First Run", to: "/first-run" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy", to: "/legal/privacy" },
      { label: "Terms", to: "/legal/terms" },
      { label: "Imprint", to: "/legal/imprint" },
    ],
  },
];

export function FooterOix() {
  return (
    <footer className="oix-hairline-top mt-32 bg-[var(--oix-bg-deep)]">
      <div className="mx-auto w-full max-w-7xl px-6 md:px-10 py-20">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:gap-16">
          {columns.map((col) => (
            <div key={col.heading}>
              <div className="oix-eyebrow mb-6 text-[10px]">{col.heading}</div>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-[var(--oix-cream-dim)] hover:text-[var(--oix-gold-soft)] transition-colors"
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
            © {new Date().getFullYear()} OPSQAI · Operational Intelligence Experience
          </p>
          <p className="oix-serif-italic text-sm">
            Powered by your knowledge — not ours.
          </p>
        </div>
      </div>

      <MottoBand size="xl" compact />
    </footer>
  );
}
