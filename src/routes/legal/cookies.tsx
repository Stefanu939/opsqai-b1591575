import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/legal/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — OPSQAI" },
      {
        name: "description",
        content: "Cookies used on opsqai.de and inside the OPSQAI application.",
      },
      { property: "og:url", content: "https://opsqai.de/legal/cookies" },
      {
        property: "og:description",
        content: "Cookies used on opsqai.de and inside the OPSQAI application.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/cookies" }],
  }),
  component: () => (
    <>
      <h1>Cookie Policy</h1>
      <p>OPSQAI uses a small number of cookies and similar storage technologies.</p>

      <h2>Strictly necessary</h2>
      <ul>
        <li>Authentication cookies and local storage to keep you signed in.</li>
        <li>CSRF and security tokens.</li>
        <li>Language preference.</li>
      </ul>

      <h2>Analytics</h2>
      <p>
        We may use first-party, privacy-respecting analytics to understand aggregate usage of the
        marketing site. We do not deploy advertising cookies. Where required by law, analytics are
        loaded only after consent.
      </p>

      <h2>Managing cookies</h2>
      <p>
        You can clear cookies in your browser at any time. Removing authentication cookies will sign
        you out of the OPSQAI application.
      </p>
    </>
  ),
});
