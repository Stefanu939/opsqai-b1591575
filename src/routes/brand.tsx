import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/brand")({
  component: BrandBoard,
  head: () => ({
    meta: [
      { title: "OPSQAI — Sovereign Mark · Brand System" },
      { name: "description", content: "OPSQAI identity system: Sovereign Mark, palette, typography, and lockups." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const PALETTE: Array<{ name: string; hex: string; role: string; ink?: string }> = [
  { name: "Onyx", hex: "#0A0A0A", role: "Primary ground", ink: "#F0D78C" },
  { name: "Ink", hex: "#141414", role: "Elevated surface", ink: "#F0D78C" },
  { name: "Gold", hex: "#C9A24C", role: "Accent · nucleus", ink: "#0A0A0A" },
  { name: "Champagne", hex: "#F0D78C", role: "Accent · highlight", ink: "#0A0A0A" },
  { name: "Bone", hex: "#eef0fa", role: "Light ground", ink: "#0A0A0A" },
];

const ASSETS: Array<{ label: string; file: string; ground: "onyx" | "bone" | "gold" }> = [
  { label: "Sovereign Mark — primary", file: "/brand/sovereign-mark.svg", ground: "onyx" },
  { label: "Mark — gold monochrome", file: "/brand/sovereign-mark-mono-gold.svg", ground: "onyx" },
  { label: "Mark — onyx monochrome", file: "/brand/sovereign-mark-mono-bone.svg", ground: "bone" },
  { label: "Mark — inverse", file: "/brand/sovereign-mark-inverse.svg", ground: "gold" },
  { label: "Monogram (favicon / avatar)", file: "/brand/monogram.svg", ground: "onyx" },
  { label: "Favicon 64×64", file: "/brand/favicon-sovereign.svg", ground: "onyx" },
  { label: "Wordmark", file: "/brand/wordmark.svg", ground: "bone" },
  { label: "Horizontal lockup", file: "/brand/lockup-horizontal.svg", ground: "onyx" },
  { label: "Stacked lockup", file: "/brand/lockup-stacked.svg", ground: "onyx" },
];

function BrandBoard() {
  return (
    <div
      className="min-h-dvh"
      style={{
        background: "#0A0A0A",
        color: "#eef0fa",
        fontFamily: "'Karla', system-ui, sans-serif",
      }}
    >
      {/* Hero */}
      <header className="border-b border-[#C9A24C]/20">
        <div className="mx-auto max-w-6xl px-8 py-20">
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.4em] text-[#C9A24C]/70">
            <span className="h-px w-8 bg-[#C9A24C]/50" />
            Identity System · v1
          </div>
          <h1
            className="mt-6 text-[clamp(3rem,7vw,6.5rem)] leading-[0.95] tracking-[0.02em]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}
          >
            The <em className="font-normal italic text-[#F0D78C]">Sovereign</em> Mark.
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#eef0fa]/70">
            A heraldic seal for a private intelligence. Engraved octagonal cartouche, a coronet of eight
            nodes for the knowledge network, and a gold monogram at the optical center. Built at grid
            64×64 and drawn to survive at 16 pixels.
          </p>
        </div>
      </header>

      {/* Primary mark */}
      <section className="mx-auto max-w-6xl px-8 py-24">
        <SectionTitle eyebrow="I · The Mark" title="Primary" />
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div
            className="flex aspect-square items-center justify-center border border-[#C9A24C]/15"
            style={{ background: "#0A0A0A" }}
          >
            <img src="/brand/sovereign-mark.svg" alt="Sovereign Mark" className="h-[62%] w-[62%]" />
          </div>
          <div className="flex flex-col justify-center gap-6 text-sm leading-relaxed text-[#eef0fa]/75">
            <p>
              An octagonal cartouche — the classical form of a coin die — closes around the monogram
              <em className="italic text-[#F0D78C]"> OQ</em>. Eight coronet nodes ride the inner ring:
              the operational network, the routing graph, the modules that connect.
            </p>
            <p>
              Gold covers less than 12% of the surface. The rest holds silence. The result feels
              minted, not marketed.
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4 text-xs uppercase tracking-[0.2em] text-[#C9A24C]/70">
              <dt>Grid</dt><dd className="text-[#eef0fa]">64 × 64</dd>
              <dt>Cartouche</dt><dd className="text-[#eef0fa]">Regular octagon, r 28</dd>
              <dt>Gravure</dt><dd className="text-[#eef0fa]">Double line, 0.6 / 0.25</dd>
              <dt>Monogram</dt><dd className="text-[#eef0fa]">Cormorant Garamond 500</dd>
            </dl>
          </div>
        </div>
      </section>

      {/* Construction grid */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <SectionTitle eyebrow="II · Construction" title="Geometry" />
        <div className="mt-12 grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div className="border border-[#C9A24C]/15 p-8" style={{ background: "#0A0A0A" }}>
            <ConstructionSVG />
          </div>
          <ul className="space-y-4 text-sm leading-relaxed text-[#eef0fa]/75">
            <li><span className="text-[#F0D78C]">·</span> The cartouche is a regular octagon inscribed in a circle of radius 28 on a 64-unit grid.</li>
            <li><span className="text-[#F0D78C]">·</span> A secondary gravure line sits 3 units inside — the depth of a printed seal.</li>
            <li><span className="text-[#F0D78C]">·</span> Eight nodes ride a circle of radius 22, aligned to the octagon's vertices.</li>
            <li><span className="text-[#F0D78C]">·</span> The monogram sits on the optical axis (y = 40.5), one unit below the geometric center.</li>
            <li><span className="text-[#F0D78C]">·</span> Clear space equals the height of the monogram. Never crop below 24px.</li>
          </ul>
        </div>
      </section>

      {/* Palette */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <SectionTitle eyebrow="III · Palette" title="Onyx & Gold" />
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PALETTE.map((c) => (
            <div key={c.hex} className="border border-[#C9A24C]/15">
              <div
                className="flex aspect-[4/5] items-end p-5"
                style={{ background: c.hex, color: c.ink ?? "#eef0fa" }}
              >
                <div>
                  <div
                    className="text-2xl leading-none"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}
                  >
                    {c.name}
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.25em] opacity-80">{c.role}</div>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-[#eef0fa]/70">
                <span>{c.hex}</span>
                <span className="text-[#C9A24C]/60">HEX</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <SectionTitle eyebrow="IV · Typography" title="Cormorant · Karla" />
        <div className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="border border-[#C9A24C]/15 p-10" style={{ background: "#141414" }}>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#C9A24C]/70">Display</div>
            <div
              className="mt-6 text-6xl leading-[0.95] text-[#F0D78C]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500, letterSpacing: "0.02em" }}
            >
              Operational
              <br />
              <em className="italic">Knowledge.</em>
            </div>
            <div className="mt-6 text-xs uppercase tracking-[0.25em] text-[#eef0fa]/60">
              Cormorant Garamond · 500 · tracking +20
            </div>
          </div>
          <div className="border border-[#C9A24C]/15 p-10" style={{ background: "#141414" }}>
            <div className="text-[10px] uppercase tracking-[0.35em] text-[#C9A24C]/70">Body</div>
            <p
              className="mt-6 text-base leading-relaxed text-[#eef0fa]/85"
              style={{ fontFamily: "'Karla', system-ui, sans-serif", fontWeight: 400 }}
            >
              OPSQAI is a self-hosted operational intelligence platform. Your procedures, your data,
              your model — held inside your boundary, answering in the language your teams speak.
            </p>
            <div className="mt-8 text-xs uppercase tracking-[0.25em] text-[#eef0fa]/60">
              Karla · 400 / 500 / 600
            </div>
          </div>
        </div>
      </section>

      {/* Variants */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <SectionTitle eyebrow="V · Variants" title="The System" />
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ASSETS.map((a) => (
            <a
              key={a.file}
              href={a.file}
              download
              className="border border-[#C9A24C]/15"
            >
              <div
                className="flex aspect-[5/4] items-center justify-center p-6"
                style={{
                  background:
                    a.ground === "onyx" ? "#0A0A0A" : a.ground === "bone" ? "#eef0fa" : "#C9A24C",
                }}
              >
                <img src={a.file} alt={a.label} className="max-h-full max-w-full" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 text-[11px] uppercase tracking-[0.22em]">
                <span className="text-[#eef0fa]/80">{a.label}</span>
                <span className="text-[#C9A24C]/60">SVG ↓</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Do / Don't */}
      <section className="mx-auto max-w-6xl px-8 pb-24">
        <SectionTitle eyebrow="VI · Rules" title="Do & Don't" />
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Rule kind="do" title="Give it silence" body="At least one monogram-height of clear space on every side. The mark is a seal — it doesn't share edges." />
          <Rule kind="dont" title="Don't recolor" body="Only Onyx, Gold, Bone. Never brand-blue, never gradient rainbows, never company-favourite purple." />
          <Rule kind="do" title="Keep gold rare" body="Gold is nucleus, not background. A gold field is only used for the inverse ceremonial variant." />
          <Rule kind="dont" title="Don't rotate or skew" body="The cartouche is heraldic. Rotation and italic skews destroy its authority." />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#C9A24C]/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-10 text-[11px] uppercase tracking-[0.3em] text-[#eef0fa]/60">
          <span>OPSQAI · Sovereign Mark · v1</span>
          <span className="text-[#C9A24C]/70">Onyx & Gold</span>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.4em] text-[#C9A24C]/70">{eyebrow}</div>
      <h2
        className="mt-4 text-4xl text-[#eef0fa]"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500, letterSpacing: "0.01em" }}
      >
        {title}
      </h2>
      <div className="mt-4 h-px w-16 bg-[#C9A24C]/40" />
    </div>
  );
}

function Rule({ kind, title, body }: { kind: "do" | "dont"; title: string; body: string }) {
  const isDo = kind === "do";
  return (
    <div
      className="border p-8"
      style={{
        background: "#141414",
        borderColor: isDo ? "rgba(201,162,76,0.4)" : "rgba(245,240,230,0.12)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-[0.35em]"
        style={{ color: isDo ? "#F0D78C" : "#8B8B8B" }}
      >
        {isDo ? "Do" : "Don't"}
      </div>
      <div
        className="mt-4 text-2xl text-[#eef0fa]"
        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 500 }}
      >
        {title}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#eef0fa]/70">{body}</p>
    </div>
  );
}

function ConstructionSVG() {
  return (
    <svg viewBox="0 0 64 64" className="mx-auto block h-auto w-full max-w-md">
      {/* grid */}
      <g stroke="#C9A24C" strokeOpacity="0.08" strokeWidth="0.15">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={(i * 64) / 8} y1="0" x2={(i * 64) / 8} y2="64" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i * 64) / 8} x2="64" y2={(i * 64) / 8} />
        ))}
      </g>
      {/* guide circles */}
      <g fill="none" stroke="#C9A24C" strokeOpacity="0.25" strokeWidth="0.15">
        <circle cx="32" cy="32" r="28" />
        <circle cx="32" cy="32" r="22" />
      </g>
      {/* axes */}
      <g stroke="#F0D78C" strokeOpacity="0.35" strokeWidth="0.15" strokeDasharray="0.6 0.6">
        <line x1="32" y1="0" x2="32" y2="64" />
        <line x1="0" y1="32" x2="64" y2="32" />
      </g>
      {/* mark */}
      <polygon
        points="42.71,6.13 57.87,21.29 57.87,42.71 42.71,57.87 21.29,57.87 6.13,42.71 6.13,21.29 21.29,6.13"
        fill="none" stroke="#C9A24C" strokeWidth="0.55"
      />
      <polygon
        points="41.19,9.82 54.18,22.81 54.18,41.19 41.19,54.18 22.81,54.18 9.82,41.19 9.82,22.81 22.81,9.82"
        fill="none" stroke="#C9A24C" strokeOpacity="0.5" strokeWidth="0.22"
      />
      <g fill="#C9A24C">
        <circle cx="40.43" cy="11.67" r="0.7" /><circle cx="52.33" cy="23.57" r="0.7" />
        <circle cx="52.33" cy="40.43" r="0.7" /><circle cx="40.43" cy="52.33" r="0.7" />
        <circle cx="23.57" cy="52.33" r="0.7" /><circle cx="11.67" cy="40.43" r="0.7" />
        <circle cx="11.67" cy="23.57" r="0.7" /><circle cx="23.57" cy="11.67" r="0.7" />
      </g>
      <text
        x="32" y="40.5" textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontWeight={500} fontSize={26} letterSpacing="-1.2"
        fill="#C9A24C"
      >
        OQ
      </text>
    </svg>
  );
}
