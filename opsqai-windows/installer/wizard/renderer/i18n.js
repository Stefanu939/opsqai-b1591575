// OPSQAI Setup Wizard — RO / DE / EN translation layer.
//
// The wizard markup is written in English. This layer translates every text
// node, placeholder and title on the fly (including text set later by
// wizard.js), so new strings only need an entry in DICT. Unknown strings
// pass through unchanged. Default language: Romanian.
"use strict";
(function () {
  // [ro, de]
  const DICT = {
    "OPSQAI Self-Hosted Setup": ["Instalare OPSQAI Self-Hosted", "OPSQAI Self-Hosted Einrichtung"],
    "Self-Hosted · Setup": ["Self-Hosted · Instalare", "Self-Hosted · Einrichtung"],
    Welcome: ["Bun venit", "Willkommen"],
    License: ["Licență", "Lizenz"],
    "System check": ["Verificare sistem", "Systemprüfung"],
    Options: ["Opțiuni", "Optionen"],
    Database: ["Bază de date", "Datenbank"],
    Administrator: ["Administrator", "Administrator"],
    Review: ["Rezumat", "Übersicht"],
    Install: ["Instalare", "Installieren"],
    Finish: ["Final", "Fertig"],
    "The private AI operations platform for your organisation.": ["Platforma privată de operațiuni AI pentru organizația ta.", "Die private KI-Betriebsplattform für Ihre Organisation."],
    "Version 1.0.0": ["Versiunea 1.0.0", "Version 1.0.0"],
    "Windows · Native": ["Windows · Nativ", "Windows · Nativ"],
    "~5 min setup": ["Instalare ~5 min", "~5 Min. Einrichtung"],
    "Get Started": ["Începe", "Los geht's"],
    "By continuing you accept the": ["Continuând, accepți", "Mit dem Fortfahren akzeptieren Sie die"],
    "OPSQAI License Agreement": ["Acordul de licență OPSQAI", "OPSQAI-Lizenzvereinbarung"],
    "Activate your OPSQAI license": ["Activează licența OPSQAI", "OPSQAI-Lizenz aktivieren"],
    "A valid license unlocks your edition, seats and modules. Nothing is installed until activation succeeds.": ["O licență validă deblochează ediția, locurile și modulele. Nu se instalează nimic până la activare.", "Eine gültige Lizenz schaltet Edition, Plätze und Module frei. Vor der Aktivierung wird nichts installiert."],
    "License key": ["Cheie de licență", "Lizenzschlüssel"],
    "Load from file…": ["Încarcă din fișier…", "Aus Datei laden…"],
    Validate: ["Validează", "Prüfen"],
    "License valid": ["Licență validă", "Lizenz gültig"],
    "License is not valid": ["Licența nu este validă", "Lizenz ist ungültig"],
    "Validating…": ["Se validează…", "Wird geprüft…"],
    "Could not read file": ["Fișierul nu a putut fi citit", "Datei konnte nicht gelesen werden"],
    "A valid OPSQAI license is required to continue": ["Pentru a continua e nevoie de o licență OPSQAI validă", "Zum Fortfahren ist eine gültige OPSQAI-Lizenz erforderlich"],
    Company: ["Firmă", "Firma"],
    Edition: ["Ediție", "Edition"],
    Seats: ["Locuri", "Plätze"],
    Modules: ["Module", "Module"],
    Expires: ["Expiră", "Läuft ab"],
    Status: ["Stare", "Status"],
    Active: ["Activă", "Aktiv"],
    "What is this computer?": ["Ce rol are acest calculator?", "Welche Rolle hat dieser Computer?"],
    "Main computer (first computer)": ["Calculator principal (primul calculator)", "Hauptcomputer (erster Computer)"],
    "— any normal Windows PC that stays on during working hours. It holds the database, local AI and the first administrator account.": ["— orice PC Windows obișnuit care rămâne pornit în timpul programului. Aici stau baza de date, AI-ul local și primul cont de administrator.", "— jeder normale Windows-PC, der während der Arbeitszeit eingeschaltet bleibt. Er enthält Datenbank, lokale KI und das erste Administratorkonto."],
    "Workstation (PC 2, PC 3 …)": ["Stație de lucru (PC 2, PC 3 …)", "Arbeitsplatz (PC 2, PC 3 …)"],
    "— native OPSQAI app connected to your main computer. No account is created here.": ["— aplicația OPSQAI conectată la calculatorul principal. Aici nu se creează niciun cont.", "— native OPSQAI-App, verbunden mit dem Hauptcomputer. Hier wird kein Konto erstellt."],
    "Find the main computer": ["Caută calculatorul principal", "Hauptcomputer suchen"],
    "Searching the local network…": ["Se caută în rețeaua locală…", "Lokales Netzwerk wird durchsucht…"],
    "No main computer found on this network. Type its address below.": ["Nu s-a găsit niciun calculator principal în rețea. Scrie adresa mai jos.", "Kein Hauptcomputer im Netzwerk gefunden. Adresse unten eingeben."],
    "Main computer address (LAN, VPN or company domain)": ["Adresa calculatorului principal (rețea locală, VPN sau domeniul firmei)", "Adresse des Hauptcomputers (LAN, VPN oder Firmendomain)"],
    "Computer name for this workstation": ["Numele acestei stații", "Name dieses Arbeitsplatzes"],
    "Location (e.g. Romania – warehouse)": ["Locație (ex. România – depozit)", "Standort (z. B. Deutschland – Büro)"],
    "Connect to server": ["Conectează-te la calculatorul principal", "Mit Hauptcomputer verbinden"],
    "Your principal administrator creates your access account on the server. After installation, sign in with that account.": ["Contul tău de acces îl creează administratorul principal. După instalare te conectezi cu acel cont.", "Ihr Zugangskonto erstellt der Hauptadministrator. Nach der Installation melden Sie sich damit an."],
    "Validate the licence first": ["Validează mai întâi licența", "Zuerst die Lizenz prüfen"],
    "Connecting…": ["Se conectează…", "Verbinde…"],
    "Server not reachable": ["Calculatorul principal nu răspunde", "Hauptcomputer nicht erreichbar"],
    "Licence already activated by your administrator": ["Licența este deja activată de administrator", "Lizenz wurde bereits vom Administrator aktiviert"],
    "This address is not an OPSQAI Self-Hosted server.": ["Această adresă nu este un calculator principal OPSQAI.", "Diese Adresse ist kein OPSQAI-Hauptcomputer."],
    "The server is not activated yet. Finish the server installation first.": ["Calculatorul principal nu e încă activat. Termină întâi instalarea pe el.", "Der Hauptcomputer ist noch nicht aktiviert. Zuerst dort die Installation abschließen."],
    "This server is activated with a different company licence.": ["Calculatorul principal este activat cu licența altei firme.", "Der Hauptcomputer ist mit der Lizenz einer anderen Firma aktiviert."],
    "All workstation seats in the licence are used. Revoke an unused computer first.": ["Toate locurile pentru stații din licență sunt ocupate. Revocă întâi un calculator nefolosit.", "Alle Arbeitsplätze der Lizenz sind belegt. Zuerst einen ungenutzten Computer widerrufen."],
    "Verifying your Windows environment. Every item must pass to continue.": ["Se verifică sistemul Windows. Toate punctele trebuie să treacă pentru a continua.", "Ihre Windows-Umgebung wird geprüft. Alle Punkte müssen bestanden werden."],
    "Windows 10 / 11 or Server 2019+": ["Windows 10 / 11 sau Server 2019+", "Windows 10 / 11 oder Server 2019+"],
    "CPU architecture": ["Arhitectura procesorului", "CPU-Architektur"],
    "Memory (min 8 GB)": ["Memorie (minim 8 GB)", "Arbeitsspeicher (mind. 8 GB)"],
    "Disk space (min 20 GB free)": ["Spațiu pe disc (minim 20 GB liberi)", "Speicherplatz (mind. 20 GB frei)"],
    "PostgreSQL 16 available": ["PostgreSQL 16 disponibil", "PostgreSQL 16 verfügbar"],
    "Ports 443, 5432, 55432 free": ["Porturile 443, 5432, 55432 libere", "Ports 443, 5432, 55432 frei"],
    "Administrator privileges": ["Drepturi de administrator", "Administratorrechte"],
    "Re-run checks": ["Reia verificările", "Prüfung wiederholen"],
    "Checking…": ["Se verifică…", "Wird geprüft…"],
    "All checks passed.": ["Toate verificările au trecut.", "Alle Prüfungen bestanden."],
    "Checks passed with warnings — the Office PC preset is recommended.": ["Verificări trecute cu avertismente — recomandăm modelul AI mic (PC de birou).", "Prüfungen mit Warnungen bestanden — die Office-PC-Variante wird empfohlen."],
    "Fix the highlighted items before continuing.": ["Rezolvă punctele marcate înainte de a continua.", "Markierte Punkte vor dem Fortfahren beheben."],
    "Installation options": ["Opțiuni de instalare", "Installationsoptionen"],
    "Where to install OPSQAI and how it should integrate with Windows.": ["Unde se instalează OPSQAI și cum se integrează cu Windows.", "Wo OPSQAI installiert wird und wie es sich in Windows integriert."],
    "Installation folder": ["Dosar de instalare", "Installationsordner"],
    "Browse…": ["Răsfoiește…", "Durchsuchen…"],
    "Data folder": ["Dosar de date", "Datenordner"],
    "databases, backups, uploads": ["baze de date, copii de siguranță, fișiere încărcate", "Datenbanken, Sicherungen, Uploads"],
    "Space required:": ["Spațiu necesar:", "Benötigter Platz:"],
    "· Available:": ["· Disponibil:", "· Verfügbar:"],
    "Country & compliance context": ["Țară și context de conformitate", "Land & Compliance-Kontext"],
    "Advisory only. This tells OPSQAI which jurisdiction, language and reference frameworks to consider when reviewing your documentation. It never certifies legal compliance and can be changed later under Organization › Compliance.": ["Doar orientativ. Îi spune lui OPSQAI ce jurisdicție, limbă și cadre de referință să ia în calcul la revizuirea documentației. Nu certifică niciodată conformitatea legală și se poate schimba ulterior din Organizație › Conformitate.", "Nur beratend. Teilt OPSQAI mit, welche Rechtsordnung, Sprache und Referenzrahmen bei der Prüfung Ihrer Dokumentation gelten. Bescheinigt niemals rechtliche Konformität; später änderbar unter Organisation › Compliance."],
    "Country / jurisdiction": ["Țară / jurisdicție", "Land / Rechtsordnung"],
    Germany: ["Germania", "Deutschland"],
    Romania: ["România", "Rumänien"],
    "Other / EU": ["Altă țară / UE", "Andere / EU"],
    "Primary language": ["Limba principală", "Hauptsprache"],
    "Default review interval (days)": ["Interval implicit de revizuire (zile)", "Standard-Prüfintervall (Tage)"],
    "Create Desktop shortcut": ["Creează scurtătură pe Desktop", "Desktop-Verknüpfung erstellen"],
    "Add OPSQAI to Start Menu": ["Adaugă OPSQAI în meniul Start", "OPSQAI zum Startmenü hinzufügen"],
    "Start OPSQAI when Windows starts": ["Pornește OPSQAI odată cu Windows", "OPSQAI beim Windows-Start starten"],
    "Allow the other company computers to connect (Windows firewall, local network only)": ["Permite celorlalte calculatoare ale firmei să se conecteze (firewall Windows, doar rețeaua locală)", "Anderen Firmencomputern die Verbindung erlauben (Windows-Firewall, nur lokales Netzwerk)"],
    "How should OPSQAI store your data?": ["Unde își păstrează OPSQAI datele?", "Wie soll OPSQAI Ihre Daten speichern?"],
    "Recommended — bundled PostgreSQL 16": ["Recomandat — PostgreSQL 16 inclus", "Empfohlen — mitgeliefertes PostgreSQL 16"],
    "Installed and managed by OPSQAI. Zero configuration. Best for most customers.": ["Instalat și administrat de OPSQAI. Fără configurare. Potrivit pentru majoritatea firmelor.", "Von OPSQAI installiert und verwaltet. Keine Konfiguration. Für die meisten Kunden ideal."],
    "Advanced — connect to my own PostgreSQL server": ["Avansat — conectare la serverul meu PostgreSQL", "Erweitert — eigenen PostgreSQL-Server verbinden"],
    "For customers with a database team or an existing enterprise cluster.": ["Pentru firme cu echipă de baze de date sau cluster existent.", "Für Kunden mit Datenbank-Team oder bestehendem Cluster."],
    Host: ["Gazdă", "Host"],
    Port: ["Port", "Port"],
    Username: ["Utilizator", "Benutzername"],
    Password: ["Parolă", "Passwort"],
    "Test connection": ["Testează conexiunea", "Verbindung testen"],
    "Testing…": ["Se testează…", "Wird getestet…"],
    "Connection failed": ["Conexiunea a eșuat", "Verbindung fehlgeschlagen"],
    "Fill in all fields first": ["Completează mai întâi toate câmpurile", "Zuerst alle Felder ausfüllen"],
    "Create the first administrator": ["Creează primul administrator", "Ersten Administrator anlegen"],
    "This account has full access to OPSQAI. You can add more users after installation.": ["Acest cont are acces complet la OPSQAI. Poți adăuga alți utilizatori după instalare.", "Dieses Konto hat vollen Zugriff auf OPSQAI. Weitere Benutzer können nach der Installation hinzugefügt werden."],
    "This creates the first local OPSQAI platform administrator for this Self-Hosted installation. It is not an OPSQAI Cloud account and it is stored only in your own database. You can add more users afterwards.": ["Se creează primul administrator local OPSQAI pentru această instalare. Nu este un cont OPSQAI Cloud și se păstrează doar în baza ta de date. Poți adăuga alți utilizatori ulterior.", "Legt den ersten lokalen OPSQAI-Administrator dieser Installation an. Es ist kein OPSQAI-Cloud-Konto und wird nur in Ihrer eigenen Datenbank gespeichert."],
    "Full name": ["Nume complet", "Vollständiger Name"],
    Email: ["E-mail", "E-Mail"],
    "At least 12 characters": ["Minim 12 caractere", "Mindestens 12 Zeichen"],
    "12+ characters": ["12+ caractere", "12+ Zeichen"],
    "Upper & lower case": ["Litere mari și mici", "Groß- & Kleinbuchstaben"],
    "A number": ["O cifră", "Eine Zahl"],
    "A symbol": ["Un simbol", "Ein Sonderzeichen"],
    "Confirm password": ["Confirmă parola", "Passwort bestätigen"],
    "Very weak": ["Foarte slabă", "Sehr schwach"],
    Weak: ["Slabă", "Schwach"],
    Fair: ["Acceptabilă", "Mittel"],
    Good: ["Bună", "Gut"],
    Strong: ["Puternică", "Stark"],
    "You're ready to install": ["Totul e pregătit pentru instalare", "Bereit zur Installation"],
    "Review your settings. Nothing has been installed yet. Installation takes about 3–5 minutes.": ["Verifică setările. Încă nu s-a instalat nimic. Instalarea durează cam 3–5 minute.", "Prüfen Sie Ihre Einstellungen. Noch wurde nichts installiert. Die Installation dauert etwa 3–5 Minuten."],
    Installation: ["Instalare", "Installation"],
    "Application folder": ["Dosarul aplicației", "Anwendungsordner"],
    Mode: ["Mod", "Modus"],
    "Bundled PostgreSQL 16": ["PostgreSQL 16 inclus", "Mitgeliefertes PostgreSQL 16"],
    "Local AI engine": ["Motor AI local", "Lokale KI-Engine"],
    Engine: ["Motor", "Engine"],
    "Ollama (local)": ["Ollama (local)", "Ollama (lokal)"],
    "Chat model": ["Model de conversație", "Chat-Modell"],
    "Fast model": ["Model rapid", "Schnelles Modell"],
    "Embedding model": ["Model de indexare", "Embedding-Modell"],
    "Email (SMTP)": ["E-mail (SMTP)", "E-Mail (SMTP)"],
    From: ["Expeditor", "Absender"],
    Name: ["Nume", "Name"],
    "Installing OPSQAI…": ["Se instalează OPSQAI…", "OPSQAI wird installiert…"],
    "Installing OPSQAI workstation…": ["Se instalează stația OPSQAI…", "OPSQAI-Arbeitsplatz wird installiert…"],
    "Connecting this computer to your company's OPSQAI server.": ["Acest calculator se conectează la calculatorul principal al firmei.", "Dieser Computer wird mit dem Hauptcomputer Ihrer Firma verbunden."],
    "Please keep this window open until setup finishes.": ["Lasă fereastra deschisă până se termină instalarea.", "Bitte lassen Sie dieses Fenster bis zum Abschluss geöffnet."],
    "Please wait…": ["Te rugăm să aștepți…", "Bitte warten…"],
    "Preparing installation": ["Pregătire instalare", "Installation wird vorbereitet"],
    "Installing bundled PostgreSQL": ["Instalare PostgreSQL inclus", "Mitgeliefertes PostgreSQL wird installiert"],
    "Installing OPSQAI services": ["Instalare servicii OPSQAI", "OPSQAI-Dienste werden installiert"],
    "Creating database & applying migrations": ["Creare bază de date și actualizări", "Datenbank wird erstellt & migriert"],
    "Installing local AI runtime": ["Instalare motor AI local", "Lokale KI wird installiert"],
    "Starting local AI runtime": ["Pornire motor AI local", "Lokale KI wird gestartet"],
    "Downloading chat model": ["Descărcare model de conversație", "Chat-Modell wird geladen"],
    "Downloading embedding model": ["Descărcare model de indexare", "Embedding-Modell wird geladen"],
    "Configuring vector storage": ["Configurare stocare vectorială", "Vektorspeicher wird konfiguriert"],
    "Verifying chat & embeddings": ["Verificare AI", "KI wird geprüft"],
    "Creating knowledge storage": ["Creare spațiu pentru documente", "Wissensspeicher wird erstellt"],
    "Finalizing installation": ["Finalizare instalare", "Installation wird abgeschlossen"],
    "Show detailed log": ["Arată jurnalul detaliat", "Detailprotokoll anzeigen"],
    "Hide detailed log": ["Ascunde jurnalul detaliat", "Detailprotokoll ausblenden"],
    "Workstation setup failed": ["Instalarea stației a eșuat", "Arbeitsplatz-Einrichtung fehlgeschlagen"],
    "OPSQAI is ready": ["OPSQAI este gata", "OPSQAI ist bereit"],
    "Your platform is installed and running.": ["Platforma este instalată și funcționează.", "Ihre Plattform ist installiert und läuft."],
    "This computer is connected to your company's OPSQAI server. The licence is already activated by your administrator — sign in with the account your principal administrator creates for you.": ["Acest calculator este conectat la calculatorul principal al firmei. Licența este deja activată de administrator — te conectezi cu contul creat de administratorul principal.", "Dieser Computer ist mit dem Hauptcomputer verbunden. Die Lizenz ist bereits vom Administrator aktiviert — melden Sie sich mit dem Konto an, das Ihr Hauptadministrator erstellt."],
    "License activated": ["Licență activată", "Lizenz aktiviert"],
    "Database created": ["Bază de date creată", "Datenbank erstellt"],
    "Services installed": ["Servicii instalate", "Dienste installiert"],
    "AI engine online": ["Motor AI pornit", "KI-Engine online"],
    "Knowledge base ready": ["Bază de cunoștințe pregătită", "Wissensbasis bereit"],
    "Administrator created": ["Administrator creat", "Administrator erstellt"],
    "Bundled PostgreSQL 16 installed": ["PostgreSQL 16 inclus instalat", "Mitgeliefertes PostgreSQL 16 installiert"],
    "External PostgreSQL connected": ["PostgreSQL extern conectat", "Externes PostgreSQL verbunden"],
    "Launch OPSQAI now": ["Pornește OPSQAI acum", "OPSQAI jetzt starten"],
    "Open installation folder": ["Deschide dosarul de instalare", "Installationsordner öffnen"],
    "View logs": ["Vezi jurnalele", "Protokolle anzeigen"],
    "Launch OPSQAI": ["Pornește OPSQAI", "OPSQAI starten"],
    Cancel: ["Anulează", "Abbrechen"],
    Back: ["Înapoi", "Zurück"],
    Next: ["Continuă", "Weiter"],
    "No result": ["Niciun rezultat", "Kein Ergebnis"],
    "Review the details below.": ["Vezi detaliile de mai jos.", "Details siehe unten."],
    "OPSQAI-XXXX-XXXX-XXXX-XXXX  or paste the contents of your .opsqai file": ["OPSQAI-XXXX-XXXX-XXXX-XXXX  sau lipește conținutul fișierului .opsqai", "OPSQAI-XXXX-XXXX-XXXX-XXXX  oder Inhalt der .opsqai-Datei einfügen"],
    Language: ["Limbă", "Sprache"],
  };
  // Dynamic strings: translated by prefix, the rest of the text is kept.
  const PREFIX = [
    ["Licence already activated by your administrator", 0],
    ["System check failed: ", ["Verificarea sistemului a eșuat: ", "Systemprüfung fehlgeschlagen: "]],
    ["Installation failed — ", ["Instalarea a eșuat — ", "Installation fehlgeschlagen — "]],
    ["Connected · ", ["Conectat · ", "Verbunden · "]],
    ["Cannot reach the server: ", ["Calculatorul principal nu poate fi contactat: ", "Hauptcomputer nicht erreichbar: "]],
  ];

  const STORE_KEY = "opsqai.wizard.lang";
  let lang = "ro";
  try { lang = localStorage.getItem(STORE_KEY) || "ro"; } catch (_) {}
  const idx = () => (lang === "ro" ? 0 : lang === "de" ? 1 : -1);

  // Remember the English original so switching language works both ways.
  const ORIG = new WeakMap();
  const ATTR_ORIG = new WeakMap();

  function tr(en) {
    const i = idx();
    if (i < 0) return en;
    const key = en.trim().replace(/\s+/g, " ");
    const hit = DICT[key];
    if (hit) return en.replace(en.trim(), hit[i]);
    for (const [p, v] of PREFIX) {
      if (key.startsWith(p)) {
        const repl = v === 0 ? DICT[p][i] : v[i];
        return en.replace(p, repl);
      }
    }
    return en;
  }

  let busy = false;
  function translateNode(n) {
    if (n.nodeType === 3) {
      if (!n.nodeValue.trim()) return;
      const p = n.parentNode;
      if (p && (p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || p.id === "log")) return;
      let orig = ORIG.get(n);
      // Text replaced by wizard.js since our last pass → new English source.
      if (orig === undefined || (n.__opsqaiOut !== n.nodeValue)) orig = n.nodeValue;
      ORIG.set(n, orig);
      const out = tr(orig);
      n.__opsqaiOut = out;
      if (n.nodeValue !== out) n.nodeValue = out;
      return;
    }
    if (n.nodeType !== 1) return;
    for (const a of ["placeholder", "title", "aria-label"]) {
      if (!n.hasAttribute(a)) continue;
      const m = ATTR_ORIG.get(n) || {};
      const cur = n.getAttribute(a);
      if (!(a in m) || m[a + ":out"] !== cur) m[a] = cur;
      const out = tr(m[a]);
      m[a + ":out"] = out;
      ATTR_ORIG.set(n, m);
      if (cur !== out) n.setAttribute(a, out);
    }
    n.childNodes.forEach(translateNode);
  }
  function translateAll() {
    busy = true;
    translateNode(document.body);
    document.title = tr("OPSQAI Self-Hosted Setup");
    document.documentElement.lang = lang;
    busy = false;
  }

  function setLang(l) {
    lang = l;
    try { localStorage.setItem(STORE_KEY, l); } catch (_) {}
    translateAll();
    document.querySelectorAll("[data-lang-btn]").forEach((b) =>
      b.classList.toggle("active", b.dataset.langBtn === l),
    );
  }

  function mountPicker() {
    if (document.getElementById("lang-picker")) return;
    const box = document.createElement("div");
    box.id = "lang-picker";
    box.innerHTML = ["ro", "de", "en"]
      .map((l) => `<button type="button" data-lang-btn="${l}">${l.toUpperCase()}</button>`)
      .join("");
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-lang-btn]");
      if (b) setLang(b.dataset.langBtn);
    });
    document.body.appendChild(box);
  }

  window.opsqaiI18n = { t: tr, get lang() { return lang; }, setLang };

  document.addEventListener("DOMContentLoaded", () => {
    mountPicker();
    setLang(lang);
    new MutationObserver(() => {
      if (!busy) translateAll();
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title"] });
  });
})();
