import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "Documentation",
    headline: "Everything, written down.",
    body: "OPSQAI ships as a Windows-native self-hosted platform. These books cover installation, architecture, security, product, technical reference, and engineering. For product notes and release announcements see the",
    blogLink: "blog",
    bodyEnd: ". Customer-specific runbooks live inside the Customer Portal.",
  },
  books: [
    {
      title: "Administrator Guide",
      body: "Install, configure, and operate OPSQAI self-hosted on a dedicated Windows Server. Signed installer, native Windows services, PostgreSQL Portable, object storage, SMTP, SSO, AI provider, licence, backups, updates, troubleshooting.",
    },
    {
      title: "Architecture Handbook",
      body: "How OPSQAI is built end to end: containers, data flow, license system, RAG pipeline, security model, storage adapters, deployment topology.",
    },
    {
      title: "Product Documentation",
      body: "What OPSQAI is, why it exists, what each module does, how licensing works, how AI answers stay grounded in your knowledge base.",
    },
    {
      title: "Security Documentation",
      body: "Encryption at rest and in transit, RLS, license security, update signing, backup encryption, audit logging, DR/BC, incident response.",
    },
    {
      title: "Technical Reference",
      body: "Windows service reference (Caddy, Platform, Worker, PostgreSQL, Updater), environment variables, ports, on-disk layout, AI adapter contract, RAG pipeline internals, embeddings, storage adapters, public API, jobs, database schema.",
    },
    {
      title: "Engineering Handbook",
      body: "Conventions, release process, adding modules, issuing licenses, adding AI adapters, publishing container images, migrations, pre-release checklist.",
    },
  ],
  openBook: "Open →",
  installSpecific: {
    headline: "Looking for install-specific docs?",
    body: "Customer contacts can browse install-scoped documentation and release notes inside the Customer Portal.",
    ctaPrimary: "Open Customer Portal",
    ctaSecondary: "Contact us",
  },
};

type Copy = typeof en;

const de: Copy = {
  hero: {
    eyebrow: "Dokumentation",
    headline: "Alles ist dokumentiert.",
    body: "OPSQAI wird als Windows-native Self-Hosted-Plattform ausgeliefert. Diese Bücher decken Installation, Architektur, Sicherheit, Produkt, technische Referenz und Engineering ab. Produkthinweise und Release-Ankündigungen finden Sie im",
    blogLink: "Blog",
    bodyEnd: ". Kundenspezifische Runbooks befinden sich im Kundenportal.",
  },
  books: [
    {
      title: "Administratorhandbuch",
      body: "Installieren, konfigurieren und betreiben Sie OPSQAI Self-Hosted auf einem dedizierten Windows Server. Signierter Installer, native Windows-Dienste, PostgreSQL Portable, Objektspeicher, SMTP, SSO, KI-Anbieter, Lizenz, Backups, Updates, Fehlerbehebung.",
    },
    {
      title: "Architekturhandbuch",
      body: "Wie OPSQAI durchgängig aufgebaut ist: Container, Datenfluss, Lizenzsystem, RAG-Pipeline, Sicherheitsmodell, Speicher-Adapter, Deployment-Topologie.",
    },
    {
      title: "Produktdokumentation",
      body: "Was OPSQAI ist, warum es existiert, was jedes Modul leistet, wie die Lizenzierung funktioniert, wie KI-Antworten auf Ihrer Wissensbasis fundiert bleiben.",
    },
    {
      title: "Sicherheitsdokumentation",
      body: "Verschlüsselung im Ruhezustand und bei der Übertragung, RLS, Lizenzsicherheit, Update-Signierung, Backup-Verschlüsselung, Audit-Protokollierung, DR/BC, Incident Response.",
    },
    {
      title: "Technische Referenz",
      body: "Windows-Dienstreferenz (Caddy, Platform, Worker, PostgreSQL, Updater), Umgebungsvariablen, Ports, Verzeichnisstruktur, KI-Adapter-Vertrag, Interna der RAG-Pipeline, Embeddings, Speicher-Adapter, öffentliche API, Jobs, Datenbankschema.",
    },
    {
      title: "Engineering-Handbuch",
      body: "Konventionen, Release-Prozess, Module hinzufügen, Lizenzen ausstellen, KI-Adapter hinzufügen, Container-Images veröffentlichen, Migrationen, Pre-Release-Checkliste.",
    },
  ],
  openBook: "Öffnen →",
  installSpecific: {
    headline: "Suchen Sie installationsspezifische Dokumentation?",
    body: "Kundenkontakte können installationsspezifische Dokumentation und Release Notes im Kundenportal durchsuchen.",
    ctaPrimary: "Kundenportal öffnen",
    ctaSecondary: "Kontakt aufnehmen",
  },
};


const ro: Copy = {
  hero: {
    eyebrow: "Documentație",
    headline: "Totul, documentat.",
    body: "OPSQAI este livrat ca platformă Self-Hosted nativă pentru Windows. Aceste manuale acoperă instalarea, arhitectura, securitatea, produsul, referința tehnică și ingineria. Pentru note despre produs și anunțuri de versiuni, consultați",
    blogLink: "blogul",
    bodyEnd: ". Ghidurile specifice fiecărui client se află în Portalul Clienților.",
  },
  books: [
    {
      title: "Ghidul Administratorului",
      body: "Instalați, configurați și operați OPSQAI Self-Hosted pe un Windows Server dedicat. Instalator semnat, servicii Windows native, PostgreSQL Portable, stocare de obiecte, SMTP, SSO, furnizor AI, licență, backupuri, actualizări, depanare.",
    },
    {
      title: "Manualul de Arhitectură",
      body: "Cum este construit OPSQAI, de la un capăt la altul: containere, flux de date, sistem de licențe, pipeline RAG, model de securitate, adaptoare de stocare, topologie de implementare.",
    },
    {
      title: "Documentația Produsului",
      body: "Ce este OPSQAI, de ce există, ce face fiecare modul, cum funcționează licențierea, cum rămân răspunsurile AI fundamentate pe baza dumneavoastră de cunoștințe.",
    },
    {
      title: "Documentația de Securitate",
      body: "Criptare în repaus și în tranzit, RLS, securitatea licenței, semnarea actualizărilor, criptarea backupurilor, jurnalizarea auditului, DR/BC, răspuns la incidente.",
    },
    {
      title: "Referință Tehnică",
      body: "Referință servicii Windows (Caddy, Platform, Worker, PostgreSQL, Updater), variabile de mediu, porturi, structura pe disc, contractul adaptorului AI, internele pipeline-ului RAG, embeddings, adaptoare de stocare, API public, joburi, schema bazei de date.",
    },
    {
      title: "Manualul de Inginerie",
      body: "Convenții, proces de lansare, adăugarea de module, emiterea licențelor, adăugarea adaptoarelor AI, publicarea imaginilor de containere, migrări, lista de verificare pre-lansare.",
    },
  ],
  openBook: "Deschideți →",
  installSpecific: {
    headline: "Căutați documentație specifică instalării?",
    body: "Contactele clientului pot răsfoi documentația specifică instalării și notele de versiune în Portalul Clienților.",
    ctaPrimary: "Deschideți Portalul Clienților",
    ctaSecondary: "Contactați-ne",
  },
};

export function useDocumentationCopy(): Copy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
