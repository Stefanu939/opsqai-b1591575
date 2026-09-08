// Per-page pain bands (EN/DE/RO).
//
// Each public page gets: a confrontational headline that names the loss,
// three "cost today -> what OPSQAI does" pairs, and one dominant CTA.
// Rule (same as pain.ts): no invented customer results, no invented savings.
import { useT } from "@/i18n";

export type PainBandCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  costLabel: string;
  fixLabel: string;
  items: { cost: string; fix: string }[];
  primary: string;
  secondary: string;
};

export type PagePainKey =
  | "product"
  | "overview"
  | "platform"
  | "selfHosted"
  | "security"
  | "solutions"
  | "pricing"
  | "blog"
  | "docs"
  | "support";

const en: Record<PagePainKey, PainBandCopy> = {
  product: {
    eyebrow: "Before you read a single feature",
    title: "The platform is not the point. The hours you lose every week are.",
    intro:
      "Most operations do not fail because software is missing. They fail because the correct instruction was not reachable in the minute someone needed it.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Every shift, the same question travels to the same experienced colleague — and the operation waits for the answer.",
        fix: "The assistant answers from your approved documents and cites the source, or refuses. Your expert only handles the exception.",
      },
      {
        cost: "Nobody can say which version of a procedure was actually followed last month.",
        fix: "Versioned procedures, acknowledgements and a hash-chained AI audit trail — evidence is produced, not reconstructed.",
      },
      {
        cost: "People paste operational documents into public AI tools because it is faster than searching.",
        fix: "The answer lives inside your own Windows environment, on your database, with your AI provider — including a fully local model.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  overview: {
    eyebrow: "The honest starting point",
    title: "Your documents are already written. That is exactly the problem.",
    intro:
      "Knowledge that exists but cannot be found in time behaves like knowledge you never wrote. It is paid for twice: once when it is created, again every time somebody searches for it.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Three weeks before a new hire is productive, because the process only exists in people's heads.",
        fix: "Onboarding runs as structured Academy paths built from the same approved procedures the operation uses.",
      },
      {
        cost: "An audit request turns into a week of hunting for documents and proof.",
        fix: "Acknowledgements, AI logs and audit exports are generated continuously — a request becomes an export.",
      },
      {
        cost: "Two versions of the same SOP in circulation, and no way to prove which one is valid.",
        fix: "One versioned knowledge base with the approved document as the single source of truth.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  platform: {
    eyebrow: "Why a catalogue instead of a suite",
    title: "You are probably paying for software nobody in the operation opens.",
    intro:
      "Enterprise suites bill for everything and get used for a fraction. OPSQAI ships Core permanently and lets you enable only the products your operation actually runs on.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Licence fees for modules that were switched on during a project and never used again.",
        fix: "Core is always included. Every other product is enabled per company through a signed licence — and can be switched off.",
      },
      {
        cost: "Every new tool means another silo, another login, another place a procedure can hide.",
        fix: "One installation, one knowledge base, one audit trail — products add workspaces, not new systems.",
      },
      {
        cost: "Budget approvals stall because nobody can say what a module will actually change.",
        fix: "Enable it in a 30-day pilot on your own data and measure the result before it becomes a line item.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  selfHosted: {
    eyebrow: "The risk nobody puts on the invoice",
    title: "Your operational documents are already in someone else's AI tool.",
    intro:
      "When the internal answer is slow, employees find a fast one outside. That is a data protection exposure created by inconvenience, not by bad intent — and European enforcement is documented publicly.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Contracts, SOPs and customer data pasted into public chat tools with no record of what left the building.",
        fix: "Documents, embeddings, chats and users stay inside your installation. Nothing is transferred to a public AI tenant.",
      },
      {
        cost: "You cannot prove to an auditor which AI answer came from which document.",
        fix: "Every AI interaction is logged with input, output, source and user, and can be exported.",
      },
      {
        cost: "Cloud dependency you did not choose: a vendor outage stops your shift.",
        fix: "The product runs on your Windows Server with local PostgreSQL and local embeddings — offline capable, your keys, your model.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  security: {
    eyebrow: "Where the money actually leaks",
    title: "A fine is cheap compared to not knowing what happened.",
    intro:
      "Security is usually sold as a certificate. In an operation it is much simpler: can you show, on demand, who saw what, which procedure was valid, and where an answer came from?",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Shared drives where everyone can open everything, and leavers keep access for months.",
        fix: "Company-scoped access, named per-user rights, role hierarchy and idle session limits enforced in the product.",
      },
      {
        cost: "An incident investigation depends on people remembering what they did.",
        fix: "Hash-chained AI audit trail plus document and acknowledgement history you can export as evidence.",
      },
      {
        cost: "A licence copied to a second machine, and suddenly another company sees your data.",
        fix: "Signed licences bound to a company and installation, with clean-install enforcement and one-owner protection.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  solutions: {
    eyebrow: "Pick the pain, not the module",
    title: "Every industry loses the same hour — it just has a different name.",
    intro:
      "In the warehouse it is a wrong label. In transport it is an expired document. In HR it is a contract typed by hand. The cause is identical: the procedure was not reachable when it mattered.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Errors that are corrected downstream, at customer cost, instead of prevented upstream.",
        fix: "The approved procedure is answered back on the spot, with the source attached.",
      },
      {
        cost: "Deadlines and expiring documents discovered after they lapse.",
        fix: "Expiry semaphores, weekly procedure checks and daily digests that surface what is overdue.",
      },
      {
        cost: "Every departure restarts onboarding from zero.",
        fix: "Academy paths, training matrix and certificates built from your own documents.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  pricing: {
    eyebrow: "The comparison that matters",
    title: "Compare us with the status quo, not with another vendor.",
    intro:
      "The relevant question is not what OPSQAI costs. It is what one year of searching, re-onboarding and unprovable procedures already costs you — with your own numbers.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Lost search time is invisible on every invoice, so nobody ever approves fixing it.",
        fix: "Put the hours and the euros on the table with the calculator below, using your own figures.",
      },
      {
        cost: "Long procurement cycles for software nobody has tested in your operation.",
        fix: "A 30-day pilot on your own hardware and your own documents, before any licence is issued.",
      },
      {
        cost: "Paying for a suite to use a quarter of it.",
        fix: "Core is permanently included; products and add-ons are enabled per company and can be switched off.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  blog: {
    eyebrow: "Why we write this",
    title: "Notes from operations where the procedure arrived too late.",
    intro:
      "No thought leadership. Each note comes from a concrete failure mode we had to design around — knowledge that could not be found, evidence that could not be produced, data that left the building.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Reading about AI does not reduce a single error in tomorrow's shift.",
        fix: "Run it on your own documents for 30 days and judge it on your own operation.",
      },
      {
        cost: "Vendor claims you cannot verify.",
        fix: "Every external figure we publish carries its public source, and we say plainly where we have no data.",
      },
      {
        cost: "Time spent evaluating tools that cannot run inside your boundary.",
        fix: "Windows Self-Hosted, your database, your AI provider — the constraint is settled before the evaluation starts.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  docs: {
    eyebrow: "Read it before you commit",
    title: "If the documentation is vague, the project fails after the invoice.",
    intro:
      "Everything an administrator, auditor or engineer needs is written down and public — so evaluation does not depend on a sales conversation.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "Requirements discovered during installation, not before it.",
        fix: "Administrator guide with server, database, TLS and update requirements, published in full.",
      },
      {
        cost: "Security review blocked because nobody can describe the data flow.",
        fix: "Architecture and security books describe boundaries, logging and licence enforcement.",
      },
      {
        cost: "An installation that only one person understands.",
        fix: "Product, technical and engineering documentation your own team can operate from.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
  },
  support: {
    eyebrow: "What downtime really costs",
    title: "A blocked shift does not care whose ticket queue it is in.",
    intro:
      "Support is not a courtesy line. It is the difference between an operation that keeps running and one that waits.",
    costLabel: "What it costs you today",
    fixLabel: "What OPSQAI does about it",
    items: [
      {
        cost: "First-level scripts, three handovers, and nobody who knows the product.",
        fix: "Tickets are handled by the people who build the platform, with response targets per tier.",
      },
      {
        cost: "An update that breaks production and cannot be rolled back.",
        fix: "Signed updates verified by checksum, installed in a maintenance window with backup and rollback.",
      },
      {
        cost: "Problems found by users instead of by monitoring.",
        fix: "Installation heartbeat, health checks and release adoption tracked from the Management Center.",
      },
    ],
    primary: "Start free 30-day pilot",
    secondary: "Talk to us",
  },
};

const de: Record<PagePainKey, PainBandCopy> = {
  product: {
    eyebrow: "Bevor Sie eine einzige Funktion lesen",
    title: "Nicht die Plattform zählt. Die Stunden, die Sie jede Woche verlieren, zählen.",
    intro:
      "Betriebe scheitern selten an fehlender Software. Sie scheitern daran, dass die richtige Anweisung in der entscheidenden Minute nicht erreichbar war.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "In jeder Schicht geht dieselbe Frage an dieselbe erfahrene Kollegin — und der Betrieb wartet auf die Antwort.",
        fix: "Der Assistent antwortet aus Ihren freigegebenen Dokumenten mit Quellenangabe oder verweigert. Ihre Fachkraft übernimmt nur die Ausnahme.",
      },
      {
        cost: "Niemand kann sagen, welche Version eines Verfahrens letzten Monat tatsächlich befolgt wurde.",
        fix: "Versionierte Verfahren, Bestätigungen und ein hash-verkettetes KI-Audit — Nachweise entstehen, statt rekonstruiert zu werden.",
      },
      {
        cost: "Mitarbeitende kopieren operative Dokumente in öffentliche KI-Tools, weil es schneller ist als Suchen.",
        fix: "Die Antwort bleibt in Ihrer Windows-Umgebung, auf Ihrer Datenbank, mit Ihrem KI-Anbieter — auch vollständig lokal.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  overview: {
    eyebrow: "Der ehrliche Ausgangspunkt",
    title: "Ihre Dokumente sind längst geschrieben. Genau das ist das Problem.",
    intro:
      "Wissen, das existiert, aber nicht rechtzeitig gefunden wird, verhält sich wie nie geschriebenes Wissen. Es wird zweimal bezahlt: beim Erstellen und bei jeder Suche.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Drei Wochen, bis neue Mitarbeitende produktiv sind, weil der Prozess nur in Köpfen existiert.",
        fix: "Einarbeitung als strukturierte Academy-Pfade aus denselben freigegebenen Verfahren.",
      },
      {
        cost: "Eine Auditanfrage wird zur Wochenaufgabe aus Suchen und Belegen.",
        fix: "Bestätigungen, KI-Protokolle und Audit-Exporte entstehen laufend — die Anfrage wird zum Export.",
      },
      {
        cost: "Zwei Versionen derselben SOP im Umlauf, ohne Nachweis, welche gilt.",
        fix: "Eine versionierte Wissensbasis mit dem freigegebenen Dokument als einziger Quelle.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  platform: {
    eyebrow: "Warum Katalog statt Suite",
    title: "Wahrscheinlich zahlen Sie für Software, die im Betrieb niemand öffnet.",
    intro:
      "Suiten rechnen alles ab und werden zu einem Bruchteil genutzt. OPSQAI liefert Core dauerhaft mit und aktiviert nur die Produkte, die Ihr Betrieb wirklich braucht.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Lizenzkosten für Module, die einmal im Projekt aktiviert und nie wieder genutzt wurden.",
        fix: "Core ist immer enthalten. Jedes weitere Produkt wird per signierter Lizenz freigeschaltet — und lässt sich abschalten.",
      },
      {
        cost: "Jedes neue Werkzeug bedeutet ein weiteres Silo und einen weiteren Ort, an dem ein Verfahren verschwindet.",
        fix: "Eine Installation, eine Wissensbasis, ein Audit — Produkte ergänzen Arbeitsbereiche, keine neuen Systeme.",
      },
      {
        cost: "Budgetfreigaben stocken, weil niemand sagen kann, was ein Modul konkret verändert.",
        fix: "Im 30-Tage-Pilot mit eigenen Daten messen, bevor daraus eine Budgetposition wird.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  selfHosted: {
    eyebrow: "Das Risiko, das auf keiner Rechnung steht",
    title: "Ihre operativen Dokumente liegen längst im KI-Tool eines Anderen.",
    intro:
      "Wenn die interne Antwort langsam ist, suchen Mitarbeitende eine schnelle draußen. Das ist ein Datenschutzrisiko aus Bequemlichkeit — und die europäische Durchsetzung ist öffentlich dokumentiert.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Verträge, SOPs und Kundendaten in öffentlichen Chat-Tools, ohne Nachweis, was das Haus verlassen hat.",
        fix: "Dokumente, Embeddings, Chats und Nutzer bleiben in Ihrer Installation. Kein Transfer in einen öffentlichen KI-Tenant.",
      },
      {
        cost: "Sie können einem Prüfer nicht belegen, aus welchem Dokument eine KI-Antwort stammt.",
        fix: "Jede KI-Interaktion wird mit Eingabe, Ausgabe, Quelle und Nutzer protokolliert und ist exportierbar.",
      },
      {
        cost: "Nicht gewählte Cloud-Abhängigkeit: ein Anbieterausfall stoppt Ihre Schicht.",
        fix: "Betrieb auf Ihrem Windows Server mit lokalem PostgreSQL und lokalen Embeddings — offlinefähig, Ihre Schlüssel, Ihr Modell.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  security: {
    eyebrow: "Wo das Geld wirklich verloren geht",
    title: "Ein Bußgeld ist günstig gegenüber dem Nichtwissen, was passiert ist.",
    intro:
      "Sicherheit wird meist als Zertifikat verkauft. Im Betrieb ist die Frage einfacher: Können Sie jederzeit zeigen, wer was gesehen hat, welches Verfahren galt und woher eine Antwort kam?",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Netzlaufwerke, auf denen alle alles öffnen können, und Abgänge behalten monatelang Zugriff.",
        fix: "Mandantenscharfe Zugriffe, benannte Nutzerrechte, Rollenhierarchie und Inaktivitäts-Timeout im Produkt erzwungen.",
      },
      {
        cost: "Eine Vorfalluntersuchung hängt daran, dass sich Menschen erinnern.",
        fix: "Hash-verkettetes KI-Audit plus Dokument- und Bestätigungshistorie, exportierbar als Nachweis.",
      },
      {
        cost: "Eine Lizenz auf einen zweiten Rechner kopiert — und plötzlich sieht ein anderes Unternehmen Ihre Daten.",
        fix: "Signierte Lizenzen an Unternehmen und Installation gebunden, mit erzwungener Neuinstallation und Owner-Schutz.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  solutions: {
    eyebrow: "Wählen Sie den Schmerz, nicht das Modul",
    title: "Jede Branche verliert dieselbe Stunde — sie heißt nur anders.",
    intro:
      "Im Lager ist es ein falsches Label. Im Transport ein abgelaufenes Dokument. In HR ein handgetippter Vertrag. Die Ursache ist identisch: das Verfahren war nicht erreichbar.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Fehler, die nachgelagert auf Kundenkosten korrigiert statt vorgelagert verhindert werden.",
        fix: "Das freigegebene Verfahren wird sofort beantwortet, mit Quellenangabe.",
      },
      {
        cost: "Fristen und ablaufende Dokumente fallen erst nach dem Ablauf auf.",
        fix: "Ablauf-Ampeln, wöchentliche Prüflisten und Tagesdigests zeigen Überfälliges.",
      },
      {
        cost: "Jeder Abgang startet die Einarbeitung bei null.",
        fix: "Academy-Pfade, Schulungsmatrix und Zertifikate aus Ihren eigenen Dokumenten.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  pricing: {
    eyebrow: "Der Vergleich, der zählt",
    title: "Vergleichen Sie uns mit dem Status quo, nicht mit einem anderen Anbieter.",
    intro:
      "Die relevante Frage ist nicht, was OPSQAI kostet, sondern was ein Jahr Suchen, Wiedereinarbeiten und nicht belegbare Verfahren bereits kostet — mit Ihren Zahlen.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Verlorene Suchzeit steht auf keiner Rechnung, deshalb genehmigt niemand die Behebung.",
        fix: "Legen Sie Stunden und Euro mit dem Rechner unten offen — mit Ihren eigenen Werten.",
      },
      {
        cost: "Lange Beschaffung für Software, die niemand in Ihrem Betrieb getestet hat.",
        fix: "30-Tage-Pilot auf Ihrer Hardware und Ihren Dokumenten, bevor eine Lizenz ausgestellt wird.",
      },
      {
        cost: "Eine Suite bezahlen und ein Viertel nutzen.",
        fix: "Core ist dauerhaft enthalten; Produkte und Add-ons werden pro Unternehmen aktiviert und lassen sich abschalten.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  blog: {
    eyebrow: "Warum wir das schreiben",
    title: "Notizen aus Betrieben, in denen das Verfahren zu spät kam.",
    intro:
      "Kein Thought Leadership. Jede Notiz kommt von einem konkreten Fehlerfall, um den wir herum entwickeln mussten.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Über KI zu lesen reduziert keinen einzigen Fehler in der morgigen Schicht.",
        fix: "30 Tage mit Ihren eigenen Dokumenten betreiben und am eigenen Betrieb bewerten.",
      },
      {
        cost: "Anbieteraussagen, die Sie nicht prüfen können.",
        fix: "Jede externe Zahl trägt ihre öffentliche Quelle, und wir sagen klar, wo wir keine Daten haben.",
      },
      {
        cost: "Zeit für Tools, die nicht in Ihrer Grenze laufen können.",
        fix: "Windows Self-Hosted, Ihre Datenbank, Ihr KI-Anbieter — die Rahmenbedingung steht vorab.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  docs: {
    eyebrow: "Lesen Sie es vor der Entscheidung",
    title: "Ist die Dokumentation vage, scheitert das Projekt nach der Rechnung.",
    intro:
      "Alles, was Administration, Audit und Technik brauchen, ist vollständig und öffentlich dokumentiert — die Bewertung hängt nicht an einem Vertriebsgespräch.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "Anforderungen, die erst bei der Installation auffallen.",
        fix: "Administrationshandbuch mit Server-, Datenbank-, TLS- und Update-Anforderungen, vollständig veröffentlicht.",
      },
      {
        cost: "Sicherheitsprüfung blockiert, weil niemand den Datenfluss beschreiben kann.",
        fix: "Architektur- und Sicherheitsbücher beschreiben Grenzen, Protokollierung und Lizenzdurchsetzung.",
      },
      {
        cost: "Eine Installation, die nur eine Person versteht.",
        fix: "Produkt-, Technik- und Engineering-Dokumentation, mit der Ihr Team selbst arbeiten kann.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
  },
  support: {
    eyebrow: "Was Ausfall wirklich kostet",
    title: "Eine blockierte Schicht interessiert sich nicht für Ticket-Warteschlangen.",
    intro:
      "Support ist keine Höflichkeit. Er ist der Unterschied zwischen einem Betrieb, der läuft, und einem, der wartet.",
    costLabel: "Was es Sie heute kostet",
    fixLabel: "Was OPSQAI dagegen tut",
    items: [
      {
        cost: "First-Level-Skripte, drei Übergaben und niemand, der das Produkt kennt.",
        fix: "Tickets bearbeiten die Menschen, die die Plattform bauen, mit Reaktionszielen je Stufe.",
      },
      {
        cost: "Ein Update, das die Produktion bricht und nicht zurückgerollt werden kann.",
        fix: "Signierte Updates mit Checksummenprüfung, Installation im Wartungsfenster mit Backup und Rollback.",
      },
      {
        cost: "Probleme, die Nutzer finden statt das Monitoring.",
        fix: "Heartbeat der Installation, Health-Checks und Release-Verbreitung im Management Center sichtbar.",
      },
    ],
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kontakt aufnehmen",
  },
};

const ro: Record<PagePainKey, PainBandCopy> = {
  product: {
    eyebrow: "Înainte de orice funcție",
    title: "Nu platforma contează. Contează orele pe care le pierzi în fiecare săptămână.",
    intro:
      "Operațiunile nu cad din lipsă de software. Cad pentru că instrucțiunea corectă nu era la îndemână în minutul în care era nevoie de ea.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "În fiecare tură, aceeași întrebare ajunge la același coleg cu experiență — iar operațiunea așteaptă răspunsul.",
        fix: "Asistentul răspunde din documentele tale aprobate și citează sursa, altfel refuză. Specialistul tău se ocupă doar de excepție.",
      },
      {
        cost: "Nimeni nu poate spune care versiune a unei proceduri a fost respectată luna trecută.",
        fix: "Proceduri versionate, confirmări și jurnal AI înlănțuit prin hash — dovada se produce, nu se reconstruiește.",
      },
      {
        cost: "Oamenii lipesc documente operaționale în unelte AI publice, pentru că e mai rapid decât să caute.",
        fix: "Răspunsul rămâne în mediul tău Windows, pe baza ta de date, cu furnizorul tău de AI — inclusiv model complet local.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  overview: {
    eyebrow: "Punctul de plecare sincer",
    title: "Documentele tale sunt deja scrise. Exact asta e problema.",
    intro:
      "Cunoștințele care există dar nu pot fi găsite la timp se comportă ca cunoștințe niciodată scrise. Se plătesc de două ori: o dată la creare și apoi la fiecare căutare.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Trei săptămâni până când un angajat nou devine productiv, pentru că procesul există doar în capul oamenilor.",
        fix: "Integrarea rulează ca trasee Academy construite din exact procedurile aprobate.",
      },
      {
        cost: "O cerere de audit devine o săptămână de căutat documente și dovezi.",
        fix: "Confirmările, jurnalele AI și exporturile de audit se produc continuu — cererea devine un export.",
      },
      {
        cost: "Două versiuni ale aceleiași proceduri în circulație, fără dovadă care e valabilă.",
        fix: "O bază de cunoștințe versionată, cu documentul aprobat ca unică sursă.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  platform: {
    eyebrow: "De ce catalog și nu suită",
    title: "Probabil plătești software pe care nimeni din operațiune nu îl deschide.",
    intro:
      "Suitele facturează tot și se folosesc pe o fracțiune. OPSQAI livrează Core permanent și activează doar produsele de care operațiunea are chiar nevoie.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Licențe pentru module pornite într-un proiect și nefolosite niciodată după.",
        fix: "Core e mereu inclus. Orice alt produs se activează per companie prin licență semnată — și se poate opri.",
      },
      {
        cost: "Fiecare unealtă nouă înseamnă alt silo, alt login, alt loc unde se poate ascunde o procedură.",
        fix: "O instalare, o bază de cunoștințe, un jurnal de audit — produsele adaugă spații de lucru, nu sisteme noi.",
      },
      {
        cost: "Aprobările de buget se blochează, pentru că nimeni nu poate spune ce schimbă concret un modul.",
        fix: "Activează-l într-un pilot de 30 de zile pe datele tale și măsoară înainte să devină o linie de buget.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  selfHosted: {
    eyebrow: "Riscul care nu apare pe nicio factură",
    title: "Documentele tale operaționale sunt deja în unealta AI a altcuiva.",
    intro:
      "Când răspunsul intern e lent, angajații găsesc unul rapid în afară. E o expunere de protecția datelor născută din comoditate — iar aplicarea în Europa e documentată public.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Contracte, proceduri și date de clienți lipite în unelte publice de chat, fără nicio urmă a ce a ieșit din firmă.",
        fix: "Documentele, embedding-urile, conversațiile și utilizatorii rămân în instalarea ta. Nimic nu pleacă către un furnizor AI public.",
      },
      {
        cost: "Nu poți dovedi unui auditor din ce document a venit un răspuns AI.",
        fix: "Fiecare interacțiune AI e jurnalizată cu intrare, ieșire, sursă și utilizator, și poate fi exportată.",
      },
      {
        cost: "Dependență de cloud pe care nu ai ales-o: o pană la furnizor îți oprește tura.",
        fix: "Rulează pe serverul tău Windows, cu PostgreSQL local și embedding-uri locale — funcționează offline, cheile tale, modelul tău.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  security: {
    eyebrow: "Unde se pierd de fapt banii",
    title: "O amendă e ieftină față de a nu ști ce s-a întâmplat.",
    intro:
      "Securitatea se vinde de obicei ca certificat. În operațiune întrebarea e mai simplă: poți arăta oricând cine a văzut ce, care procedură era valabilă și de unde a venit un răspuns?",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Foldere partajate unde toți deschid tot, iar cei care plecă păstrează accesul luni de zile.",
        fix: "Acces limitat pe companie, drepturi numite pe utilizator, ierarhie de roluri și deconectare la inactivitate, impuse în produs.",
      },
      {
        cost: "O investigație de incident depinde de ce își amintesc oamenii.",
        fix: "Jurnal AI înlănțuit prin hash, plus istoricul documentelor și al confirmărilor, exportabile ca dovadă.",
      },
      {
        cost: "O licență copiată pe alt calculator și, brusc, altă firmă îți vede datele.",
        fix: "Licențe semnate, legate de companie și instalare, cu instalare curată obligatorie și protecția unicului proprietar.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  solutions: {
    eyebrow: "Alege durerea, nu modulul",
    title: "Fiecare industrie pierde aceeași oră — doar că are alt nume.",
    intro:
      "În depozit e o etichetă greșită. În transport, un document expirat. În HR, un contract scris de mână. Cauza e identică: procedura nu era la îndemână.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Erori corectate mai târziu, pe costul clientului, în loc să fie prevenite la sursă.",
        fix: "Procedura aprobată e răspunsă pe loc, cu sursa atașată.",
      },
      {
        cost: "Termene și documente care expiră, descoperite după ce au expirat.",
        fix: "Semafoare de expirare, verificări săptămânale și rezumate zilnice cu ce e restant.",
      },
      {
        cost: "Fiecare plecare reia integrarea de la zero.",
        fix: "Trasee Academy, matrice de instruire și certificate construite din documentele tale.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  pricing: {
    eyebrow: "Comparația care contează",
    title: "Compară-ne cu situația actuală, nu cu alt furnizor.",
    intro:
      "Întrebarea relevantă nu e cât costă OPSQAI. E cât te costă deja un an de căutat, reintegrat și proceduri pe care nu le poți dovedi — cu cifrele tale.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Timpul pierdut cu căutarea nu apare pe nicio factură, așa că nimeni nu aprobă rezolvarea.",
        fix: "Pune orele și euro pe masă cu calculatorul de mai jos, folosind propriile date.",
      },
      {
        cost: "Achiziții lungi pentru software pe care nimeni nu l-a testat în operațiunea ta.",
        fix: "Un pilot de 30 de zile pe hardware-ul și documentele tale, înainte de orice licență.",
      },
      {
        cost: "Plătești o suită și folosești un sfert.",
        fix: "Core e inclus permanent; produsele și extensiile se activează per companie și se pot opri.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  blog: {
    eyebrow: "De ce scriem asta",
    title: "Note din operațiuni în care procedura a ajuns prea târziu.",
    intro:
      "Fără discursuri de lider de opinie. Fiecare notă vine dintr-un mod concret de eșec pe care a trebuit să îl acoperim prin design.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Cititul despre AI nu reduce nicio eroare din tura de mâine.",
        fix: "Rulează-l 30 de zile pe documentele tale și judecă-l pe operațiunea ta.",
      },
      {
        cost: "Afirmații de furnizor care nu pot fi verificate.",
        fix: "Fiecare cifră externă publicată are sursa publică, și spunem clar unde nu avem date.",
      },
      {
        cost: "Timp pierdut cu unelte care nu pot rula în interiorul firmei.",
        fix: "Windows Self-Hosted, baza ta de date, furnizorul tău de AI — condiția e clară înainte de evaluare.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  docs: {
    eyebrow: "Citește înainte să te angajezi",
    title: "Dacă documentația e vagă, proiectul cade după factură.",
    intro:
      "Tot ce are nevoie un administrator, un auditor sau un inginer e scris și public — evaluarea nu depinde de o discuție de vânzare.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Cerințe descoperite în timpul instalării, nu înainte.",
        fix: "Ghid de administrare cu cerințe de server, bază de date, TLS și actualizări, publicat integral.",
      },
      {
        cost: "Verificarea de securitate se blochează, pentru că nimeni nu poate descrie fluxul de date.",
        fix: "Cărțile de arhitectură și securitate descriu limitele, jurnalizarea și aplicarea licenței.",
      },
      {
        cost: "O instalare pe care o înțelege doar o persoană.",
        fix: "Documentație de produs, tehnică și de inginerie, cu care echipa ta poate lucra singură.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
  },
  support: {
    eyebrow: "Cât costă de fapt o oprire",
    title: "O tură blocată nu se interesează în ce coadă de tichete stă.",
    intro:
      "Suportul nu e o amabilitate. E diferența dintre o operațiune care merge și una care așteaptă.",
    costLabel: "Cât te costă astăzi",
    fixLabel: "Ce face OPSQAI în privința asta",
    items: [
      {
        cost: "Scripturi de nivel unu, trei predări și nimeni care cunoaște produsul.",
        fix: "Tichetele sunt tratate de oamenii care construiesc platforma, cu ținte de răspuns pe nivel.",
      },
      {
        cost: "O actualizare care rupe producția și nu poate fi dată înapoi.",
        fix: "Actualizări semnate, verificate prin sumă de control, instalate în fereastră de mentenanță, cu backup și revenire.",
      },
      {
        cost: "Probleme găsite de utilizatori, nu de monitorizare.",
        fix: "Heartbeat al instalării, verificări de sănătate și adopția versiunilor, vizibile în Management Center.",
      },
    ],
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Contactează-ne",
  },
};

export function usePagePain(key: PagePainKey): PainBandCopy {
  const { lang } = useT();
  const dict = lang === "de" ? de : lang === "ro" ? ro : en;
  return dict[key];
}
