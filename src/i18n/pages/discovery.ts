// OPSQAI Discovery positioning copy (EN/DE/RO): problem-first homepage hero,
// the four-step model, the anti-comparison band and the /discovery page.
//
// Rule: no invented customer results, no competitor naming on the page,
// no promises the product cannot keep. Discovery deliverables are described
// exactly as delivered.
import { useT } from "@/i18n";

const en = {
  hero: {
    eyebrow: "OPSQAI — Your Workspace",
    h1a: "Built around",
    h1b: "your problems.",
    serifAccent: "Not around our software.",
    intro:
      "You tell us the problem. We analyze the root cause. We design the solution. We build it into your OPSQAI Workspace — one workspace your employees actually use, adapted to the way your company really works.",
    line1: "You tell us the problem.",
    line2: "We analyze the root cause.",
    line3: "We design the solution.",
    line4: "We build it into your OPSQAI Workspace.",
    primary: "Start with Discovery",
    secondary: "Calculate what the problem costs",
    tertiary: "See the 30-day pilot",
  },
  steps: {
    eyebrow: "How it works",
    title: "Problem → Diagnosis → Solution → Workspace.",
    intro:
      "You don't need to know which software you need. You only need to know one thing: “this hurts.” OPSQAI turns that pain into an operational solution.",
    items: [
      {
        step: "01",
        name: "Problem",
        body: "A working session with your team. You describe what hurts — lost hours, repeated errors, slow onboarding, audit stress. We listen, we don't pitch.",
      },
      {
        step: "02",
        name: "Diagnosis",
        body: "We find the root cause behind the symptom: where knowledge breaks, which procedure fails, which step eats the hours. Written down, in plain language.",
      },
      {
        step: "03",
        name: "Solution design",
        body: "We design the workspace that removes the cause — and only that. The exact OPSQAI modules that solve your problem, nothing you don't need.",
      },
      {
        step: "04",
        name: "Workspace",
        body: "We build it into your OPSQAI Workspace, installed on your own Windows environment. Your employees use one workspace shaped around how your company actually works.",
      },
    ],
  },
  painToSolution: {
    eyebrow: "You don't buy software",
    title: "You describe the pain. We deliver the fix.",
    intro:
      "Every OPSQAI engagement starts from a sentence that begins with “we keep losing…”. These are real starting points we are built for.",
    pains: [
      {
        pain: "“We keep losing hours searching for procedures.”",
        solution:
          "A knowledge workspace that answers from your approved documents, with the source attached — or refuses when no source exists.",
      },
      {
        pain: "“Every new colleague needs weeks before they're useful.”",
        solution:
          "Academy onboarding paths built from your own procedures, with lessons, quizzes and certificates — measured in days during your pilot.",
      },
      {
        pain: "“An audit means a week of hunting for proof.”",
        solution:
          "Versioned procedures, acknowledgements and a hash-chained audit trail — evidence is produced continuously, exported on request.",
      },
      {
        pain: "“We can't let operational data leave the company.”",
        solution:
          "The entire workspace runs on your own Windows environment — local database, local embeddings, your AI provider, including a fully local model.",
      },
    ],
  },
  antiCompare: {
    eyebrow: "Why this is different",
    title: "We don't compete on feature lists.",
    body: "The big platforms ask you to compare software. We ask a different question: what is the problem? OPSQAI doesn't start from a product catalogue — it starts from your diagnosis, and the workspace is built from it. If a module doesn't solve your problem, it isn't in your workspace.",
    points: [
      "No generic suite to adapt to — the workspace is shaped from your diagnosis",
      "No paying for modules you don't need — the configuration comes from the root cause",
      "No months of implementation theatre — the pilot proves it in 30 days",
    ],
  },
  discovery: {
    meta: {
      title: "OPSQAI Discovery — Problem → Diagnosis → Solution → Workspace",
      description:
        "You tell us the problem. OPSQAI Discovery delivers a written diagnosis, a proposed workspace configuration, a value estimate and a direct path into a 30-day pilot — before you commit to anything.",
    },
    eyebrow: "OPSQAI Discovery",
    h1a: "Start with the problem.",
    h1b: "Not with the software.",
    intro:
      "Discovery is the first step of every OPSQAI engagement. You bring one sentence — “this hurts” — and we return a diagnosis, a designed solution and a workspace proposal. You decide what happens next.",
    deliverablesTitle: "What you receive",
    deliverables: [
      {
        name: "Written diagnosis report",
        body: "The problem, the root cause behind it and the proposed solution — a document you own and can walk away with, no strings attached.",
      },
      {
        name: "Proposed workspace configuration",
        body: "The exact OPSQAI modules that solve your problem — Core, Transport, HR and the rest, only where they fit. Nothing you don't need.",
      },
      {
        name: "Value estimate",
        body: "A transparent estimate of what the problem costs you today and what the workspace is worth — an estimate, not a promise. Your numbers, your reality.",
      },
      {
        name: "Direct path into the pilot",
        body: "If the diagnosis convinces you, Discovery flows straight into a 30-day pilot with a workspace pre-configured around your problem.",
      },
    ],
    notTitle: "What Discovery is not",
    notItems: [
      "Not a long, expensive audit that ends in a slide deck",
      "Not generic consulting — every recommendation lands in a concrete workspace configuration",
      "Not a commitment — the diagnosis report is yours even if you stop there",
    ],
    ctaTitle: "Tell us what hurts.",
    ctaBody:
      "One sentence is enough to start. Describe the problem in the contact form and we come back with the first diagnostic questions.",
    ctaPrimary: "Request a Discovery session",
    ctaSecondary: "See what the problem costs",
    formHint:
      "Use the contact form and start your message with “Our problem is…”. We take it from there.",
  },
  pilotNote: {
    title: "Every pilot starts with Discovery.",
    body: "We don't install software and hope. We diagnose the problem first, then configure your pilot workspace around it — so the 30 days measure what actually matters to you.",
    cta: "Learn about Discovery",
  },
  pricingNote: {
    title: "Pricing follows the diagnosis.",
    body: "Your final configuration — and its price — is defined during OPSQAI Discovery, around the problems your workspace must actually solve. The figures below are the building blocks, not the offer.",
    cta: "Start with Discovery",
  },
};

export type DiscoveryCopy = typeof en;

const de: DiscoveryCopy = {
  hero: {
    eyebrow: "OPSQAI — Ihr Workspace",
    h1a: "Gebaut um",
    h1b: "Ihre Probleme.",
    serifAccent: "Nicht um unsere Software.",
    intro:
      "Sie nennen uns das Problem. Wir analysieren die Grundursache. Wir entwerfen die Lösung. Wir bauen sie in Ihren OPSQAI Workspace — ein Arbeitsbereich, den Ihre Mitarbeitenden wirklich nutzen, abgestimmt auf die Arbeitsweise Ihres Unternehmens.",
    line1: "Sie nennen uns das Problem.",
    line2: "Wir analysieren die Grundursache.",
    line3: "Wir entwerfen die Lösung.",
    line4: "Wir bauen sie in Ihren OPSQAI Workspace.",
    primary: "Mit Discovery starten",
    secondary: "Kosten des Problems berechnen",
    tertiary: "30-Tage-Pilot ansehen",
  },
  steps: {
    eyebrow: "So funktioniert es",
    title: "Problem → Diagnose → Lösung → Workspace.",
    intro:
      "Sie müssen nicht wissen, welche Software Sie brauchen. Sie müssen nur eines wissen: „Das tut weh.“ OPSQAI verwandelt diesen Schmerz in eine operative Lösung.",
    items: [
      {
        step: "01",
        name: "Problem",
        body: "Eine Arbeitssitzung mit Ihrem Team. Sie beschreiben, was weh tut — verlorene Stunden, wiederkehrende Fehler, langsame Einarbeitung, Audit-Stress. Wir hören zu, wir verkaufen nicht.",
      },
      {
        step: "02",
        name: "Diagnose",
        body: "Wir finden die Grundursache hinter dem Symptom: wo Wissen bricht, welches Verfahren versagt, welcher Schritt die Stunden frisst. Schriftlich, in klarer Sprache.",
      },
      {
        step: "03",
        name: "Lösungsdesign",
        body: "Wir entwerfen den Workspace, der die Ursache beseitigt — und nur diese. Genau die OPSQAI-Module, die Ihr Problem lösen, nichts, das Sie nicht brauchen.",
      },
      {
        step: "04",
        name: "Workspace",
        body: "Wir bauen ihn in Ihren OPSQAI Workspace, installiert in Ihrer eigenen Windows-Umgebung. Ihre Mitarbeitenden nutzen einen Arbeitsbereich, geformt nach der Arbeitsweise Ihres Unternehmens.",
      },
    ],
  },
  painToSolution: {
    eyebrow: "Sie kaufen keine Software",
    title: "Sie beschreiben den Schmerz. Wir liefern die Lösung.",
    intro:
      "Jede OPSQAI-Zusammenarbeit beginnt mit einem Satz, der mit „wir verlieren ständig…“ anfängt. Das sind echte Ausgangslagen, für die wir gebaut sind.",
    pains: [
      {
        pain: "„Wir verlieren ständig Stunden bei der Suche nach Verfahren.“",
        solution:
          "Ein Wissens-Workspace, der aus Ihren freigegebenen Dokumenten antwortet, mit Quellenangabe — oder verweigert, wenn keine Quelle existiert.",
      },
      {
        pain: "„Jede neue Kollegin braucht Wochen, bis sie produktiv ist.“",
        solution:
          "Academy-Onboarding-Pfade aus Ihren eigenen Verfahren, mit Lektionen, Tests und Zertifikaten — im Pilot in Tagen gemessen.",
      },
      {
        pain: "„Ein Audit bedeutet eine Woche Suche nach Nachweisen.“",
        solution:
          "Versionierte Verfahren, Bestätigungen und ein hash-verkettetes Audit-Protokoll — Nachweise entstehen laufend und werden auf Anfrage exportiert.",
      },
      {
        pain: "„Wir dürfen operative Daten nicht aus dem Haus geben.“",
        solution:
          "Der gesamte Workspace läuft in Ihrer eigenen Windows-Umgebung — lokale Datenbank, lokale Embeddings, Ihr KI-Anbieter, inklusive vollständig lokalem Modell.",
      },
    ],
  },
  antiCompare: {
    eyebrow: "Warum das anders ist",
    title: "Wir konkurrieren nicht über Funktionslisten.",
    body: "Die großen Plattformen fordern Sie zum Software-Vergleich auf. Wir stellen eine andere Frage: Was ist das Problem? OPSQAI startet nicht aus einem Produktkatalog — es startet aus Ihrer Diagnose, und der Workspace wird daraus gebaut. Wenn ein Modul Ihr Problem nicht löst, ist es nicht in Ihrem Workspace.",
    points: [
      "Keine generische Suite, an die Sie sich anpassen müssen — der Workspace entsteht aus Ihrer Diagnose",
      "Keine Bezahlung für Module, die Sie nicht brauchen — die Konfiguration folgt der Grundursache",
      "Kein monatelanges Implementierungstheater — der Pilot beweist es in 30 Tagen",
    ],
  },
  discovery: {
    meta: {
      title: "OPSQAI Discovery — Problem → Diagnose → Lösung → Workspace",
      description:
        "Sie nennen uns das Problem. OPSQAI Discovery liefert eine schriftliche Diagnose, eine vorgeschlagene Workspace-Konfiguration, eine Wertschätzung und den direkten Weg in einen 30-Tage-Pilot — bevor Sie sich festlegen.",
    },
    eyebrow: "OPSQAI Discovery",
    h1a: "Beginnen Sie mit dem Problem.",
    h1b: "Nicht mit der Software.",
    intro:
      "Discovery ist der erste Schritt jeder OPSQAI-Zusammenarbeit. Sie bringen einen Satz mit — „das tut weh“ — und wir liefern eine Diagnose, eine entworfene Lösung und einen Workspace-Vorschlag. Sie entscheiden, was danach passiert.",
    deliverablesTitle: "Was Sie erhalten",
    deliverables: [
      {
        name: "Schriftlicher Diagnosebericht",
        body: "Das Problem, die Grundursache dahinter und die vorgeschlagene Lösung — ein Dokument, das Ihnen gehört und mit dem Sie gehen können, ohne Verpflichtung.",
      },
      {
        name: "Vorgeschlagene Workspace-Konfiguration",
        body: "Genau die OPSQAI-Module, die Ihr Problem lösen — Core, Transport, HR und die übrigen, nur wo sie passen. Nichts, das Sie nicht brauchen.",
      },
      {
        name: "Wertschätzung",
        body: "Eine transparente Schätzung, was das Problem Sie heute kostet und was der Workspace wert ist — eine Schätzung, kein Versprechen. Ihre Zahlen, Ihre Realität.",
      },
      {
        name: "Direkter Weg in den Pilot",
        body: "Wenn die Diagnose überzeugt, fließt Discovery direkt in einen 30-Tage-Pilot mit einem Workspace, der auf Ihr Problem vorkonfiguriert ist.",
      },
    ],
    notTitle: "Was Discovery nicht ist",
    notItems: [
      "Kein langes, teures Audit, das in einer Präsentation endet",
      "Keine generische Beratung — jede Empfehlung mündet in eine konkrete Workspace-Konfiguration",
      "Keine Verpflichtung — der Diagnosebericht gehört Ihnen, auch wenn Sie dort aufhören",
    ],
    ctaTitle: "Sagen Sie uns, was weh tut.",
    ctaBody:
      "Ein Satz genügt für den Anfang. Beschreiben Sie das Problem im Kontaktformular und wir kommen mit den ersten Diagnosefragen zurück.",
    ctaPrimary: "Discovery-Sitzung anfragen",
    ctaSecondary: "Kosten des Problems ansehen",
    formHint:
      "Nutzen Sie das Kontaktformular und beginnen Sie Ihre Nachricht mit „Unser Problem ist…“. Wir übernehmen von dort.",
  },
  pilotNote: {
    title: "Jeder Pilot beginnt mit Discovery.",
    body: "Wir installieren keine Software auf gut Glück. Wir diagnostizieren zuerst das Problem und konfigurieren dann Ihren Pilot-Workspace darum — damit die 30 Tage messen, was für Sie wirklich zählt.",
    cta: "Mehr über Discovery",
  },
  pricingNote: {
    title: "Der Preis folgt der Diagnose.",
    body: "Ihre endgültige Konfiguration — und ihr Preis — wird im OPSQAI Discovery definiert, rund um die Probleme, die Ihr Workspace tatsächlich lösen muss. Die Beträge unten sind Bausteine, nicht das Angebot.",
    cta: "Mit Discovery starten",
  },
};

const ro: DiscoveryCopy = {
  hero: {
    eyebrow: "OPSQAI — Workspace-ul tău",
    h1a: "Construit în jurul",
    h1b: "problemelor tale.",
    serifAccent: "Nu în jurul software-ului nostru.",
    intro:
      "Tu ne spui problema. Noi analizăm cauza de rădăcină. Proiectăm soluția. O construim în OPSQAI Workspace-ul tău — un singur spațiu de lucru pe care angajații tăi îl folosesc cu adevărat, adaptat felului în care compania ta lucrează de fapt.",
    line1: "Tu ne spui problema.",
    line2: "Noi analizăm cauza de rădăcină.",
    line3: "Proiectăm soluția.",
    line4: "O construim în OPSQAI Workspace-ul tău.",
    primary: "Începe cu Discovery",
    secondary: "Calculează cât costă problema",
    tertiary: "Vezi pilotul de 30 de zile",
  },
  steps: {
    eyebrow: "Cum funcționează",
    title: "Problemă → Diagnostic → Soluție → Workspace.",
    intro:
      "Nu trebuie să știi ce software îți trebuie. Trebuie să știi un singur lucru: „asta mă doare”. OPSQAI transformă durerea într-o soluție operațională.",
    items: [
      {
        step: "01",
        name: "Problema",
        body: "O sesiune de lucru cu echipa ta. Tu descrii ce doare — ore pierdute, erori repetate, integrare lentă, stres de audit. Noi ascultăm, nu vindem.",
      },
      {
        step: "02",
        name: "Diagnosticul",
        body: "Găsim cauza de rădăcină din spatele simptomului: unde se rupe informația, ce procedură cedează, ce pas mănâncă orele. În scris, în limbaj clar.",
      },
      {
        step: "03",
        name: "Proiectarea soluției",
        body: "Proiectăm workspace-ul care elimină cauza — și doar pe aceea. Exact modulele OPSQAI care rezolvă problema ta, nimic de care nu ai nevoie.",
      },
      {
        step: "04",
        name: "Workspace-ul",
        body: "Îl construim în OPSQAI Workspace-ul tău, instalat în mediul tău Windows. Angajații tăi folosesc un singur spațiu de lucru, modelat după felul în care compania ta lucrează de fapt.",
      },
    ],
  },
  painToSolution: {
    eyebrow: "Nu cumperi software",
    title: "Tu descrii durerea. Noi livrăm rezolvarea.",
    intro:
      "Fiecare colaborare OPSQAI pornește de la o frază care începe cu „tot pierdem…”. Acestea sunt puncte de plecare reale pentru care suntem construiți.",
    pains: [
      {
        pain: "„Tot pierdem ore căutând proceduri.”",
        solution:
          "Un workspace de cunoștințe care răspunde din documentele tale aprobate, cu sursa atașată — sau refuză când nu există sursă.",
      },
      {
        pain: "„Fiecărui coleg nou îi trebuie săptămâni până devine util.”",
        solution:
          "Trasee Academy de integrare construite din propriile tale proceduri, cu lecții, teste și certificate — măsurat în zile, în pilotul tău.",
      },
      {
        pain: "„Un audit înseamnă o săptămână de căutat dovezi.”",
        solution:
          "Proceduri versionate, confirmări și un jurnal de audit înlănțuit prin hash — dovezile se produc continuu și se exportă la cerere.",
      },
      {
        pain: "„Nu putem lăsa datele operaționale să iasă din firmă.”",
        solution:
          "Tot workspace-ul rulează în mediul tău Windows — bază de date locală, embedding-uri locale, furnizorul tău de AI, inclusiv un model complet local.",
      },
    ],
  },
  antiCompare: {
    eyebrow: "De ce e diferit",
    title: "Nu concurăm pe liste de funcții.",
    body: "Platformele mari te invită să compari software. Noi punem o altă întrebare: care e problema? OPSQAI nu pornește dintr-un catalog de produse — pornește din diagnosticul tău, iar workspace-ul se construiește din el. Dacă un modul nu rezolvă problema ta, nu e în workspace-ul tău.",
    points: [
      "Fără o suită generică la care să te adaptezi — workspace-ul se naște din diagnosticul tău",
      "Fără plata unor module de care nu ai nevoie — configurația urmează cauza de rădăcină",
      "Fără luni de teatru de implementare — pilotul demonstrează în 30 de zile",
    ],
  },
  discovery: {
    meta: {
      title: "OPSQAI Discovery — Problemă → Diagnostic → Soluție → Workspace",
      description:
        "Tu ne spui problema. OPSQAI Discovery livrează un diagnostic scris, o configurație de workspace propusă, o estimare de valoare și trecerea directă într-un pilot de 30 de zile — înainte să te angajezi la ceva.",
    },
    eyebrow: "OPSQAI Discovery",
    h1a: "Începe cu problema.",
    h1b: "Nu cu software-ul.",
    intro:
      "Discovery este primul pas al fiecărei colaborări OPSQAI. Tu vii cu o frază — „asta mă doare” — iar noi întoarcem un diagnostic, o soluție proiectată și o propunere de workspace. Tu decizi ce urmează.",
    deliverablesTitle: "Ce primești",
    deliverables: [
      {
        name: "Raport de diagnostic scris",
        body: "Problema, cauza de rădăcină din spatele ei și soluția propusă — un document care îți aparține și cu care poți pleca, fără nicio obligație.",
      },
      {
        name: "Configurația de workspace propusă",
        body: "Exact modulele OPSQAI care rezolvă problema ta — Core, Transport, HR și restul, doar unde se potrivesc. Nimic de care nu ai nevoie.",
      },
      {
        name: "Estimare de valoare",
        body: "O estimare transparentă a cât te costă problema azi și cât valorează workspace-ul — o estimare, nu o promisiune. Cifrele tale, realitatea ta.",
      },
      {
        name: "Trecere directă în pilot",
        body: "Dacă diagnosticul te convinge, Discovery curge direct într-un pilot de 30 de zile, cu un workspace preconfigurat pe problema ta.",
      },
    ],
    notTitle: "Ce nu este Discovery",
    notItems: [
      "Nu e un audit lung și scump care se termină cu o prezentare",
      "Nu e consultanță generică — fiecare recomandare ajunge într-o configurație concretă de workspace",
      "Nu e un angajament — raportul de diagnostic e al tău chiar dacă te oprești aici",
    ],
    ctaTitle: "Spune-ne ce te doare.",
    ctaBody:
      "O singură frază e de ajuns pentru început. Descrie problema în formularul de contact și revenim cu primele întrebări de diagnostic.",
    ctaPrimary: "Cere o sesiune Discovery",
    ctaSecondary: "Vezi cât costă problema",
    formHint:
      "Folosește formularul de contact și începe mesajul cu „Problema noastră este…”. De acolo preluăm noi.",
  },
  pilotNote: {
    title: "Fiecare pilot începe cu Discovery.",
    body: "Nu instalăm software și sperăm. Mai întâi diagnosticăm problema, apoi configurăm workspace-ul de pilot în jurul ei — ca cele 30 de zile să măsoare ce contează cu adevărat pentru tine.",
    cta: "Află despre Discovery",
  },
  pricingNote: {
    title: "Prețul urmează diagnosticul.",
    body: "Configurația finală — și prețul ei — se definește în OPSQAI Discovery, în jurul problemelor pe care workspace-ul tău trebuie de fapt să le rezolve. Cifrele de mai jos sunt piesele de construcție, nu oferta.",
    cta: "Începe cu Discovery",
  },
};

export const discoveryCopyEn = en;

export function useDiscoveryCopy(): DiscoveryCopy {
  const { lang } = useT();
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
