import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — OPSQAI" },
      {
        name: "description",
        content:
          "Cookies used on opsqai.de. Only strictly necessary cookies; no analytics, no advertising.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/cookies" },
      {
        property: "og:description",
        content:
          "Cookies used on opsqai.de. Only strictly necessary cookies; no analytics, no advertising.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/cookies" }],
  }),
  component: () => (
    <>
      <h1>Cookie Policy</h1>
      <p>
        opsqai.de uses only cookies and local-storage entries that are strictly necessary to run
        the site and to keep customer contacts signed into the Customer Portal.{" "}
        <strong>
          We do not use analytics cookies, advertising cookies, retargeting pixels, or any
          third-party tracker.
        </strong>{" "}
        No consent banner is shown because no consent is required for strictly necessary storage
        under Art. 5(3) ePrivacy Directive and § 25(2) TDDDG.
      </p>

      <h2>Strictly necessary</h2>
      <ul>
        <li>
          <strong>Authentication session</strong> — set only when a customer contact signs into the
          Customer Portal. Stored as an HTTP-only cookie plus a session entry in browser storage,
          scoped to opsqai.de. Cleared on sign-out.
        </li>
        <li>
          <strong>CSRF / security tokens</strong> — short-lived tokens that protect form
          submissions (including the contact form) from cross-site request forgery.
        </li>
        <li>
          <strong>Language preference</strong> — remembers the interface language you picked
          (English, German or Romanian) so we do not have to ask on every visit.
        </li>
      </ul>

      <h2>What is NOT set</h2>
      <ul>
        <li>No Google Analytics, Plausible, PostHog, Matomo or equivalent analytics.</li>
        <li>No Meta Pixel, LinkedIn Insight Tag, Google Ads or retargeting pixels.</li>
        <li>No third-party embed that sets its own cookies (no YouTube, no Vimeo, no Intercom).</li>
      </ul>

      <h2>Managing cookies</h2>
      <p>
        You can clear cookies and local storage in your browser at any time. Removing the
        authentication cookies will simply sign you out of the Customer Portal; the rest of
        opsqai.de will keep working.
      </p>
    </>
  ),
});
