import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Security · Verifiable",
    headline: "Proven",
    serifAccent: "not just trusted.",
    body: "OPSQAI is sovereign by design. Operational knowledge stays on the customer's Windows Server. Signed artifacts prove provenance. Every privileged action is recorded in a hash-chained audit log.",
    ctaPrimary: "Request DPA / security review",
    ctaSecondary: "Sovereign architecture",
  },
  guarantee: {
    eyebrow: "The guarantee",
    lead: "OPSQAI never sees operational customer knowledge.",
    accent: "Documents, chats, embeddings and users live inside the customer install.",
  },
  pillars: {
    eyebrow: "Twelve pillars",
    headline: "Security",
    serifAccent: "by construction.",
    items: [
      { title: "Ed25519-signed licenses", body: "Every license is an Ed25519-signed bundle. The install verifies it locally, offline. Revocation is durable and cryptographically bound to the installation identity." },
      { title: "Signed activation bundles", body: "Activation bundles are signed by OPSQAI with a 90-day validity window. Expired bundles are refused; renewal is issued through the Customer Portal." },
      { title: "Hash-chained audit trail", body: "Privileged and AI actions are appended to a hash-chained audit log. Any tampering breaks the chain and is detected on verification." },
      { title: "Certificate revocation list", body: "OPSQAI maintains a signed CRL for licenses and activation bundles. The install checks it on heartbeat and refuses revoked artifacts." },
      { title: "Chunk-level ACL", body: "Retrieval is enforced at the chunk level. Users only see grounded citations from documents their role and department allow." },
      { title: "Customer owns the data", body: "Documents, embeddings, chats, users and configuration are stored inside the customer install. OPSQAI never sees operational customer knowledge." },
      { title: "Signed releases", body: "Installer packages and update manifests are signed. The updater refuses any artifact that fails verification." },
      { title: "Encryption in transit and at rest", body: "TLS everywhere via Caddy. PostgreSQL storage follows Windows Server policy. Backups can be encrypted end-to-end." },
      { title: "Append-only audit log", body: "License issuance, ownership transfer, admin promotion, module activation — every privileged action is logged with actor, target and timestamp." },
      { title: "Role-based access", body: "Workspace owner, admin, manager, supervisor, worker, viewer. Platform Super Admin is a separate, tightly-scoped OPSQAI role." },
      { title: "Single-tenant boundary", body: "Every install is one customer. No shared databases, vector stores or AI keys — nothing crosses tenants." },
      { title: "GDPR aligned", body: "EU-hosted cloud surfaces, DPA available on request, right-to-erasure procedures documented for both cloud metadata and on-prem content." },
    ],
  },
  boundary: {
    eyebrow: "The boundary",
    headline: "What crosses. What",
    serifAccent: "stays.",
    cloud: {
      title: "Cloud · OPSQAI-managed",
      items: [
        "· Customer & installation metadata",
        "· License records and signing keys",
        "· Release manifests and CRL",
        "· Support conversations",
      ],
    },
    onprem: {
      title: "On-prem · Customer-owned",
      items: [
        "· Documents, SOPs and embeddings",
        "· Chat messages and AI audit records",
        "· End-user accounts and roles",
        "· Workspace configuration and AI keys",
      ],
    },
  },
  finalCta: {
    eyebrow: "Procurement, InfoSec, compliance",
    headline: "Bring your questionnaire",
    serifAccent: "here.",
    body: "We respond to security reviews from procurement, InfoSec and compliance teams.",
    ctaPrimary: "Contact security",
    ctaSecondary: "Self-hosted architecture",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Sicherheit · Verifizierbar",
    headline: "Bewiesen",
    serifAccent: "nicht nur vertraut.",
    body: "OPSQAI ist von Grund auf souverän konzipiert. Operatives Wissen verbleibt auf dem Windows Server des Kunden. Signierte Artefakte belegen die Herkunft. Jede privilegierte Aktion wird in einem hash-verketteten Audit-Log erfasst.",
    ctaPrimary: "DPA / Sicherheitsprüfung anfordern",
    ctaSecondary: "Souveräne Architektur",
  },
  guarantee: {
    eyebrow: "Die Garantie",
    lead: "OPSQAI sieht niemals operatives Kundenwissen.",
    accent: "Dokumente, Chats, Embeddings und Nutzer verbleiben innerhalb der Kundeninstallation.",
  },
  pillars: {
    eyebrow: "Zwölf Säulen",
    headline: "Sicherheit",
    serifAccent: "von Grund auf.",
    items: [
      { title: "Ed25519-signierte Lizenzen", body: "Jede Lizenz ist ein Ed25519-signiertes Paket. Die Installation verifiziert es lokal, offline. Widerruf ist dauerhaft und kryptografisch an die Installationsidentität gebunden." },
      { title: "Signierte Aktivierungspakete", body: "Aktivierungspakete werden von OPSQAI mit einer 90-Tage-Gültigkeit signiert. Abgelaufene Pakete werden abgelehnt; die Erneuerung erfolgt über das Kundenportal." },
      { title: "Hash-verkettetes Audit-Protokoll", body: "Privilegierte und KI-Aktionen werden an ein hash-verkettetes Audit-Protokoll angehängt. Jede Manipulation bricht die Kette und wird bei der Verifizierung erkannt." },
      { title: "Zertifikatssperrliste", body: "OPSQAI führt eine signierte CRL für Lizenzen und Aktivierungspakete. Die Installation prüft sie bei jedem Heartbeat und lehnt widerrufene Artefakte ab." },
      { title: "ACL auf Chunk-Ebene", body: "Der Abruf wird auf Chunk-Ebene durchgesetzt. Nutzer sehen nur belegte Zitate aus Dokumenten, die ihre Rolle und Abteilung zulassen." },
      { title: "Der Kunde besitzt die Daten", body: "Dokumente, Embeddings, Chats, Nutzer und Konfiguration werden innerhalb der Kundeninstallation gespeichert. OPSQAI sieht niemals operatives Kundenwissen." },
      { title: "Signierte Releases", body: "Installationspakete und Update-Manifeste sind signiert. Der Updater lehnt jedes Artefakt ab, das die Verifizierung nicht besteht." },
      { title: "Verschlüsselung bei Übertragung und Speicherung", body: "TLS überall via Caddy. Die PostgreSQL-Speicherung folgt der Windows-Server-Richtlinie. Backups können durchgängig verschlüsselt werden." },
      { title: "Unveränderliches Audit-Protokoll", body: "Lizenzausstellung, Eigentümerwechsel, Admin-Beförderung, Modulaktivierung — jede privilegierte Aktion wird mit Akteur, Ziel und Zeitstempel protokolliert." },
      { title: "Rollenbasierter Zugriff", body: "Workspace-Inhaber, Admin, Manager, Supervisor, Mitarbeiter, Betrachter. Platform Super Admin ist eine separate, eng begrenzte OPSQAI-Rolle." },
      { title: "Single-Tenant-Grenze", body: "Jede Installation entspricht einem Kunden. Keine gemeinsamen Datenbanken, Vektorspeicher oder KI-Schlüssel — nichts überschreitet Mandantengrenzen." },
      { title: "DSGVO-konform", body: "EU-gehostete Cloud-Komponenten, DPA auf Anfrage verfügbar, dokumentierte Löschverfahren sowohl für Cloud-Metadaten als auch für lokale Inhalte." },
    ],
  },
  boundary: {
    eyebrow: "Die Grenze",
    headline: "Was übergeht. Was",
    serifAccent: "bleibt.",
    cloud: {
      title: "Cloud · von OPSQAI verwaltet",
      items: [
        "· Kunden- und Installationsmetadaten",
        "· Lizenzdatensätze und Signierschlüssel",
        "· Release-Manifeste und CRL",
        "· Support-Gespräche",
      ],
    },
    onprem: {
      title: "On-Prem · im Besitz des Kunden",
      items: [
        "· Dokumente, SOPs und Embeddings",
        "· Chatnachrichten und KI-Audit-Datensätze",
        "· Endnutzerkonten und Rollen",
        "· Workspace-Konfiguration und KI-Schlüssel",
      ],
    },
  },
  finalCta: {
    eyebrow: "Einkauf, InfoSec, Compliance",
    headline: "Bringen Sie Ihren Fragebogen",
    serifAccent: "mit.",
    body: "Wir beantworten Sicherheitsprüfungen von Einkaufs-, InfoSec- und Compliance-Teams.",
    ctaPrimary: "Security kontaktieren",
    ctaSecondary: "Self-Hosted-Architektur",
  },
};

export function useSecurityCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : en;
}
