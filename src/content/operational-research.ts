import type { Lang } from "@/i18n";

type ResearchText = { title: string; finding: string; population: string; analysis: string; mechanism: string; limitation: string };
export type OperationalResearch = {
  slug: string; metric: string; publisher: string; year: number; url: string;
  text: Record<Lang, ResearchText>;
};

export const OPERATIONAL_RESEARCH: OperationalResearch[] = [
  {
    slug: "digitalizarea-firmelor-romanesti", metric: "72%", publisher: "Eurostat — Digital Intensity Index", year: 2024,
    url: "https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20240829-1",
    text: {
      ro: {
        title: "România, pe ultimul loc în UE la digitalizarea firmelor.",
        finding: "dintre firmele românești au un nivel foarte scăzut de intensitate digitală — cea mai mare pondere din Uniunea Europeană, conform Eurostat.",
        population: "Sondajul Eurostat privind utilizarea TIC în întreprinderi, date 2023, publicat în 2024. Indicele de Intensitate Digitală (DII) măsoară adoptarea a 12 tehnologii: AI, cloud, CRM, comerț electronic, analiză de date. Media UE: 59% dintre firme au cel puțin un nivel de bază. În România, doar ~27% dintre IMM-uri ating acest nivel, iar doar 1,3% au un nivel foarte ridicat.",
        analysis: "În practică, asta înseamnă că în majoritatea companiilor românești cunoștințele critice stau în hârtii, fișiere Excel personale, grupuri de WhatsApp și în memoria câtorva oameni-cheie. Când un angajat nou are o întrebare, întrerupe un coleg. Când acel coleg pleacă, cunoștințele pleacă odată cu el. Decalajul nu e o condamnare — este o oportunitate: firmele care se digitalizează acum câștigă un avans real față de concurenții care așteaptă.",
        mechanism: "OPSQAI este construit exact pentru acest punct de plecare: se instalează pe serverul Windows pe care firma îl are deja, funcționează integral în română, preia datele firmei din ANAF pe baza CUI-ului și nu cere migrarea în cloud. Documentele existente — proceduri, fișe, regulamente — devin o bază de cunoștințe interogabilă, fără ca vreun fișier să părăsească firma. Pilotul de 30 de zile verifică pe sarcini reale dacă angajații găsesc mai repede informația corectă.",
        limitation: "DII este un indice compozit despre adoptarea tehnologiei, nu o măsurare a pierderilor tale concrete și nu testează OPSQAI. Faptul că România e pe ultimul loc nu garantează că firma ta are o problemă — dar simulatorul nostru îți arată, pe cifrele tale, cât costă căutarea informației în fiecare lună.",
      },
      en: {
        title: "Romania ranks last in the EU for enterprise digitalisation.",
        finding: "of Romanian enterprises have a very low level of digital intensity — the highest share in the European Union, according to Eurostat.",
        population: "Eurostat survey on ICT usage in enterprises, 2023 data, published 2024. The Digital Intensity Index (DII) measures adoption of 12 technologies: AI, cloud, CRM, e-commerce, data analytics. EU average: 59% of enterprises reach at least a basic level. In Romania, only ~27% of SMEs reach it, and just 1.3% reach a very high level.",
        analysis: "In practice, this means critical knowledge in most Romanian companies lives on paper, in personal Excel files, WhatsApp groups and the memory of a few key people. A new employee's question interrupts a colleague. When that colleague leaves, the knowledge leaves with them. The gap is not a verdict — it is an opportunity: companies that digitalise now gain a real lead over competitors who wait.",
        mechanism: "OPSQAI is built for exactly this starting point: it installs on the Windows server the company already owns, works entirely in Romanian, pulls company data from ANAF by CUI, and requires no cloud migration. Existing documents — procedures, fact sheets, regulations — become a searchable knowledge base without any file leaving the company. The 30-day pilot tests on real tasks whether employees find the right information faster.",
        limitation: "The DII is a composite index of technology adoption, not a measure of your specific losses, and it does not test OPSQAI. Romania's last place does not guarantee your company has a problem — but our simulator shows, on your own numbers, what searching for information costs every month.",
      },
      de: {
        title: "Rumänien liegt bei der Digitalisierung von Unternehmen auf dem letzten EU-Platz.",
        finding: "der rumänischen Unternehmen weisen eine sehr geringe digitale Intensität auf — der höchste Anteil in der Europäischen Union, laut Eurostat.",
        population: "Eurostat-Erhebung zur IKT-Nutzung in Unternehmen, Daten 2023, veröffentlicht 2024. Der Digital Intensity Index (DII) misst die Nutzung von 12 Technologien: KI, Cloud, CRM, E-Commerce, Datenanalyse. EU-Durchschnitt: 59% der Unternehmen erreichen mindestens ein Basisniveau. In Rumänien erreichen nur ~27% der KMU dieses Niveau, nur 1,3% ein sehr hohes.",
        analysis: "In der Praxis bedeutet das: Kritisches Wissen liegt in den meisten rumänischen Unternehmen auf Papier, in persönlichen Excel-Dateien, WhatsApp-Gruppen und im Gedächtnis weniger Schlüsselpersonen. Jede Frage eines neuen Mitarbeiters unterbricht einen Kollegen. Wenn dieser Kollege geht, geht das Wissen mit. Die Lücke ist kein Urteil — sie ist eine Chance: Wer jetzt digitalisiert, gewinnt einen echten Vorsprung vor wartenden Wettbewerbern.",
        mechanism: "OPSQAI ist genau für diesen Ausgangspunkt gebaut: Es installiert sich auf dem vorhandenen Windows-Server, arbeitet vollständig auf Rumänisch, übernimmt Firmendaten aus ANAF anhand der CUI und erfordert keine Cloud-Migration. Vorhandene Dokumente — Verfahren, Merkblätter, Regelwerke — werden zu einer durchsuchbaren Wissensbasis, ohne dass eine Datei das Unternehmen verlässt. Der 30-tägige Pilot prüft an realen Aufgaben, ob Mitarbeitende Informationen schneller finden.",
        limitation: "Der DII ist ein zusammengesetzter Index zur Technologieadoption, kein Maß für Ihre konkreten Verluste, und er testet OPSQAI nicht. Rumäniens letzter Platz garantiert nicht, dass Ihr Unternehmen ein Problem hat — aber unser Simulator zeigt Ihnen anhand Ihrer eigenen Zahlen, was die Informationssuche jeden Monat kostet.",
      },
    },
  },
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