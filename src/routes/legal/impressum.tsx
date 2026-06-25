import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/impressum")({
  head: () => ({ meta: [{ title: "Impressum — OPSQAI" }, { name: "description", content: "Legal notice and contact information for OPSQAI." },
      { property: "og:url", content: "https://opsqai.de/legal/impressum" },
      { property: "og:description", content: "Legal notice and contact information for OPSQAI." },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/impressum" }],
  }),
  component: () => (
    <>
      <h1>Impressum</h1>
      <p>Information in accordance with § 5 TMG.</p>

      <h2>Operator</h2>
      <p>OPSQAI<br />Contact: notify@opsqai.de<br />Web: https://opsqai.de</p>

      <h2>Responsible for content</h2>
      <p>The operator named above, in accordance with § 55 (2) RStV.</p>

      <h2>Disputes</h2>
      <p>We are neither willing nor obliged to participate in dispute resolution proceedings before a consumer arbitration body.</p>

      <h2>Disclaimer</h2>
      <p>Despite careful content control, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.</p>
    </>
  ),
});
