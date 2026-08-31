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


const ro: Copy = {
  hero: {
    eyebrow: "Securitate · Verificabilă",
    headline: "Demonstrată",
    serifAccent: "nu doar de încredere.",
    body: "OPSQAI este suveran prin design. Cunoștințele operaționale rămân pe Windows Server-ul clientului. Artefactele semnate dovedesc proveniența. Fiecare acțiune privilegiată este înregistrată într-un jurnal de audit înlănțuit prin hash.",
    ctaPrimary: "Solicitați DPA / evaluare de securitate",
    ctaSecondary: "Arhitectură suverană",
  },
  guarantee: {
    eyebrow: "Garanția",
    lead: "OPSQAI nu vede niciodată cunoștințele operaționale ale clientului.",
    accent: "Documentele, conversațiile, embeddings și utilizatorii rămân în cadrul instalării clientului.",
  },
  pillars: {
    eyebrow: "Douăsprezece piloni",
    headline: "Securitate",
    serifAccent: "prin construcție.",
    items: [
      { title: "Licențe semnate Ed25519", body: "Fiecare licență este un pachet semnat Ed25519. Instalarea o verifică local, offline. Revocarea este permanentă și legată criptografic de identitatea instalării." },
      { title: "Pachete de activare semnate", body: "Pachetele de activare sunt semnate de OPSQAI cu o valabilitate de 90 de zile. Pachetele expirate sunt refuzate; reînnoirea se emite prin Portalul Clienților." },
      { title: "Jurnal de audit înlănțuit prin hash", body: "Acțiunile privilegiate și cele ale AI sunt adăugate la un jurnal de audit înlănțuit prin hash. Orice modificare rupe lanțul și este detectată la verificare." },
      { title: "Listă de revocare a certificatelor", body: "OPSQAI menține un CRL semnat pentru licențe și pachete de activare. Instalarea îl verifică la fiecare heartbeat și refuză artefactele revocate." },
      { title: "ACL la nivel de fragment", body: "Recuperarea este aplicată la nivel de fragment (chunk). Utilizatorii văd doar citate fundamentate din documentele permise de rolul și departamentul lor." },
      { title: "Clientul deține datele", body: "Documentele, embeddings, conversațiile, utilizatorii și configurația sunt stocate în cadrul instalării clientului. OPSQAI nu vede niciodată cunoștințele operaționale ale clientului." },
      { title: "Versiuni semnate", body: "Pachetele de instalare și manifestele de actualizare sunt semnate. Actualizatorul refuză orice artefact care eșuează verificarea." },
      { title: "Criptare în tranzit și în repaus", body: "TLS peste tot, prin Caddy. Stocarea PostgreSQL respectă politica Windows Server. Backupurile pot fi criptate integral." },
      { title: "Jurnal de audit doar-adăugare", body: "Emiterea licenței, transferul de proprietate, promovarea la admin, activarea modulelor — fiecare acțiune privilegiată este înregistrată cu actor, țintă și marcaj temporal." },
      { title: "Acces bazat pe roluri", body: "Proprietar de workspace, admin, manager, supervizor, lucrător, vizualizator. Platform Super Admin este un rol OPSQAI separat, strict delimitat." },
      { title: "Graniță single-tenant", body: "Fiecare instalare corespunde unui singur client. Fără baze de date, magazii vectoriale sau chei AI partajate — nimic nu traversează granițele dintre clienți." },
      { title: "Aliniat GDPR", body: "Componente cloud găzduite în UE, DPA disponibil la cerere, proceduri de ștergere documentate atât pentru metadatele din cloud, cât și pentru conținutul on-premise." },
    ],
  },
  boundary: {
    eyebrow: "Granița",
    headline: "Ce traversează. Ce",
    serifAccent: "rămâne.",
    cloud: {
      title: "Cloud · gestionat de OPSQAI",
      items: [
        "· Metadatele clientului și ale instalării",
        "· Înregistrări de licențe și chei de semnare",
        "· Manifeste de versiuni și CRL",
        "· Conversații de suport",
      ],
    },
    onprem: {
      title: "On-premise · deținut de client",
      items: [
        "· Documente, SOP-uri și embeddings",
        "· Mesaje de chat și înregistrări de audit AI",
        "· Conturi și roluri ale utilizatorilor finali",
        "· Configurația workspace-ului și cheile AI",
      ],
    },
  },
  finalCta: {
    eyebrow: "Achiziții, InfoSec, conformitate",
    headline: "Aduceți chestionarul dumneavoastră",
    serifAccent: "aici.",
    body: "Răspundem la evaluări de securitate din partea echipelor de achiziții, InfoSec și conformitate.",
    ctaPrimary: "Contactați echipa de securitate",
    ctaSecondary: "Arhitectură Self-Hosted",
  },
};

export function useSecurityCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
