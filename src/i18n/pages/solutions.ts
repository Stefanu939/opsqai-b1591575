// Copy for the public vertical landing pages (/solutions/...).
import { useT } from "@/i18n";

export const SOLUTION_VERTICALS = ["logistics", "hr", "finance", "transport"] as const;
export type SolutionVertical = (typeof SOLUTION_VERTICALS)[number];

export function isSolutionVertical(value: string): value is SolutionVertical {
  return (SOLUTION_VERTICALS as readonly string[]).includes(value);
}

interface VerticalCopy {
  name: string;
  tagline: string;
  meta: { title: string; description: string };
  hero: { eyebrow: string; headline: string; serifAccent: string; body: string };
  pains: { title: string; body: string }[];
  capabilities: { title: string; body: string }[];
  outcomes: { value: string; label: string }[];
  cta: { title: string; body: string };
}

interface SolutionsCopy {
  labels: {
    indexEyebrow: string;
    indexTitle: string;
    indexAccent: string;
    indexBody: string;
    indexMetaTitle: string;
    indexMetaDescription: string;
    painsEyebrow: string;
    painsTitle: string;
    capabilitiesEyebrow: string;
    capabilitiesTitle: string;
    outcomesEyebrow: string;
    startPilot: string;
    bookDemo: string;
    getResources: string;
    explore: string;
    otherVerticals: string;
  };
  verticals: Record<SolutionVertical, VerticalCopy>;
}

export const solutionsCopyEn: SolutionsCopy = {
  labels: {
    indexEyebrow: "Solutions",
    indexTitle: "One operational answer layer,",
    indexAccent: "four operating realities.",
    indexBody:
      "OPSQAI runs on your own Windows Server and answers only from your approved documents. Choose the operation you are responsible for.",
    indexMetaTitle: "Solutions by Operation — OPSQAI · Logistics, HR, Finance, Transport",
    indexMetaDescription:
      "Self-hosted operational AI for logistics, HR, finance and transport teams. Answers grounded in your own procedures, installed on your Windows Server.",
    painsEyebrow: "The daily reality",
    painsTitle: "What this costs you today",
    capabilitiesEyebrow: "What OPSQAI does",
    capabilitiesTitle: "Built for this operation",
    outcomesEyebrow: "What changes",
    startPilot: "Start free 30-day pilot",
    bookDemo: "Book a demo",
    getResources: "Free checklists & cost model",
    explore: "Explore",
    otherVerticals: "Other operations",
  },
  verticals: {
    logistics: {
      name: "Logistics & Warehouse",
      tagline: "Shift-proof procedures for picking, receiving and dispatch.",
      meta: {
        title: "Logistics AI, Self-Hosted — OPSQAI for Warehouse Operations",
        description:
          "Warehouse and logistics teams get instant, document-grounded answers on picking, receiving, dispatch and safety — on your own server, no cloud dependency.",
      },
      hero: {
        eyebrow: "Logistics & Warehouse",
        headline: "Every shift works",
        serifAccent: "from the same procedure.",
        body: "Three shifts, seasonal staff and constant exceptions. OPSQAI answers warehouse questions from your own SOPs in seconds, records what it could not answer, and keeps training aligned with the procedure people actually follow.",
      },
      pains: [
        { title: "Knowledge lives with the senior picker", body: "When that one person is on holiday, throughput drops and errors climb." },
        { title: "Procedures exist, nobody finds them", body: "PDF folders, printed binders and chat messages compete for the same answer." },
        { title: "Seasonal onboarding restarts every peak", body: "New staff learn by asking, which stops experienced staff from working." },
        { title: "Audits demand evidence you assemble by hand", body: "Proving who read which procedure takes days you do not have." },
      ],
      capabilities: [
        { title: "Grounded shop-floor answers", body: "Questions on picking rules, dangerous goods, packing or returns are answered only from your approved documents, with the source named." },
        { title: "Knowledge gaps captured automatically", body: "When no procedure covers a question, it becomes a tracked gap with an owner and a deadline instead of a lost chat message." },
        { title: "Training built from your SOPs", body: "Academy lessons and true/false checks are generated from the same procedures, so training never drifts from practice." },
        { title: "Acknowledgement and audit trail", body: "See who read which version of a critical procedure and export the evidence for customer or ISO audits." },
      ],
      outcomes: [
        { value: "Minutes", label: "from question to grounded answer" },
        { value: "1 source", label: "of truth per procedure" },
        { value: "0 cloud", label: "dependency — your server, your data" },
      ],
      cta: {
        title: "Pilot it in your warehouse for 30 days",
        body: "Install on your own Windows Server, load your existing SOPs and let a real shift use it. No cloud, no data leaving your boundary.",
      },
    },
    hr: {
      name: "HR & People Operations",
      tagline: "Policy answers, onboarding and mandatory training in one place.",
      meta: {
        title: "HR AI, Self-Hosted — OPSQAI for People Operations",
        description:
          "HR teams answer policy, leave and onboarding questions from approved documents, run mandatory training and prove acknowledgements — self-hosted, GDPR-friendly.",
      },
      hero: {
        eyebrow: "HR & People Operations",
        headline: "Policy answers without",
        serifAccent: "the same question twice.",
        body: "Leave rules, contracts, onboarding steps, internal requests. OPSQAI answers from your approved HR documents, keeps employee data on your own server, and turns policy changes into training people actually complete.",
      },
      pains: [
        { title: "The same 30 questions every month", body: "Leave carry-over, expense limits, probation rules — asked repeatedly in chats and calls." },
        { title: "Employee data cannot leave the company", body: "Public AI assistants are not an option for contracts, medical notes or payroll context." },
        { title: "Onboarding depends on who is available", body: "Quality of a first week varies with the manager, not with the process." },
        { title: "Mandatory training is hard to prove", body: "Spreadsheets of signatures do not survive a serious audit." },
      ],
      capabilities: [
        { title: "Answers from your HR handbook only", body: "Every reply cites the internal policy it came from, and refuses when the documents do not cover the question." },
        { title: "Onboarding as a repeatable path", body: "Departments get assigned learning paths, deadlines and reminders instead of ad-hoc introductions." },
        { title: "Acknowledgements and retraining", body: "When a policy changes, affected employees are re-enrolled automatically and acknowledgements are recorded." },
        { title: "Data stays inside your boundary", body: "Runs on your Windows Server with role-based access, so sensitive people data never leaves your infrastructure." },
      ],
      outcomes: [
        { value: "-30%", label: "repetitive HR questions, conservatively" },
        { value: "Evidence", label: "for every acknowledgement" },
        { value: "On-prem", label: "processing of employee data" },
      ],
      cta: {
        title: "Try it with one department for 30 days",
        body: "Load your handbook and policies, assign one onboarding path, and measure how many questions HR no longer answers manually.",
      },
    },
    finance: {
      name: "Finance & Administration",
      tagline: "Approval rules, invoicing and month-end without tribal knowledge.",
      meta: {
        title: "Finance AI, Self-Hosted — OPSQAI for Finance Operations",
        description:
          "Finance and administration teams get grounded answers on approval limits, invoicing rules and month-end steps, with a full audit trail — installed on your own server.",
      },
      hero: {
        eyebrow: "Finance & Administration",
        headline: "Controls people can",
        serifAccent: "actually follow.",
        body: "Approval limits, invoice handling, expense rules and month-end steps written once and answered consistently — on your own infrastructure, with an audit trail you can hand to an auditor.",
      },
      pains: [
        { title: "Rules exist in email threads", body: "Approval limits and exceptions are agreed in conversations nobody can find later." },
        { title: "Month-end depends on two people", body: "Their absence turns a routine close into an incident." },
        { title: "Errors are discovered after payment", body: "Wrong VAT treatment or missing documents surface when correcting is expensive." },
        { title: "Auditors ask for proof, not intentions", body: "Showing that the current procedure was communicated takes manual reconstruction." },
      ],
      capabilities: [
        { title: "One answer per control", body: "Approval thresholds, document requirements and exception paths answered from the approved finance procedures only." },
        { title: "Month-end as a tracked checklist", body: "Recurring closing steps with owners, deadlines and completion history instead of a personal spreadsheet." },
        { title: "Complete audit trail", body: "Who asked, what was answered, from which document version, and who acknowledged the procedure." },
        { title: "Segregated access", body: "Role-based rights keep payroll, treasury and procurement knowledge visible only to the people entitled to it." },
      ],
      outcomes: [
        { value: "Traceable", label: "answer for every control question" },
        { value: "Faster", label: "close with documented steps" },
        { value: "Audit-ready", label: "evidence exported on demand" },
      ],
      cta: {
        title: "Prove the audit trail in 30 days",
        body: "Load your finance procedures, run one closing cycle inside OPSQAI, and export the evidence pack at the end.",
      },
    },
    transport: {
      name: "Transport & Fleet",
      tagline: "Drivers, vehicles, inspections and compliance in one operational view.",
      meta: {
        title: "Transport & Fleet AI, Self-Hosted — OPSQAI for Fleet Operations",
        description:
          "Fleet operations get a live view of vehicles, drivers, fuel, inspections and weekly audits, plus grounded answers from your own transport procedures — self-hosted.",
      },
      hero: {
        eyebrow: "Transport & Fleet",
        headline: "Know your fleet",
        serifAccent: "before the phone rings.",
        body: "How many vehicles are actually working, which driver is off today, what the fuel cost per route is, and which inspection is overdue — with weekly audits, evidence and PDF reports built in.",
      },
      pains: [
        { title: "Fleet status lives in three spreadsheets", body: "Vehicles, drivers and maintenance are tracked separately and disagree by Friday." },
        { title: "Compliance dates are remembered, not managed", body: "Roadworthiness, tachograph and licence expiries surface too late." },
        { title: "Incidents are reported in messages", body: "There is no record connecting an incident to a vehicle, driver and corrective action." },
        { title: "Drivers ask dispatch what the procedure says", body: "Loading, securing and documentation rules are explained again on every call." },
      ],
      capabilities: [
        { title: "Fleet overview that fits one screen", body: "Working vehicles, maintenance queue, drivers on duty and off, and fuel cost by route — updated from your own registers." },
        { title: "Weekly audits with evidence", body: "Checklists per vehicle and driver, numeric limits that flag out-of-range readings, photo evidence, signatures and PDF reports." },
        { title: "Grounded driver answers", body: "Cargo securing, CMR handling and hours rules answered from your own transport procedures, in the driver's language." },
        { title: "Incidents that close properly", body: "Every incident links to a vehicle, driver, corrective action and the procedure that changed as a result." },
      ],
      outcomes: [
        { value: "One view", label: "of vehicles, drivers and cost" },
        { value: "Weekly", label: "audit with signed evidence" },
        { value: "Self-hosted", label: "operational and location data" },
      ],
      cta: {
        title: "Run one fleet week inside OPSQAI",
        body: "Load your vehicles and drivers, run a weekly audit with evidence, and export the PDF report at the end of the week.",
      },
    },
  },
};

const de: SolutionsCopy = {
  labels: {
    indexEyebrow: "Lösungen",
    indexTitle: "Eine Antwortebene,",
    indexAccent: "vier operative Realitäten.",
    indexBody:
      "OPSQAI läuft auf Ihrem eigenen Windows Server und antwortet ausschließlich aus Ihren freigegebenen Dokumenten. Wählen Sie den Bereich, für den Sie verantwortlich sind.",
    indexMetaTitle: "Lösungen nach Bereich — OPSQAI · Logistik, HR, Finanzen, Transport",
    indexMetaDescription:
      "Self-hosted KI für Logistik, HR, Finanzen und Transport. Antworten aus Ihren eigenen Anweisungen, installiert auf Ihrem Windows Server.",
    painsEyebrow: "Der Alltag",
    painsTitle: "Was Sie das heute kostet",
    capabilitiesEyebrow: "Was OPSQAI leistet",
    capabilitiesTitle: "Für diesen Bereich gebaut",
    outcomesEyebrow: "Was sich ändert",
    startPilot: "Kostenlosen 30-Tage-Pilot starten",
    bookDemo: "Demo buchen",
    getResources: "Kostenlose Checklisten & Kostenmodell",
    explore: "Ansehen",
    otherVerticals: "Weitere Bereiche",
  },
  verticals: {
    logistics: {
      name: "Logistik & Lager",
      tagline: "Schichtfeste Anweisungen für Kommissionierung, Wareneingang und Versand.",
      meta: {
        title: "Logistik-KI, Self-Hosted — OPSQAI für Lagerbetrieb",
        description:
          "Lager- und Logistikteams erhalten sofortige, dokumentenbasierte Antworten zu Kommissionierung, Wareneingang, Versand und Sicherheit — auf dem eigenen Server.",
      },
      hero: {
        eyebrow: "Logistik & Lager",
        headline: "Jede Schicht arbeitet",
        serifAccent: "nach derselben Anweisung.",
        body: "Drei Schichten, Saisonkräfte und ständige Ausnahmen. OPSQAI beantwortet Lagerfragen in Sekunden aus Ihren eigenen Anweisungen, erfasst unbeantwortete Fragen und hält Schulungen an der gelebten Praxis.",
      },
      pains: [
        { title: "Wissen hängt an einer erfahrenen Person", body: "Ist sie im Urlaub, sinkt die Leistung und die Fehlerquote steigt." },
        { title: "Anweisungen existieren, niemand findet sie", body: "PDF-Ordner, Papierordner und Chatnachrichten liefern widersprüchliche Antworten." },
        { title: "Saisonale Einarbeitung startet jedes Peak neu", body: "Neue Kräfte lernen durch Fragen und blockieren erfahrene Kräfte." },
        { title: "Audits verlangen Nachweise von Hand", body: "Zu belegen, wer welche Anweisung gelesen hat, kostet Tage." },
      ],
      capabilities: [
        { title: "Belegte Antworten für die Fläche", body: "Fragen zu Kommissionierregeln, Gefahrgut, Verpackung oder Retouren nur aus Ihren freigegebenen Dokumenten, mit Quellenangabe." },
        { title: "Wissenslücken automatisch erfasst", body: "Fehlt eine Anweisung, entsteht eine nachverfolgte Lücke mit Verantwortung und Frist statt einer verlorenen Nachricht." },
        { title: "Schulung aus Ihren Anweisungen", body: "Lektionen und Wahr/Falsch-Prüfungen entstehen aus denselben Anweisungen, damit Schulung nicht abdriftet." },
        { title: "Bestätigungen und Prüfpfad", body: "Sehen Sie, wer welche Version gelesen hat, und exportieren Sie Nachweise für Kunden- oder ISO-Audits." },
      ],
      outcomes: [
        { value: "Minuten", label: "von der Frage zur belegten Antwort" },
        { value: "1 Quelle", label: "der Wahrheit pro Anweisung" },
        { value: "0 Cloud", label: "Abhängigkeit — Ihr Server, Ihre Daten" },
      ],
      cta: {
        title: "30 Tage im eigenen Lager testen",
        body: "Auf Ihrem Windows Server installieren, bestehende Anweisungen laden und eine echte Schicht damit arbeiten lassen.",
      },
    },
    hr: {
      name: "HR & Personal",
      tagline: "Richtlinien, Onboarding und Pflichtschulungen an einem Ort.",
      meta: {
        title: "HR-KI, Self-Hosted — OPSQAI für Personalbereiche",
        description:
          "HR-Teams beantworten Richtlinien-, Urlaubs- und Onboarding-Fragen aus freigegebenen Dokumenten, führen Pflichtschulungen und belegen Bestätigungen — self-hosted.",
      },
      hero: {
        eyebrow: "HR & Personal",
        headline: "Richtlinien-Antworten,",
        serifAccent: "nicht zweimal dieselbe Frage.",
        body: "Urlaubsregeln, Verträge, Onboarding, interne Anfragen. OPSQAI antwortet aus Ihren freigegebenen HR-Dokumenten, hält Personaldaten auf Ihrem Server und macht aus Richtlinienänderungen abgeschlossene Schulungen.",
      },
      pains: [
        { title: "Die gleichen 30 Fragen jeden Monat", body: "Urlaubsübertrag, Spesengrenzen, Probezeit — immer wieder in Chats und Anrufen." },
        { title: "Personaldaten dürfen das Haus nicht verlassen", body: "Öffentliche KI-Assistenten sind für Verträge oder Gehaltskontext keine Option." },
        { title: "Onboarding hängt an Verfügbarkeit", body: "Die erste Woche ist so gut wie die Führungskraft, nicht wie der Prozess." },
        { title: "Pflichtschulungen sind schwer zu belegen", body: "Signaturlisten in Tabellen überstehen kein ernsthaftes Audit." },
      ],
      capabilities: [
        { title: "Antworten nur aus Ihrem Handbuch", body: "Jede Antwort nennt die interne Richtlinie und verweigert, wenn die Dokumente die Frage nicht abdecken." },
        { title: "Onboarding als wiederholbarer Pfad", body: "Abteilungen erhalten zugewiesene Lernpfade, Fristen und Erinnerungen statt Ad-hoc-Einführungen." },
        { title: "Bestätigungen und Nachschulung", body: "Ändert sich eine Richtlinie, werden betroffene Personen automatisch neu eingeschrieben." },
        { title: "Daten bleiben im Haus", body: "Betrieb auf Ihrem Windows Server mit Rollenrechten, sensible Personaldaten verlassen die Infrastruktur nicht." },
      ],
      outcomes: [
        { value: "-30 %", label: "wiederkehrende HR-Fragen, konservativ" },
        { value: "Nachweis", label: "für jede Bestätigung" },
        { value: "On-Prem", label: "Verarbeitung von Personaldaten" },
      ],
      cta: {
        title: "30 Tage mit einer Abteilung testen",
        body: "Handbuch und Richtlinien laden, einen Onboarding-Pfad zuweisen und messen, wie viele Fragen HR nicht mehr manuell beantwortet.",
      },
    },
    finance: {
      name: "Finanzen & Verwaltung",
      tagline: "Freigaberegeln, Rechnungen und Monatsabschluss ohne Kopfwissen.",
      meta: {
        title: "Finanz-KI, Self-Hosted — OPSQAI für Finanzprozesse",
        description:
          "Finanz- und Verwaltungsteams erhalten belegte Antworten zu Freigabegrenzen, Rechnungsregeln und Abschlussschritten, mit vollem Prüfpfad — auf dem eigenen Server.",
      },
      hero: {
        eyebrow: "Finanzen & Verwaltung",
        headline: "Kontrollen, die Menschen",
        serifAccent: "wirklich einhalten können.",
        body: "Freigabegrenzen, Rechnungsbearbeitung, Spesenregeln und Abschlussschritte einmal geschrieben und konsistent beantwortet — auf eigener Infrastruktur, mit prüfbarem Nachweis.",
      },
      pains: [
        { title: "Regeln stehen in E-Mail-Verläufen", body: "Freigabegrenzen und Ausnahmen werden in Gesprächen vereinbart und später nicht gefunden." },
        { title: "Der Abschluss hängt an zwei Personen", body: "Deren Abwesenheit macht aus Routine einen Vorfall." },
        { title: "Fehler zeigen sich nach der Zahlung", body: "Falsche Umsatzsteuer oder fehlende Belege fallen auf, wenn Korrektur teuer ist." },
        { title: "Prüfer wollen Nachweise, keine Absichten", body: "Zu zeigen, dass die aktuelle Anweisung kommuniziert wurde, ist Handarbeit." },
      ],
      capabilities: [
        { title: "Eine Antwort pro Kontrolle", body: "Freigabegrenzen, Belegpflichten und Ausnahmewege nur aus den freigegebenen Finanzanweisungen." },
        { title: "Abschluss als verfolgte Checkliste", body: "Wiederkehrende Schritte mit Verantwortung, Fristen und Historie statt privater Tabelle." },
        { title: "Vollständiger Prüfpfad", body: "Wer hat gefragt, was wurde geantwortet, aus welcher Dokumentversion, wer hat bestätigt." },
        { title: "Getrennte Zugriffe", body: "Rollenrechte halten Gehalts-, Treasury- und Einkaufswissen nur für Berechtigte sichtbar." },
      ],
      outcomes: [
        { value: "Nachvollziehbar", label: "jede Antwort zu einer Kontrolle" },
        { value: "Schneller", label: "Abschluss mit dokumentierten Schritten" },
        { value: "Auditfähig", label: "Nachweise auf Abruf" },
      ],
      cta: {
        title: "Prüfpfad in 30 Tagen belegen",
        body: "Finanzanweisungen laden, einen Abschlusszyklus in OPSQAI durchlaufen und am Ende das Nachweispaket exportieren.",
      },
    },
    transport: {
      name: "Transport & Flotte",
      tagline: "Fahrer, Fahrzeuge, Prüfungen und Compliance in einer Ansicht.",
      meta: {
        title: "Transport- & Flotten-KI, Self-Hosted — OPSQAI für Fuhrparkbetrieb",
        description:
          "Fuhrparkbetriebe sehen Fahrzeuge, Fahrer, Kraftstoff, Prüfungen und Wochenaudits live und erhalten belegte Antworten aus eigenen Transportanweisungen — self-hosted.",
      },
      hero: {
        eyebrow: "Transport & Flotte",
        headline: "Ihre Flotte kennen,",
        serifAccent: "bevor das Telefon klingelt.",
        body: "Wie viele Fahrzeuge tatsächlich fahren, welcher Fahrer heute frei hat, was die Kraftstoffkosten pro Route sind und welche Prüfung überfällig ist — mit Wochenaudits, Nachweisen und PDF-Berichten.",
      },
      pains: [
        { title: "Flottenstatus in drei Tabellen", body: "Fahrzeuge, Fahrer und Wartung werden getrennt geführt und widersprechen sich." },
        { title: "Compliance-Termine werden erinnert", body: "HU, Tachograph und Führerscheinfristen fallen zu spät auf." },
        { title: "Vorfälle stehen in Nachrichten", body: "Es fehlt die Verbindung von Vorfall, Fahrzeug, Fahrer und Maßnahme." },
        { title: "Fahrer fragen die Disposition", body: "Lade-, Sicherungs- und Dokumentenregeln werden bei jedem Anruf erneut erklärt." },
      ],
      capabilities: [
        { title: "Flottenübersicht auf einem Bildschirm", body: "Fahrende Fahrzeuge, Wartungsliste, Fahrer im Dienst und frei, Kraftstoffkosten pro Route — aus Ihren Registern." },
        { title: "Wochenaudits mit Nachweis", body: "Checklisten pro Fahrzeug und Fahrer, Grenzwerte mit Abweichungsmarkierung, Fotonachweis, Signaturen, PDF-Berichte." },
        { title: "Belegte Antworten für Fahrer", body: "Ladungssicherung, CMR und Lenkzeiten aus Ihren eigenen Anweisungen, in der Sprache des Fahrers." },
        { title: "Vorfälle, die sauber schließen", body: "Jeder Vorfall verknüpft Fahrzeug, Fahrer, Maßnahme und die geänderte Anweisung." },
      ],
      outcomes: [
        { value: "Eine Ansicht", label: "für Fahrzeuge, Fahrer und Kosten" },
        { value: "Wöchentlich", label: "Audit mit signiertem Nachweis" },
        { value: "Self-Hosted", label: "Betriebs- und Standortdaten" },
      ],
      cta: {
        title: "Eine Flottenwoche in OPSQAI fahren",
        body: "Fahrzeuge und Fahrer laden, ein Wochenaudit mit Nachweis durchführen und den PDF-Bericht exportieren.",
      },
    },
  },
};

const ro: SolutionsCopy = {
  labels: {
    indexEyebrow: "Soluții",
    indexTitle: "Un singur strat de răspuns,",
    indexAccent: "patru realități operaționale.",
    indexBody:
      "OPSQAI rulează pe serverul tău Windows și răspunde exclusiv din documentele aprobate. Alege operațiunea de care răspunzi.",
    indexMetaTitle: "Soluții pe operațiuni — OPSQAI · Logistică, HR, Finanțe, Transport",
    indexMetaDescription:
      "AI operațional self-hosted pentru logistică, HR, finanțe și transport. Răspunsuri din propriile proceduri, instalat pe serverul tău Windows.",
    painsEyebrow: "Realitatea zilnică",
    painsTitle: "Cât te costă asta astăzi",
    capabilitiesEyebrow: "Ce face OPSQAI",
    capabilitiesTitle: "Construit pentru această operațiune",
    outcomesEyebrow: "Ce se schimbă",
    startPilot: "Începe pilotul gratuit de 30 de zile",
    bookDemo: "Programează un demo",
    getResources: "Checklisturi și model de cost gratuite",
    explore: "Vezi detalii",
    otherVerticals: "Alte operațiuni",
  },
  verticals: {
    logistics: {
      name: "Logistică & Depozit",
      tagline: "Proceduri valabile pe toate turele: preluare, recepție, expediere.",
      meta: {
        title: "AI pentru logistică, self-hosted — OPSQAI pentru depozite",
        description:
          "Echipele de depozit primesc răspunsuri imediate, bazate pe documente, despre preluare, recepție, expediere și siguranță — pe serverul propriu, fără cloud.",
      },
      hero: {
        eyebrow: "Logistică & Depozit",
        headline: "Fiecare tură lucrează",
        serifAccent: "după aceeași procedură.",
        body: "Trei ture, personal sezonier și excepții constante. OPSQAI răspunde întrebărilor din depozit în câteva secunde, din procedurile tale, înregistrează ce nu a putut răspunde și ține instruirea aliniată la practică.",
      },
      pains: [
        { title: "Cunoștințele stau la un singur om", body: "Când acesta e în concediu, productivitatea scade și erorile cresc." },
        { title: "Procedurile există, dar nu le găsește nimeni", body: "Dosare PDF, mape tipărite și mesaje pe chat dau răspunsuri diferite." },
        { title: "Integrarea sezonierilor reîncepe la fiecare vârf", body: "Oamenii noi învață întrebând, iar cei experimentați se opresc din muncă." },
        { title: "Auditurile cer dovezi făcute manual", body: "Să arăți cine a citit ce procedură ia zile pe care nu le ai." },
      ],
      capabilities: [
        { title: "Răspunsuri din documente, pe teren", body: "Reguli de preluare, mărfuri periculoase, ambalare sau retururi — răspunse doar din documentele aprobate, cu sursa indicată." },
        { title: "Lipsuri de cunoștințe captate automat", body: "Când nicio procedură nu acoperă întrebarea, apare o lipsă urmărită, cu responsabil și termen." },
        { title: "Instruire construită din procedurile tale", body: "Lecțiile și verificările adevărat/fals se generează din aceleași proceduri, deci instruirea nu se abate." },
        { title: "Confirmări și pistă de audit", body: "Vezi cine a citit ce versiune a unei proceduri critice și exporți dovada pentru audituri de client sau ISO." },
      ],
      outcomes: [
        { value: "Minute", label: "de la întrebare la răspuns documentat" },
        { value: "1 sursă", label: "de adevăr per procedură" },
        { value: "0 cloud", label: "dependență — serverul tău, datele tale" },
      ],
      cta: {
        title: "Testează 30 de zile în depozitul tău",
        body: "Instalezi pe serverul tău Windows, încarci procedurile existente și lași o tură reală să lucreze cu ele.",
      },
    },
    hr: {
      name: "HR & Resurse Umane",
      tagline: "Răspunsuri de politică, integrare și instruire obligatorie într-un loc.",
      meta: {
        title: "AI pentru HR, self-hosted — OPSQAI pentru resurse umane",
        description:
          "Echipele HR răspund la întrebări de politică, concedii și integrare din documente aprobate, rulează instruiri obligatorii și dovedesc confirmările — self-hosted.",
      },
      hero: {
        eyebrow: "HR & Resurse Umane",
        headline: "Răspunsuri de politică,",
        serifAccent: "fără aceeași întrebare de două ori.",
        body: "Reguli de concediu, contracte, pași de integrare, cereri interne. OPSQAI răspunde din documentele HR aprobate, ține datele angajaților pe serverul tău și transformă schimbările de politică în instruire finalizată.",
      },
      pains: [
        { title: "Aceleași 30 de întrebări lunar", body: "Report de concediu, plafoane de cheltuieli, perioada de probă — repetate pe chat și telefon." },
        { title: "Datele angajaților nu pot ieși din firmă", body: "Asistenții AI publici nu sunt o opțiune pentru contracte sau context de salarizare." },
        { title: "Integrarea depinde de cine e disponibil", body: "Prima săptămână e cât managerul, nu cât procesul." },
        { title: "Instruirea obligatorie e greu de dovedit", body: "Tabelele cu semnături nu rezistă la un audit serios." },
      ],
      capabilities: [
        { title: "Răspunsuri doar din manualul tău", body: "Fiecare răspuns citează politica internă și refuză când documentele nu acoperă întrebarea." },
        { title: "Integrare ca traseu repetabil", body: "Departamentele primesc trasee de învățare atribuite, termene și memento-uri, nu introduceri improvizate." },
        { title: "Confirmări și reinstruire", body: "Când o politică se schimbă, angajații afectați sunt reînscriși automat și confirmările se înregistrează." },
        { title: "Datele rămân în interior", body: "Rulează pe serverul tău Windows cu drepturi pe roluri, deci datele sensibile nu ies din infrastructură." },
      ],
      outcomes: [
        { value: "-30%", label: "întrebări HR repetitive, conservator" },
        { value: "Dovadă", label: "pentru fiecare confirmare" },
        { value: "Local", label: "procesarea datelor de personal" },
      ],
      cta: {
        title: "Încearcă 30 de zile cu un departament",
        body: "Încarci manualul și politicile, atribui un traseu de integrare și măsori câte întrebări nu mai ajung la HR.",
      },
    },
    finance: {
      name: "Finanțe & Administrativ",
      tagline: "Reguli de aprobare, facturare și închidere de lună fără cunoștințe orale.",
      meta: {
        title: "AI pentru finanțe, self-hosted — OPSQAI pentru procese financiare",
        description:
          "Echipele financiare primesc răspunsuri documentate despre plafoane de aprobare, reguli de facturare și pașii de închidere, cu pistă completă de audit — pe serverul propriu.",
      },
      hero: {
        eyebrow: "Finanțe & Administrativ",
        headline: "Controale pe care oamenii",
        serifAccent: "le pot respecta.",
        body: "Plafoane de aprobare, tratarea facturilor, reguli de cheltuieli și pașii de închidere — scrise o dată și răspunse consecvent, pe infrastructura ta, cu dovezi pentru auditor.",
      },
      pains: [
        { title: "Regulile stau în fire de e-mail", body: "Plafoanele și excepțiile se convin în discuții pe care nimeni nu le mai găsește." },
        { title: "Închiderea depinde de doi oameni", body: "Absența lor transformă rutina în incident." },
        { title: "Erorile apar după plată", body: "TVA greșit sau documente lipsă ies la lumină când corecția e scumpă." },
        { title: "Auditorii cer dovezi, nu intenții", body: "Să arăți că procedura curentă a fost comunicată necesită reconstrucție manuală." },
      ],
      capabilities: [
        { title: "Un răspuns per control", body: "Plafoane, documente obligatorii și trasee de excepție, răspunse doar din procedurile financiare aprobate." },
        { title: "Închidere ca listă urmărită", body: "Pași recurenți cu responsabili, termene și istoric, nu un fișier personal." },
        { title: "Pistă completă de audit", body: "Cine a întrebat, ce s-a răspuns, din ce versiune de document și cine a confirmat procedura." },
        { title: "Acces separat", body: "Drepturile pe roluri păstrează informația de salarizare, trezorerie și achiziții doar la cei îndreptățiți." },
      ],
      outcomes: [
        { value: "Trasabil", label: "fiecare răspuns la o întrebare de control" },
        { value: "Mai rapid", label: "închidere cu pași documentați" },
        { value: "Pregătit", label: "de audit, dovezi exportate la cerere" },
      ],
      cta: {
        title: "Dovedește pista de audit în 30 de zile",
        body: "Încarci procedurile financiare, rulezi un ciclu de închidere în OPSQAI și exporți pachetul de dovezi la final.",
      },
    },
    transport: {
      name: "Transport & Flotă",
      tagline: "Șoferi, vehicule, inspecții și conformitate într-o singură vedere.",
      meta: {
        title: "AI pentru transport și flotă, self-hosted — OPSQAI pentru parc auto",
        description:
          "Operațiunile de transport văd vehicule, șoferi, combustibil, inspecții și audituri săptămânale, plus răspunsuri din propriile proceduri de transport — self-hosted.",
      },
      hero: {
        eyebrow: "Transport & Flotă",
        headline: "Îți știi flota",
        serifAccent: "înainte să sune telefonul.",
        body: "Câte mașini funcționează efectiv, care șofer are liber azi, cât costă combustibilul pe rută și ce inspecție e depășită — cu audituri săptămânale, dovezi și rapoarte PDF incluse.",
      },
      pains: [
        { title: "Starea flotei stă în trei fișiere", body: "Vehiculele, șoferii și mentenanța sunt urmărite separat și nu se mai potrivesc." },
        { title: "Termenele de conformitate se țin minte", body: "ITP, tahograf și expirări de permise apar prea târziu." },
        { title: "Incidentele rămân în mesaje", body: "Nu există legătura dintre incident, vehicul, șofer și acțiunea corectivă." },
        { title: "Șoferii întreabă dispecerul", body: "Regulile de încărcare, fixare și documente se explică la fiecare apel." },
      ],
      capabilities: [
        { title: "Vedere de flotă pe un singur ecran", body: "Vehicule funcționale, coadă de mentenanță, șoferi în tură și liberi, cost combustibil pe rută — din registrele tale." },
        { title: "Audituri săptămânale cu dovezi", body: "Checklisturi per vehicul și șofer, limite numerice cu marcarea abaterilor, dovezi foto, semnături și rapoarte PDF." },
        { title: "Răspunsuri documentate pentru șoferi", body: "Fixarea mărfii, CMR și timpii de conducere, din propriile proceduri, în limba șoferului." },
        { title: "Incidente care se închid corect", body: "Fiecare incident leagă vehiculul, șoferul, acțiunea corectivă și procedura schimbată." },
      ],
      outcomes: [
        { value: "O vedere", label: "pentru vehicule, șoferi și costuri" },
        { value: "Săptămânal", label: "audit cu dovezi semnate" },
        { value: "Self-hosted", label: "datele operaționale și de locație" },
      ],
      cta: {
        title: "Rulează o săptămână de flotă în OPSQAI",
        body: "Încarci vehiculele și șoferii, rulezi un audit săptămânal cu dovezi și exporți raportul PDF la final.",
      },
    },
  },
};

export function useSolutionsCopy(): SolutionsCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : solutionsCopyEn;
}
