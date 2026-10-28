import type { Lang } from "@/i18n";

type ResearchText = { title: string; finding: string; population: string; analysis: string; mechanism: string; limitation: string };
export type OperationalResearch = {
  slug: string; metric: string; publisher: string; year: number; url: string;
  text: Record<Lang, ResearchText>;
};

export const OPERATIONAL_RESEARCH: OperationalResearch[] = [
  {
    slug: "business-case-transport-40-camioane", metric: "5.000€", publisher: "OPSQAI — Model de rentabilitate", year: 2026,
    url: "https://opsqai.de/studies",
    text: {
      ro: {
        title: "De unde pierde o flotă de 40 de camioane peste 5.000€ pe lună.",
        finding: "pe lună este costul operațional tipic al fricțiunii dintr-o firmă de transport cu 40 de camioane — calculat pe ipoteze transparente, nu pe promisiuni.",
        population: "Model OPSQAI cu ipoteze explicite, ajustabile în simulator: 2 dispeceri × 2 ore/zi pierdute pe apeluri repetitive și căutare de informații (~1.200€/lună la 15€/oră); întârzieri și erori la documentele CMR și facturare (~1.500€/lună); urmărirea manuală a ITP, rovinietelor și reviziilor (~800€/lună); reconcilierea curselor și a deconturilor la final de lună (~1.500€/lună). Total: ~5.000€/lună. Nu este rezultatul unui client — este un model pe care îl poți recalcula cu cifrele tale.",
        analysis: "Banii nu se pierd într-un singur loc spectaculos, ci în zeci de micro-întreruperi: dispecerul care sună șoferul pentru o informație care există deja într-un document, factura emisă greșit dintr-un CMR citit de pe WhatsApp, rovinieta expirată descoperită la control. Fiecare episod costă puțin; împreună, depășesc salariul unui angajat. Problema nu e lipsa datelor — datele există. Problema e că ajungerea la ele trece prin oameni, telefoane și memorie.",
        mechanism: "Modulul OPSQAI Transport acționează pe fiecare punct: șoferii și dispecerii întreabă și primesc răspunsul din procedurile firmei în secunde, cu sursa citată; documentele CMR și facturile sunt generate din datele cursei, nu rescrise manual; alertele pentru ITP, roviniete și revizii pleacă automat înainte de expirare; reconcilierea curselor se face pe date centralizate. Totul rulează pe serverul firmei, fără ca datele să plece în cloud, iar unde fluxul tău e diferit, construim modulul custom pe el. Pilotul de 30 de zile măsoară pe curse reale cât din cei 5.000€ se recuperează.",
        limitation: "Cei 5.000€ sunt un model cu ipoteze declarate, nu o medie de piață și nu un rezultat al unui client OPSQAI. Costul real depinde de salarii, numărul de curse și disciplina existentă. De aceea pilotul există: măsurăm la tine, înainte și după, și abia apoi vorbim despre investiție.",
      },
      en: {
        title: "Where a 40-truck fleet loses over €5,000 a month.",
        finding: "per month is the typical operational cost of friction in a 40-truck transport company — calculated on transparent assumptions, not promises.",
        population: "OPSQAI model with explicit assumptions, adjustable in the simulator: 2 dispatchers × 2 hours/day lost on repetitive calls and information search (~€1,200/month at €15/hour); delays and errors on CMR documents and invoicing (~€1,500/month); manual tracking of inspections, tolls and maintenance (~€800/month); end-of-month trip and expense reconciliation (~€1,500/month). Total: ~€5,000/month. This is not a client result — it is a model you can recalculate with your own figures.",
        analysis: "Money is not lost in one spectacular place, but in dozens of micro-interruptions: the dispatcher calling a driver for information that already exists in a document, the invoice issued wrong from a CMR read off WhatsApp, the expired toll vignette discovered at a roadside check. Each episode costs little; together they exceed one employee's salary. The problem is not missing data — the data exists. The problem is that reaching it goes through people, phones and memory.",
        mechanism: "The OPSQAI Transport module acts on each point: drivers and dispatchers ask and get answers from company procedures in seconds, with the source cited; CMR documents and invoices are generated from trip data, not retyped; inspection, toll and maintenance alerts fire automatically before expiry; trip reconciliation runs on centralised data. Everything runs on the company's own server, no data leaves for the cloud, and where your workflow differs, we build the custom module around it. The 30-day pilot measures on real trips how much of the €5,000 is recovered.",
        limitation: "The €5,000 is a model with declared assumptions, not a market average and not an OPSQAI client result. Real cost depends on salaries, trip volume and existing discipline. That is why the pilot exists: we measure at your site, before and after, and only then discuss investment.",
      },
      de: {
        title: "Wo eine Flotte mit 40 Lkw über 5.000€ im Monat verliert.",
        finding: "pro Monat betragen die typischen operativen Reibungskosten eines Transportunternehmens mit 40 Lkw — berechnet auf transparenten Annahmen, nicht auf Versprechen.",
        population: "OPSQAI-Modell mit expliziten Annahmen, im Simulator anpassbar: 2 Disponenten × 2 Stunden/Tag für wiederkehrende Anrufe und Informationssuche (~1.200€/Monat bei 15€/Stunde); Verzögerungen und Fehler bei CMR-Dokumenten und Rechnungen (~1.500€/Monat); manuelle Verfolgung von Inspektionen, Maut und Wartung (~800€/Monat); Abgleich von Touren und Abrechnungen am Monatsende (~1.500€/Monat). Summe: ~5.000€/Monat. Kein Kundenergebnis — ein Modell, das Sie mit eigenen Zahlen nachrechnen können.",
        analysis: "Das Geld geht nicht an einer spektakulären Stelle verloren, sondern in Dutzenden Mikro-Unterbrechungen: der Disponent ruft den Fahrer für eine Information an, die längst in einem Dokument existiert; die Rechnung wird falsch ausgestellt, weil der CMR aus WhatsApp abgeschrieben wurde; die abgelaufene Vignette fällt erst bei der Kontrolle auf. Jeder Vorfall kostet wenig — zusammen übersteigen sie ein Gehalt. Das Problem ist nicht fehlende Datenlage: Die Daten existieren. Das Problem ist, dass der Weg zu ihnen über Menschen, Telefone und Gedächtnis führt.",
        mechanism: "Das OPSQAI-Transportmodul greift an jedem Punkt: Fahrer und Disponenten fragen und erhalten Antworten aus den Firmenverfahren in Sekunden, mit Quellenangabe; CMR-Dokumente und Rechnungen werden aus den Tourdaten erzeugt statt manuell abgetippt; Warnungen zu Inspektion, Maut und Wartung gehen automatisch vor Ablauf raus; der Tourenabgleich läuft auf zentralisierten Daten. Alles läuft auf dem eigenen Server, keine Daten verlassen das Unternehmen, und wo Ihr Ablauf anders ist, bauen wir das Modul passend dazu. Der 30-tägige Pilot misst an echten Touren, wie viel der 5.000€ zurückgeholt wird.",
        limitation: "Die 5.000€ sind ein Modell mit deklarierten Annahmen, kein Marktdurchschnitt und kein OPSQAI-Kundenergebnis. Die tatsächlichen Kosten hängen von Gehältern, Tourvolumen und vorhandener Disziplin ab. Genau dafür gibt es den Piloten: Wir messen bei Ihnen, vorher und nachher, und sprechen erst dann über Investitionen.",
      },
    },
  },
  {
    slug: "business-case-productie-150-angajati", metric: "6.500€", publisher: "OPSQAI — Model de rentabilitate", year: 2026,
    url: "https://opsqai.de/studies",
    text: {
      ro: {
        title: "Cât costă fricțiunea într-o fabrică cu 150 de angajați.",
        finding: "pe lună este costul operațional tipic al fricțiunii într-o unitate de producție cu 150 de angajați — un model cu ipoteze declarate, nu o promisiune.",
        population: "Model OPSQAI cu ipoteze explicite, ajustabile în simulator: instruirea operatorilor noi și rotația personalului — șefii de echipă pierd ~6 ore/săptămână repetând aceleași instrucțiuni (~2.200€/lună); predarea de tură verbală și informații pierdute între schimburi (~1.400€/lună); căutarea procedurilor de calitate și a fișelor de lucru la nevoie (~1.300€/lună); rebuturi și retușuri cauzate de versiuni greșite de proceduri (~1.600€/lună). Total: ~6.500€/lună. Nu este rezultatul unui client — recalculezi cu cifrele tale în simulator.",
        analysis: "În producție, informația critică stă în capul șefilor de echipă și în foldere plastifiate pe care nimeni nu le mai deschide. Când un operator nou întreabă, oprește linia sau ghicește. Când procedura se schimbă, jumătate din tură află abia săptămâna viitoare. Costul nu apare ca o linie în contabilitate — se ascunde în rebuturi, în orele de instruire repetate și în auditurile la care documentația se caută cu zăhărelul.",
        mechanism: "Modulul OPSQAI Producție pune procedurile aprobate la o întrebare distanță: operatorul întreabă pe română și primește pasul exact din fișa de lucru curentă, cu sursa; noii angajați parcurg lecții scurte cu teste și diplome interne, fără să ocupe șeful de echipă; predarea de tură se face pe date centralizate, nu pe ce își amintește fiecare; la audit, fiecare răspuns are documentul aprobat în spate. Rulează pe serverul firmei, iar fluxurile specifice liniei tale le construim custom.",
        limitation: "Cei 6.500€ sunt un model cu ipoteze declarate, nu o medie de industrie și nu un rezultat măsurat la un client OPSQAI. Costul real depinde de rotația personalului, complexitatea produsului și disciplina documentelor. Pilotul de 30 de zile măsoară pe linia ta, înainte și după.",
      },
      en: {
        title: "What friction costs a 150-employee factory.",
        finding: "per month is the typical operational cost of friction in a 150-employee production plant — a model with declared assumptions, not a promise.",
        population: "OPSQAI model with explicit assumptions, adjustable in the simulator: training new operators and staff turnover — team leads lose ~6 hours/week repeating the same instructions (~€2,200/month); verbal shift handover and information lost between shifts (~€1,400/month); searching for quality procedures and work instructions on demand (~€1,300/month); scrap and rework caused by wrong procedure versions (~€1,600/month). Total: ~€6,500/month. Not a client result — recalculate with your own figures in the simulator.",
        analysis: "In production, critical knowledge lives in team leads' heads and in laminated folders nobody opens. When a new operator asks, the line stops or they guess. When a procedure changes, half the shift finds out next week. The cost never appears as an accounting line — it hides in scrap, in repeated training hours and in audits where documentation is chased at the last minute.",
        mechanism: "The OPSQAI Production module puts approved procedures one question away: the operator asks in Romanian and gets the exact step from the current work instruction, with the source; new hires complete short lessons with tests and internal certificates without occupying the team lead; shift handover runs on centralised data, not on what everyone remembers; at audit time, every answer has the approved document behind it. It runs on the company's server, and line-specific workflows are built custom.",
        limitation: "The €6,500 is a model with declared assumptions, not an industry average and not a measured OPSQAI client result. Real cost depends on turnover, product complexity and document discipline. The 30-day pilot measures on your line, before and after.",
      },
      de: {
        title: "Was Reibung in einem Werk mit 150 Beschäftigten kostet.",
        finding: "pro Monat betragen die typischen operativen Reibungskosten eines Produktionsbetriebs mit 150 Beschäftigten — ein Modell mit deklarierten Annahmen, kein Versprechen.",
        population: "OPSQAI-Modell mit expliziten Annahmen, im Simulator anpassbar: Einarbeitung neuer Bediener und Personalwechsel — Schichtleiter verlieren ~6 Stunden/Woche mit denselben Anweisungen (~2.200€/Monat); mündliche Schichtübergabe und verlorene Informationen (~1.400€/Monat); Suche nach Qualitätsverfahren und Arbeitsanweisungen (~1.300€/Monat); Ausschuss und Nacharbeit durch falsche Verfahrensversionen (~1.600€/Monat). Summe: ~6.500€/Monat. Kein Kundenergebnis — rechnen Sie im Simulator mit eigenen Zahlen nach.",
        analysis: "In der Produktion steckt kritisches Wissen in den Köpfen der Schichtleiter und in laminierten Ordnern, die niemand öffnet. Fragt ein neuer Bediener, bleibt die Linie stehen oder er rät. Ändert sich ein Verfahren, erfährt es die halbe Schicht erst nächste Woche. Die Kosten tauchen nie als Buchhaltungsposten auf — sie verstecken sich in Ausschuss, wiederholten Schulungsstunden und Audits, bei denen Unterlagen in letzter Minute gesucht werden.",
        mechanism: "Das OPSQAI-Produktionsmodul bringt freigegebene Verfahren auf eine Frage Entfernung: Der Bediener fragt auf Rumänisch und erhält den exakten Schritt aus der aktuellen Arbeitsanweisung, mit Quelle; neue Mitarbeitende durchlaufen kurze Lektionen mit Tests und internen Zertifikaten, ohne den Schichtleiter zu binden; die Schichtübergabe läuft über zentralisierte Daten statt über Erinnerung; im Audit steht hinter jeder Antwort das freigegebene Dokument. Läuft auf dem Firmenserver, linienspezifische Abläufe bauen wir passend dazu.",
        limitation: "Die 6.500€ sind ein Modell mit deklarierten Annahmen, kein Branchendurchschnitt und kein gemessenes OPSQAI-Kundenergebnis. Die tatsächlichen Kosten hängen von Fluktuation, Produktkomplexität und Dokumentendisziplin ab. Der 30-tägige Pilot misst an Ihrer Linie, vorher und nachher.",
      },
    },
  },
  {
    slug: "business-case-service-auto-12-puncte", metric: "3.000€", publisher: "OPSQAI — Model de rentabilitate", year: 2026,
    url: "https://opsqai.de/studies",
    text: {
      ro: {
        title: "Cât pierde lunar un service auto cu 12 puncte de lucru.",
        finding: "pe lună este costul tipic al fricțiunii într-un service auto cu 12 puncte de lucru — model cu ipoteze transparente, nu promisiune de vânzare.",
        population: "Model OPSQAI cu ipoteze explicite, ajustabile: recepția pierde ~90 min/zi pe apeluri repetitive (programări, status, prețuri orientative) (~700€/lună); devize întârziate sau greșite din căutare manuală de piese și manoperă (~900€/lună); mecanici care întreabă colegi sau caută specificații tehnice (~800€/lună); documente de garanție și istoric de intervenții greu de regăsit la reclamații (~600€/lună). Total: ~3.000€/lună. Nu este rezultatul unui client — îl recalculezi cu cifrele tale.",
        analysis: "Într-un service, fiecare telefon care sună oprește pe cineva din lucru. Devizul întârziat înseamnă client plecat la concurență. Mecanicul care nu găsește cuplul de strângere sau procedura de resetare pierde 10 minute pe care le plătești tu. Iar când un client revine cu o reclamație, istoricul intervenției e împrăștiat între hârtii, WhatsApp și memoria receptionerului. Sunt bani mici, zilnici, care adunați depășesc chiria halei.",
        mechanism: "OPSQAI pentru service auto: clienții primesc răspunsuri automate la întrebările repetitive, recepția rămâne pe programări reale; devizele se generează din lista de piese și manoperă a firmei, nu din memorie; mecanicul întreabă și primește specificația tehnică cu sursa, direct de la pontaj; istoricul fiecărui vehicul e la o căutare distanță, cu documentele atașate. Totul local, pe calculatorul firmei — iar fluxul tău exact (piese second, flote, leasing) îl construim custom.",
        limitation: "Cei 3.000€ sunt un model cu ipoteze declarate, nu o medie de piață și nu un rezultat al unui client OPSQAI. Depinde de volumul de apeluri, mixul de lucrări și cum ții azi evidența. Pilotul de 30 de zile măsoară la tine în service, înainte și după.",
      },
      en: {
        title: "What a 12-bay auto repair shop loses every month.",
        finding: "per month is the typical cost of friction in a 12-bay auto repair shop — a model with transparent assumptions, not a sales promise.",
        population: "OPSQAI model with explicit assumptions, adjustable: reception loses ~90 min/day on repetitive calls (bookings, status, ballpark prices) (~€700/month); delayed or wrong quotes from manual parts and labour lookup (~€900/month); mechanics asking colleagues or searching technical specs (~€800/month); warranty documents and service history hard to retrieve on complaints (~€600/month). Total: ~€3,000/month. Not a client result — recalculate with your own figures.",
        analysis: "In a repair shop, every ringing phone pulls someone off the job. A delayed quote means a customer gone to a competitor. A mechanic who cannot find the torque spec or the reset procedure loses 10 minutes you pay for. And when a customer comes back with a complaint, the job history is scattered across paper, WhatsApp and the receptionist's memory. Small daily amounts that together exceed the hall's rent.",
        mechanism: "OPSQAI for auto repair: customers get automatic answers to repetitive questions, reception stays on real bookings; quotes are generated from the company's own parts and labour lists, not from memory; the mechanic asks and gets the technical spec with its source, right at the bay; each vehicle's history is one search away, documents attached. All local, on the company's computer — and your exact workflow (used parts, fleets, leasing) is built custom.",
        limitation: "The €3,000 is a model with declared assumptions, not a market average and not an OPSQAI client result. It depends on call volume, job mix and how you keep records today. The 30-day pilot measures in your shop, before and after.",
      },
      de: {
        title: "Was eine Kfz-Werkstatt mit 12 Hebebühnen monatlich verliert.",
        finding: "pro Monat betragen die typischen Reibungskosten einer Kfz-Werkstatt mit 12 Arbeitsplätzen — ein Modell mit transparenten Annahmen, kein Verkaufsversprechen.",
        population: "OPSQAI-Modell mit expliziten Annahmen, anpassbar: Der Empfang verliert ~90 Min./Tag durch wiederkehrende Anrufe (Termine, Status, Richtpreise) (~700€/Monat); verzögerte oder fehlerhafte Angebote durch manuelle Teile- und Lohnsuche (~900€/Monat); Mechaniker, die Kollegen fragen oder technische Daten suchen (~800€/Monat); Garantieunterlagen und Wartungshistorie bei Reklamationen schwer auffindbar (~600€/Monat). Summe: ~3.000€/Monat. Kein Kundenergebnis — rechnen Sie mit eigenen Zahlen nach.",
        analysis: "In einer Werkstatt reißt jedes klingelnde Telefon jemanden aus der Arbeit. Ein verspätetes Angebot heißt: Kunde weg zur Konkurrenz. Der Mechaniker, der das Anzugsmoment oder die Reset-Prozedur nicht findet, verliert 10 Minuten, die Sie bezahlen. Und bei einer Reklamation liegt die Historie verstreut zwischen Papier, WhatsApp und dem Gedächtnis des Empfangs. Kleine tägliche Beträge, die zusammen die Hallenmiete übersteigen.",
        mechanism: "OPSQAI für Kfz-Werkstätten: Kunden erhalten automatische Antworten auf Standardfragen, der Empfang bleibt bei echten Terminen; Angebote entstehen aus den eigenen Teile- und Lohnlisten, nicht aus dem Gedächtnis; der Mechaniker fragt und bekommt die technische Angabe mit Quelle, direkt an der Bühne; die Historie jedes Fahrzeugs ist eine Suche entfernt, mit Dokumenten. Alles lokal auf dem Firmenrechner — Ihren genauen Ablauf (Gebrauchtteile, Flotten, Leasing) bauen wir passend dazu.",
        limitation: "Die 3.000€ sind ein Modell mit deklarierten Annahmen, kein Marktdurchschnitt und kein OPSQAI-Kundenergebnis. Sie hängen von Anrufvolumen, Auftragsmix und Ihrer heutigen Dokumentation ab. Der 30-tägige Pilot misst in Ihrer Werkstatt, vorher und nachher.",
      },
    },
  },
  {
    slug: "business-case-banking-dora", metric: "8.000€", publisher: "OPSQAI — Model de rentabilitate", year: 2026,
    url: "https://opsqai.de/studies",
    text: {
      ro: {
        title: "Cât costă căutarea procedurilor într-o instituție financiară.",
        finding: "pe lună este costul operațional tipic al fricțiunii documentare într-o rețea financiară cu 10 sucursale — model cu ipoteze declarate, în contextul cerințelor DORA.",
        population: "Model OPSQAI cu ipoteze explicite, ajustabile: angajații din sucursale caută proceduri de creditare, KYC și conformitate ~45 min/zi fiecare (~3.500€/lună la 50 de utilizatori); pregătirea auditurilor și a evidențelor cerute de reglementări (~2.000€/lună); instruirea și re-instruirea pe proceduri actualizate (~1.500€/lună); erori de aplicare a versiunilor vechi de proceduri (~1.000€/lună). Total: ~8.000€/lună. Nu este rezultatul unui client — recalculezi cu cifrele tale.",
        analysis: "În sectorul financiar, procedura greșită nu e doar ineficiență — e risc de conformitate. DORA cere instituțiilor financiare să demonstreze controlul riscului operațional TIC, iar asta presupune documente actuale, trasabilitate și dovezi că personalul cunoaște procedurile. Realitatea din multe sucursale: procedurile stau în PDF-uri pe share-uri interne, versiunile circulă pe email, iar la audit se reconstruiește istoricul manual. Fricțiunea costă bani; lipsa de trasabilitate costă și mai mult.",
        mechanism: "OPSQAI se instalează în infrastructura proprie a instituției — datele nu părăsesc rețeaua, cerință de bază în zona reglementată. Angajatul întreabă și primește procedura curentă, cu sursa și versiunea citate; instruirea pe proceduri noi se face cu teste și evidență a absolvirii, utilă ca dovadă la audit; fiecare răspuns e trasabil până la documentul aprobat. Nu suntem un furnizor de certificare DORA — construim controalele operaționale aliniate cerințelor, iar fluxurile specifice (creditare, KYC, raportări) le dezvoltăm custom.",
        limitation: "Cei 8.000€ sunt un model cu ipoteze declarate, nu o medie de sector și nu un rezultat al unui client OPSQAI. Conformitatea DORA rămâne responsabilitatea instituției — OPSQAI oferă infrastructura tehnică și trasabilitatea, nu o certificare. Pilotul de 30 de zile măsoară pe procedurile tale reale.",
      },
      en: {
        title: "What procedure search costs a financial institution.",
        finding: "per month is the typical operational cost of document friction in a 10-branch financial network — a model with declared assumptions, in the context of DORA requirements.",
        population: "OPSQAI model with explicit assumptions, adjustable: branch employees search lending, KYC and compliance procedures ~45 min/day each (~€3,500/month across 50 users); preparing audits and regulator-required records (~€2,000/month); training and re-training on updated procedures (~€1,500/month); errors from applying outdated procedure versions (~€1,000/month). Total: ~€8,000/month. Not a client result — recalculate with your own figures.",
        analysis: "In finance, the wrong procedure is not just inefficiency — it is compliance risk. DORA requires financial entities to demonstrate control over ICT operational risk, which means current documents, traceability and evidence that staff know the procedures. The reality in many branches: procedures sit in PDFs on internal shares, versions circulate by email, and at audit time the history is reconstructed by hand. Friction costs money; missing traceability costs even more.",
        mechanism: "OPSQAI installs in the institution's own infrastructure — data never leaves the network, a baseline requirement in the regulated space. The employee asks and gets the current procedure, with source and version cited; training on new procedures runs with tests and completion records, usable as audit evidence; every answer is traceable to the approved document. We are not a DORA certification provider — we build the operational controls aligned with the requirements, and institution-specific workflows (lending, KYC, reporting) are developed custom.",
        limitation: "The €8,000 is a model with declared assumptions, not a sector average and not an OPSQAI client result. DORA compliance remains the institution's responsibility — OPSQAI provides the technical infrastructure and traceability, not a certification. The 30-day pilot measures on your real procedures.",
      },
      de: {
        title: "Was die Verfahrenssuche in einem Finanzinstitut kostet.",
        finding: "pro Monat betragen die typischen operativen Kosten der Dokumentenreibung in einem Finanznetz mit 10 Filialen — ein Modell mit deklarierten Annahmen, im Kontext der DORA-Anforderungen.",
        population: "OPSQAI-Modell mit expliziten Annahmen, anpassbar: Filialmitarbeitende suchen ~45 Min./Tag nach Kredit-, KYC- und Compliance-Verfahren (~3.500€/Monat bei 50 Nutzern); Vorbereitung von Audits und regulatorisch geforderten Nachweisen (~2.000€/Monat); Schulung und Nachschulung zu aktualisierten Verfahren (~1.500€/Monat); Fehler durch veraltete Verfahrensversionen (~1.000€/Monat). Summe: ~8.000€/Monat. Kein Kundenergebnis — rechnen Sie mit eigenen Zahlen nach.",
        analysis: "Im Finanzbereich ist das falsche Verfahren nicht nur Ineffizienz — es ist ein Compliance-Risiko. DORA verlangt von Finanzunternehmen den Nachweis der Kontrolle über IKT-Betriebsrisiken: aktuelle Dokumente, Nachverfolgbarkeit und Belege, dass Mitarbeitende die Verfahren kennen. Die Realität vieler Filialen: Verfahren liegen als PDFs auf internen Laufwerken, Versionen kursieren per E-Mail, und im Audit wird die Historie manuell rekonstruiert. Reibung kostet Geld; fehlende Nachverfolgbarkeit kostet noch mehr.",
        mechanism: "OPSQAI wird in der eigenen Infrastruktur des Instituts installiert — Daten verlassen das Netz nicht, eine Grundanforderung im regulierten Umfeld. Mitarbeitende fragen und erhalten das aktuelle Verfahren mit Quelle und Version; Schulungen zu neuen Verfahren laufen mit Tests und Abschlussnachweisen, als Audit-Beleg nutzbar; jede Antwort ist bis zum freigegebenen Dokument rückverfolgbar. Wir sind kein DORA-Zertifizierer — wir bauen die operativen Kontrollen passend zu den Anforderungen, und institutsspezifische Abläufe (Kreditvergabe, KYC, Meldewesen) entwickeln wir individuell.",
        limitation: "Die 8.000€ sind ein Modell mit deklarierten Annahmen, kein Branchendurchschnitt und kein OPSQAI-Kundenergebnis. DORA-Compliance bleibt Aufgabe des Instituts — OPSQAI liefert die technische Infrastruktur und Nachverfolgbarkeit, keine Zertifizierung. Der 30-tägige Pilot misst an Ihren realen Verfahren.",
      },
    },
  },
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