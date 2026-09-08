// OPSQAI HR — EN/DE/RO copy for the workflow upgrade: document generation flow,
// workable tasks, rich overview, country flows, packages, screening tools,
// policies, requests, knowledge, training, compliance, intelligence, settings.

export interface HrWsUi {
  // generic
  search: string;
  searchEmployee: string;
  selectEmployee: string;
  step: string;
  next: string;
  back: string;
  close: string;
  open: string;
  done: string;
  inProgress: string;
  pending: string;
  cancelled: string;
  priority: string;
  low: string;
  normal: string;
  high: string;
  status: string;
  details: string;
  actions: string;
  history: string;
  created: string;
  by: string;
  progress: string;
  overdue: string;
  dueToday: string;
  noResults: string;
  language: string;
  country: string;
  pdf: string;
  // document flow
  docFlowTitle: string;
  docFlowHint: string;
  stepEmployee: string;
  stepDocument: string;
  stepReview: string;
  documentType: string;
  companyTemplates: string;
  builtIn: string;
  draftName: string;
  generateNow: string;
  generated: string;
  missingFields: string;
  missingFieldsHint: string;
  editDraft: string;
  saveDraft: string;
  sendToReview: string;
  approveAndLock: string;
  approvedLocked: string;
  downloadPdf: string;
  uploadSigned: string;
  signedCopy: string;
  signedFiled: string;
  draft: string;
  review: string;
  file: string;
  statusDraft: string;
  statusReview: string;
  statusApproved: string;
  statusFile: string;
  drafts: string;
  allDocuments: string;
  byEmployee: string;
  employeeFile: string;
  // tasks
  taskDetail: string;
  description: string;
  steps: string;
  addStep: string;
  resolution: string;
  resolutionHint: string;
  linkedDocument: string;
  generateLinkedDoc: string;
  openDocument: string;
  markDone: string;
  reopen: string;
  start: string;
  taskQueue: string;
  myFilters: string;
  onlyOpen: string;
  onlyOverdue: string;
  exportPdf: string;
  completedOn: string;
  newTask: string;
  taskTitle: string;
  // overview
  todayQueue: string;
  pipelineOnboarding: string;
  pipelineOffboarding: string;
  noPipeline: string;
  nextStep: string;
  workspaces: string;
  openRequests: string;
  policiesPendingAck: string;
  trainingsExpired: string;
  trainingsPlanned: string;
  complianceOpen: string;
  complianceOverdue: string;
  candidatesNew: string;
  candidatesShortlisted: string;
  documentsDraft: string;
  documentsReview: string;
  documentsExpiring: string;
  incidents30d: string;
  positionChanges: string;
  recentActivity: string;
  alerts: string;
  viewAll: string;
  // lifecycle
  countryFlows: string;
  flowSteps: string;
  startFlow: string;
  anchorDate: string;
  anchorHint: string;
  activeFlows: string;
  positionChange: string;
  promote: string;
  demote: string;
  transfer: string;
  newPosition: string;
  criteriaMet: string;
  reason: string;
  effectiveOn: string;
  generatePromotionLetter: string;
  record: string;
  recorded: string;
  criteriaWarning: string;
  changesHistory: string;
  // equipment
  packages: string;
  builtInPackages: string;
  savedPackages: string;
  newPackage: string;
  packageName: string;
  packageItems: string;
  issuePackage: string;
  issueTo: string;
  issued: string;
  addItem: string;
  catalog: string;
  // screening
  candidateFile: string;
  askCv: string;
  askPlaceholder: string;
  ask: string;
  notStated: string;
  strengths: string;
  risks: string;
  cvLanguage: string;
  anyLanguage: string;
  editExtracted: string;
  interviewNotes: string;
  compareSelected: string;
  comparison: string;
  selectToCompare: string;
  decision: string;
  humanDecision: string;
  candidatePdf: string;
  extractedData: string;
  qaHistory: string;
  // analytics
  overview: string;
  workforce: string;
  lifecycleMetrics: string;
  risk: string;
  noData: string;
  noDataBody: string;
  // settings
  general: string;
  contractDefaults: string;
  alertsThresholds: string;
  companyIdentity: string;
  defaultLanguage: string;
  probationMonths: string;
  noticeWeeks: string;
  vacationDays: string;
  weeklyHours: string;
  contractAlertDays: string;
  documentAlertDays: string;
  autoOnboarding: string;
  autoOnboardingHint: string;
  companyLegalName: string;
  companyAddress: string;
  companySignatory: string;
  identityHint: string;
  // policies
  policies: string;
  newPolicy: string;
  starters: string;
  useStarter: string;
  category: string;
  policy: string;
  procedure: string;
  safety: string;
  codeOfConduct: string;
  requiresAck: string;
  acknowledgements: string;
  recordAck: string;
  publish: string;
  published: string;
  archive: string;
  newVersion: string;
  version: string;
  effectiveFrom: string;
  noPolicies: string;
  noPoliciesBody: string;
  // requests
  requests: string;
  newRequest: string;
  leave: string;
  certificate: string;
  equipmentReq: string;
  dataChange: string;
  trainingReq: string;
  other: string;
  fromDate: string;
  toDate: string;
  approve: string;
  rejectReq: string;
  inReview: string;
  approved: string;
  rejected: string;
  createTaskOnApprove: string;
  decisionNote: string;
  noRequests: string;
  noRequestsBody: string;
  // knowledge
  knowledge: string;
  newArticle: string;
  tags: string;
  tagsHint: string;
  noKnowledge: string;
  noKnowledgeBody: string;
  // training
  training: string;
  catalogue: string;
  addFromCatalogue: string;
  newTraining: string;
  mandatory: string;
  validMonths: string;
  neverExpires: string;
  plan: string;
  complete: string;
  planned: string;
  completed: string;
  expired: string;
  valid: string;
  records: string;
  planFor: string;
  completedOnDate: string;
  scoreResult: string;
  matrix: string;
  noTraining: string;
  noTrainingBody: string;
  // compliance
  compliance: string;
  seedLibrary: string;
  seeded: string;
  newItem: string;
  legal: string;
  dataProtection: string;
  payroll: string;
  medical: string;
  notApplicable: string;
  companyWide: string;
  perEmployee: string;
  complianceRate: string;
  noCompliance: string;
  noComplianceBody: string;
  // intelligence
  intelligence: string;
  assistant: string;
  assistantHint: string;
  assistantPlaceholder: string;
  employeeIntelligence: string;
  attention: string;
  signals: Record<string, string>;
  noSignals: string;
  suggestedQuestions: string[];
}

const en: HrWsUi = {
  search: "Search",
  searchEmployee: "Search employee by name or ID…",
  selectEmployee: "Select an employee",
  step: "Step",
  next: "Next",
  back: "Back",
  close: "Close",
  open: "Open",
  done: "Done",
  inProgress: "In progress",
  pending: "Pending",
  cancelled: "Cancelled",
  priority: "Priority",
  low: "Low",
  normal: "Normal",
  high: "High",
  status: "Status",
  details: "Details",
  actions: "Actions",
  history: "History",
  created: "Created",
  by: "by",
  progress: "Progress",
  overdue: "Overdue",
  dueToday: "Due today",
  noResults: "No results",
  language: "Language",
  country: "Country",
  pdf: "PDF",
  docFlowTitle: "Generate a document",
  docFlowHint: "Pick the employee, then the document. The country of your HR settings decides the template. Review, edit, approve, download and file the signed copy.",
  stepEmployee: "Employee",
  stepDocument: "Document",
  stepReview: "Review & approve",
  documentType: "Document type",
  companyTemplates: "Your templates",
  builtIn: "Built-in for",
  draftName: "Draft name",
  generateNow: "Generate draft",
  generated: "Draft generated",
  missingFields: "empty fields",
  missingFieldsHint: "Fields marked [___] could not be filled from the employee record or company settings. Complete them before approval.",
  editDraft: "Edit draft",
  saveDraft: "Save draft",
  sendToReview: "Send to review",
  approveAndLock: "Approve & lock",
  approvedLocked: "Approved — locked for editing",
  downloadPdf: "Download PDF",
  uploadSigned: "Upload signed copy",
  signedCopy: "Signed copy",
  signedFiled: "Signed copy filed in the employee record",
  draft: "Draft",
  review: "Review",
  file: "File",
  statusDraft: "Draft",
  statusReview: "In review",
  statusApproved: "Approved",
  statusFile: "Uploaded file",
  drafts: "Drafts",
  allDocuments: "All documents",
  byEmployee: "By employee",
  employeeFile: "Employee file",
  taskDetail: "Task",
  description: "Description",
  steps: "Checklist",
  addStep: "Add step",
  resolution: "Resolution",
  resolutionHint: "What was done — kept in the employee timeline and in the PDF.",
  linkedDocument: "Linked document",
  generateLinkedDoc: "Generate the document for this task",
  openDocument: "Open document",
  markDone: "Mark as done",
  reopen: "Reopen",
  start: "Start",
  taskQueue: "Task queue",
  myFilters: "Filters",
  onlyOpen: "Open only",
  onlyOverdue: "Overdue only",
  exportPdf: "Export PDF",
  completedOn: "Completed",
  newTask: "New task",
  taskTitle: "Task title",
  todayQueue: "What needs action",
  pipelineOnboarding: "Onboarding in progress",
  pipelineOffboarding: "Offboarding in progress",
  noPipeline: "No lifecycle flows running. Start one from Onboarding & offboarding.",
  nextStep: "Next",
  workspaces: "Across HR",
  openRequests: "open requests",
  policiesPendingAck: "policies awaiting acknowledgement",
  trainingsExpired: "expired trainings",
  trainingsPlanned: "planned trainings",
  complianceOpen: "open compliance items",
  complianceOverdue: "overdue compliance items",
  candidatesNew: "new candidates",
  candidatesShortlisted: "shortlisted candidates",
  documentsDraft: "document drafts",
  documentsReview: "documents in review",
  documentsExpiring: "documents expiring (60 days)",
  incidents30d: "incidents (30 days)",
  positionChanges: "position changes (90 days)",
  recentActivity: "Recent activity",
  alerts: "Alerts",
  viewAll: "View all",
  countryFlows: "Flows for your country",
  flowSteps: "steps",
  startFlow: "Start for employee",
  anchorDate: "Reference date",
  anchorHint: "Defaults to the employee's start (onboarding) or end date (offboarding).",
  activeFlows: "Running flows",
  positionChange: "Promotion / demotion / transfer",
  promote: "Promote",
  demote: "Demote",
  transfer: "Transfer",
  newPosition: "New position",
  criteriaMet: "Criteria",
  reason: "Reason / justification",
  effectiveOn: "Effective on",
  generatePromotionLetter: "Create a task to generate the promotion letter",
  record: "Record",
  recorded: "Recorded",
  criteriaWarning: "Fewer than half of the criteria are met — document the reasons.",
  changesHistory: "Position changes",
  packages: "Packages",
  builtInPackages: "Predefined packages",
  savedPackages: "Your packages",
  newPackage: "New package",
  packageName: "Package name",
  packageItems: "Items",
  issuePackage: "Issue package",
  issueTo: "Issue to",
  issued: "Package issued",
  addItem: "Add item",
  catalog: "Catalog",
  candidateFile: "Candidate file",
  askCv: "Ask the CV",
  askPlaceholder: "e.g. Does the candidate hold a C+E licence? Any experience with SAP?",
  ask: "Ask",
  notStated: "Not stated in the CV",
  strengths: "Strengths (from the CV)",
  risks: "Gaps / risks (from the CV)",
  cvLanguage: "CV language",
  anyLanguage: "CVs in any language are analysed; quotes stay in the original.",
  editExtracted: "Correct extracted data",
  interviewNotes: "Interview notes",
  compareSelected: "Compare selected",
  comparison: "Candidate comparison",
  selectToCompare: "Select 2–6 candidates from the same job profile.",
  decision: "Decision",
  humanDecision: "The score is computed from your weighted criteria. Shortlisting, rejecting and hiring are always human decisions.",
  candidatePdf: "Candidate PDF",
  extractedData: "Extracted data",
  qaHistory: "Questions asked",
  overview: "Overview",
  workforce: "Workforce",
  lifecycleMetrics: "Lifecycle",
  risk: "Risk & compliance",
  noData: "No data yet",
  noDataBody: "Analytics appear once employees, tasks and documents exist.",
  general: "General",
  contractDefaults: "Contract defaults",
  alertsThresholds: "Alert thresholds",
  companyIdentity: "Company identity (used in documents)",
  defaultLanguage: "Document language",
  probationMonths: "Probation (months)",
  noticeWeeks: "Notice period (weeks)",
  vacationDays: "Vacation days / year",
  weeklyHours: "Weekly hours",
  contractAlertDays: "Contract expiry alert (days)",
  documentAlertDays: "Document expiry alert (days)",
  autoOnboarding: "Start onboarding flow automatically for new employees",
  autoOnboardingHint: "Uses the country flow and the start date.",
  companyLegalName: "Legal company name",
  companyAddress: "Company address",
  companySignatory: "Signatory (name, role)",
  identityHint: "These values fill {{company_name}}, {{company_address}} and {{signatory}} in generated documents.",
  policies: "Policies & procedures",
  newPolicy: "New policy",
  starters: "Starter kit",
  useStarter: "Use",
  category: "Category",
  policy: "Policy",
  procedure: "Procedure",
  safety: "Safety",
  codeOfConduct: "Code of conduct",
  requiresAck: "Requires acknowledgement",
  acknowledgements: "Acknowledgements",
  recordAck: "Record acknowledgement",
  publish: "Publish",
  published: "Published",
  archive: "Archive",
  newVersion: "Save as new version",
  version: "Version",
  effectiveFrom: "Effective from",
  noPolicies: "No policies yet",
  noPoliciesBody: "Start from the starter kit or write your own.",
  requests: "Employee requests",
  newRequest: "New request",
  leave: "Leave",
  certificate: "Certificate",
  equipmentReq: "Equipment",
  dataChange: "Data change",
  trainingReq: "Training",
  other: "Other",
  fromDate: "From",
  toDate: "To",
  approve: "Approve",
  rejectReq: "Reject",
  inReview: "In review",
  approved: "Approved",
  rejected: "Rejected",
  createTaskOnApprove: "Create an HR task when approved",
  decisionNote: "Decision note",
  noRequests: "No requests",
  noRequestsBody: "Record requests employees raise: leave, certificates, equipment, data changes, training.",
  knowledge: "HR knowledge",
  newArticle: "New article",
  tags: "Tags",
  tagsHint: "Comma separated",
  noKnowledge: "No articles yet",
  noKnowledgeBody: "Internal HR know-how: how-tos, contacts, country rules, FAQs.",
  training: "Training",
  catalogue: "Catalogue for your country",
  addFromCatalogue: "Add",
  newTraining: "New training",
  mandatory: "Mandatory",
  validMonths: "Valid (months)",
  neverExpires: "never expires",
  plan: "Plan",
  complete: "Complete",
  planned: "Planned",
  completed: "Completed",
  expired: "Expired",
  valid: "Valid",
  records: "Records",
  planFor: "Plan / complete for employees",
  completedOnDate: "Completed on",
  scoreResult: "Result",
  matrix: "Training matrix",
  noTraining: "No trainings yet",
  noTrainingBody: "Add trainings from the country catalogue and plan them per employee.",
  compliance: "Compliance",
  seedLibrary: "Add country checklist",
  seeded: "items added",
  newItem: "New item",
  legal: "Legal",
  dataProtection: "Data protection",
  payroll: "Payroll",
  medical: "Medical",
  notApplicable: "Not applicable",
  companyWide: "Company-wide",
  perEmployee: "Per employee",
  complianceRate: "Compliance rate",
  noCompliance: "No compliance items",
  noComplianceBody: "Add the country checklist to get the legally required items per employee.",
  intelligence: "HR Intelligence",
  assistant: "AI assistant",
  assistantHint: "Answers only from your HR data (employees, tasks, documents, requests, training, compliance). No legal advice, no hiring recommendations.",
  assistantPlaceholder: "e.g. Which contracts end in the next 60 days? Who is still onboarding?",
  employeeIntelligence: "Employee intelligence",
  attention: "Needs attention",
  signals: {
    overdueTasks: "overdue tasks",
    warnings: "warnings (12 months)",
    expiredTrainings: "expired trainings",
    missingContract: "no approved contract on file",
    openCompliance: "open compliance items",
    contractEnding: "contract ending within 60 days",
    onboardingStalled: "onboarding running for 90+ days",
    probationEnding: "probation period ending",
  },
  noSignals: "No employee needs attention right now.",
  suggestedQuestions: [
    "Which contracts end in the next 60 days?",
    "Who is still in onboarding and what is their next step?",
    "Which trainings are expired?",
    "Which compliance items are overdue?",
  ],
};

const de: HrWsUi = {
  ...en,
  search: "Suchen",
  searchEmployee: "Mitarbeitende nach Name oder ID suchen…",
  selectEmployee: "Mitarbeitende:n auswählen",
  step: "Schritt",
  next: "Weiter",
  back: "Zurück",
  close: "Schließen",
  open: "Offen",
  done: "Erledigt",
  inProgress: "In Arbeit",
  pending: "Ausstehend",
  cancelled: "Abgebrochen",
  priority: "Priorität",
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  status: "Status",
  details: "Details",
  actions: "Aktionen",
  history: "Verlauf",
  created: "Erstellt",
  by: "von",
  progress: "Fortschritt",
  overdue: "Überfällig",
  dueToday: "Heute fällig",
  noResults: "Keine Treffer",
  language: "Sprache",
  country: "Land",
  docFlowTitle: "Dokument erzeugen",
  docFlowHint: "Mitarbeitende:n wählen, dann das Dokument. Das Land aus den HR-Einstellungen bestimmt die Vorlage. Prüfen, bearbeiten, freigeben, als PDF laden und die unterschriebene Kopie ablegen.",
  stepEmployee: "Mitarbeitende:r",
  stepDocument: "Dokument",
  stepReview: "Prüfen & freigeben",
  documentType: "Dokumenttyp",
  companyTemplates: "Eigene Vorlagen",
  builtIn: "Integriert für",
  draftName: "Entwurfsname",
  generateNow: "Entwurf erzeugen",
  generated: "Entwurf erzeugt",
  missingFields: "leere Felder",
  missingFieldsHint: "Mit [___] markierte Felder konnten nicht aus Personalakte oder Firmeneinstellungen gefüllt werden. Vor der Freigabe ergänzen.",
  editDraft: "Entwurf bearbeiten",
  saveDraft: "Entwurf speichern",
  sendToReview: "Zur Prüfung",
  approveAndLock: "Freigeben & sperren",
  approvedLocked: "Freigegeben — nicht mehr bearbeitbar",
  downloadPdf: "PDF herunterladen",
  uploadSigned: "Unterschriebene Kopie hochladen",
  signedCopy: "Unterschriebene Kopie",
  signedFiled: "Unterschriebene Kopie in der Personalakte abgelegt",
  draft: "Entwurf",
  review: "Prüfung",
  file: "Datei",
  statusDraft: "Entwurf",
  statusReview: "In Prüfung",
  statusApproved: "Freigegeben",
  statusFile: "Hochgeladene Datei",
  drafts: "Entwürfe",
  allDocuments: "Alle Dokumente",
  byEmployee: "Nach Mitarbeitenden",
  employeeFile: "Personalakte",
  taskDetail: "Aufgabe",
  description: "Beschreibung",
  steps: "Checkliste",
  addStep: "Schritt hinzufügen",
  resolution: "Erledigungsvermerk",
  resolutionHint: "Was wurde getan — bleibt in der Zeitleiste und im PDF.",
  linkedDocument: "Verknüpftes Dokument",
  generateLinkedDoc: "Dokument für diese Aufgabe erzeugen",
  openDocument: "Dokument öffnen",
  markDone: "Als erledigt markieren",
  reopen: "Wieder öffnen",
  start: "Starten",
  taskQueue: "Aufgabenliste",
  myFilters: "Filter",
  onlyOpen: "Nur offene",
  onlyOverdue: "Nur überfällige",
  exportPdf: "PDF exportieren",
  completedOn: "Erledigt",
  newTask: "Neue Aufgabe",
  taskTitle: "Titel",
  todayQueue: "Was zu tun ist",
  pipelineOnboarding: "Laufende Onboardings",
  pipelineOffboarding: "Laufende Offboardings",
  noPipeline: "Keine laufenden Abläufe. Unter Onboarding & Offboarding starten.",
  nextStep: "Nächster Schritt",
  workspaces: "HR gesamt",
  openRequests: "offene Anfragen",
  policiesPendingAck: "Richtlinien ohne vollständige Bestätigung",
  trainingsExpired: "abgelaufene Schulungen",
  trainingsPlanned: "geplante Schulungen",
  complianceOpen: "offene Compliance-Punkte",
  complianceOverdue: "überfällige Compliance-Punkte",
  candidatesNew: "neue Bewerbungen",
  candidatesShortlisted: "Bewerbungen in der Auswahl",
  documentsDraft: "Dokumententwürfe",
  documentsReview: "Dokumente in Prüfung",
  documentsExpiring: "ablaufende Dokumente (60 Tage)",
  incidents30d: "Vorfälle (30 Tage)",
  positionChanges: "Positionswechsel (90 Tage)",
  recentActivity: "Letzte Aktivität",
  alerts: "Hinweise",
  viewAll: "Alle anzeigen",
  countryFlows: "Abläufe für Ihr Land",
  flowSteps: "Schritte",
  startFlow: "Für Mitarbeitende:n starten",
  anchorDate: "Bezugsdatum",
  anchorHint: "Standard: Eintrittsdatum (Onboarding) bzw. Austrittsdatum (Offboarding).",
  activeFlows: "Laufende Abläufe",
  positionChange: "Beförderung / Rückstufung / Versetzung",
  promote: "Befördern",
  demote: "Zurückstufen",
  transfer: "Versetzen",
  newPosition: "Neue Position",
  criteriaMet: "Kriterien",
  reason: "Begründung",
  effectiveOn: "Wirksam ab",
  generatePromotionLetter: "Aufgabe zum Erzeugen des Beförderungsschreibens anlegen",
  record: "Erfassen",
  recorded: "Erfasst",
  criteriaWarning: "Weniger als die Hälfte der Kriterien erfüllt — Gründe dokumentieren.",
  changesHistory: "Positionswechsel",
  packages: "Pakete",
  builtInPackages: "Vordefinierte Pakete",
  savedPackages: "Eigene Pakete",
  newPackage: "Neues Paket",
  packageName: "Paketname",
  packageItems: "Positionen",
  issuePackage: "Paket ausgeben",
  issueTo: "Ausgeben an",
  issued: "Paket ausgegeben",
  addItem: "Position hinzufügen",
  catalog: "Katalog",
  candidateFile: "Bewerberakte",
  askCv: "Lebenslauf befragen",
  askPlaceholder: "z. B. Hat die Person einen CE-Führerschein? Erfahrung mit SAP?",
  ask: "Fragen",
  notStated: "Im Lebenslauf nicht angegeben",
  strengths: "Stärken (aus dem Lebenslauf)",
  risks: "Lücken / Risiken (aus dem Lebenslauf)",
  cvLanguage: "Sprache des Lebenslaufs",
  anyLanguage: "Lebensläufe in jeder Sprache werden analysiert; Zitate bleiben im Original.",
  editExtracted: "Extrahierte Daten korrigieren",
  interviewNotes: "Interviewnotizen",
  compareSelected: "Auswahl vergleichen",
  comparison: "Bewerbervergleich",
  selectToCompare: "2–6 Bewerbungen desselben Stellenprofils auswählen.",
  decision: "Entscheidung",
  humanDecision: "Der Score wird aus Ihren gewichteten Kriterien berechnet. Auswahl, Absage und Einstellung sind immer menschliche Entscheidungen.",
  candidatePdf: "Bewerber-PDF",
  extractedData: "Extrahierte Daten",
  qaHistory: "Gestellte Fragen",
  overview: "Übersicht",
  workforce: "Belegschaft",
  lifecycleMetrics: "Lebenszyklus",
  risk: "Risiko & Compliance",
  noData: "Noch keine Daten",
  noDataBody: "Auswertungen erscheinen, sobald Mitarbeitende, Aufgaben und Dokumente vorhanden sind.",
  general: "Allgemein",
  contractDefaults: "Vertragsstandards",
  alertsThresholds: "Schwellenwerte für Hinweise",
  companyIdentity: "Firmenangaben (für Dokumente)",
  defaultLanguage: "Dokumentsprache",
  probationMonths: "Probezeit (Monate)",
  noticeWeeks: "Kündigungsfrist (Wochen)",
  vacationDays: "Urlaubstage / Jahr",
  weeklyHours: "Wochenstunden",
  contractAlertDays: "Hinweis Vertragsende (Tage)",
  documentAlertDays: "Hinweis Dokumentablauf (Tage)",
  autoOnboarding: "Onboarding-Ablauf für neue Mitarbeitende automatisch starten",
  autoOnboardingHint: "Nutzt den Länderablauf und das Eintrittsdatum.",
  companyLegalName: "Firmenname (rechtlich)",
  companyAddress: "Firmenanschrift",
  companySignatory: "Unterzeichner:in (Name, Funktion)",
  identityHint: "Diese Werte füllen {{company_name}}, {{company_address}} und {{signatory}} in erzeugten Dokumenten.",
  policies: "Richtlinien & Verfahren",
  newPolicy: "Neue Richtlinie",
  starters: "Starter-Kit",
  useStarter: "Übernehmen",
  category: "Kategorie",
  policy: "Richtlinie",
  procedure: "Verfahren",
  safety: "Sicherheit",
  codeOfConduct: "Verhaltenskodex",
  requiresAck: "Bestätigung erforderlich",
  acknowledgements: "Bestätigungen",
  recordAck: "Bestätigung erfassen",
  publish: "Veröffentlichen",
  published: "Veröffentlicht",
  archive: "Archivieren",
  newVersion: "Als neue Version speichern",
  version: "Version",
  effectiveFrom: "Gültig ab",
  noPolicies: "Noch keine Richtlinien",
  noPoliciesBody: "Mit dem Starter-Kit beginnen oder eigene schreiben.",
  requests: "Mitarbeiteranfragen",
  newRequest: "Neue Anfrage",
  leave: "Urlaub",
  certificate: "Bescheinigung",
  equipmentReq: "Ausstattung",
  dataChange: "Datenänderung",
  trainingReq: "Schulung",
  other: "Sonstiges",
  fromDate: "Von",
  toDate: "Bis",
  approve: "Genehmigen",
  rejectReq: "Ablehnen",
  inReview: "In Prüfung",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
  createTaskOnApprove: "Bei Genehmigung HR-Aufgabe anlegen",
  decisionNote: "Entscheidungsvermerk",
  noRequests: "Keine Anfragen",
  noRequestsBody: "Anfragen der Mitarbeitenden erfassen: Urlaub, Bescheinigungen, Ausstattung, Datenänderungen, Schulungen.",
  knowledge: "HR-Wissen",
  newArticle: "Neuer Artikel",
  tags: "Schlagwörter",
  tagsHint: "Kommagetrennt",
  noKnowledge: "Noch keine Artikel",
  noKnowledgeBody: "Internes HR-Wissen: Anleitungen, Kontakte, Länderregeln, FAQs.",
  training: "Schulungen",
  catalogue: "Katalog für Ihr Land",
  addFromCatalogue: "Hinzufügen",
  newTraining: "Neue Schulung",
  mandatory: "Pflicht",
  validMonths: "Gültig (Monate)",
  neverExpires: "läuft nicht ab",
  plan: "Planen",
  complete: "Abschließen",
  planned: "Geplant",
  completed: "Abgeschlossen",
  expired: "Abgelaufen",
  valid: "Gültig",
  records: "Nachweise",
  planFor: "Für Mitarbeitende planen / abschließen",
  completedOnDate: "Abgeschlossen am",
  scoreResult: "Ergebnis",
  matrix: "Schulungsmatrix",
  noTraining: "Noch keine Schulungen",
  noTrainingBody: "Schulungen aus dem Länderkatalog hinzufügen und pro Mitarbeitende:r planen.",
  compliance: "Compliance",
  seedLibrary: "Länder-Checkliste hinzufügen",
  seeded: "Punkte hinzugefügt",
  newItem: "Neuer Punkt",
  legal: "Recht",
  dataProtection: "Datenschutz",
  payroll: "Lohn & Gehalt",
  medical: "Arbeitsmedizin",
  notApplicable: "Nicht zutreffend",
  companyWide: "Unternehmensweit",
  perEmployee: "Pro Mitarbeitende:r",
  complianceRate: "Erfüllungsgrad",
  noCompliance: "Keine Compliance-Punkte",
  noComplianceBody: "Länder-Checkliste hinzufügen, um die gesetzlich nötigen Punkte pro Mitarbeitende:r zu erhalten.",
  intelligence: "HR Intelligence",
  assistant: "KI-Assistent",
  assistantHint: "Antwortet nur aus Ihren HR-Daten (Mitarbeitende, Aufgaben, Dokumente, Anfragen, Schulungen, Compliance). Keine Rechtsberatung, keine Einstellungsempfehlungen.",
  assistantPlaceholder: "z. B. Welche Verträge enden in den nächsten 60 Tagen? Wer ist noch im Onboarding?",
  employeeIntelligence: "Mitarbeiter-Intelligence",
  attention: "Braucht Aufmerksamkeit",
  signals: {
    overdueTasks: "überfällige Aufgaben",
    warnings: "Abmahnungen (12 Monate)",
    expiredTrainings: "abgelaufene Schulungen",
    missingContract: "kein freigegebener Vertrag in der Akte",
    openCompliance: "offene Compliance-Punkte",
    contractEnding: "Vertrag endet in 60 Tagen",
    onboardingStalled: "Onboarding läuft seit 90+ Tagen",
    probationEnding: "Probezeit endet",
  },
  noSignals: "Derzeit braucht niemand besondere Aufmerksamkeit.",
  suggestedQuestions: [
    "Welche Verträge enden in den nächsten 60 Tagen?",
    "Wer ist noch im Onboarding und was ist der nächste Schritt?",
    "Welche Schulungen sind abgelaufen?",
    "Welche Compliance-Punkte sind überfällig?",
  ],
};

const ro: HrWsUi = {
  ...en,
  search: "Caută",
  searchEmployee: "Caută angajatul după nume sau ID…",
  selectEmployee: "Selectează un angajat",
  step: "Pasul",
  next: "Înainte",
  back: "Înapoi",
  close: "Închide",
  open: "Deschis",
  done: "Finalizat",
  inProgress: "În lucru",
  pending: "În așteptare",
  cancelled: "Anulat",
  priority: "Prioritate",
  low: "Scăzută",
  normal: "Normală",
  high: "Ridicată",
  status: "Stare",
  details: "Detalii",
  actions: "Acțiuni",
  history: "Istoric",
  created: "Creat",
  by: "de",
  progress: "Progres",
  overdue: "Întârziat",
  dueToday: "Scadent azi",
  noResults: "Niciun rezultat",
  language: "Limbă",
  country: "Țară",
  docFlowTitle: "Generează un document",
  docFlowHint: "Alege angajatul, apoi documentul. Țara din setările HR stabilește șablonul. Verifici, editezi, aprobi, descarci PDF-ul și arhivezi copia semnată.",
  stepEmployee: "Angajat",
  stepDocument: "Document",
  stepReview: "Verificare și aprobare",
  documentType: "Tip document",
  companyTemplates: "Șabloanele firmei",
  builtIn: "Integrate pentru",
  draftName: "Numele ciornei",
  generateNow: "Generează ciorna",
  generated: "Ciornă generată",
  missingFields: "câmpuri goale",
  missingFieldsHint: "Câmpurile marcate [___] nu au putut fi completate din fișa angajatului sau din setările firmei. Completează-le înainte de aprobare.",
  editDraft: "Editează ciorna",
  saveDraft: "Salvează ciorna",
  sendToReview: "Trimite la verificare",
  approveAndLock: "Aprobă și blochează",
  approvedLocked: "Aprobat — nu mai poate fi editat",
  downloadPdf: "Descarcă PDF",
  uploadSigned: "Încarcă copia semnată",
  signedCopy: "Copie semnată",
  signedFiled: "Copia semnată a fost arhivată la fișa angajatului",
  draft: "Ciornă",
  review: "Verificare",
  file: "Fișier",
  statusDraft: "Ciornă",
  statusReview: "În verificare",
  statusApproved: "Aprobat",
  statusFile: "Fișier încărcat",
  drafts: "Ciorne",
  allDocuments: "Toate documentele",
  byEmployee: "După angajat",
  employeeFile: "Dosarul angajatului",
  taskDetail: "Sarcină",
  description: "Descriere",
  steps: "Listă de verificare",
  addStep: "Adaugă pas",
  resolution: "Rezoluție",
  resolutionHint: "Ce s-a făcut — rămâne în cronologia angajatului și în PDF.",
  linkedDocument: "Document asociat",
  generateLinkedDoc: "Generează documentul pentru această sarcină",
  openDocument: "Deschide documentul",
  markDone: "Marchează ca finalizat",
  reopen: "Redeschide",
  start: "Începe",
  taskQueue: "Lista de sarcini",
  myFilters: "Filtre",
  onlyOpen: "Doar deschise",
  onlyOverdue: "Doar întârziate",
  exportPdf: "Exportă PDF",
  completedOn: "Finalizat",
  newTask: "Sarcină nouă",
  taskTitle: "Titlu",
  todayQueue: "Ce necesită acțiune",
  pipelineOnboarding: "Integrări în curs",
  pipelineOffboarding: "Plecări în curs",
  noPipeline: "Niciun flux în desfășurare. Pornește unul din Integrare și plecare.",
  nextStep: "Următorul pas",
  workspaces: "În tot HR-ul",
  openRequests: "solicitări deschise",
  policiesPendingAck: "politici fără confirmare completă",
  trainingsExpired: "instruiri expirate",
  trainingsPlanned: "instruiri planificate",
  complianceOpen: "puncte de conformitate deschise",
  complianceOverdue: "puncte de conformitate întârziate",
  candidatesNew: "candidați noi",
  candidatesShortlisted: "candidați pe lista scurtă",
  documentsDraft: "ciorne de documente",
  documentsReview: "documente în verificare",
  documentsExpiring: "documente care expiră (60 zile)",
  incidents30d: "incidente (30 zile)",
  positionChanges: "schimbări de poziție (90 zile)",
  recentActivity: "Activitate recentă",
  alerts: "Alerte",
  viewAll: "Vezi tot",
  countryFlows: "Fluxuri pentru țara ta",
  flowSteps: "pași",
  startFlow: "Pornește pentru angajat",
  anchorDate: "Data de referință",
  anchorHint: "Implicit: data angajării (integrare) sau data încetării (plecare).",
  activeFlows: "Fluxuri în desfășurare",
  positionChange: "Promovare / retrogradare / transfer",
  promote: "Promovează",
  demote: "Retrogradează",
  transfer: "Transferă",
  newPosition: "Poziția nouă",
  criteriaMet: "Criterii",
  reason: "Motivare",
  effectiveOn: "Cu efect de la",
  generatePromotionLetter: "Creează o sarcină pentru generarea deciziei de promovare",
  record: "Înregistrează",
  recorded: "Înregistrat",
  criteriaWarning: "Mai puțin de jumătate din criterii sunt îndeplinite — documentează motivele.",
  changesHistory: "Schimbări de poziție",
  packages: "Pachete",
  builtInPackages: "Pachete predefinite",
  savedPackages: "Pachetele tale",
  newPackage: "Pachet nou",
  packageName: "Numele pachetului",
  packageItems: "Articole",
  issuePackage: "Predă pachetul",
  issueTo: "Predă către",
  issued: "Pachet predat",
  addItem: "Adaugă articol",
  catalog: "Catalog",
  candidateFile: "Dosarul candidatului",
  askCv: "Întreabă CV-ul",
  askPlaceholder: "ex. Candidatul are permis C+E? Are experiență cu SAP?",
  ask: "Întreabă",
  notStated: "Nu apare în CV",
  strengths: "Puncte forte (din CV)",
  risks: "Lipsuri / riscuri (din CV)",
  cvLanguage: "Limba CV-ului",
  anyLanguage: "CV-urile în orice limbă sunt analizate; citatele rămân în original.",
  editExtracted: "Corectează datele extrase",
  interviewNotes: "Note de interviu",
  compareSelected: "Compară selecția",
  comparison: "Comparație candidați",
  selectToCompare: "Selectează 2–6 candidați din același profil de post.",
  decision: "Decizie",
  humanDecision: "Scorul se calculează din criteriile tale ponderate. Lista scurtă, respingerea și angajarea sunt întotdeauna decizii umane.",
  candidatePdf: "PDF candidat",
  extractedData: "Date extrase",
  qaHistory: "Întrebări puse",
  overview: "Prezentare",
  workforce: "Personal",
  lifecycleMetrics: "Ciclu de viață",
  risk: "Risc și conformitate",
  noData: "Nu există date încă",
  noDataBody: "Analizele apar după ce există angajați, sarcini și documente.",
  general: "General",
  contractDefaults: "Valori implicite contract",
  alertsThresholds: "Praguri de alertă",
  companyIdentity: "Identitatea firmei (folosită în documente)",
  defaultLanguage: "Limba documentelor",
  probationMonths: "Perioadă de probă (luni)",
  noticeWeeks: "Preaviz (săptămâni)",
  vacationDays: "Zile de concediu / an",
  weeklyHours: "Ore pe săptămână",
  contractAlertDays: "Alertă expirare contract (zile)",
  documentAlertDays: "Alertă expirare document (zile)",
  autoOnboarding: "Pornește automat fluxul de integrare pentru angajații noi",
  autoOnboardingHint: "Folosește fluxul țării și data angajării.",
  companyLegalName: "Denumirea legală a firmei",
  companyAddress: "Adresa firmei",
  companySignatory: "Semnatar (nume, funcție)",
  identityHint: "Aceste valori completează {{company_name}}, {{company_address}} și {{signatory}} în documentele generate.",
  policies: "Politici și proceduri",
  newPolicy: "Politică nouă",
  starters: "Kit de start",
  useStarter: "Folosește",
  category: "Categorie",
  policy: "Politică",
  procedure: "Procedură",
  safety: "Siguranță",
  codeOfConduct: "Cod de conduită",
  requiresAck: "Necesită confirmare",
  acknowledgements: "Confirmări",
  recordAck: "Înregistrează confirmarea",
  publish: "Publică",
  published: "Publicat",
  archive: "Arhivează",
  newVersion: "Salvează ca versiune nouă",
  version: "Versiune",
  effectiveFrom: "Valabil de la",
  noPolicies: "Nicio politică încă",
  noPoliciesBody: "Pornește de la kitul de start sau scrie propriile politici.",
  requests: "Solicitările angajaților",
  newRequest: "Solicitare nouă",
  leave: "Concediu",
  certificate: "Adeverință",
  equipmentReq: "Echipament",
  dataChange: "Modificare date",
  trainingReq: "Instruire",
  other: "Altele",
  fromDate: "De la",
  toDate: "Până la",
  approve: "Aprobă",
  rejectReq: "Respinge",
  inReview: "În analiză",
  approved: "Aprobată",
  rejected: "Respinsă",
  createTaskOnApprove: "Creează o sarcină HR la aprobare",
  decisionNote: "Notă de decizie",
  noRequests: "Nicio solicitare",
  noRequestsBody: "Înregistrează solicitările angajaților: concedii, adeverințe, echipamente, modificări de date, instruiri.",
  knowledge: "Cunoștințe HR",
  newArticle: "Articol nou",
  tags: "Etichete",
  tagsHint: "Separate prin virgulă",
  noKnowledge: "Niciun articol încă",
  noKnowledgeBody: "Know-how intern HR: proceduri, contacte, reguli pe țară, întrebări frecvente.",
  training: "Instruiri",
  catalogue: "Catalog pentru țara ta",
  addFromCatalogue: "Adaugă",
  newTraining: "Instruire nouă",
  mandatory: "Obligatorie",
  validMonths: "Valabilă (luni)",
  neverExpires: "nu expiră",
  plan: "Planifică",
  complete: "Finalizează",
  planned: "Planificată",
  completed: "Finalizată",
  expired: "Expirată",
  valid: "Valabilă",
  records: "Evidențe",
  planFor: "Planifică / finalizează pentru angajați",
  completedOnDate: "Finalizată la",
  scoreResult: "Rezultat",
  matrix: "Matricea instruirilor",
  noTraining: "Nicio instruire încă",
  noTrainingBody: "Adaugă instruiri din catalogul țării și planifică-le pe angajat.",
  compliance: "Conformitate",
  seedLibrary: "Adaugă lista țării",
  seeded: "puncte adăugate",
  newItem: "Punct nou",
  legal: "Legal",
  dataProtection: "Protecția datelor",
  payroll: "Salarizare",
  medical: "Medicina muncii",
  notApplicable: "Nu se aplică",
  companyWide: "La nivel de firmă",
  perEmployee: "Pe angajat",
  complianceRate: "Grad de conformitate",
  noCompliance: "Niciun punct de conformitate",
  noComplianceBody: "Adaugă lista țării pentru a obține punctele cerute de lege pentru fiecare angajat.",
  intelligence: "HR Intelligence",
  assistant: "Asistent AI",
  assistantHint: "Răspunde doar din datele tale HR (angajați, sarcini, documente, solicitări, instruiri, conformitate). Fără consultanță juridică, fără recomandări de angajare.",
  assistantPlaceholder: "ex. Ce contracte expiră în următoarele 60 de zile? Cine este încă în integrare?",
  employeeIntelligence: "Informații despre angajați",
  attention: "Necesită atenție",
  signals: {
    overdueTasks: "sarcini întârziate",
    warnings: "avertismente (12 luni)",
    expiredTrainings: "instruiri expirate",
    missingContract: "fără contract aprobat la dosar",
    openCompliance: "puncte de conformitate deschise",
    contractEnding: "contract care expiră în 60 de zile",
    onboardingStalled: "integrare în curs de peste 90 de zile",
    probationEnding: "perioadă de probă care se încheie",
  },
  noSignals: "Momentan niciun angajat nu necesită atenție specială.",
  suggestedQuestions: [
    "Ce contracte expiră în următoarele 60 de zile?",
    "Cine este încă în integrare și care este următorul pas?",
    "Ce instruiri au expirat?",
    "Ce puncte de conformitate sunt întârziate?",
  ],
};

export function hrWsUi(lang: string): HrWsUi {
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
