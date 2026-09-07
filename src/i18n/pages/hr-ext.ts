// OPSQAI HR — EN/DE/RO copy for documents, lifecycle, equipment, incidents,
// candidate screening, analytics and alerts.

export interface HrExtUi {
  // shared
  cancel: string;
  save: string;
  create: string;
  edit: string;
  remove: string;
  saved: string;
  employee: string;
  all: string;
  none: string;
  download: string;
  export: string;
  // documents
  documents: string;
  templates: string;
  newTemplate: string;
  templateName: string;
  templateKind: string;
  templateBody: string;
  templateHint: string;
  generate: string;
  generateDoc: string;
  upload: string;
  uploadDoc: string;
  title: string;
  validUntil: string;
  approve: string;
  approved: string;
  noDocuments: string;
  noDocumentsBody: string;
  // lifecycle
  lifecycle: string;
  checklists: string;
  onboarding: string;
  offboarding: string;
  newChecklist: string;
  checklistName: string;
  items: string;
  addItem: string;
  itemTitle: string;
  team: string;
  offsetDays: string;
  runChecklist: string;
  anchorDate: string;
  started: string;
  noChecklists: string;
  noChecklistsBody: string;
  // equipment
  equipment: string;
  newAsset: string;
  assetName: string;
  category: string;
  serial: string;
  assetStatus: string;
  assign: string;
  returnAsset: string;
  holder: string;
  available: string;
  assigned: string;
  retired: string;
  noAssets: string;
  noAssetsBody: string;
  // incidents
  incidents: string;
  newIncident: string;
  kind: string;
  severity: string;
  occurredOn: string;
  description: string;
  actionTaken: string;
  low: string;
  medium: string;
  high: string;
  incident: string;
  warning: string;
  accident: string;
  noIncidents: string;
  noIncidentsBody: string;
  // screening
  screening: string;
  jobProfiles: string;
  newJobProfile: string;
  jobTitle: string;
  criteria: string;
  addCriterion: string;
  criterion: string;
  weight: string;
  required: string;
  candidates: string;
  uploadCv: string;
  analyse: string;
  blindScreening: string;
  score: string;
  evidence: string;
  quote: string;
  verdictMet: string;
  verdictPartial: string;
  verdictNotMet: string;
  verdictUnknown: string;
  shortlist: string;
  reject: string;
  hire: string;
  hired: string;
  decisionNote: string;
  aiDisclaimer: string;
  noCandidates: string;
  noCandidatesBody: string;
  noProfiles: string;
  noProfilesBody: string;
  compare: string;
  // analytics
  analytics: string;
  alerts: string;
  headcountByDepartment: string;
  contractsByType: string;
  hiresByMonth: string;
  exitsByMonth: string;
  averageTenure: string;
  turnover: string;
  incidents12m: string;
  equipmentAssigned: string;
  equipmentAvailable: string;
  noAlerts: string;
  critical: string;
  warn: string;
  info: string;
  reportPdf: string;
}

const en: HrExtUi = {
  cancel: "Cancel",
  save: "Save",
  create: "Create",
  edit: "Edit",
  remove: "Delete",
  saved: "Saved",
  employee: "Employee",
  all: "All",
  none: "—",
  download: "Download",
  export: "Export",
  documents: "Documents",
  templates: "Templates",
  newTemplate: "New template",
  templateName: "Template name",
  templateKind: "Type",
  templateBody: "Template text",
  templateHint:
    "Use placeholders such as {{full_name}}, {{employee_no}}, {{position}}, {{start_date}}, {{today}}.",
  generate: "Generate",
  generateDoc: "Generate from template",
  upload: "Upload",
  uploadDoc: "Upload document",
  title: "Title",
  validUntil: "Valid until",
  approve: "Approve",
  approved: "Approved",
  noDocuments: "No documents yet",
  noDocumentsBody: "Generate a contract from a template or upload an existing file.",
  lifecycle: "Onboarding & offboarding",
  checklists: "Checklists",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  newChecklist: "New checklist",
  checklistName: "Checklist name",
  items: "Steps",
  addItem: "Add step",
  itemTitle: "Step",
  team: "Team",
  offsetDays: "Days from start/end date",
  runChecklist: "Start for employee",
  anchorDate: "Reference date",
  started: "Checklist started",
  noChecklists: "No checklists yet",
  noChecklistsBody: "Create a checklist once — then start it for every new or leaving employee.",
  equipment: "Equipment",
  newAsset: "New item",
  assetName: "Item",
  category: "Category",
  serial: "Serial number",
  assetStatus: "Status",
  assign: "Assign",
  returnAsset: "Take back",
  holder: "Held by",
  available: "Available",
  assigned: "Assigned",
  retired: "Retired",
  noAssets: "No equipment yet",
  noAssetsBody: "Add laptops, phones, keys or protective equipment and assign them to employees.",
  incidents: "Incidents & warnings",
  newIncident: "New entry",
  kind: "Type",
  severity: "Severity",
  occurredOn: "Date",
  description: "What happened",
  actionTaken: "Action taken",
  low: "Low",
  medium: "Medium",
  high: "High",
  incident: "Incident",
  warning: "Warning",
  accident: "Accident",
  noIncidents: "Nothing recorded",
  noIncidentsBody: "Incidents, warnings and workplace accidents are documented here.",
  screening: "Candidate screening",
  jobProfiles: "Job profiles",
  newJobProfile: "New job profile",
  jobTitle: "Job title",
  criteria: "Screening criteria",
  addCriterion: "Add criterion",
  criterion: "Criterion",
  weight: "Weight",
  required: "Must have",
  candidates: "Candidates",
  uploadCv: "Upload CV",
  analyse: "Analyse CV",
  blindScreening: "Blind screening (hide personal details)",
  score: "Score",
  evidence: "Evidence",
  quote: "From the CV",
  verdictMet: "Met",
  verdictPartial: "Partly",
  verdictNotMet: "Not met",
  verdictUnknown: "Not stated",
  shortlist: "Shortlist",
  reject: "Reject",
  hire: "Hire",
  hired: "Hired",
  decisionNote: "Decision note",
  aiDisclaimer:
    "The analysis only quotes the uploaded CV. It never decides — you shortlist, reject or hire.",
  noCandidates: "No candidates yet",
  noCandidatesBody: "Upload a CV for this job profile to start the screening.",
  noProfiles: "No job profiles yet",
  noProfilesBody: "Create a job profile with the criteria you screen against.",
  compare: "Compare",
  analytics: "HR analytics",
  alerts: "Alerts",
  headcountByDepartment: "Headcount by department",
  contractsByType: "Contracts by type",
  hiresByMonth: "Hires per month",
  exitsByMonth: "Exits per month",
  averageTenure: "Average tenure (months)",
  turnover: "Turnover 12 months",
  incidents12m: "Incidents 12 months",
  equipmentAssigned: "Equipment assigned",
  equipmentAvailable: "Equipment available",
  noAlerts: "No open alerts.",
  critical: "Critical",
  warn: "Warning",
  info: "Info",
  reportPdf: "HR report (PDF)",
};

const de: HrExtUi = {
  ...en,
  cancel: "Abbrechen",
  save: "Speichern",
  create: "Anlegen",
  edit: "Bearbeiten",
  remove: "Löschen",
  saved: "Gespeichert",
  employee: "Mitarbeiter",
  all: "Alle",
  download: "Herunterladen",
  export: "Export",
  documents: "Dokumente",
  templates: "Vorlagen",
  newTemplate: "Neue Vorlage",
  templateName: "Vorlagenname",
  templateKind: "Art",
  templateBody: "Vorlagentext",
  templateHint:
    "Platzhalter nutzen, z. B. {{full_name}}, {{employee_no}}, {{position}}, {{start_date}}, {{today}}.",
  generate: "Erzeugen",
  generateDoc: "Aus Vorlage erzeugen",
  upload: "Hochladen",
  uploadDoc: "Dokument hochladen",
  title: "Titel",
  validUntil: "Gültig bis",
  approve: "Freigeben",
  approved: "Freigegeben",
  noDocuments: "Noch keine Dokumente",
  noDocumentsBody: "Vertrag aus einer Vorlage erzeugen oder eine Datei hochladen.",
  lifecycle: "Onboarding & Offboarding",
  checklists: "Checklisten",
  newChecklist: "Neue Checkliste",
  checklistName: "Name der Checkliste",
  items: "Schritte",
  addItem: "Schritt hinzufügen",
  itemTitle: "Schritt",
  team: "Team",
  offsetDays: "Tage ab Ein-/Austrittsdatum",
  runChecklist: "Für Mitarbeiter starten",
  anchorDate: "Bezugsdatum",
  started: "Checkliste gestartet",
  noChecklists: "Noch keine Checklisten",
  noChecklistsBody:
    "Checkliste einmal anlegen — danach für jeden Ein- und Austritt starten.",
  equipment: "Ausstattung",
  newAsset: "Neuer Gegenstand",
  assetName: "Gegenstand",
  category: "Kategorie",
  serial: "Seriennummer",
  assetStatus: "Status",
  assign: "Zuweisen",
  returnAsset: "Zurücknehmen",
  holder: "Bei",
  available: "Verfügbar",
  assigned: "Zugewiesen",
  retired: "Ausgemustert",
  noAssets: "Noch keine Ausstattung",
  noAssetsBody: "Laptops, Telefone, Schlüssel oder Schutzausrüstung erfassen und zuweisen.",
  incidents: "Vorfälle & Abmahnungen",
  newIncident: "Neuer Eintrag",
  kind: "Art",
  severity: "Schwere",
  occurredOn: "Datum",
  description: "Was ist passiert",
  actionTaken: "Maßnahme",
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  incident: "Vorfall",
  warning: "Abmahnung",
  accident: "Arbeitsunfall",
  noIncidents: "Nichts erfasst",
  noIncidentsBody: "Vorfälle, Abmahnungen und Arbeitsunfälle werden hier dokumentiert.",
  screening: "Bewerber-Screening",
  jobProfiles: "Stellenprofile",
  newJobProfile: "Neues Stellenprofil",
  jobTitle: "Stellenbezeichnung",
  criteria: "Screening-Kriterien",
  addCriterion: "Kriterium hinzufügen",
  criterion: "Kriterium",
  weight: "Gewichtung",
  required: "Pflicht",
  candidates: "Bewerber",
  uploadCv: "CV hochladen",
  analyse: "CV analysieren",
  blindScreening: "Blindes Screening (persönliche Angaben ausblenden)",
  score: "Score",
  evidence: "Belege",
  quote: "Aus dem CV",
  verdictMet: "Erfüllt",
  verdictPartial: "Teilweise",
  verdictNotMet: "Nicht erfüllt",
  verdictUnknown: "Nicht angegeben",
  shortlist: "Shortlist",
  reject: "Ablehnen",
  hire: "Einstellen",
  hired: "Eingestellt",
  decisionNote: "Entscheidungsnotiz",
  aiDisclaimer:
    "Die Analyse zitiert nur den hochgeladenen CV. Sie entscheidet nicht — Sie shortlisten, lehnen ab oder stellen ein.",
  noCandidates: "Noch keine Bewerber",
  noCandidatesBody: "CV zu diesem Stellenprofil hochladen, um das Screening zu starten.",
  noProfiles: "Noch keine Stellenprofile",
  noProfilesBody: "Stellenprofil mit den Kriterien anlegen, gegen die geprüft wird.",
  compare: "Vergleichen",
  analytics: "HR-Analysen",
  alerts: "Hinweise",
  headcountByDepartment: "Mitarbeiter je Abteilung",
  contractsByType: "Verträge je Art",
  hiresByMonth: "Eintritte pro Monat",
  exitsByMonth: "Austritte pro Monat",
  averageTenure: "Durchschnittliche Betriebszugehörigkeit (Monate)",
  turnover: "Fluktuation 12 Monate",
  incidents12m: "Vorfälle 12 Monate",
  equipmentAssigned: "Ausstattung zugewiesen",
  equipmentAvailable: "Ausstattung verfügbar",
  noAlerts: "Keine offenen Hinweise.",
  critical: "Kritisch",
  warn: "Warnung",
  info: "Info",
  reportPdf: "HR-Bericht (PDF)",
};

const ro: HrExtUi = {
  ...en,
  cancel: "Anulează",
  save: "Salvează",
  create: "Creează",
  edit: "Editează",
  remove: "Șterge",
  saved: "Salvat",
  employee: "Angajat",
  all: "Toate",
  download: "Descarcă",
  export: "Export",
  documents: "Documente",
  templates: "Șabloane",
  newTemplate: "Șablon nou",
  templateName: "Nume șablon",
  templateKind: "Tip",
  templateBody: "Text șablon",
  templateHint:
    "Folosește câmpuri precum {{full_name}}, {{employee_no}}, {{position}}, {{start_date}}, {{today}}.",
  generate: "Generează",
  generateDoc: "Generează din șablon",
  upload: "Încarcă",
  uploadDoc: "Încarcă document",
  title: "Titlu",
  validUntil: "Valabil până la",
  approve: "Aprobă",
  approved: "Aprobat",
  noDocuments: "Încă nu există documente",
  noDocumentsBody: "Generează un contract dintr-un șablon sau încarcă un fișier existent.",
  lifecycle: "Integrare și plecare",
  checklists: "Liste de verificare",
  onboarding: "Integrare",
  offboarding: "Plecare",
  newChecklist: "Listă nouă",
  checklistName: "Nume listă",
  items: "Pași",
  addItem: "Adaugă pas",
  itemTitle: "Pas",
  team: "Echipă",
  offsetDays: "Zile față de data de start/plecare",
  runChecklist: "Pornește pentru angajat",
  anchorDate: "Dată de referință",
  started: "Lista a fost pornită",
  noChecklists: "Încă nu există liste",
  noChecklistsBody:
    "Creează lista o singură dată — apoi pornește-o pentru fiecare angajat nou sau care pleacă.",
  equipment: "Echipamente",
  newAsset: "Echipament nou",
  assetName: "Echipament",
  category: "Categorie",
  serial: "Număr de serie",
  assetStatus: "Stare",
  assign: "Atribuie",
  returnAsset: "Preia înapoi",
  holder: "La",
  available: "Disponibil",
  assigned: "Atribuit",
  retired: "Scos din uz",
  noAssets: "Încă nu există echipamente",
  noAssetsBody: "Adaugă laptopuri, telefoane, chei sau echipament de protecție și atribuie-le.",
  incidents: "Incidente și avertismente",
  newIncident: "Înregistrare nouă",
  kind: "Tip",
  severity: "Gravitate",
  occurredOn: "Dată",
  description: "Ce s-a întâmplat",
  actionTaken: "Măsura luată",
  low: "Scăzută",
  medium: "Medie",
  high: "Ridicată",
  incident: "Incident",
  warning: "Avertisment",
  accident: "Accident de muncă",
  noIncidents: "Nu există înregistrări",
  noIncidentsBody: "Incidentele, avertismentele și accidentele de muncă se documentează aici.",
  screening: "Evaluare candidați",
  jobProfiles: "Profiluri de post",
  newJobProfile: "Profil de post nou",
  jobTitle: "Denumirea postului",
  criteria: "Criterii de evaluare",
  addCriterion: "Adaugă criteriu",
  criterion: "Criteriu",
  weight: "Pondere",
  required: "Obligatoriu",
  candidates: "Candidați",
  uploadCv: "Încarcă CV",
  analyse: "Analizează CV-ul",
  blindScreening: "Evaluare anonimă (ascunde datele personale)",
  score: "Punctaj",
  evidence: "Dovezi",
  quote: "Din CV",
  verdictMet: "Îndeplinit",
  verdictPartial: "Parțial",
  verdictNotMet: "Neîndeplinit",
  verdictUnknown: "Nu apare în CV",
  shortlist: "Listă scurtă",
  reject: "Respinge",
  hire: "Angajează",
  hired: "Angajat",
  decisionNote: "Notă de decizie",
  aiDisclaimer:
    "Analiza citează doar CV-ul încărcat. Nu decide niciodată — tu treci în listă scurtă, respingi sau angajezi.",
  noCandidates: "Încă nu există candidați",
  noCandidatesBody: "Încarcă un CV pentru acest profil de post ca să începi evaluarea.",
  noProfiles: "Încă nu există profiluri de post",
  noProfilesBody: "Creează un profil de post cu criteriile după care evaluezi.",
  compare: "Compară",
  analytics: "Analize HR",
  alerts: "Alerte",
  headcountByDepartment: "Angajați pe departament",
  contractsByType: "Contracte pe tip",
  hiresByMonth: "Angajări pe lună",
  exitsByMonth: "Plecări pe lună",
  averageTenure: "Vechime medie (luni)",
  turnover: "Fluctuație 12 luni",
  incidents12m: "Incidente 12 luni",
  equipmentAssigned: "Echipamente atribuite",
  equipmentAvailable: "Echipamente disponibile",
  noAlerts: "Nu există alerte deschise.",
  critical: "Critic",
  warn: "Avertisment",
  info: "Informativ",
  reportPdf: "Raport HR (PDF)",
};

export function hrExtUi(lang: string): HrExtUi {
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
