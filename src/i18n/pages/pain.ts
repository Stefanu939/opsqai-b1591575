// Pain-first marketing copy (EN/DE/RO): before/after, role scenarios,
// loss calculator, proof map and compliance risk band.
//
// Rule: no invented customer results, no invented savings. External figures
// are attributed to their public source; anything about a specific company
// is calculated from what the visitor types in.
import { useT } from "@/i18n";

export type SourceRef = { label: string; url: string };

const sources = {
  turnoverCost: {
    label: "Safe Mind, Fluktuationskosten Logistik & Transport",
    url: "https://safe-mind.de/de/fluktuationskosten-rechner/logistik",
  },
  turnoverBvl: {
    label: "BVL, Fluktuationskosten bei Berufskraftfahrern (2025)",
    url: "https://www.bvl.de/blog/fluktuationskosten-bei-berufskraftfahrern-ein-zu-oft-unterschatzter-kostenfaktor/",
  },
  drivers: {
    label: "tagesschau, 120.000 Lkw-Fahrer fehlen (2025)",
    url: "https://www.tagesschau.de/wirtschaft/unternehmen/lkw-fahrer-mangel-deutschland-100.html",
  },
  staffing: {
    label: "VerkehrsRundschau, Fachkräftemangel Lager, IT & Disposition (2025)",
    url: "https://www.verkehrsrundschau.de/nachrichten/ausbildung-karriere/fachkraeftemangel-in-der-logistik-lager-it-disposition-3725662",
  },
  knowledge: {
    label: "Coveo EX Relevance Report (2025)",
    url: "https://www.prnewswire.com/news-releases/coveo-ex-relevance-report-reveals-42-of-information-fails-employees-too-much-data-not-enough-relevance-302439738.html",
  },
  gdpr: {
    label: "CMS GDPR Enforcement Tracker Report 2025",
    url: "https://cms.law/en/fra/publication/gdpr-enforcement-tracker-report-2025/numbers-and-figures",
  },
  gdprDla: {
    label: "DLA Piper GDPR fines and data breach survey (2025)",
    url: "https://blogs.dlapiper.com/advocatus/files/2025/01/dla-piper-fines-and-data-breach-survey-2025.pdf",
  },
} satisfies Record<string, SourceRef>;

const en = {
  hero: {
    eyebrow: "Operational knowledge, under control",
    h1a: "Your procedures exist.",
    h1b: "Nobody can find them in time —",
    serifAccent: "and that costs money.",
    intro:
      "Every shift, someone asks a question that is already answered in a document on a shared drive. Someone works from an outdated SOP. A new hire needs three weeks before they are productive. An audit turns into a document hunt. OPSQAI runs inside your own Windows environment and answers those questions from your approved documents — with the source attached, or no answer at all.",
    primary: "Start free 30-day pilot",
    secondary: "Calculate what this costs you",
    tertiary: "See how it works",
    costs: [
      {
        value: "47%",
        label: "name fragmented knowledge as the biggest obstacle to productivity",
        source: sources.knowledge,
      },
      {
        value: "~30%",
        label: "annual staff turnover in German logistics & transport — every departure re-starts onboarding",
        source: sources.turnoverCost,
      },
      {
        value: "120,000",
        label: "truck drivers missing in Germany — the people you keep must carry more, faster",
        source: sources.drivers,
      },
    ],
  },
  beforeAfter: {
    eyebrow: "Before vs. after",
    title: "Recognise your own operation.",
    intro:
      "This is not a feature list. It is the difference between how a shift runs today and how it runs when the knowledge answers back.",
    beforeTitle: "Today, without OPSQAI",
    afterTitle: "With OPSQAI installed",
    before: [
      "PDFs scattered across shared drives, mailboxes and someone's desktop",
      "Two versions of the same SOP in circulation — nobody knows which one is valid",
      "The same question asked twenty times, always to the same experienced colleague",
      "New hires shadow someone for weeks because the process only exists in people's heads",
      "An audit request means hours of hunting for documents and proof",
      "Employees paste operational documents into public AI tools to get a fast answer",
    ],
    after: [
      "One knowledge base, versioned, with the approved document as the single source",
      "Answers cite the exact document and section — and refuse when no source covers the question",
      "The assistant answers the routine question; your expert handles the exception",
      "Onboarding runs as structured Academy paths with lessons, quizzes and certificates",
      "SOP acknowledgements, AI audit log and audit exports are generated, not reconstructed",
      "Nothing leaves the company: local database, local embeddings, your own AI provider",
    ],
    note:
      "The right-hand column describes what the installed product does today. Speed of your own onboarding is measured in your pilot — we do not publish other companies' numbers as if they were yours.",
  },
  calculator: {
    eyebrow: "Cost of the status quo",
    title: "Put a number on it — with your own figures.",
    intro:
      "This calculator uses only what you type. It does not promise savings; it shows what the current situation costs per year. Start from the defaults, then replace them with your reality.",
    fields: {
      employees: "Employees who look for procedures or ask questions",
      hourlyCost: "Average fully loaded cost per hour (EUR)",
      minutes: "Minutes lost per person per day searching or asking",
      leavers: "People leaving per year",
      leaverCost: "Cost per departure incl. recruiting & onboarding (EUR)",
    },
    results: {
      hours: "Hours lost per year searching",
      searchCost: "Annual cost of searching",
      turnoverCost: "Annual cost of turnover & re-onboarding",
      total: "Total exposure per year",
    },
    assumption:
      "Defaults are placeholders, not claims: turnover in German logistics runs around 30% per year with a typical cost of tens of thousands of euros per departure. Working days assumed: 220 per year.",
    disclaimer:
      "OPSQAI does not remove these costs automatically. It removes the search and the guesswork; the rest depends on your processes. That is exactly what a 30-day pilot measures.",
    cta: "Measure it in a 30-day pilot",
  },
  roles: {
    eyebrow: "Where it hurts",
    title: "Three people who feel this every day.",
    items: [
      {
        role: "Logistics / warehouse manager",
        pain: "Wrong pallet, wrong label, wrong loading order — every error costs a correction, a return or a customer call. The correct procedure existed; it just wasn't at hand.",
        fix: "Answers with the approved procedure attached, plus weekly procedure checks, expiry semaphores for vehicle and driver documents, and incident records with evidence.",
        product: "Core + OPSQAI Transport",
      },
      {
        role: "Operations director",
        pain: "Knowledge lives in a handful of experienced people. When one is on holiday or leaves, throughput drops and nobody can prove which process was followed.",
        fix: "One versioned knowledge base, SOP acknowledgements, a hash-chained AI audit trail and a control centre that shows what is open, overdue or expiring.",
        product: "Core Platform",
      },
      {
        role: "HR manager",
        pain: "Contracts typed by hand, onboarding tracked in spreadsheets, CVs in five languages, training certificates nobody can locate before an inspection.",
        fix: "Country-aware document generation with review and approval, onboarding and offboarding task flows, equipment packages, training matrix and multilingual CV analysis with editable, source-referenced fields.",
        product: "Core + OPSQAI HR",
      },
    ],
  },
  proof: {
    eyebrow: "Mechanism → consequence",
    title: "What the technology actually buys you.",
    intro:
      "Local AI, retrieval and signed licenses are mechanisms. Here is the business consequence of each — and where we deliberately stop short of a promise.",
    items: [
      {
        mechanism: "Grounded answers with citations, refusal without a source",
        consequence: "Fewer expensive mistakes from outdated or invented instructions. Every answer can be checked against the document it came from.",
      },
      {
        mechanism: "Academy paths, lessons, quizzes, certificates",
        consequence: "New hires learn from the same approved procedures the operation actually uses, instead of shadowing a colleague for weeks.",
      },
      {
        mechanism: "Versioned SOPs, acknowledgements, AI audit trail, exports",
        consequence: "Audit evidence is produced continuously, so a request becomes an export instead of a week of searching.",
      },
      {
        mechanism: "Runs on your Windows Server, local PostgreSQL, local embeddings, your AI provider — including a fully local Ollama model",
        consequence: "No operational document is transferred to a public AI tenant. Data protection risk stays inside the boundary you already control.",
      },
      {
        mechanism: "Procedure checks, expiry tracking, incidents, fleet and duty registers",
        consequence: "Omissions surface before they become a fine or a breakdown. OPSQAI Transport does not replace your WMS or TMS — it governs the procedures and documents around them.",
      },
    ],
    honest: "Where we don't have data, we don't claim it.",
    honestBody:
      "OPSQAI has no published customer case studies yet and does not claim a certification it does not hold. Every effect above is a property of the shipping product; the size of the effect in your operation is what the pilot is for.",
  },
  risk: {
    eyebrow: "Compliance exposure",
    title: "The fastest answer is often the most expensive one.",
    body:
      "When the procedure is hard to find, employees improvise — including pasting operational documents into public AI tools. GDPR enforcement across Europe has grown year after year, and the fines are documented publicly. OPSQAI removes the incentive to improvise: the answer is inside the company, on the company's own hardware, with an audit record.",
    points: [
      "Documents, embeddings, chats and users stay inside your installation",
      "AI provider and keys are yours — a fully local model is supported",
      "Every AI interaction is logged with inputs, outputs, sources and user",
    ],
    sources: [sources.gdpr, sources.gdprDla],
  },
  sourceLabel: "Source",
  sourcesLabel: "Sources",
};

export type PainCopy = typeof en;

const de: PainCopy = {
  hero: {
    eyebrow: "Operatives Wissen, unter Kontrolle",
    h1a: "Ihre Verfahren existieren.",
    h1b: "Niemand findet sie rechtzeitig —",
    serifAccent: "und das kostet Geld.",
    intro:
      "In jeder Schicht stellt jemand eine Frage, die längst in einem Dokument auf einem Netzlaufwerk beantwortet ist. Jemand arbeitet nach einer veralteten SOP. Eine neue Mitarbeiterin braucht drei Wochen bis zur Produktivität. Ein Audit wird zur Dokumentensuche. OPSQAI läuft in Ihrer eigenen Windows-Umgebung und beantwortet diese Fragen aus Ihren freigegebenen Dokumenten — mit Quellenangabe, oder gar nicht.",
    primary: "Kostenlosen 30-Tage-Pilot starten",
    secondary: "Kosten berechnen",
    tertiary: "So funktioniert es",
    costs: [
      {
        value: "47 %",
        label: "nennen fragmentiertes Wissen als größtes Produktivitätshindernis",
        source: sources.knowledge,
      },
      {
        value: "ca. 30 %",
        label: "Fluktuation p. a. in Logistik & Transport in Deutschland — jede Kündigung startet die Einarbeitung neu",
        source: sources.turnoverCost,
      },
      {
        value: "120.000",
        label: "fehlende Lkw-Fahrer in Deutschland — die verbleibenden Menschen müssen mehr tragen",
        source: sources.drivers,
      },
    ],
  },
  beforeAfter: {
    eyebrow: "Vorher vs. nachher",
    title: "Erkennen Sie Ihren eigenen Betrieb wieder.",
    intro:
      "Das ist keine Funktionsliste. Es ist der Unterschied zwischen der Schicht von heute und der Schicht, in der das Wissen antwortet.",
    beforeTitle: "Heute, ohne OPSQAI",
    afterTitle: "Mit installiertem OPSQAI",
    before: [
      "PDFs verstreut auf Netzlaufwerken, in Postfächern und auf einzelnen Desktops",
      "Zwei Versionen derselben SOP im Umlauf — niemand weiß, welche gilt",
      "Dieselbe Frage zwanzig Mal, immer an dieselbe erfahrene Kollegin",
      "Neue Mitarbeitende laufen wochenlang mit, weil der Prozess nur in Köpfen existiert",
      "Eine Auditanfrage bedeutet Stunden Suche nach Dokumenten und Nachweisen",
      "Mitarbeitende kopieren operative Dokumente in öffentliche KI-Tools, um schnell eine Antwort zu bekommen",
    ],
    after: [
      "Eine versionierte Wissensbasis mit dem freigegebenen Dokument als einziger Quelle",
      "Antworten nennen Dokument und Abschnitt — und verweigern, wenn keine Quelle die Frage deckt",
      "Der Assistent beantwortet die Routinefrage; Ihre Fachkraft übernimmt die Ausnahme",
      "Einarbeitung als strukturierte Academy-Pfade mit Lektionen, Tests und Zertifikaten",
      "SOP-Bestätigungen, KI-Audit-Protokoll und Audit-Exporte werden erzeugt, nicht rekonstruiert",
      "Nichts verlässt das Unternehmen: lokale Datenbank, lokale Embeddings, eigener KI-Anbieter",
    ],
    note:
      "Die rechte Spalte beschreibt, was das installierte Produkt heute leistet. Wie schnell Ihre Einarbeitung wird, messen wir in Ihrem Pilot — wir geben keine Zahlen anderer Unternehmen als Ihre aus.",
  },
  calculator: {
    eyebrow: "Kosten des Status quo",
    title: "Machen Sie eine Zahl daraus — mit Ihren eigenen Werten.",
    intro:
      "Dieser Rechner nutzt ausschließlich Ihre Eingaben. Er verspricht keine Einsparung, sondern zeigt, was die aktuelle Situation pro Jahr kostet. Starten Sie mit den Vorgaben und ersetzen Sie sie durch Ihre Realität.",
    fields: {
      employees: "Mitarbeitende, die Verfahren suchen oder nachfragen",
      hourlyCost: "Durchschnittliche Vollkosten pro Stunde (EUR)",
      minutes: "Verlorene Minuten pro Person und Tag durch Suchen oder Nachfragen",
      leavers: "Abgänge pro Jahr",
      leaverCost: "Kosten pro Abgang inkl. Recruiting & Einarbeitung (EUR)",
    },
    results: {
      hours: "Verlorene Stunden pro Jahr",
      searchCost: "Jährliche Suchkosten",
      turnoverCost: "Jährliche Kosten für Fluktuation & Wiedereinarbeitung",
      total: "Gesamtes Jahresrisiko",
    },
    assumption:
      "Die Vorgaben sind Platzhalter, keine Behauptungen: Die Fluktuation in der deutschen Logistik liegt bei rund 30 % p. a., mit typischen Kosten im Bereich mehrerer Zehntausend Euro pro Abgang. Angenommene Arbeitstage: 220 pro Jahr.",
    disclaimer:
      "OPSQAI beseitigt diese Kosten nicht automatisch. Es beseitigt das Suchen und das Raten; der Rest hängt von Ihren Prozessen ab. Genau das misst ein 30-Tage-Pilot.",
    cta: "Im 30-Tage-Pilot messen",
  },
  roles: {
    eyebrow: "Wo es weh tut",
    title: "Drei Menschen, die das täglich spüren.",
    items: [
      {
        role: "Logistik- / Lagerleitung",
        pain: "Falsche Palette, falsches Label, falsche Ladereihenfolge — jeder Fehler kostet Korrektur, Retoure oder Kundenanruf. Das richtige Verfahren existierte; es war nur nicht zur Hand.",
        fix: "Antworten mit dem freigegebenen Verfahren, wöchentliche Prüflisten, Ampeln für ablaufende Fahrzeug- und Fahrerdokumente sowie Vorfälle mit Nachweisen.",
        product: "Core + OPSQAI Transport",
      },
      {
        role: "Operations Director",
        pain: "Wissen steckt in wenigen erfahrenen Personen. Fällt eine aus, sinkt der Durchsatz und niemand kann belegen, welcher Prozess befolgt wurde.",
        fix: "Eine versionierte Wissensbasis, SOP-Bestätigungen, ein hash-verkettetes KI-Audit und ein Control Center mit offenen, überfälligen und ablaufenden Punkten.",
        product: "Core-Plattform",
      },
      {
        role: "HR-Leitung",
        pain: "Verträge von Hand getippt, Onboarding in Excel, Lebensläufe in fünf Sprachen, Schulungsnachweise, die vor einer Prüfung niemand findet.",
        fix: "Länderspezifische Dokumentenerstellung mit Prüfung und Freigabe, Onboarding- und Offboarding-Abläufe, Ausstattungspakete, Schulungsmatrix und mehrsprachige CV-Analyse mit editierbaren, quellenbezogenen Feldern.",
        product: "Core + OPSQAI HR",
      },
    ],
  },
  proof: {
    eyebrow: "Mechanismus → Wirkung",
    title: "Was die Technik Ihnen tatsächlich bringt.",
    intro:
      "Lokale KI, Retrieval und signierte Lizenzen sind Mechanismen. Hier steht die geschäftliche Wirkung — und wo wir bewusst kein Versprechen abgeben.",
    items: [
      {
        mechanism: "Belegte Antworten mit Quellenangabe, Verweigerung ohne Quelle",
        consequence: "Weniger teure Fehler durch veraltete oder erfundene Anweisungen. Jede Antwort ist gegen ihr Dokument prüfbar.",
      },
      {
        mechanism: "Academy-Pfade, Lektionen, Tests, Zertifikate",
        consequence: "Neue Mitarbeitende lernen aus denselben freigegebenen Verfahren, die der Betrieb wirklich nutzt — statt wochenlang mitzulaufen.",
      },
      {
        mechanism: "Versionierte SOPs, Bestätigungen, KI-Audit, Exporte",
        consequence: "Auditnachweise entstehen laufend; eine Anfrage wird zum Export statt zur Wochenaufgabe.",
      },
      {
        mechanism: "Läuft auf Ihrem Windows Server, lokales PostgreSQL, lokale Embeddings, eigener KI-Anbieter — inklusive vollständig lokalem Ollama-Modell",
        consequence: "Kein operatives Dokument wandert in einen öffentlichen KI-Tenant. Das Datenschutzrisiko bleibt in Ihrer eigenen Grenze.",
      },
      {
        mechanism: "Prüflisten, Ablaufüberwachung, Vorfälle, Flotten- und Dienstregister",
        consequence: "Versäumnisse werden sichtbar, bevor daraus ein Bußgeld oder ein Ausfall wird. OPSQAI Transport ersetzt kein WMS oder TMS — es steuert die Verfahren und Dokumente darum.",
      },
    ],
    honest: "Wo wir keine Daten haben, behaupten wir nichts.",
    honestBody:
      "OPSQAI hat noch keine veröffentlichten Kundenreferenzen und behauptet keine Zertifizierung, die es nicht besitzt. Jede Wirkung oben ist eine Eigenschaft des ausgelieferten Produkts; die Größe der Wirkung in Ihrem Betrieb zeigt der Pilot.",
  },
  risk: {
    eyebrow: "Compliance-Risiko",
    title: "Die schnellste Antwort ist oft die teuerste.",
    body:
      "Wenn das Verfahren schwer zu finden ist, improvisieren Mitarbeitende — auch mit dem Einfügen operativer Dokumente in öffentliche KI-Tools. Die DSGVO-Durchsetzung in Europa ist Jahr für Jahr gewachsen, die Bußgelder sind öffentlich dokumentiert. OPSQAI nimmt den Anreiz zum Improvisieren: Die Antwort liegt im Unternehmen, auf eigener Hardware, mit Audit-Eintrag.",
    points: [
      "Dokumente, Embeddings, Chats und Nutzer bleiben in Ihrer Installation",
      "KI-Anbieter und Schlüssel gehören Ihnen — ein vollständig lokales Modell ist unterstützt",
      "Jede KI-Interaktion wird mit Eingaben, Ausgaben, Quellen und Nutzer protokolliert",
    ],
    sources: [sources.gdpr, sources.gdprDla],
  },
  sourceLabel: "Quelle",
  sourcesLabel: "Quellen",
};

const ro: PainCopy = {
  hero: {
    eyebrow: "Cunoștințe operaționale, sub control",
    h1a: "Procedurile tale există.",
    h1b: "Nimeni nu le găsește la timp —",
    serifAccent: "și asta costă bani.",
    intro:
      "În fiecare tură, cineva pune o întrebare la care există deja răspuns într-un document de pe un server. Cineva lucrează după o procedură veche. Un angajat nou are nevoie de trei săptămâni până devine productiv. Un audit se transformă în vânătoare de documente. OPSQAI rulează în mediul tău Windows și răspunde la aceste întrebări din documentele tale aprobate — cu sursa atașată, sau deloc.",
    primary: "Începe pilotul gratuit de 30 de zile",
    secondary: "Calculează cât te costă",
    tertiary: "Vezi cum funcționează",
    costs: [
      {
        value: "47%",
        label: "spun că informația fragmentată e cel mai mare obstacol de productivitate",
        source: sources.knowledge,
      },
      {
        value: "~30%",
        label: "fluctuație anuală în logistica și transportul din Germania — fiecare plecare reia integrarea de la zero",
        source: sources.turnoverCost,
      },
      {
        value: "120.000",
        label: "șoferi lipsă în Germania — oamenii care rămân duc mai mult, mai repede",
        source: sources.drivers,
      },
    ],
  },
  beforeAfter: {
    eyebrow: "Înainte vs. după",
    title: "Recunoaște-ți propria operațiune.",
    intro:
      "Nu e o listă de funcții. E diferența dintre tura de azi și tura în care cunoștințele răspund singure.",
    beforeTitle: "Azi, fără OPSQAI",
    afterTitle: "Cu OPSQAI instalat",
    before: [
      "PDF-uri împrăștiate pe servere, în mailuri și pe desktopul cuiva",
      "Două versiuni ale aceleiași proceduri în circulație — nimeni nu știe care e validă",
      "Aceeași întrebare pusă de douăzeci de ori, mereu aceluiași coleg cu experiență",
      "Angajații noi stau săptămâni pe lângă cineva, pentru că procesul există doar în capul oamenilor",
      "O cerere de audit înseamnă ore de căutat documente și dovezi",
      "Angajații lipesc documente operaționale în unelte AI publice ca să obțină repede un răspuns",
    ],
    after: [
      "O singură bază de cunoștințe, versionată, cu documentul aprobat ca unică sursă",
      "Răspunsurile citează documentul și secțiunea — și refuză când nicio sursă nu acoperă întrebarea",
      "Asistentul răspunde la întrebarea de rutină; specialistul tău se ocupă de excepție",
      "Integrarea rulează ca trasee Academy cu lecții, teste și certificate",
      "Confirmările de proceduri, jurnalul AI și exporturile de audit se generează, nu se reconstruiesc",
      "Nimic nu iese din firmă: bază de date locală, embedding-uri locale, propriul furnizor AI",
    ],
    note:
      "Coloana din dreapta descrie ce face produsul instalat astăzi. Cât de repede devine integrarea la tine se măsoară în pilotul tău — nu prezentăm cifrele altor firme ca fiind ale tale.",
  },
  calculator: {
    eyebrow: "Costul situației actuale",
    title: "Pune o cifră pe asta — cu datele tale.",
    intro:
      "Calculatorul folosește doar ce introduci tu. Nu promite economii; arată cât costă situația actuală pe an. Pornește de la valorile implicite și înlocuiește-le cu realitatea ta.",
    fields: {
      employees: "Angajați care caută proceduri sau întreabă",
      hourlyCost: "Cost mediu total pe oră (EUR)",
      minutes: "Minute pierdute pe persoană pe zi cu căutat sau întrebat",
      leavers: "Plecări pe an",
      leaverCost: "Cost per plecare, inclusiv recrutare și integrare (EUR)",
    },
    results: {
      hours: "Ore pierdute pe an cu căutarea",
      searchCost: "Cost anual al căutării",
      turnoverCost: "Cost anual al fluctuației și reintegrării",
      total: "Expunere totală pe an",
    },
    assumption:
      "Valorile implicite sunt doar repere, nu afirmații: fluctuația în logistica germană e în jur de 30% pe an, cu un cost tipic de zeci de mii de euro per plecare. Zile lucrătoare presupuse: 220 pe an.",
    disclaimer:
      "OPSQAI nu elimină automat aceste costuri. Elimină căutarea și ghicitul; restul depinde de procesele tale. Exact asta măsoară un pilot de 30 de zile.",
    cta: "Măsoară într-un pilot de 30 de zile",
  },
  roles: {
    eyebrow: "Unde doare",
    title: "Trei oameni care simt asta zilnic.",
    items: [
      {
        role: "Manager logistică / depozit",
        pain: "Palet greșit, etichetă greșită, ordine de încărcare greșită — fiecare eroare costă o corecție, un retur sau un telefon de la client. Procedura corectă exista; doar nu era la îndemână.",
        fix: "Răspunsuri cu procedura aprobată atașată, verificări săptămânale, semafoare pentru documente de vehicul și șofer care expiră, incidente cu dovezi.",
        product: "Core + OPSQAI Transport",
      },
      {
        role: "Operations Director",
        pain: "Cunoștințele stau în câțiva oameni cu experiență. Când unul lipsește, scade productivitatea și nimeni nu poate dovedi ce proces a fost respectat.",
        fix: "O bază de cunoștințe versionată, confirmări de proceduri, jurnal AI înlănțuit prin hash și un centru de control cu ce e deschis, întârziat sau pe cale să expire.",
        product: "Platforma Core",
      },
      {
        role: "Manager HR",
        pain: "Contracte scrise manual, integrare urmărită în Excel, CV-uri în cinci limbi, certificate de instruire pe care nimeni nu le găsește înainte de un control.",
        fix: "Generare de documente în funcție de țară, cu verificare și aprobare, fluxuri de onboarding și offboarding, pachete de echipament, matrice de instruire și analiză CV multilingvă cu câmpuri editabile și referințe la sursă.",
        product: "Core + OPSQAI HR",
      },
    ],
  },
  proof: {
    eyebrow: "Mecanism → consecință",
    title: "Ce îți aduce de fapt tehnologia.",
    intro:
      "AI local, regăsire și licențe semnate sunt mecanisme. Aici e consecința de business a fiecăruia — și unde nu promitem nimic.",
    items: [
      {
        mechanism: "Răspunsuri fundamentate, cu citare, și refuz când nu există sursă",
        consequence: "Mai puține greșeli scumpe din instrucțiuni vechi sau inventate. Fiecare răspuns poate fi verificat în documentul din care vine.",
      },
      {
        mechanism: "Trasee Academy, lecții, teste, certificate",
        consequence: "Angajații noi învață din exact procedurile aprobate folosite în operațiune, nu stau săptămâni pe lângă un coleg.",
      },
      {
        mechanism: "Proceduri versionate, confirmări, jurnal AI, exporturi",
        consequence: "Dovezile de audit se produc continuu, așa că o cerere devine un export, nu o săptămână de căutat.",
      },
      {
        mechanism: "Rulează pe serverul tău Windows, PostgreSQL local, embedding-uri locale, furnizorul tău de AI — inclusiv model Ollama complet local",
        consequence: "Niciun document operațional nu ajunge într-un cont AI public. Riscul de protecție a datelor rămâne în granița pe care o controlezi deja.",
      },
      {
        mechanism: "Verificări de proceduri, urmărire expirări, incidente, registre de flotă și tură",
        consequence: "Omisiunile apar înainte să devină amendă sau opriri. OPSQAI Transport nu înlocuiește WMS sau TMS — guvernează procedurile și documentele din jurul lor.",
      },
    ],
    honest: "Unde nu avem date, nu afirmăm nimic.",
    honestBody:
      "OPSQAI nu are încă studii de caz publicate și nu revendică certificări pe care nu le deține. Fiecare efect de mai sus e o proprietate a produsului livrat; mărimea efectului la tine se vede în pilot.",
  },
  risk: {
    eyebrow: "Expunere de conformitate",
    title: "Cel mai rapid răspuns e adesea cel mai scump.",
    body:
      "Când procedura e greu de găsit, oamenii improvizează — inclusiv lipind documente operaționale în unelte AI publice. Aplicarea GDPR în Europa a crescut an după an, iar amenzile sunt documentate public. OPSQAI scoate motivul de a improviza: răspunsul e în firmă, pe hardware-ul firmei, cu înregistrare în audit.",
    points: [
      "Documentele, embedding-urile, conversațiile și utilizatorii rămân în instalarea ta",
      "Furnizorul AI și cheile sunt ale tale — un model complet local e suportat",
      "Fiecare interacțiune AI e înregistrată cu intrări, ieșiri, surse și utilizator",
    ],
    sources: [sources.gdpr, sources.gdprDla],
  },
  sourceLabel: "Sursă",
  sourcesLabel: "Surse",
};

export const painSources = sources;

export function usePainCopy(): PainCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
