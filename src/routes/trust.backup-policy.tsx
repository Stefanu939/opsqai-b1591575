import { createFileRoute } from "@tanstack/react-router";
import { TrustTopic } from "@/components/marketing/trust-topic";
import { DraftDisclaimer } from "@/components/legal/draft-disclaimer";

export const Route = createFileRoute("/trust/backup-policy")({
  head: () => ({
    meta: [
      { title: "Backup Policy — OPSQAI Trust Center" },
      {
        name: "description",
        content:
          "OPSQAI relies on managed automated backups with point-in-time recovery and tests restoration regularly.",
      },
      { property: "og:title", content: "Backup Policy — OPSQAI Trust Center" },
      { property: "og:url", content: "https://opsqai.de/trust/backup-policy" },
      {
        property: "og:description",
        content:
          "OPSQAI relies on managed automated backups with point-in-time recovery and tests restoration regularly.",
      },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/trust/backup-policy" }],
  }),
  component: () => (
    <TrustTopic
      title="Backup Policy"
      intro="OPSQAI's primary data store uses managed automated backups with point-in-time recovery. Object storage and configuration are versioned independently."
    >
      <DraftDisclaimer />
      <h2>Backup schedule</h2>
      <ul>
        <li>
          <strong>Database:</strong> continuous WAL archiving + daily base backups, retained for a
          rolling 30-day window on the managed platform.
        </li>
        <li>
          <strong>Point-in-time recovery (PITR):</strong> supported within the retention window at
          second-level granularity.
        </li>
        <li>
          <strong>Object storage (knowledge-base files):</strong> redundant storage in the EU
          region; versioning is enabled on the bucket so accidental overwrites can be rolled back.
        </li>
      </ul>
      <h2>Recovery objectives</h2>
      <ul>
        <li>
          <strong>RPO (Recovery Point Objective):</strong> ≤ 5 minutes for the application database.
        </li>
        <li>
          <strong>RTO (Recovery Time Objective):</strong> ≤ 4 hours for a full database restore in
          the same region.
        </li>
      </ul>
      <h2>Restoration testing</h2>
      <ul>
        <li>Restore drills are performed at least quarterly into an isolated environment.</li>
        <li>Schema and RLS policies are re-verified after restore.</li>
      </ul>
      <h2>Customer-side backups</h2>
      <p>
        Tenant admins can export their knowledge base and audit logs at any time via the admin area.
        We recommend customers keep an external copy of mission-critical SOPs.
      </p>
    </TrustTopic>
  ),
});
