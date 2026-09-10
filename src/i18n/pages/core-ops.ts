// OPSQAI Core — Operations (incidents, root cause, actions) copy: EN / DE / RO.

export interface CoreOpsUi {
  title: string;
  description: string;
  tabIncidents: string;
  tabActions: string;
  tabAnalytics: string;
  newIncident: string;
  editIncident: string;
  deleteIncident: string;
  confirmDelete: string;
  search: string;
  allDepartments: string;
  allTypes: string;
  allStatus: string;
  exportPdf: string;
  reportPdf: string;
  departmentScoped: string;
  // fields
  reference: string;
  incidentTitle: string;
  descriptionField: string;
  occurredAt: string;
  department: string;
  location: string;
  cost: string;
  currency: string;
  downtime: string;
  frequency: string;
  status: string;
  type: string;
  involvedPerson: string;
  involvedRole: string;
  immediateCause: string;
  save: string;
  cancel: string;
  // kinds / statuses
  kinds: Record<string, string>;
  statuses: Record<string, string>;
  // relations
  relations: string;
  relationsHint: string;
  violatedSop: string;
  relatedSop: string;
  faq: string;
  relatedIncident: string;
  linkSearch: string;
  addLink: string;
  noLinks: string;
  // evidence
  evidence: string;
  evidenceHint: string;
  upload: string;
  download: string;
  remove: string;
  // root cause
  rootCause: string;
  rootCauseHint: string;
  analyse: string;
  analysing: string;
  problem: string;
  immediate: string;
  rootCauseField: string;
  sopViolation: string;
  processFailure: string;
  relatedProcesses: string;
  leanClass: string;
  financialImpact: string;
  whyChain: string;
  unknownStep: string;
  notCovered: string;
  sources: string;
  corrective: string;
  preventive: string;
  notAnalysed: string;
  // actions
  actions: string;
  addAction: string;
  actionTitle: string;
  actionDetail: string;
  owner: string;
  due: string;
  kindCorrective: string;
  kindPreventive: string;
  noActions: string;
  openActions: string;
  overdue: string;
  // analytics
  incidents: string;
  directCost: string;
  annualImpact: string;
  openGaps: string;
  answerQuality: string;
  byDepartment: string;
  byType: string;
  topRootCauses: string;
  topViolated: string;
  trend: string;
  noData: string;
  saved: string;
}

const en: CoreOpsUi = {
  title: "Operations",
  description:
    "Incidents and damages, their link to your procedures, grounded root-cause analysis and the actions that close them.",
  tabIncidents: "Incidents",
  tabActions: "Actions",
  tabAnalytics: "Analytics",
  newIncident: "Report incident",
  editIncident: "Edit incident",
  deleteIncident: "Delete incident",
  confirmDelete: "Delete this incident and its analysis?",
  search: "Search incidents",
  allDepartments: "All departments",
  allTypes: "All types",
  allStatus: "All statuses",
  exportPdf: "Export PDF",
  reportPdf: "Operations report (PDF)",
  departmentScoped: "You see the incidents of your department only.",
  reference: "Reference",
  incidentTitle: "Title",
  descriptionField: "What happened",
  occurredAt: "Occurred at",
  department: "Department",
  location: "Location / asset",
  cost: "Direct cost",
  currency: "Currency",
  downtime: "Downtime (minutes)",
  frequency: "Times per month",
  status: "Status",
  type: "Type",
  involvedPerson: "Person involved",
  involvedRole: "Role / position",
  immediateCause: "Immediate cause (as reported)",
  save: "Save",
  cancel: "Cancel",
  kinds: {
    damage: "Damage",
    accident: "Accident",
    process_error: "Process error",
    system_error: "System error",
    quality: "Quality issue",
    other: "Other",
  },
  statuses: { open: "Open", analysed: "Analysed", action: "Actions running", closed: "Closed" },
  relations: "Procedures & FAQ",
  relationsHint: "Link the procedure that was violated and any related knowledge.",
  violatedSop: "Violated procedure",
  relatedSop: "Related procedure",
  faq: "FAQ",
  relatedIncident: "Related incident",
  linkSearch: "Search procedures and FAQ",
  addLink: "Link",
  noLinks: "Nothing linked yet.",
  evidence: "Evidence",
  evidenceHint: "Photos or PDF, up to 8 MB per file.",
  upload: "Upload",
  download: "Download",
  remove: "Remove",
  rootCause: "Root cause intelligence",
  rootCauseHint:
    "The analysis uses your published procedures and FAQ only. Anything they do not cover is marked UNKNOWN — never guessed.",
  analyse: "Analyse",
  analysing: "Analysing…",
  problem: "Problem",
  immediate: "Immediate cause",
  rootCauseField: "Root cause",
  sopViolation: "Procedure violated",
  processFailure: "Process failure",
  relatedProcesses: "Related processes",
  leanClass: "Lean classification",
  financialImpact: "Annualised impact",
  whyChain: "5 Why",
  unknownStep: "Not covered by the knowledge base",
  notCovered: "Missing knowledge",
  sources: "Sources",
  corrective: "Corrective measure",
  preventive: "Preventive measure",
  notAnalysed: "No analysis yet.",
  actions: "Actions",
  addAction: "Add action",
  actionTitle: "Action",
  actionDetail: "Detail",
  owner: "Owner",
  due: "Due",
  kindCorrective: "Corrective",
  kindPreventive: "Preventive",
  noActions: "No actions recorded.",
  openActions: "Open actions",
  overdue: "overdue",
  incidents: "Incidents",
  directCost: "Direct cost",
  annualImpact: "Annualised impact",
  openGaps: "Open knowledge gaps",
  answerQuality: "Answer quality",
  byDepartment: "By department",
  byType: "By type",
  topRootCauses: "Top root causes",
  topViolated: "Most violated procedures",
  trend: "Trend (12 months)",
  noData: "No data yet.",
  saved: "Saved",
};

const de: CoreOpsUi = {
  ...en,
  title: "Betrieb",
  description:
    "Vorfälle und Schäden, ihre Verbindung zu Ihren Verfahren, belegte Ursachenanalyse und die Maßnahmen, die sie abschließen.",
  tabIncidents: "Vorfälle",
  tabActions: "Maßnahmen",
  tabAnalytics: "Auswertung",
  newIncident: "Vorfall melden",
  editIncident: "Vorfall bearbeiten",
  deleteIncident: "Vorfall löschen",
  confirmDelete: "Diesen Vorfall samt Analyse löschen?",
  search: "Vorfälle suchen",
  allDepartments: "Alle Abteilungen",
  allTypes: "Alle Typen",
  allStatus: "Alle Status",
  exportPdf: "PDF exportieren",
  reportPdf: "Betriebsbericht (PDF)",
  departmentScoped: "Sie sehen nur die Vorfälle Ihrer Abteilung.",
  reference: "Referenz",
  incidentTitle: "Titel",
  descriptionField: "Was ist passiert",
  occurredAt: "Zeitpunkt",
  department: "Abteilung",
  location: "Ort / Objekt",
  cost: "Direkte Kosten",
  currency: "Währung",
  downtime: "Stillstand (Minuten)",
  frequency: "Fälle pro Monat",
  status: "Status",
  type: "Typ",
  involvedPerson: "Beteiligte Person",
  involvedRole: "Rolle / Position",
  immediateCause: "Unmittelbare Ursache (gemeldet)",
  save: "Speichern",
  cancel: "Abbrechen",
  kinds: {
    damage: "Schaden",
    accident: "Unfall",
    process_error: "Prozessfehler",
    system_error: "Systemfehler",
    quality: "Qualitätsproblem",
    other: "Sonstiges",
  },
  statuses: {
    open: "Offen",
    analysed: "Analysiert",
    action: "Maßnahmen laufen",
    closed: "Abgeschlossen",
  },
  relations: "Verfahren & FAQ",
  relationsHint: "Verknüpfen Sie das verletzte Verfahren und weiteres Wissen.",
  violatedSop: "Verletztes Verfahren",
  relatedSop: "Verwandtes Verfahren",
  faq: "FAQ",
  relatedIncident: "Verwandter Vorfall",
  linkSearch: "Verfahren und FAQ suchen",
  addLink: "Verknüpfen",
  noLinks: "Noch nichts verknüpft.",
  evidence: "Nachweise",
  evidenceHint: "Fotos oder PDF, bis 8 MB pro Datei.",
  upload: "Hochladen",
  download: "Herunterladen",
  remove: "Entfernen",
  rootCause: "Ursachenanalyse",
  rootCauseHint:
    "Die Analyse nutzt ausschließlich Ihre veröffentlichten Verfahren und FAQ. Was dort nicht belegt ist, wird als UNKNOWN markiert — nie geraten.",
  analyse: "Analysieren",
  analysing: "Analyse läuft…",
  problem: "Problem",
  immediate: "Unmittelbare Ursache",
  rootCauseField: "Grundursache",
  sopViolation: "Verletztes Verfahren",
  processFailure: "Prozessversagen",
  relatedProcesses: "Betroffene Prozesse",
  leanClass: "Lean-Klassifizierung",
  financialImpact: "Jahreswirkung",
  whyChain: "5 Warum",
  unknownStep: "Nicht durch die Wissensbasis belegt",
  notCovered: "Fehlendes Wissen",
  sources: "Quellen",
  corrective: "Korrekturmaßnahme",
  preventive: "Vorbeugende Maßnahme",
  notAnalysed: "Noch keine Analyse.",
  actions: "Maßnahmen",
  addAction: "Maßnahme hinzufügen",
  actionTitle: "Maßnahme",
  actionDetail: "Details",
  owner: "Verantwortlich",
  due: "Fällig",
  kindCorrective: "Korrektiv",
  kindPreventive: "Präventiv",
  noActions: "Keine Maßnahmen erfasst.",
  openActions: "Offene Maßnahmen",
  overdue: "überfällig",
  incidents: "Vorfälle",
  directCost: "Direkte Kosten",
  annualImpact: "Jahreswirkung",
  openGaps: "Offene Wissenslücken",
  answerQuality: "Antwortqualität",
  byDepartment: "Nach Abteilung",
  byType: "Nach Typ",
  topRootCauses: "Häufigste Grundursachen",
  topViolated: "Häufigst verletzte Verfahren",
  trend: "Verlauf (12 Monate)",
  noData: "Noch keine Daten.",
  saved: "Gespeichert",
};

const ro: CoreOpsUi = {
  ...en,
  title: "Operațiuni",
  description:
    "Incidente și daune, legătura lor cu procedurile tale, analiză de cauză bazată pe documente și acțiunile care le închid.",
  tabIncidents: "Incidente",
  tabActions: "Acțiuni",
  tabAnalytics: "Analiză",
  newIncident: "Raportează incident",
  editIncident: "Editează incidentul",
  deleteIncident: "Șterge incidentul",
  confirmDelete: "Ștergi acest incident și analiza lui?",
  search: "Caută incidente",
  allDepartments: "Toate departamentele",
  allTypes: "Toate tipurile",
  allStatus: "Toate stările",
  exportPdf: "Exportă PDF",
  reportPdf: "Raport operațional (PDF)",
  departmentScoped: "Vezi doar incidentele departamentului tău.",
  reference: "Referință",
  incidentTitle: "Titlu",
  descriptionField: "Ce s-a întâmplat",
  occurredAt: "Data și ora",
  department: "Departament",
  location: "Loc / echipament",
  cost: "Cost direct",
  currency: "Monedă",
  downtime: "Timp pierdut (minute)",
  frequency: "Cazuri pe lună",
  status: "Stare",
  type: "Tip",
  involvedPerson: "Persoana implicată",
  involvedRole: "Rol / funcție",
  immediateCause: "Cauza imediată (raportată)",
  save: "Salvează",
  cancel: "Anulează",
  kinds: {
    damage: "Daună",
    accident: "Accident",
    process_error: "Eroare de proces",
    system_error: "Eroare de sistem",
    quality: "Problemă de calitate",
    other: "Altele",
  },
  statuses: {
    open: "Deschis",
    analysed: "Analizat",
    action: "Acțiuni în curs",
    closed: "Închis",
  },
  relations: "Proceduri și FAQ",
  relationsHint: "Leagă procedura încălcată și alte informații relevante.",
  violatedSop: "Procedură încălcată",
  relatedSop: "Procedură conexă",
  faq: "FAQ",
  relatedIncident: "Incident conex",
  linkSearch: "Caută proceduri și FAQ",
  addLink: "Leagă",
  noLinks: "Nimic legat încă.",
  evidence: "Dovezi",
  evidenceHint: "Fotografii sau PDF, maximum 8 MB per fișier.",
  upload: "Încarcă",
  download: "Descarcă",
  remove: "Șterge",
  rootCause: "Analiza cauzei rădăcină",
  rootCauseHint:
    "Analiza folosește numai procedurile și FAQ-urile publicate. Ce nu este acoperit este marcat UNKNOWN — nu se inventează nimic.",
  analyse: "Analizează",
  analysing: "Se analizează…",
  problem: "Problema",
  immediate: "Cauza imediată",
  rootCauseField: "Cauza rădăcină",
  sopViolation: "Procedura încălcată",
  processFailure: "Eșecul procesului",
  relatedProcesses: "Procese afectate",
  leanClass: "Clasificare Lean",
  financialImpact: "Impact anualizat",
  whyChain: "5 De ce",
  unknownStep: "Neacoperit de baza de cunoștințe",
  notCovered: "Cunoștințe lipsă",
  sources: "Surse",
  corrective: "Măsură corectivă",
  preventive: "Măsură preventivă",
  notAnalysed: "Încă nu există analiză.",
  actions: "Acțiuni",
  addAction: "Adaugă acțiune",
  actionTitle: "Acțiune",
  actionDetail: "Detalii",
  owner: "Responsabil",
  due: "Termen",
  kindCorrective: "Corectivă",
  kindPreventive: "Preventivă",
  noActions: "Nicio acțiune înregistrată.",
  openActions: "Acțiuni deschise",
  overdue: "întârziate",
  incidents: "Incidente",
  directCost: "Cost direct",
  annualImpact: "Impact anualizat",
  openGaps: "Lacune de cunoștințe deschise",
  answerQuality: "Calitatea răspunsurilor",
  byDepartment: "Pe departament",
  byType: "Pe tip",
  topRootCauses: "Cele mai frecvente cauze",
  topViolated: "Proceduri încălcate cel mai des",
  trend: "Evoluție (12 luni)",
  noData: "Încă nu există date.",
  saved: "Salvat",
};

export function coreOpsUi(lang: string): CoreOpsUi {
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
