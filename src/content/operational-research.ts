import type { Lang } from "@/i18n";

type ResearchText = { title: string; finding: string; population: string; analysis: string; mechanism: string; limitation: string };
export type OperationalResearch = {
  slug: string; metric: string; publisher: string; year: number; url: string;
  text: Record<Lang, ResearchText>;
};

export const OPERATIONAL_RESEARCH: OperationalResearch[] = [
  {
    slug: "costul-informatiei-greu-de-gasit", metric: "62%", publisher: "Microsoft Work Trend Index", year: 2023,
    url: "https://www.microsoft.com/en-us/worklab/work-trend-index/will-ai-fix-work",
    text: {
      ro: {
        title: "Informația există. Dar cât costă să o găsești?",
        finding: "dintre respondenți spun că petrec prea mult timp căutând informații în timpul zilei de lucru.",
        population: "Sondaj: 31.000 de persoane din 31 de țări; raportul include și analiza semnalelor Microsoft 365. Procentul descrie răspunsurile la sondaj.",
        analysis: "Într-o fabrică, întrebarea poate fi despre versiunea corectă a unei proceduri. În transport, despre un document sau o regulă internă. În HR și banking, despre o politică aplicabilă. Studiul documentează fricțiunea căutării; costul firmei tale depinde de câți oameni caută, cât durează și ce cost orar au. Nu putem deduce aceste valori din procentul de 62%.",
        mechanism: "OPSQAI este conceput pentru întrebări pe documentele interne, cu referințe la surse, și pentru acces la proceduri, FAQ și instruire. În pilot alegem sarcini concrete: găsirea unei proceduri aprobate, identificarea sursei și verificarea răspunsului. Comparăm aceeași sarcină înainte și după, fără să presupunem dinainte o economie.",
        limitation: "Este un indicator global de percepție, nu o măsurare a minutelor pierdute în România, în banking sau la clienți OPSQAI. Raportul nu testează OPSQAI și nu demonstrează reducerea costurilor prin platforma noastră. Valoarea capacității recuperate nu este echivalentă cu economii în numerar.",
      },
      en: {
        title: "The information exists. What does finding it cost?",
        finding: "of respondents say they spend too much time searching for information during their workday.",
        population: "Survey: 31,000 people in 31 countries; the report also analyzes Microsoft 365 signals. This percentage refers to survey responses.",
        analysis: "In manufacturing, it could mean finding the approved procedure. In transport, a document or internal rule. In HR and banking, an applicable policy. The study documents search friction; your cost depends on headcount, time spent and hourly cost. None of those values can be derived from the 62% figure.",
        mechanism: "OPSQAI is designed for questions over internal documents with source references, and access to procedures, FAQs and training. A pilot tests concrete tasks: finding an approved procedure, identifying the source and verifying the answer. Compare the same task before and after, without assuming savings in advance.",
        limitation: "This is a global perception indicator, not a measurement of minutes lost in Romania, banking or OPSQAI customers. It does not test OPSQAI or prove cost reductions from our platform. Recovered capacity value is not cash savings.",
      },
      de: {
        title: "Die Information existiert. Was kostet es, sie zu finden?",
        finding: "der Befragten geben an, während ihres Arbeitstages zu viel Zeit mit der Informationssuche zu verbringen.",
        population: "Befragung: 31.000 Personen in 31 Ländern; der Bericht analysiert auch Microsoft-365-Signale. Der Prozentsatz bezieht sich auf Antworten der Befragten.",
        analysis: "In der Produktion geht es etwa um die freigegebene Verfahrensversion, im Transport um ein Dokument oder eine interne Regel, in HR und Banken um eine Richtlinie. Die Studie dokumentiert Suchprobleme; Ihre Kosten hängen von Personenzahl, Suchzeit und Stundenkosten ab. Diese Werte lassen sich nicht aus den 62% ableiten.",
        mechanism: "OPSQAI ist für Fragen zu internen Dokumenten mit Quellenverweisen sowie Zugang zu Verfahren, FAQs und Schulung konzipiert. Im Pilot prüfen wir konkrete Aufgaben: freigegebene Verfahren finden, Quellen identifizieren und Antworten verifizieren. Dieselben Aufgaben vor und nach der Einführung vergleichen, ohne Einsparungen vorwegzunehmen.",
        limitation: "Ein globaler Wahrnehmungsindikator, keine Messung verlorener Minuten in Rumänien, Banken oder bei OPSQAI-Kunden. Die Studie testet OPSQAI nicht und belegt keine Kostensenkung durch unsere Plattform. Freigesetzte Kapazität ist keine Geldeinsparung.",
      },
    },
  },
  {
    slug: "cunostinte-fragmentate-operatiuni", metric: "47%", publisher: "Coveo EX Relevance Report", year: 2025,
    url: "https://ir.coveo.com/en/news-events/press-releases/detail/434/coveo-ex-relevance-report-reveals-42-of-information-fails",
    text: {
      ro: {
        title: "Cunoștințe fragmentate: problema dintre departamente.",
        finding: "raportează că informația fragmentată rămâne cel mai mare obstacol în calea productivității, conform comunicatului Coveo.",
        population: "4.000 de adulți din SUA și Regatul Unit, care folosesc un computer la muncă, în organizații cu peste 5.000 de angajați. Studiu publicat de un furnizor de soluții de căutare.",
        analysis: "Documentele pot exista, dar în locuri diferite, cu versiuni contradictorii și proprietari neclari. Pentru producție, transport sau HR, întrebarea utilă nu este «câte fișiere avem?», ci «poate colegul să găsească sursa aprobată fără să întrerupă alte două persoane?». Studiul semnalează o problemă; nu estimează costul firmei tale.",
        mechanism: "OPSQAI poate organiza cunoștințe interne, FAQ și instruire și poate oferi răspunsuri cu trimiteri la documente. Tehnologia nu înlocuiește curățarea surselor: stabilim proprietarul procedurii, documentul aprobat și cine validează răspunsul. În pilot verificăm accesul la informație și corectitudinea pe un set comun de întrebări.",
        limitation: "Eșantionul privește organizații mari din SUA și Regatul Unit, nu o medie a IMM-urilor românești. Publicarea de către un furnizor este context relevant. Procentul nu trebuie confundat cu indicatorul separat de 47% despre frustrarea față de instrumente digitale. Nu reprezintă un rezultat OPSQAI sau o rată de îmbunătățire.",
      },
      en: {
        title: "Fragmented knowledge: the gap between departments.",
        finding: "report that fragmented knowledge remains the biggest obstacle to productivity, according to Coveo's release.",
        population: "4,000 adults in the US and UK using a computer for work at organizations with 5,000+ employees. Published by a search-solutions vendor.",
        analysis: "Documents may exist across different systems, with conflicting versions and unclear owners. For manufacturing, transport or HR, the useful question is not how many files exist, but whether a colleague can find an approved source without interrupting two other people. The study identifies a problem; it does not estimate your company's costs.",
        mechanism: "OPSQAI can organize internal knowledge, FAQs and training and offer answers with document references. Technology does not replace source governance: agree on the procedure owner, approved document and answer reviewer. A pilot checks information access and correctness against a common question set.",
        limitation: "The sample concerns large US and UK organizations, not an average of Romanian SMEs. Vendor sponsorship is relevant context. This figure must not be confused with a separate 47% about digital-tool frustration. It is neither an OPSQAI outcome nor an improvement rate.",
      },
      de: {
        title: "Fragmentiertes Wissen: die Lücke zwischen Abteilungen.",
        finding: "nennen fragmentiertes Wissen als größtes Produktivitätshindernis, laut der Coveo-Pressemitteilung.",
        population: "4.000 Erwachsene in den USA und Großbritannien, die in Unternehmen mit über 5.000 Beschäftigten am Computer arbeiten. Veröffentlicht von einem Suchlösungsanbieter.",
        analysis: "Dokumente liegen in unterschiedlichen Systemen, mit widersprüchlichen Versionen und unklaren Verantwortlichen. Für Produktion, Transport und HR zählt nicht die Dateizahl, sondern ob Mitarbeitende eine freigegebene Quelle finden, ohne andere zu unterbrechen. Die Studie beschreibt ein Problem, nicht die Kosten Ihres Unternehmens.",
        mechanism: "OPSQAI kann internes Wissen, FAQs und Schulung organisieren und Antworten mit Dokumentverweisen anbieten. Technologie ersetzt keine Quellenpflege: Verantwortliche, freigegebene Dokumente und Prüfer festlegen. Im Pilot prüfen wir Informationszugang und Richtigkeit anhand gemeinsamer Fragen.",
        limitation: "Die Stichprobe umfasst große US- und UK-Organisationen, keinen Durchschnitt rumänischer KMU. Die Veröffentlichung durch einen Anbieter ist relevanter Kontext. Nicht mit den separaten 47% zur Frustration über digitale Werkzeuge verwechseln. Kein OPSQAI-Ergebnis und keine Verbesserungsquote.",
      },
    },
  },
];