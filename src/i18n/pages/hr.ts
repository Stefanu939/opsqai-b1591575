// OPSQAI HR — real EN/DE/RO copy for the Self-Hosted workspace.

export interface HrUi {
  eyebrow: string;
  notLicensed: string;
  notLicensedBody: string;
  // Overview
  employees: string;
  active: string;
  onboarding: string;
  offboarding: string;
  onLeave: string;
  actionRequired: string;
  contractsExpiring: string;
  openTasks: string;
  overdueTasks: string;
  missingData: string;
  lifecycle: string;
  newHires: string;
  leaving: string;
  // List
  employeeList: string;
  search: string;
  searchPlaceholder: string;
  all: string;
  department: string;
  position: string;
  location: string;
  status: string;
  contract: string;
  employeeId: string;
  name: string;
  none: string;
  noneBody: string;
  newEmployee: string;
  exportCsv: string;
  profilePdf: string;
  // Form
  personalInformation: string;
  employment: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  email: string;
  phone: string;
  startDate: string;
  endDate: string;
  employmentType: string;
  notes: string;
  cancel: string;
  create: string;
  save: string;
  edit: string;
  remove: string;
  saved: string;
  // Detail
  overview: string;
  documents: string;
  training: string;
  equipment: string;
  incidents: string;
  activity: string;
  ai: string;
  currentStatus: string;
  timeline: string;
  noTimeline: string;
  back: string;
  comingSoon: string;
  // Tasks
  tasks: string;
  taskTitle: string;
  team: string;
  assignedTo: string;
  dueDate: string;
  newTask: string;
  noTasks: string;
  markDone: string;
  // Reference data
  referenceData: string;
  addDepartment: string;
  addPosition: string;
  addLocation: string;
  jurisdiction: string;
  statuses: Record<string, string>;
}

const en: HrUi = {
  eyebrow: "OPSQAI HR",
  notLicensed: "OPSQAI HR is not enabled",
  notLicensedBody: "This product is delivered through your license. Contact OPSQAI to enable it.",
  employees: "Employees",
  active: "Active",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  onLeave: "On leave",
  actionRequired: "Action required",
  contractsExpiring: "contracts ending in 30 days",
  openTasks: "open HR tasks",
  overdueTasks: "overdue tasks",
  missingData: "employee records with missing data",
  lifecycle: "Employee lifecycle",
  newHires: "New hires (30 days)",
  leaving: "Leaving",
  employeeList: "Employee list",
  search: "Search",
  searchPlaceholder: "Name, employee ID or email…",
  all: "All",
  department: "Department",
  position: "Position",
  location: "Location",
  status: "Status",
  contract: "Contract",
  employeeId: "Employee ID",
  name: "Name",
  none: "No employees yet",
  noneBody: "Create the first employee — OPSQAI assigns the internal employee ID automatically.",
  newEmployee: "New employee",
  exportCsv: "Export Excel/CSV",
  profilePdf: "Profile PDF",
  personalInformation: "Personal information",
  employment: "Employment",
  firstName: "First name",
  lastName: "Last name",
  dateOfBirth: "Date of birth",
  address: "Address",
  email: "Email",
  phone: "Phone",
  startDate: "Start date",
  endDate: "End date",
  employmentType: "Employment type",
  notes: "Notes",
  cancel: "Cancel",
  create: "Create",
  save: "Save",
  edit: "Edit",
  remove: "Delete",
  saved: "Saved",
  overview: "Overview",
  documents: "Documents",
  training: "Training",
  equipment: "Equipment",
  incidents: "Incidents",
  activity: "Activity",
  ai: "AI",
  currentStatus: "Current status",
  timeline: "Status timeline",
  noTimeline: "No events recorded yet.",
  back: "Back to list",
  comingSoon: "This tab is delivered in the next HR phase.",
  tasks: "HR tasks",
  taskTitle: "Task",
  team: "Team",
  assignedTo: "Assigned to",
  dueDate: "Due date",
  newTask: "New task",
  noTasks: "No open tasks.",
  markDone: "Mark done",
  referenceData: "Reference data",
  addDepartment: "Add department",
  addPosition: "Add position",
  addLocation: "Add location",
  jurisdiction: "Jurisdiction",
  statuses: {
    onboarding: "Onboarding",
    active: "Active",
    leave: "On leave",
    offboarding: "Offboarding",
    terminated: "Terminated",
    pending: "Pending",
    in_progress: "In progress",
    done: "Done",
    cancelled: "Cancelled",
  },
};

const de: HrUi = {
  ...en,
  notLicensed: "OPSQAI HR ist nicht aktiviert",
  notLicensedBody:
    "Dieses Produkt wird über Ihre Lizenz ausgeliefert. Wenden Sie sich an OPSQAI zur Aktivierung.",
  employees: "Mitarbeiter",
  active: "Aktiv",
  onboarding: "Onboarding",
  offboarding: "Offboarding",
  onLeave: "Abwesend",
  actionRequired: "Handlungsbedarf",
  contractsExpiring: "Verträge enden in 30 Tagen",
  openTasks: "offene HR-Aufgaben",
  overdueTasks: "überfällige Aufgaben",
  missingData: "Personalakten mit fehlenden Daten",
  lifecycle: "Mitarbeiter-Lebenszyklus",
  newHires: "Neueintritte (30 Tage)",
  leaving: "Austritte",
  employeeList: "Mitarbeiterliste",
  search: "Suche",
  searchPlaceholder: "Name, Personalnummer oder E-Mail…",
  all: "Alle",
  department: "Abteilung",
  position: "Position",
  location: "Standort",
  status: "Status",
  contract: "Vertrag",
  employeeId: "Personalnummer",
  name: "Name",
  none: "Noch keine Mitarbeiter",
  noneBody:
    "Erstellen Sie den ersten Mitarbeiter — OPSQAI vergibt die interne Personalnummer automatisch.",
  newEmployee: "Neuer Mitarbeiter",
  exportCsv: "Excel/CSV-Export",
  profilePdf: "Profil-PDF",
  personalInformation: "Persönliche Daten",
  employment: "Beschäftigung",
  firstName: "Vorname",
  lastName: "Nachname",
  dateOfBirth: "Geburtsdatum",
  address: "Adresse",
  email: "E-Mail",
  phone: "Telefon",
  startDate: "Eintrittsdatum",
  endDate: "Austrittsdatum",
  employmentType: "Beschäftigungsart",
  notes: "Notizen",
  cancel: "Abbrechen",
  create: "Erstellen",
  save: "Speichern",
  edit: "Bearbeiten",
  remove: "Löschen",
  saved: "Gespeichert",
  overview: "Übersicht",
  documents: "Dokumente",
  training: "Schulung",
  equipment: "Ausstattung",
  incidents: "Vorfälle",
  activity: "Aktivität",
  ai: "KI",
  currentStatus: "Aktueller Status",
  timeline: "Status-Verlauf",
  noTimeline: "Noch keine Ereignisse erfasst.",
  back: "Zurück zur Liste",
  comingSoon: "Dieser Bereich folgt in der nächsten HR-Phase.",
  tasks: "HR-Aufgaben",
  taskTitle: "Aufgabe",
  team: "Team",
  assignedTo: "Zuständig",
  dueDate: "Fällig am",
  newTask: "Neue Aufgabe",
  noTasks: "Keine offenen Aufgaben.",
  markDone: "Als erledigt markieren",
  referenceData: "Stammdaten",
  addDepartment: "Abteilung hinzufügen",
  addPosition: "Position hinzufügen",
  addLocation: "Standort hinzufügen",
  jurisdiction: "Rechtsraum",
  statuses: {
    onboarding: "Onboarding",
    active: "Aktiv",
    leave: "Abwesend",
    offboarding: "Offboarding",
    terminated: "Ausgetreten",
    pending: "Offen",
    in_progress: "In Arbeit",
    done: "Erledigt",
    cancelled: "Abgebrochen",
  },
};

const ro: HrUi = {
  ...en,
  notLicensed: "OPSQAI HR nu este activat",
  notLicensedBody: "Acest produs vine prin licența dvs. Contactați OPSQAI pentru activare.",
  employees: "Angajați",
  active: "Activi",
  onboarding: "În integrare",
  offboarding: "În plecare",
  onLeave: "În concediu",
  actionRequired: "Necesită acțiune",
  contractsExpiring: "contracte care expiră în 30 de zile",
  openTasks: "sarcini HR deschise",
  overdueTasks: "sarcini întârziate",
  missingData: "fișe de angajat cu date lipsă",
  lifecycle: "Ciclul de viață al angajatului",
  newHires: "Angajări noi (30 de zile)",
  leaving: "Plecări",
  employeeList: "Lista angajaților",
  search: "Căutare",
  searchPlaceholder: "Nume, ID angajat sau email…",
  all: "Toate",
  department: "Departament",
  position: "Poziție",
  location: "Locație",
  status: "Status",
  contract: "Contract",
  employeeId: "ID angajat",
  name: "Nume",
  none: "Încă niciun angajat",
  noneBody: "Creează primul angajat — OPSQAI atribuie automat ID-ul intern.",
  newEmployee: "Angajat nou",
  exportCsv: "Export Excel/CSV",
  profilePdf: "PDF profil",
  personalInformation: "Date personale",
  employment: "Date de angajare",
  firstName: "Prenume",
  lastName: "Nume",
  dateOfBirth: "Data naşterii",
  address: "Adresă",
  email: "Email",
  phone: "Telefon",
  startDate: "Data începerii",
  endDate: "Data încetării",
  employmentType: "Tip de muncă",
  notes: "Note",
  cancel: "Anulează",
  create: "Creează",
  save: "Salvează",
  edit: "Editează",
  remove: "Șterge",
  saved: "Salvat",
  overview: "Prezentare",
  documents: "Documente",
  training: "Instruire",
  equipment: "Echipament",
  incidents: "Incidente",
  activity: "Activitate",
  ai: "AI",
  currentStatus: "Status curent",
  timeline: "Istoric status",
  noTimeline: "Nu există încă evenimente.",
  back: "Înapoi la listă",
  comingSoon: "Această secțiune vine în faza HR următoare.",
  tasks: "Sarcini HR",
  taskTitle: "Sarcină",
  team: "Echipă",
  assignedTo: "Responsabil",
  dueDate: "Termen",
  newTask: "Sarcină nouă",
  noTasks: "Nicio sarcină deschisă.",
  markDone: "Marchează finalizat",
  referenceData: "Date de referință",
  addDepartment: "Adaugă departament",
  addPosition: "Adaugă poziție",
  addLocation: "Adaugă locație",
  jurisdiction: "Jurisdicție",
  statuses: {
    onboarding: "În integrare",
    active: "Activ",
    leave: "În concediu",
    offboarding: "În plecare",
    terminated: "Încetat",
    pending: "În aşteptare",
    in_progress: "În lucru",
    done: "Finalizat",
    cancelled: "Anulat",
  },
};

export function hrUi(lang: string): HrUi {
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
