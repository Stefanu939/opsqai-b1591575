// OPSQAI HR — EN/DE/RO copy for payroll, document signing and the employee file.

export interface HrPayrollUi {
  payroll: string;
  payrollHint: string;
  noRight: string;
  currentSalary: string;
  salaryHistory: string;
  noSalary: string;
  addSalary: string;
  validFrom: string;
  amount: string;
  currency: string;
  per: string;
  perMonth: string;
  perHour: string;
  perYear: string;
  hoursPerWeek: string;
  reason: string;
  note: string;
  month: string;
  additions: string;
  deductions: string;
  gross: string;
  payable: string;
  addAddition: string;
  addDeduction: string;
  label: string;
  noEntries: string;
  manualOnly: string;
  payslip: string;
  payslips: string;
  generatePayslip: string;
  noPayslips: string;
  accountingExport: string;
  // Signing
  signing: string;
  signingHint: string;
  requestSignature: string;
  cancelRequest: string;
  dueDate: string;
  awaitingSignature: string;
  signed: string;
  overdue: string;
  dueInDays: string;
  signerName: string;
  drawSignature: string;
  clear: string;
  saveSignature: string;
  uploadSigned: string;
  downloadForSignature: string;
  versions: string;
  noVersions: string;
  version: string;
  preview: string;
  hidePreview: string;
  documents: string;
  noDocuments: string;
  remindAll: string;
  reminded: string;
  // Employee file
  employeeFile: string;
  clickToEdit: string;
  saved: string;
  save: string;
  cancel: string;
  file: string;
  // Upload into the employee file
  uploadToFile: string;
  uploadToFileHint: string;
  documentTitle: string;
  chooseFile: string;
  uploading: string;
  uploadFailed: string;
  fileTooLarge: string;
}

const en: HrPayrollUi = {
  payroll: "Payroll",
  payrollHint:
    "Salary history, monthly additions and deductions, payslip PDFs. Values are entered by HR — no tax or contribution is calculated automatically.",
  noRight: "This account does not have the payroll right.",
  currentSalary: "Current salary",
  salaryHistory: "Salary history",
  noSalary: "No salary recorded yet.",
  addSalary: "Record salary",
  validFrom: "Valid from",
  amount: "Amount",
  currency: "Currency",
  per: "Per",
  perMonth: "Month",
  perHour: "Hour",
  perYear: "Year",
  hoursPerWeek: "Hours / week",
  reason: "Reason",
  note: "Note",
  month: "Month",
  additions: "Additions",
  deductions: "Deductions",
  gross: "Gross",
  payable: "Amount payable",
  addAddition: "Add addition",
  addDeduction: "Add deduction",
  label: "Description",
  noEntries: "No additions or deductions for this month.",
  manualOnly: "Manual values only — this is not a statutory tax calculation.",
  payslip: "Payslip",
  payslips: "Payslips",
  generatePayslip: "Generate payslip",
  noPayslips: "No payslip generated yet.",
  accountingExport: "Accounting export (month)",
  signing: "Documents to sign",
  signingHint:
    "Request a signature with a due date, download the PDF, upload the signed copy or sign on screen. Every signed copy is kept as a version.",
  requestSignature: "Request signature",
  cancelRequest: "Cancel request",
  dueDate: "Due",
  awaitingSignature: "Awaiting signature",
  signed: "Signed",
  overdue: "Overdue",
  dueInDays: "days left",
  signerName: "Signed by",
  drawSignature: "Sign on screen",
  clear: "Clear",
  saveSignature: "Save signature",
  uploadSigned: "Upload signed copy",
  downloadForSignature: "Download PDF",
  versions: "Version history",
  noVersions: "Only the current copy exists.",
  version: "Version",
  preview: "Preview",
  hidePreview: "Hide preview",
  documents: "Documents",
  noDocuments: "No documents in this employee file yet.",
  remindAll: "Create reminder tasks",
  reminded: "Reminder tasks created",
  employeeFile: "Employee file",
  clickToEdit: "Click a value to edit it.",
  saved: "Saved",
  save: "Save",
  cancel: "Cancel",
  file: "File",
};

const de: HrPayrollUi = {
  payroll: "Gehalt",
  payrollHint:
    "Gehaltshistorie, monatliche Zuschläge und Abzüge, Lohnabrechnung als PDF. Die Werte gibt HR ein — Steuern und Beiträge werden nicht automatisch berechnet.",
  noRight: "Dieses Konto hat kein Gehaltsrecht.",
  currentSalary: "Aktuelles Gehalt",
  salaryHistory: "Gehaltshistorie",
  noSalary: "Noch kein Gehalt erfasst.",
  addSalary: "Gehalt erfassen",
  validFrom: "Gültig ab",
  amount: "Betrag",
  currency: "Währung",
  per: "Pro",
  perMonth: "Monat",
  perHour: "Stunde",
  perYear: "Jahr",
  hoursPerWeek: "Stunden / Woche",
  reason: "Grund",
  note: "Notiz",
  month: "Monat",
  additions: "Zuschläge",
  deductions: "Abzüge",
  gross: "Brutto",
  payable: "Auszahlungsbetrag",
  addAddition: "Zuschlag hinzufügen",
  addDeduction: "Abzug hinzufügen",
  label: "Bezeichnung",
  noEntries: "Keine Zuschläge oder Abzüge in diesem Monat.",
  manualOnly: "Nur manuelle Werte — keine gesetzliche Steuerberechnung.",
  payslip: "Lohnabrechnung",
  payslips: "Lohnabrechnungen",
  generatePayslip: "Lohnabrechnung erzeugen",
  noPayslips: "Noch keine Lohnabrechnung erzeugt.",
  accountingExport: "Export für die Buchhaltung (Monat)",
  signing: "Zu unterschreibende Dokumente",
  signingHint:
    "Signatur mit Frist anfordern, PDF herunterladen, unterschriebene Kopie hochladen oder am Bildschirm unterschreiben. Jede unterschriebene Kopie bleibt als Version erhalten.",
  requestSignature: "Signatur anfordern",
  cancelRequest: "Anforderung zurückziehen",
  dueDate: "Frist",
  awaitingSignature: "Wartet auf Signatur",
  signed: "Unterschrieben",
  overdue: "Überfällig",
  dueInDays: "Tage übrig",
  signerName: "Unterschrieben von",
  drawSignature: "Am Bildschirm unterschreiben",
  clear: "Löschen",
  saveSignature: "Signatur speichern",
  uploadSigned: "Unterschriebene Kopie hochladen",
  downloadForSignature: "PDF herunterladen",
  versions: "Versionsverlauf",
  noVersions: "Es existiert nur die aktuelle Kopie.",
  version: "Version",
  preview: "Vorschau",
  hidePreview: "Vorschau ausblenden",
  documents: "Dokumente",
  noDocuments: "Noch keine Dokumente in dieser Personalakte.",
  remindAll: "Erinnerungsaufgaben erstellen",
  reminded: "Erinnerungsaufgaben erstellt",
  employeeFile: "Personalakte",
  clickToEdit: "Auf einen Wert klicken, um ihn zu ändern.",
  saved: "Gespeichert",
  save: "Speichern",
  cancel: "Abbrechen",
  file: "Akte",
};

const ro: HrPayrollUi = {
  payroll: "Salarizare",
  payrollHint:
    "Istoric salarial, adăugiri și rețineri lunare, fluturaș PDF. Valorile sunt introduse de HR — nu se calculează automat taxe sau contribuții.",
  noRight: "Acest cont nu are dreptul de salarizare.",
  currentSalary: "Salariul curent",
  salaryHistory: "Istoric salarial",
  noSalary: "Nu există încă un salariu înregistrat.",
  addSalary: "Înregistrează salariu",
  validFrom: "Valabil de la",
  amount: "Sumă",
  currency: "Monedă",
  per: "Pe",
  perMonth: "Lună",
  perHour: "Oră",
  perYear: "An",
  hoursPerWeek: "Ore / săptămână",
  reason: "Motiv",
  note: "Notă",
  month: "Luna",
  additions: "Adăugiri",
  deductions: "Rețineri",
  gross: "Brut",
  payable: "Sumă de plată",
  addAddition: "Adaugă adăugire",
  addDeduction: "Adaugă reținere",
  label: "Descriere",
  noEntries: "Nicio adăugire sau reținere pentru luna aceasta.",
  manualOnly: "Doar valori introduse manual — nu este un calcul legal de taxe.",
  payslip: "Fluturaș",
  payslips: "Fluturași",
  generatePayslip: "Generează fluturaș",
  noPayslips: "Nu s-a generat încă niciun fluturaș.",
  accountingExport: "Export pentru contabilitate (lună)",
  signing: "Documente de semnat",
  signingHint:
    "Cere semnătura cu termen, descarcă PDF-ul, încarcă copia semnată sau semnează pe ecran. Fiecare copie semnată rămâne ca versiune.",
  requestSignature: "Cere semnătura",
  cancelRequest: "Anulează cererea",
  dueDate: "Termen",
  awaitingSignature: "Așteaptă semnătura",
  signed: "Semnat",
  overdue: "Depășit",
  dueInDays: "zile rămase",
  signerName: "Semnat de",
  drawSignature: "Semnează pe ecran",
  clear: "Șterge",
  saveSignature: "Salvează semnătura",
  uploadSigned: "Încarcă copia semnată",
  downloadForSignature: "Descarcă PDF",
  versions: "Istoric versiuni",
  noVersions: "Există doar copia curentă.",
  version: "Versiunea",
  preview: "Previzualizare",
  hidePreview: "Ascunde previzualizarea",
  documents: "Documente",
  noDocuments: "Nu există încă documente în această fișă.",
  remindAll: "Creează sarcini de reamintire",
  reminded: "Sarcini de reamintire create",
  employeeFile: "Fișa angajatului",
  clickToEdit: "Apasă pe o valoare pentru a o modifica.",
  saved: "Salvat",
  save: "Salvează",
  cancel: "Anulează",
  file: "Fișă",
};

export function hrPayrollUi(lang: string): HrPayrollUi {
  return lang === "de" ? de : lang === "ro" ? ro : en;
}
