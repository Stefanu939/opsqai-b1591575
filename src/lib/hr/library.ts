// OPSQAI HR — built-in country library (client-safe, no I/O).
//
// Documents, onboarding/offboarding flows, equipment packages, compliance
// items, trainings and promotion criteria per country. Everything here is a
// starting point the HR team edits inside the app; nothing is invented at
// generation time — placeholders are filled from the employee record and
// company settings, and whatever is missing stays visibly marked as [___].

import type { HrCountry } from "./types";

export type HrDocKey =
  | "employment_contract"
  | "fixed_term_contract"
  | "contract_amendment"
  | "job_description"
  | "employment_certificate"
  | "termination_notice"
  | "termination_agreement"
  | "warning_letter"
  | "reference_letter"
  | "confidentiality"
  | "equipment_handover"
  | "promotion_letter";

export interface HrDocDefinition {
  key: HrDocKey;
  kind: "contract" | "letter" | "policy" | "other";
  label: Record<"en" | "de" | "ro", string>;
  /** Suggested validity in months (null = no expiry). */
  validMonths: number | null;
  body: string;
}

export const HR_PLACEHOLDERS = [
  "company_name",
  "company_address",
  "signatory",
  "employee_no",
  "full_name",
  "first_name",
  "last_name",
  "date_of_birth",
  "address",
  "email",
  "phone",
  "department",
  "position",
  "location",
  "start_date",
  "end_date",
  "contract_type",
  "employment_type",
  "weekly_hours",
  "vacation_days",
  "probation_months",
  "notice_weeks",
  "today",
] as const;

const sig = (lines: string[]) => `\n\n${lines.join("\n")}`;

const DE: HrDocDefinition[] = [
  {
    key: "employment_contract",
    kind: "contract",
    validMonths: null,
    label: { en: "Employment contract (DE)", de: "Arbeitsvertrag", ro: "Contract de muncă (DE)" },
    body: `ARBEITSVERTRAG

zwischen
{{company_name}}, {{company_address}} (nachfolgend „Arbeitgeber“)
und
{{full_name}}, geboren am {{date_of_birth}}, wohnhaft {{address}} (nachfolgend „Arbeitnehmer/in“)
Personalnummer: {{employee_no}}

§ 1 Beginn und Art des Arbeitsverhältnisses
Das Arbeitsverhältnis beginnt am {{start_date}} und wird auf unbestimmte Zeit geschlossen ({{contract_type}}).

§ 2 Tätigkeit und Arbeitsort
Der/Die Arbeitnehmer/in wird als {{position}} in der Abteilung {{department}} am Standort {{location}} eingestellt. Der Arbeitgeber behält sich vor, dem/der Arbeitnehmer/in eine andere gleichwertige Tätigkeit zuzuweisen.

§ 3 Probezeit
Die ersten {{probation_months}} Monate gelten als Probezeit. Während der Probezeit kann das Arbeitsverhältnis beiderseits mit einer Frist von zwei Wochen gekündigt werden.

§ 4 Arbeitszeit
Die regelmäßige wöchentliche Arbeitszeit beträgt {{weekly_hours}} Stunden ({{employment_type}}).

§ 5 Vergütung
Der/Die Arbeitnehmer/in erhält ein monatliches Bruttogehalt von [___] EUR, zahlbar am Monatsende auf ein vom/von der Arbeitnehmer/in benanntes Konto.

§ 6 Urlaub
Der Jahresurlaub beträgt {{vacation_days}} Arbeitstage.

§ 7 Kündigung
Nach der Probezeit gilt eine Kündigungsfrist von {{notice_weeks}} Wochen zum Monatsende, mindestens jedoch die gesetzliche Frist (§ 622 BGB). Die Kündigung bedarf der Schriftform.

§ 8 Verschwiegenheit und Datenschutz
Der/Die Arbeitnehmer/in verpflichtet sich, über alle Geschäfts- und Betriebsgeheimnisse Stillschweigen zu bewahren. Personenbezogene Daten werden nach DSGVO verarbeitet.

§ 9 Nebentätigkeit
Nebentätigkeiten bedürfen der vorherigen schriftlichen Zustimmung des Arbeitgebers.

§ 10 Schlussbestimmungen
Änderungen und Ergänzungen bedürfen der Schriftform. Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen wirksam.

Ort, Datum: {{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}} (Arbeitgeber)        {{full_name}} (Arbeitnehmer/in)",
    ])}`,
  },
  {
    key: "fixed_term_contract",
    kind: "contract",
    validMonths: null,
    label: { en: "Fixed-term contract (DE)", de: "Befristeter Arbeitsvertrag", ro: "Contract determinat (DE)" },
    body: `BEFRISTETER ARBEITSVERTRAG

zwischen {{company_name}}, {{company_address}} („Arbeitgeber“)
und {{full_name}}, geb. {{date_of_birth}}, {{address}} („Arbeitnehmer/in“), Personalnummer {{employee_no}}

§ 1 Befristung
Das Arbeitsverhältnis beginnt am {{start_date}} und endet am {{end_date}}, ohne dass es einer Kündigung bedarf (§ 14 TzBfG). Sachgrund: [___] (oder: sachgrundlose Befristung gem. § 14 Abs. 2 TzBfG).

§ 2 Tätigkeit
{{position}}, Abteilung {{department}}, Standort {{location}}.

§ 3 Arbeitszeit und Vergütung
{{weekly_hours}} Wochenstunden. Monatliches Bruttogehalt: [___] EUR.

§ 4 Urlaub
{{vacation_days}} Arbeitstage pro Kalenderjahr (anteilig).

§ 5 Ordentliche Kündigung
Eine ordentliche Kündigung während der Befristung ist beiderseits mit einer Frist von {{notice_weeks}} Wochen möglich.

§ 6 Sonstiges
Es gelten die Bestimmungen des unbefristeten Standardvertrages des Arbeitgebers, soweit hier nichts anderes geregelt ist.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}} (Arbeitgeber)        {{full_name}}",
    ])}`,
  },
  {
    key: "contract_amendment",
    kind: "contract",
    validMonths: null,
    label: { en: "Contract amendment (DE)", de: "Änderungsvereinbarung", ro: "Act adițional (DE)" },
    body: `ÄNDERUNGSVEREINBARUNG ZUM ARBEITSVERTRAG

zwischen {{company_name}} und {{full_name}} (Personalnummer {{employee_no}}).

Die Parteien vereinbaren mit Wirkung zum [___] folgende Änderung des Arbeitsvertrages vom {{start_date}}:

1. Position: {{position}} (Abteilung {{department}})
2. Arbeitszeit: {{weekly_hours}} Stunden/Woche
3. Vergütung: [___] EUR brutto/Monat
4. Sonstiges: [___]

Alle übrigen Bestimmungen des Arbeitsvertrages bleiben unverändert.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "job_description",
    kind: "other",
    validMonths: null,
    label: { en: "Job description (DE)", de: "Stellenbeschreibung", ro: "Fișa postului (DE)" },
    body: `STELLENBESCHREIBUNG

Mitarbeiter/in: {{full_name}} ({{employee_no}})
Position: {{position}}
Abteilung: {{department}} · Standort: {{location}}
Vorgesetzte/r: [___]

Ziel der Stelle
[___]

Hauptaufgaben
1. [___]
2. [___]
3. [___]

Befugnisse
[___]

Anforderungen
- Ausbildung/Qualifikation: [___]
- Erfahrung: [___]
- Sprachen: [___]

Zur Kenntnis genommen am {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "employment_certificate",
    kind: "letter",
    validMonths: 3,
    label: { en: "Employment certificate (DE)", de: "Arbeitsbescheinigung", ro: "Adeverință (DE)" },
    body: `ARBEITSBESCHEINIGUNG

Hiermit bestätigen wir, dass {{full_name}}, geboren am {{date_of_birth}}, seit dem {{start_date}} in unserem Unternehmen als {{position}} in der Abteilung {{department}} beschäftigt ist ({{contract_type}}, {{weekly_hours}} Std./Woche).

Diese Bescheinigung wird auf Wunsch des/der Mitarbeiter/in zur Vorlage bei [___] ausgestellt.

{{company_name}}
{{company_address}}

{{location}}, {{today}}${sig(["______________________", "{{signatory}}"])}`,
  },
  {
    key: "termination_notice",
    kind: "letter",
    validMonths: null,
    label: { en: "Termination notice (DE)", de: "Kündigung", ro: "Notificare încetare (DE)" },
    body: `KÜNDIGUNG DES ARBEITSVERHÄLTNISSES

{{full_name}}
{{address}}

{{location}}, {{today}}

Sehr geehrte/r {{full_name}},

hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis ordentlich und fristgerecht zum {{end_date}}, hilfsweise zum nächstmöglichen Zeitpunkt.

Wir weisen Sie darauf hin, dass Sie verpflichtet sind, sich unverzüglich bei der Agentur für Arbeit arbeitsuchend zu melden (§ 38 SGB III).

Bitte geben Sie sämtliche Arbeitsmittel bis zum letzten Arbeitstag zurück. Ein Arbeitszeugnis wird Ihnen ausgestellt.

Mit freundlichen Grüßen${sig(["______________________", "{{signatory}}, {{company_name}}"])}

Erhalten am: ____________  Unterschrift: ______________________`,
  },
  {
    key: "termination_agreement",
    kind: "contract",
    validMonths: null,
    label: { en: "Termination agreement (DE)", de: "Aufhebungsvertrag", ro: "Acord de încetare (DE)" },
    body: `AUFHEBUNGSVERTRAG

zwischen {{company_name}} und {{full_name}} ({{employee_no}}).

1. Die Parteien sind sich einig, dass das Arbeitsverhältnis im gegenseitigen Einvernehmen zum {{end_date}} endet.
2. Bis zum Beendigungszeitpunkt wird das Arbeitsverhältnis ordnungsgemäß abgerechnet. Resturlaub: [___] Tage.
3. Abfindung: [___] EUR brutto (optional).
4. Der/Die Arbeitnehmer/in erhält ein wohlwollendes qualifiziertes Arbeitszeugnis.
5. Arbeitsmittel werden bis zum {{end_date}} zurückgegeben.
6. Der/Die Arbeitnehmer/in wurde auf mögliche sozialversicherungsrechtliche Folgen (Sperrzeit) hingewiesen.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "warning_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Written warning (DE)", de: "Abmahnung", ro: "Avertisment scris (DE)" },
    body: `ABMAHNUNG

{{full_name}} ({{employee_no}}), {{position}}

{{location}}, {{today}}

Sehr geehrte/r {{full_name}},

am [___] haben Sie [Sachverhalt konkret beschreiben: ___].

Damit haben Sie gegen Ihre arbeitsvertraglichen Pflichten verstoßen. Wir fordern Sie auf, Ihre Pflichten künftig ordnungsgemäß zu erfüllen. Im Wiederholungsfall müssen Sie mit arbeitsrechtlichen Konsequenzen bis hin zur Kündigung rechnen.

Diese Abmahnung wird in Ihre Personalakte aufgenommen.${sig(["______________________", "{{signatory}}, {{company_name}}"])}

Erhalten am: ____________  Unterschrift Mitarbeiter/in: ______________________`,
  },
  {
    key: "reference_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Reference letter (DE)", de: "Arbeitszeugnis", ro: "Scrisoare de recomandare (DE)" },
    body: `ARBEITSZEUGNIS

{{full_name}}, geboren am {{date_of_birth}}, war vom {{start_date}} bis {{end_date}} als {{position}} in unserer Abteilung {{department}} tätig.

Aufgabengebiet
- [___]
- [___]

Leistungsbeurteilung
[___]

Verhalten
[___]

Das Arbeitsverhältnis endet [auf eigenen Wunsch / im gegenseitigen Einvernehmen]. Wir danken für die Zusammenarbeit und wünschen für die Zukunft alles Gute.

{{location}}, {{today}}${sig(["______________________", "{{signatory}}, {{company_name}}"])}`,
  },
  {
    key: "confidentiality",
    kind: "policy",
    validMonths: null,
    label: { en: "Confidentiality agreement (DE)", de: "Verschwiegenheitserklärung", ro: "Acord confidențialitate (DE)" },
    body: `VERSCHWIEGENHEITSERKLÄRUNG

Ich, {{full_name}} ({{employee_no}}), verpflichte mich, alle mir im Rahmen meiner Tätigkeit bei {{company_name}} bekannt werdenden Geschäfts- und Betriebsgeheimnisse sowie personenbezogenen Daten vertraulich zu behandeln und nicht an Dritte weiterzugeben. Diese Verpflichtung gilt auch nach Beendigung des Arbeitsverhältnisses. Ich wurde auf die Vorschriften der DSGVO und des GeschGehG hingewiesen.

{{location}}, {{today}}${sig(["______________________", "{{full_name}}"])}`,
  },
  {
    key: "equipment_handover",
    kind: "other",
    validMonths: null,
    label: { en: "Equipment handover (DE)", de: "Übergabeprotokoll Arbeitsmittel", ro: "Proces-verbal predare (DE)" },
    body: `ÜBERGABEPROTOKOLL ARBEITSMITTEL

Mitarbeiter/in: {{full_name}} ({{employee_no}}) · {{position}}

Übergebene Arbeitsmittel:
| Gegenstand | Seriennummer | Zustand |
| [___] | [___] | [___] |
| [___] | [___] | [___] |

Der/Die Mitarbeiter/in verpflichtet sich, die Arbeitsmittel pfleglich zu behandeln und bei Beendigung des Arbeitsverhältnisses vollständig zurückzugeben.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "Übergeben: {{signatory}}           Übernommen: {{full_name}}",
    ])}`,
  },
  {
    key: "promotion_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Promotion letter (DE)", de: "Beförderungsschreiben", ro: "Scrisoare promovare (DE)" },
    body: `BEFÖRDERUNG

Sehr geehrte/r {{full_name}},

wir freuen uns, Ihnen mitzuteilen, dass Sie mit Wirkung zum [___] zur/zum {{position}} in der Abteilung {{department}} befördert werden.

Grundlage dieser Entscheidung: [Kriterien: ___].

Ihre neue Vergütung beträgt [___] EUR brutto/Monat. Alle übrigen Vertragsbestandteile bleiben unverändert.

{{location}}, {{today}}${sig(["______________________", "{{signatory}}, {{company_name}}"])}`,
  },
];

const RO: HrDocDefinition[] = [
  {
    key: "employment_contract",
    kind: "contract",
    validMonths: null,
    label: { en: "Individual employment contract (RO)", de: "Arbeitsvertrag (RO)", ro: "Contract individual de muncă" },
    body: `CONTRACT INDIVIDUAL DE MUNCĂ
încheiat și înregistrat sub nr. [___] / {{today}} în registrul general de evidență a salariaților

A. Părțile contractului
Angajator: {{company_name}}, cu sediul în {{company_address}}, reprezentată legal prin {{signatory}},
și
Salariat: {{full_name}}, domiciliat(ă) în {{address}}, născut(ă) la {{date_of_birth}}, marca {{employee_no}},
am încheiat prezentul contract individual de muncă în următoarele condiții:

B. Obiectul contractului: prestarea muncii în funcția de {{position}}, compartimentul {{department}}.

C. Durata contractului: {{contract_type}}, începând cu data de {{start_date}}.

D. Locul de muncă: {{location}}.

E. Felul muncii: funcția {{position}} conform Clasificării ocupațiilor din România, cod COR [___].

F. Atribuțiile postului sunt prevăzute în fișa postului, anexă la contract.

G. Condiții de muncă: normale, conform Legii nr. 319/2006.

H. Durata muncii: {{employment_type}}, {{weekly_hours}} ore/săptămână, repartizate [___].

I. Concediul de odihnă anual: {{vacation_days}} zile lucrătoare.

J. Salariul de bază lunar brut: [___] lei. Data plății: [___].

K. Perioada de probă: {{probation_months}} luni calendaristice (art. 31 Codul muncii).

L. Preaviz: {{notice_weeks}} săptămâni în caz de demisie; minimum 20 de zile lucrătoare în caz de concediere (art. 75 Codul muncii).

M. Drepturi și obligații generale ale părților conform Legii nr. 53/2003 – Codul muncii, republicată.

N. Dispoziții finale: prezentul contract se încheie în două exemplare, câte unul pentru fiecare parte. Modificarea se face prin act adițional.

Angajator: {{signatory}}, {{company_name}}          Salariat: {{full_name}}${sig([
      "______________________            ______________________",
    ])}`,
  },
  {
    key: "fixed_term_contract",
    kind: "contract",
    validMonths: null,
    label: { en: "Fixed-term contract (RO)", de: "Befristeter Vertrag (RO)", ro: "Contract pe durată determinată" },
    body: `CONTRACT INDIVIDUAL DE MUNCĂ PE DURATĂ DETERMINATĂ
nr. [___] / {{today}}

Angajator: {{company_name}}, {{company_address}}, reprezentată prin {{signatory}}
Salariat: {{full_name}}, {{address}}, născut(ă) la {{date_of_birth}}, marca {{employee_no}}

1. Durata: de la {{start_date}} până la {{end_date}} (art. 82–87 Codul muncii). Temeiul: [___].
2. Funcția: {{position}}, compartimentul {{department}}, locul de muncă {{location}}.
3. Durata muncii: {{weekly_hours}} ore/săptămână.
4. Salariul de bază lunar brut: [___] lei.
5. Concediul de odihnă: {{vacation_days}} zile lucrătoare/an (proporțional).
6. Perioada de probă: maximum conform art. 85 Codul muncii.
7. Celelalte clauze sunt cele ale contractului-cadru al angajatorului.

Angajator: {{signatory}}                                  Salariat: {{full_name}}${sig([
      "______________________            ______________________",
    ])}`,
  },
  {
    key: "contract_amendment",
    kind: "contract",
    validMonths: null,
    label: { en: "Contract addendum (RO)", de: "Zusatzvereinbarung (RO)", ro: "Act adițional la CIM" },
    body: `ACT ADIȚIONAL nr. [___] / {{today}}
la contractul individual de muncă înregistrat sub nr. [___]

Între {{company_name}}, reprezentată prin {{signatory}}, și {{full_name}} (marca {{employee_no}}), în temeiul art. 17 alin. (5) din Codul muncii, părțile convin modificarea contractului începând cu [___], astfel:

1. Funcția: {{position}} (compartiment {{department}})
2. Durata muncii: {{weekly_hours}} ore/săptămână
3. Salariul de bază lunar brut: [___] lei
4. Alte clauze: [___]

Celelalte clauze rămân neschimbate. Încheiat în două exemplare.

Angajator: {{signatory}}                                  Salariat: {{full_name}}${sig([
      "______________________            ______________________",
    ])}`,
  },
  {
    key: "job_description",
    kind: "other",
    validMonths: null,
    label: { en: "Job description (RO)", de: "Stellenbeschreibung (RO)", ro: "Fișa postului" },
    body: `FIȘA POSTULUI
Anexă la contractul individual de muncă nr. [___]

Titular: {{full_name}} ({{employee_no}})
Denumirea postului: {{position}} · Cod COR: [___]
Compartiment: {{department}} · Locul de muncă: {{location}}
Se subordonează: [___]

1. Scopul postului
[___]

2. Atribuții și responsabilități
2.1. [___]
2.2. [___]
2.3. [___]

3. Responsabilități SSM și PSI
Respectă instrucțiunile de securitate și sănătate în muncă (Legea 319/2006) și de apărare împotriva incendiilor.

4. Cerințele postului
- Studii: [___]
- Experiență: [___]
- Competențe / limbi străine: [___]

Luat la cunoștință la {{today}}

Angajator: {{signatory}}                                  Salariat: {{full_name}}${sig([
      "______________________            ______________________",
    ])}`,
  },
  {
    key: "employment_certificate",
    kind: "letter",
    validMonths: 3,
    label: { en: "Employment certificate (RO)", de: "Bescheinigung (RO)", ro: "Adeverință de salariat" },
    body: `{{company_name}}
{{company_address}}
Nr. [___] / {{today}}

ADEVERINȚĂ

Prin prezenta se adeverește că dl./dna. {{full_name}}, născut(ă) la {{date_of_birth}}, domiciliat(ă) în {{address}}, este angajat(ă) al/a societății noastre începând cu data de {{start_date}}, în funcția de {{position}}, compartimentul {{department}}, cu contract individual de muncă {{contract_type}}, normă {{weekly_hours}} ore/săptămână.

Salariul de bază lunar brut este de [___] lei.

Se eliberează la cererea salariatului(ei) pentru a-i servi la [___].

{{signatory}}, {{company_name}}${sig(["______________________"])}`,
  },
  {
    key: "termination_notice",
    kind: "letter",
    validMonths: null,
    label: { en: "Termination decision (RO)", de: "Kündigung (RO)", ro: "Decizie de încetare a CIM" },
    body: `{{company_name}}
DECIZIA nr. [___] / {{today}}
privind încetarea contractului individual de muncă

Având în vedere [temeiul: art. ___ din Codul muncii / cererea salariatului nr. ___],
{{signatory}}, în calitate de reprezentant legal al {{company_name}},

DECIDE:

Art. 1. Începând cu data de {{end_date}} încetează contractul individual de muncă al dlui./dnei. {{full_name}}, marca {{employee_no}}, funcția {{position}}, compartimentul {{department}}, înregistrat sub nr. [___].
Art. 2. Temeiul legal: art. [___] din Legea nr. 53/2003 – Codul muncii.
Art. 3. Salariatul are dreptul la plata drepturilor salariale și a concediului de odihnă neefectuat: [___] zile.
Art. 4. Prezenta decizie poate fi contestată în termen de 45 de zile calendaristice de la comunicare la tribunalul competent.
Art. 5. Compartimentul resurse umane va duce la îndeplinire prezenta decizie și o va înregistra în REVISAL.

{{signatory}}, {{company_name}}${sig(["______________________"])}

Comunicat salariatului la data de ____________ Semnătura: ______________________`,
  },
  {
    key: "termination_agreement",
    kind: "contract",
    validMonths: null,
    label: { en: "Mutual termination (RO)", de: "Aufhebungsvertrag (RO)", ro: "Acord de încetare prin acordul părților" },
    body: `ACORD DE ÎNCETARE A CONTRACTULUI INDIVIDUAL DE MUNCĂ
prin acordul părților (art. 55 lit. b Codul muncii)

Între {{company_name}}, reprezentată prin {{signatory}}, și {{full_name}} (marca {{employee_no}}), s-a convenit:

1. Contractul individual de muncă nr. [___] încetează prin acordul părților la data de {{end_date}}.
2. Angajatorul achită drepturile salariale până la data încetării și compensează concediul neefectuat: [___] zile.
3. Salariatul predă bunurile și echipamentele societății până la {{end_date}}.
4. Părțile declară că nu au alte pretenții una față de cealaltă.

Încheiat astăzi, {{today}}, în două exemplare.

Angajator: {{signatory}}                                  Salariat: {{full_name}}${sig([
      "______________________            ______________________",
    ])}`,
  },
  {
    key: "warning_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Written warning (RO)", de: "Abmahnung (RO)", ro: "Avertisment scris" },
    body: `{{company_name}}
DECIZIA nr. [___] / {{today}}
privind aplicarea sancțiunii disciplinare „avertisment scris"

Având în vedere abaterea disciplinară din data de [___], constând în [descrierea faptei: ___], săvârșită de dl./dna. {{full_name}}, marca {{employee_no}}, funcția {{position}},
în temeiul art. 248 alin. (1) lit. a) din Codul muncii,

DECIDE:
Art. 1. Se aplică salariatului sancțiunea disciplinară „avertisment scris".
Art. 2. Motivele de fapt: [___]. Prevederile încălcate: [___].
Art. 3. Prezenta decizie poate fi contestată în termen de 30 de zile calendaristice de la comunicare.

{{signatory}}, {{company_name}}${sig(["______________________"])}

Comunicat la data de ____________ Semnătura salariatului: ______________________`,
  },
  {
    key: "reference_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Reference letter (RO)", de: "Arbeitszeugnis (RO)", ro: "Scrisoare de recomandare" },
    body: `SCRISOARE DE RECOMANDARE

Subsemnatul/a {{signatory}}, în calitate de reprezentant al {{company_name}}, confirm că {{full_name}} a fost angajat(ă) în cadrul societății noastre în perioada {{start_date}} – {{end_date}}, în funcția de {{position}}, compartimentul {{department}}.

Principalele responsabilități:
- [___]
- [___]

Aprecierea activității: [___]

Recomand cu încredere pe {{full_name}} pentru [___].

{{location}}, {{today}}${sig(["______________________", "{{signatory}}"])}`,
  },
  {
    key: "confidentiality",
    kind: "policy",
    validMonths: null,
    label: { en: "Confidentiality agreement (RO)", de: "Verschwiegenheit (RO)", ro: "Angajament de confidențialitate" },
    body: `ANGAJAMENT DE CONFIDENȚIALITATE

Subsemnatul/a {{full_name}} (marca {{employee_no}}), angajat(ă) al/a {{company_name}} în funcția de {{position}}, mă oblig să păstrez confidențialitatea tuturor informațiilor, datelor și secretelor comerciale de care iau cunoștință în exercitarea atribuțiilor, inclusiv a datelor cu caracter personal (Regulamentul UE 2016/679), atât pe durata contractului, cât și după încetarea acestuia.

{{location}}, {{today}}${sig(["______________________", "{{full_name}}"])}`,
  },
  {
    key: "equipment_handover",
    kind: "other",
    validMonths: null,
    label: { en: "Equipment handover (RO)", de: "Übergabeprotokoll (RO)", ro: "Proces-verbal de predare-primire" },
    body: `PROCES-VERBAL DE PREDARE-PRIMIRE ECHIPAMENTE

Salariat: {{full_name}} ({{employee_no}}) · {{position}}

| Echipament | Serie | Stare |
| [___] | [___] | [___] |
| [___] | [___] | [___] |

Salariatul se obligă să utilizeze echipamentele cu grijă și să le restituie integral la încetarea contractului.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "Predat: {{signatory}}              Primit: {{full_name}}",
    ])}`,
  },
  {
    key: "promotion_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Promotion decision (RO)", de: "Beförderung (RO)", ro: "Decizie de promovare" },
    body: `{{company_name}}
DECIZIA nr. [___] / {{today}} privind promovarea

Având în vedere [criterii: ___],
{{signatory}} DECIDE:

Art. 1. Începând cu data de [___], dl./dna. {{full_name}} (marca {{employee_no}}) este promovat(ă) în funcția de {{position}}, compartimentul {{department}}.
Art. 2. Salariul de bază lunar brut devine [___] lei. Modificarea se consemnează prin act adițional.

{{signatory}}${sig(["______________________"])}`,
  },
];

const GENERIC: HrDocDefinition[] = [
  {
    key: "employment_contract",
    kind: "contract",
    validMonths: null,
    label: { en: "Employment contract", de: "Arbeitsvertrag (EN)", ro: "Contract de muncă (EN)" },
    body: `EMPLOYMENT CONTRACT

between {{company_name}}, {{company_address}} ("Employer")
and {{full_name}}, born {{date_of_birth}}, residing at {{address}} ("Employee"), employee no. {{employee_no}}

1. Commencement: this contract starts on {{start_date}} ({{contract_type}}).
2. Position: {{position}}, department {{department}}, location {{location}}.
3. Probation: {{probation_months}} months.
4. Working time: {{weekly_hours}} hours per week ({{employment_type}}).
5. Remuneration: [___] gross per month, paid at month end.
6. Holiday: {{vacation_days}} working days per year.
7. Notice: {{notice_weeks}} weeks after probation, in writing.
8. Confidentiality and data protection: the Employee keeps all business information confidential.
9. Entire agreement: amendments require written form.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}} (Employer)           {{full_name}} (Employee)",
    ])}`,
  },
  {
    key: "fixed_term_contract",
    kind: "contract",
    validMonths: null,
    label: { en: "Fixed-term contract", de: "Befristeter Vertrag (EN)", ro: "Contract determinat (EN)" },
    body: `FIXED-TERM EMPLOYMENT CONTRACT

{{company_name}} employs {{full_name}} ({{employee_no}}) as {{position}} ({{department}}, {{location}}) from {{start_date}} to {{end_date}}. Reason for the fixed term: [___].
Working time {{weekly_hours}} h/week · Salary [___] gross/month · Holiday {{vacation_days}} days (pro rata) · Notice {{notice_weeks}} weeks.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "contract_amendment",
    kind: "contract",
    validMonths: null,
    label: { en: "Contract amendment", de: "Änderungsvereinbarung (EN)", ro: "Act adițional (EN)" },
    body: `CONTRACT AMENDMENT

Effective [___], the employment contract of {{full_name}} ({{employee_no}}) dated {{start_date}} is amended as follows:
1. Position: {{position}} ({{department}})
2. Working time: {{weekly_hours}} h/week
3. Salary: [___] gross/month
4. Other: [___]
All other terms remain unchanged.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "job_description",
    kind: "other",
    validMonths: null,
    label: { en: "Job description", de: "Stellenbeschreibung (EN)", ro: "Fișa postului (EN)" },
    body: `JOB DESCRIPTION

Employee: {{full_name}} ({{employee_no}}) · Position: {{position}} · Department: {{department}} · Location: {{location}} · Reports to: [___]

Purpose
[___]

Key responsibilities
1. [___]
2. [___]
3. [___]

Requirements
- Education: [___] · Experience: [___] · Languages: [___]

Acknowledged on {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "employment_certificate",
    kind: "letter",
    validMonths: 3,
    label: { en: "Employment certificate", de: "Bescheinigung (EN)", ro: "Adeverință (EN)" },
    body: `EMPLOYMENT CERTIFICATE

This is to certify that {{full_name}}, born {{date_of_birth}}, has been employed by {{company_name}} since {{start_date}} as {{position}} in the {{department}} department ({{contract_type}}, {{weekly_hours}} h/week).

Issued at the employee's request for [___].

{{location}}, {{today}}${sig(["______________________", "{{signatory}}, {{company_name}}"])}`,
  },
  {
    key: "termination_notice",
    kind: "letter",
    validMonths: null,
    label: { en: "Termination notice", de: "Kündigung (EN)", ro: "Notificare încetare (EN)" },
    body: `NOTICE OF TERMINATION

Dear {{full_name}},

we hereby terminate your employment contract with effect from {{end_date}}, observing the applicable notice period of {{notice_weeks}} weeks.
Please return all company equipment by your last working day. A reference letter will be provided.

{{location}}, {{today}}${sig(["______________________", "{{signatory}}, {{company_name}}"])}

Received on ____________ Signature ______________________`,
  },
  {
    key: "termination_agreement",
    kind: "contract",
    validMonths: null,
    label: { en: "Mutual termination agreement", de: "Aufhebungsvertrag (EN)", ro: "Acord de încetare (EN)" },
    body: `MUTUAL TERMINATION AGREEMENT

{{company_name}} and {{full_name}} ({{employee_no}}) agree that the employment ends by mutual consent on {{end_date}}.
Outstanding holiday: [___] days · Severance: [___] (optional) · Equipment returned by {{end_date}} · Reference letter to be issued.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "{{signatory}}                      {{full_name}}",
    ])}`,
  },
  {
    key: "warning_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Written warning", de: "Abmahnung (EN)", ro: "Avertisment scris (EN)" },
    body: `WRITTEN WARNING

Dear {{full_name}} ({{employee_no}}, {{position}}),

on [___] you [describe the incident: ___]. This breaches your contractual duties. We expect you to comply in future; a repeat may lead to further action up to termination. This warning is filed in your personnel record.

{{location}}, {{today}}${sig(["______________________", "{{signatory}}, {{company_name}}"])}

Received on ____________ Employee signature ______________________`,
  },
  {
    key: "reference_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Reference letter", de: "Arbeitszeugnis (EN)", ro: "Scrisoare de recomandare (EN)" },
    body: `REFERENCE LETTER

{{full_name}} was employed by {{company_name}} from {{start_date}} to {{end_date}} as {{position}} in the {{department}} department.

Responsibilities: [___]
Performance: [___]
Conduct: [___]

We thank {{first_name}} for the collaboration and wish all the best.

{{location}}, {{today}}${sig(["______________________", "{{signatory}}"])}`,
  },
  {
    key: "confidentiality",
    kind: "policy",
    validMonths: null,
    label: { en: "Confidentiality agreement", de: "Verschwiegenheit (EN)", ro: "Confidențialitate (EN)" },
    body: `CONFIDENTIALITY AGREEMENT

I, {{full_name}} ({{employee_no}}), undertake to keep confidential all business information and personal data I learn while working for {{company_name}}, during and after my employment.

{{location}}, {{today}}${sig(["______________________", "{{full_name}}"])}`,
  },
  {
    key: "equipment_handover",
    kind: "other",
    validMonths: null,
    label: { en: "Equipment handover", de: "Übergabeprotokoll (EN)", ro: "Proces-verbal predare (EN)" },
    body: `EQUIPMENT HANDOVER

Employee: {{full_name}} ({{employee_no}}) · {{position}}
| Item | Serial | Condition |
| [___] | [___] | [___] |

The employee will take care of the equipment and return it in full when leaving.

{{location}}, {{today}}${sig([
      "______________________            ______________________",
      "Handed over: {{signatory}}         Received: {{full_name}}",
    ])}`,
  },
  {
    key: "promotion_letter",
    kind: "letter",
    validMonths: null,
    label: { en: "Promotion letter", de: "Beförderung (EN)", ro: "Promovare (EN)" },
    body: `PROMOTION

Dear {{full_name}},

we are pleased to promote you to {{position}} ({{department}}) effective [___], based on: [criteria: ___]. Your new salary is [___] gross/month. All other terms remain unchanged.

{{location}}, {{today}}${sig(["______________________", "{{signatory}}, {{company_name}}"])}`,
  },
];

export function documentLibrary(country: HrCountry): HrDocDefinition[] {
  return country === "de" ? DE : country === "ro" ? RO : GENERIC;
}

export function findDocDefinition(country: HrCountry, key: string): HrDocDefinition | null {
  return documentLibrary(country).find((d) => d.key === key) ?? null;
}

/** Fill {{placeholders}}; unknown or empty values stay visible as [___]. */
export function fillTemplate(body: string, values: Record<string, string | null | undefined>): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const v = values[key.toLowerCase()];
    return v && String(v).trim() ? String(v) : "[___]";
  });
}

// ── Lifecycle flows ──────────────────────────────────────────────────────

export interface HrFlowStep {
  title: Record<"en" | "de" | "ro", string>;
  team: string;
  offsetDays: number;
  documentKey?: HrDocKey;
  priority?: "low" | "normal" | "high";
}

export interface HrFlow {
  key: string;
  kind: "onboarding" | "offboarding";
  label: Record<"en" | "de" | "ro", string>;
  steps: HrFlowStep[];
}

const T = (en: string, de: string, ro: string) => ({ en, de, ro });

const COMMON_ONBOARDING: HrFlowStep[] = [
  { title: T("Sign employment contract", "Arbeitsvertrag unterzeichnen", "Semnare contract de muncă"), team: "HR", offsetDays: -7, documentKey: "employment_contract", priority: "high" },
  { title: T("Job description handed over", "Stellenbeschreibung übergeben", "Fișa postului predată"), team: "HR", offsetDays: -3, documentKey: "job_description" },
  { title: T("Confidentiality agreement signed", "Verschwiegenheitserklärung unterzeichnet", "Angajament de confidențialitate semnat"), team: "HR", offsetDays: 0, documentKey: "confidentiality" },
  { title: T("Workplace, accounts and equipment prepared", "Arbeitsplatz, Zugänge und Ausstattung vorbereitet", "Loc de muncă, conturi și echipamente pregătite"), team: "IT", offsetDays: -2, documentKey: "equipment_handover" },
  { title: T("Safety briefing on day one", "Sicherheitsunterweisung am ersten Tag", "Instructaj SSM în prima zi"), team: "Manager", offsetDays: 0, priority: "high" },
  { title: T("Buddy / mentor assigned", "Pate/Patin zugeteilt", "Mentor desemnat"), team: "Manager", offsetDays: 0 },
  { title: T("First-week check-in", "Check-in erste Woche", "Discuție la finalul primei săptămâni"), team: "Manager", offsetDays: 5 },
  { title: T("30-day review", "30-Tage-Gespräch", "Evaluare la 30 de zile"), team: "Manager", offsetDays: 30 },
  { title: T("Probation review scheduled", "Probezeitgespräch geplant", "Evaluare perioadă de probă planificată"), team: "HR", offsetDays: 150, priority: "high" },
];

const COMMON_OFFBOARDING: HrFlowStep[] = [
  { title: T("Termination document issued", "Kündigungs-/Aufhebungsdokument erstellt", "Document de încetare emis"), team: "HR", offsetDays: -30, documentKey: "termination_notice", priority: "high" },
  { title: T("Handover plan agreed", "Übergabeplan vereinbart", "Plan de predare agreat"), team: "Manager", offsetDays: -21 },
  { title: T("Remaining holiday settled", "Resturlaub geklärt", "Concediu rămas clarificat"), team: "HR", offsetDays: -14 },
  { title: T("Equipment returned", "Arbeitsmittel zurückgegeben", "Echipamente restituite"), team: "IT", offsetDays: 0, documentKey: "equipment_handover", priority: "high" },
  { title: T("Accounts and access revoked", "Zugänge gesperrt", "Conturi și accese dezactivate"), team: "IT", offsetDays: 0, priority: "high" },
  { title: T("Exit interview", "Austrittsgespräch", "Interviu de plecare"), team: "HR", offsetDays: -3 },
  { title: T("Reference letter issued", "Arbeitszeugnis ausgestellt", "Scrisoare de recomandare emisă"), team: "HR", offsetDays: 7, documentKey: "reference_letter" },
  { title: T("Final payroll processed", "Endabrechnung erstellt", "Lichidare finală procesată"), team: "Payroll", offsetDays: 14 },
];

export const HR_FLOWS: Record<HrCountry, HrFlow[]> = {
  de: [
    {
      key: "de_onboarding",
      kind: "onboarding",
      label: T("Onboarding Germany", "Onboarding Deutschland", "Integrare Germania"),
      steps: [
        ...COMMON_ONBOARDING,
        { title: T("Social security number and tax ID collected", "Sozialversicherungsnummer und Steuer-ID erfasst", "Număr asigurări sociale și ID fiscal colectate"), team: "Payroll", offsetDays: -5, priority: "high" },
        { title: T("Health insurance registration (Krankenkasse)", "Anmeldung Krankenkasse", "Înregistrare asigurare de sănătate"), team: "Payroll", offsetDays: 0, priority: "high" },
        { title: T("Reporting to social insurance (DEÜV) within 6 weeks", "DEÜV-Meldung innerhalb von 6 Wochen", "Raportare asigurări sociale (DEÜV) în 6 săptămâni"), team: "Payroll", offsetDays: 30 },
        { title: T("Written record of essential terms (NachwG)", "Niederschrift wesentlicher Vertragsbedingungen (NachwG)", "Consemnare scrisă a condițiilor esențiale (NachwG)"), team: "HR", offsetDays: 0 },
      ],
    },
    {
      key: "de_offboarding",
      kind: "offboarding",
      label: T("Offboarding Germany", "Offboarding Deutschland", "Plecare Germania"),
      steps: [
        ...COMMON_OFFBOARDING,
        { title: T("Deregistration with social insurance", "Abmeldung Sozialversicherung", "Dezînregistrare asigurări sociale"), team: "Payroll", offsetDays: 7, priority: "high" },
        { title: T("Employment certificate for the Agentur für Arbeit (§ 312 SGB III)", "Arbeitsbescheinigung § 312 SGB III", "Adeverință pentru agenția de muncă (§ 312 SGB III)"), team: "HR", offsetDays: 3, documentKey: "employment_certificate" },
      ],
    },
  ],
  ro: [
    {
      key: "ro_onboarding",
      kind: "onboarding",
      label: T("Onboarding Romania", "Onboarding Rumänien", "Integrare România"),
      steps: [
        ...COMMON_ONBOARDING,
        { title: T("Pre-employment medical check (fișa de aptitudine)", "Einstellungsuntersuchung (fișa de aptitudine)", "Control medical la angajare (fișa de aptitudine)"), team: "HR", offsetDays: -3, priority: "high" },
        { title: T("REVISAL registration before the first day", "REVISAL-Registrierung vor dem ersten Arbeitstag", "Înregistrare în REVISAL înainte de prima zi"), team: "HR", offsetDays: -1, priority: "high" },
        { title: T("General SSM and PSI training recorded", "Allgemeine SSM/PSI-Unterweisung dokumentiert", "Instructaj introductiv general SSM și PSI consemnat"), team: "Manager", offsetDays: 0, priority: "high" },
        { title: T("Personal file opened (dosar personal)", "Personalakte angelegt (dosar personal)", "Dosar personal constituit"), team: "HR", offsetDays: 0 },
      ],
    },
    {
      key: "ro_offboarding",
      kind: "offboarding",
      label: T("Offboarding Romania", "Offboarding Rumänien", "Plecare România"),
      steps: [
        ...COMMON_OFFBOARDING,
        { title: T("Termination recorded in REVISAL", "Beendigung in REVISAL eingetragen", "Încetare înregistrată în REVISAL"), team: "HR", offsetDays: 1, priority: "high" },
        { title: T("Seniority certificate issued (adeverință de vechime)", "Bescheinigung über Beschäftigungszeiten", "Adeverință de vechime eliberată"), team: "HR", offsetDays: 3, documentKey: "employment_certificate" },
      ],
    },
  ],
  generic: [
    { key: "generic_onboarding", kind: "onboarding", label: T("Onboarding", "Onboarding", "Integrare"), steps: COMMON_ONBOARDING },
    { key: "generic_offboarding", kind: "offboarding", label: T("Offboarding", "Offboarding", "Plecare"), steps: COMMON_OFFBOARDING },
  ],
};

export function flowsFor(country: HrCountry): HrFlow[] {
  return HR_FLOWS[country] ?? HR_FLOWS.generic;
}

// ── Promotion / demotion criteria ────────────────────────────────────────

export const PROMOTION_CRITERIA = [
  T("Performance targets met in the last 2 review periods", "Leistungsziele der letzten 2 Beurteilungsperioden erreicht", "Obiective de performanță atinse în ultimele 2 evaluări"),
  T("No active warnings in the last 12 months", "Keine aktive Abmahnung in den letzten 12 Monaten", "Fără avertismente active în ultimele 12 luni"),
  T("Required trainings completed and valid", "Pflichtschulungen abgeschlossen und gültig", "Instruiri obligatorii finalizate și valabile"),
  T("Minimum tenure in current role reached", "Mindestverweildauer in aktueller Rolle erreicht", "Vechime minimă în rolul actual atinsă"),
  T("Manager recommendation", "Empfehlung der Führungskraft", "Recomandarea managerului"),
  T("Budget / headcount available", "Budget / Stelle verfügbar", "Buget / poziție disponibilă"),
];

export const DEMOTION_CRITERIA = [
  T("Documented performance issues after improvement plan", "Dokumentierte Leistungsprobleme nach Verbesserungsplan", "Probleme de performanță documentate după plan de îmbunătățire"),
  T("Repeated warnings on record", "Wiederholte Abmahnungen", "Avertismente repetate în dosar"),
  T("Role requirements no longer met", "Anforderungen der Rolle nicht mehr erfüllt", "Cerințele rolului nu mai sunt îndeplinite"),
  T("Employee request / mutual agreement", "Wunsch des Mitarbeitenden / einvernehmlich", "Cerere a angajatului / acord comun"),
  T("Organisational restructuring", "Organisatorische Umstrukturierung", "Restructurare organizațională"),
];

// ── Equipment packages ───────────────────────────────────────────────────

export interface HrAssetPackageDef {
  key: string;
  category: string;
  label: Record<"en" | "de" | "ro", string>;
  items: Array<{ name: string; category: string }>;
}

export const ASSET_PACKAGES: HrAssetPackageDef[] = [
  {
    key: "safety",
    category: "safety",
    label: T("Safety (PPE)", "Sicherheit (PSA)", "Siguranță (EIP)"),
    items: [
      { name: "Warnweste / Hi-vis vest", category: "safety" },
      { name: "Sicherheitsschuhe / Safety shoes", category: "safety" },
      { name: "Schutzhelm / Helmet", category: "safety" },
      { name: "Schutzhandschuhe / Gloves", category: "safety" },
      { name: "Schutzbrille / Safety glasses", category: "safety" },
    ],
  },
  {
    key: "hardware",
    category: "hardware",
    label: T("Hardware", "Hardware", "Hardware"),
    items: [
      { name: "Smartphone", category: "hardware" },
      { name: "Laptop", category: "hardware" },
      { name: "Headset", category: "hardware" },
      { name: "Monitor", category: "hardware" },
      { name: "Docking station", category: "hardware" },
    ],
  },
  {
    key: "access",
    category: "access",
    label: T("Access & keys", "Zugang & Schlüssel", "Acces și chei"),
    items: [
      { name: "Badge / access card", category: "access" },
      { name: "Office keys", category: "access" },
      { name: "Locker key", category: "access" },
    ],
  },
  {
    key: "driver",
    category: "vehicle",
    label: T("Driver kit", "Fahrer-Set", "Kit șofer"),
    items: [
      { name: "Vehicle keys", category: "vehicle" },
      { name: "Fuel card", category: "vehicle" },
      { name: "Toll box", category: "vehicle" },
      { name: "Tachograph driver card holder", category: "vehicle" },
    ],
  },
  {
    key: "workwear",
    category: "workwear",
    label: T("Workwear", "Arbeitskleidung", "Echipament de lucru"),
    items: [
      { name: "Work jacket", category: "workwear" },
      { name: "Work trousers", category: "workwear" },
      { name: "Polo shirts (x3)", category: "workwear" },
    ],
  },
];

export const ASSET_CATEGORIES = ["safety", "hardware", "access", "vehicle", "workwear", "office", "other"] as const;

// ── Compliance library ───────────────────────────────────────────────────

export interface HrComplianceDef {
  key: string;
  category: "legal" | "safety" | "data_protection" | "payroll" | "medical";
  perEmployee: boolean;
  title: Record<"en" | "de" | "ro", string>;
  /** Days after start date (per-employee) or after seeding (company-wide). */
  dueOffsetDays: number;
}

export const COMPLIANCE_LIBRARY: Record<HrCountry, HrComplianceDef[]> = {
  de: [
    { key: "de_nachwg", category: "legal", perEmployee: true, title: T("Written terms of employment (NachwG)", "Nachweis wesentlicher Vertragsbedingungen (NachwG)", "Condiții esențiale în scris (NachwG)"), dueOffsetDays: 0 },
    { key: "de_deuev", category: "payroll", perEmployee: true, title: T("Social insurance registration (DEÜV)", "DEÜV-Anmeldung", "Înregistrare asigurări sociale (DEÜV)"), dueOffsetDays: 42 },
    { key: "de_unterweisung", category: "safety", perEmployee: true, title: T("Annual safety instruction (§ 12 ArbSchG)", "Jährliche Unterweisung (§ 12 ArbSchG)", "Instructaj anual SSM (§ 12 ArbSchG)"), dueOffsetDays: 365 },
    { key: "de_dsgvo", category: "data_protection", perEmployee: true, title: T("Data protection commitment (Art. 29 GDPR)", "Datenschutzverpflichtung (Art. 29 DSGVO)", "Angajament protecția datelor (Art. 29 GDPR)"), dueOffsetDays: 0 },
    { key: "de_gefaehrdung", category: "safety", perEmployee: false, title: T("Risk assessment documented (§ 5 ArbSchG)", "Gefährdungsbeurteilung dokumentiert (§ 5 ArbSchG)", "Evaluare riscuri documentată (§ 5 ArbSchG)"), dueOffsetDays: 30 },
    { key: "de_arbeitszeit", category: "legal", perEmployee: false, title: T("Working time records kept (ArbZG)", "Arbeitszeiterfassung (ArbZG)", "Evidența timpului de lucru (ArbZG)"), dueOffsetDays: 30 },
  ],
  ro: [
    { key: "ro_revisal", category: "legal", perEmployee: true, title: T("REVISAL registration before day one", "REVISAL-Registrierung", "Înregistrare REVISAL înainte de prima zi"), dueOffsetDays: -1 },
    { key: "ro_medical", category: "medical", perEmployee: true, title: T("Occupational medicine fitness certificate", "Arbeitsmedizinische Eignung", "Fișa de aptitudine medicina muncii"), dueOffsetDays: -1 },
    { key: "ro_ssm", category: "safety", perEmployee: true, title: T("SSM/PSI introductory training (Law 319/2006)", "SSM/PSI-Erstunterweisung", "Instructaj introductiv general SSM/PSI (Legea 319/2006)"), dueOffsetDays: 0 },
    { key: "ro_fisa_post", category: "legal", perEmployee: true, title: T("Job description signed (fișa postului)", "Stellenbeschreibung unterschrieben", "Fișa postului semnată"), dueOffsetDays: 0 },
    { key: "ro_gdpr", category: "data_protection", perEmployee: true, title: T("GDPR information notice signed", "DSGVO-Information unterschrieben", "Notă de informare GDPR semnată"), dueOffsetDays: 0 },
    { key: "ro_ri", category: "legal", perEmployee: false, title: T("Internal regulation (Regulament intern) in place", "Betriebsordnung (Regulament intern)", "Regulament intern întocmit și adus la cunoștință"), dueOffsetDays: 30 },
    { key: "ro_pontaj", category: "payroll", perEmployee: false, title: T("Attendance records (pontaj) maintained", "Anwesenheitserfassung (pontaj)", "Evidența orelor de muncă (pontaj) ținută"), dueOffsetDays: 30 },
  ],
  generic: [
    { key: "g_contract", category: "legal", perEmployee: true, title: T("Signed employment contract on file", "Unterschriebener Arbeitsvertrag", "Contract semnat la dosar"), dueOffsetDays: 0 },
    { key: "g_safety", category: "safety", perEmployee: true, title: T("Safety induction completed", "Sicherheitseinweisung", "Instructaj de siguranță finalizat"), dueOffsetDays: 0 },
    { key: "g_privacy", category: "data_protection", perEmployee: true, title: T("Privacy notice acknowledged", "Datenschutzhinweis bestätigt", "Notă de confidențialitate confirmată"), dueOffsetDays: 0 },
    { key: "g_time", category: "payroll", perEmployee: false, title: T("Working time records kept", "Arbeitszeiterfassung", "Evidența timpului de lucru"), dueOffsetDays: 30 },
  ],
};

// ── Training catalogue ───────────────────────────────────────────────────

export interface HrTrainingDef {
  key: string;
  category: "safety" | "compliance" | "skills" | "onboarding";
  mandatory: boolean;
  validMonths: number | null;
  title: Record<"en" | "de" | "ro", string>;
}

export const TRAINING_LIBRARY: Record<HrCountry, HrTrainingDef[]> = {
  de: [
    { key: "de_safety", category: "safety", mandatory: true, validMonths: 12, title: T("Occupational safety instruction", "Arbeitsschutz-Unterweisung", "Instruire securitatea muncii") },
    { key: "de_fire", category: "safety", mandatory: true, validMonths: 24, title: T("Fire safety", "Brandschutz", "Protecție împotriva incendiilor") },
    { key: "de_firstaid", category: "safety", mandatory: false, validMonths: 24, title: T("First aid", "Erste Hilfe", "Prim ajutor") },
    { key: "de_gdpr", category: "compliance", mandatory: true, validMonths: 24, title: T("Data protection (GDPR)", "Datenschutz (DSGVO)", "Protecția datelor (GDPR)") },
    { key: "de_ladung", category: "skills", mandatory: false, validMonths: 36, title: T("Load securing", "Ladungssicherung", "Asigurarea încărcăturii") },
  ],
  ro: [
    { key: "ro_ssm", category: "safety", mandatory: true, validMonths: 12, title: T("SSM periodic training", "SSM periodische Unterweisung", "Instructaj periodic SSM") },
    { key: "ro_psi", category: "safety", mandatory: true, validMonths: 12, title: T("Fire prevention (PSI)", "Brandschutz (PSI)", "Instructaj PSI") },
    { key: "ro_firstaid", category: "safety", mandatory: false, validMonths: 24, title: T("First aid", "Erste Hilfe", "Prim ajutor") },
    { key: "ro_gdpr", category: "compliance", mandatory: true, validMonths: 24, title: T("Data protection (GDPR)", "Datenschutz (DSGVO)", "Protecția datelor (GDPR)") },
  ],
  generic: [
    { key: "g_safety", category: "safety", mandatory: true, validMonths: 12, title: T("Workplace safety", "Arbeitssicherheit", "Siguranța la locul de muncă") },
    { key: "g_privacy", category: "compliance", mandatory: true, validMonths: 24, title: T("Data protection", "Datenschutz", "Protecția datelor") },
    { key: "g_onboarding", category: "onboarding", mandatory: true, validMonths: null, title: T("Company induction", "Unternehmenseinführung", "Introducere în companie") },
  ],
};

// ── Policy starter kit ───────────────────────────────────────────────────

export interface HrPolicyDef {
  key: string;
  category: "policy" | "procedure" | "safety" | "code_of_conduct";
  requiresAck: boolean;
  title: Record<"en" | "de" | "ro", string>;
  body: Record<"en" | "de" | "ro", string>;
}

export const POLICY_LIBRARY: HrPolicyDef[] = [
  {
    key: "code_of_conduct",
    category: "code_of_conduct",
    requiresAck: true,
    title: T("Code of conduct", "Verhaltenskodex", "Codul de conduită"),
    body: T(
      "1. Respect and non-discrimination\n2. Integrity and anti-corruption\n3. Confidentiality\n4. Health and safety first\n5. Reporting concerns without retaliation",
      "1. Respekt und Nichtdiskriminierung\n2. Integrität und Anti-Korruption\n3. Vertraulichkeit\n4. Sicherheit zuerst\n5. Meldung von Verstößen ohne Nachteile",
      "1. Respect și nediscriminare\n2. Integritate și anticorupție\n3. Confidențialitate\n4. Sănătatea și siguranța pe primul loc\n5. Raportarea problemelor fără represalii",
    ),
  },
  {
    key: "leave_procedure",
    category: "procedure",
    requiresAck: false,
    title: T("Leave request procedure", "Urlaubsverfahren", "Procedura de solicitare a concediului"),
    body: T(
      "Requests are submitted at least 14 days ahead through Employee Requests. The manager decides within 3 working days. HR records the approved leave in the calendar.",
      "Anträge werden mindestens 14 Tage im Voraus über Mitarbeiteranfragen gestellt. Die Führungskraft entscheidet innerhalb von 3 Arbeitstagen. HR trägt den genehmigten Urlaub im Kalender ein.",
      "Cererile se depun cu cel puțin 14 zile înainte prin Solicitările angajaților. Managerul decide în 3 zile lucrătoare. HR înregistrează concediul aprobat în calendar.",
    ),
  },
  {
    key: "ppe",
    category: "safety",
    requiresAck: true,
    title: T("Personal protective equipment", "Persönliche Schutzausrüstung", "Echipament individual de protecție"),
    body: T(
      "Hi-vis vest and safety shoes are mandatory in all operational areas. Damaged PPE is replaced immediately via Equipment. Non-compliance is recorded as an incident.",
      "Warnweste und Sicherheitsschuhe sind in allen Betriebsbereichen Pflicht. Beschädigte PSA wird sofort über Ausstattung ersetzt. Verstöße werden als Vorfall erfasst.",
      "Vesta reflectorizantă și încălțămintea de protecție sunt obligatorii în toate zonele operaționale. EIP deteriorat se înlocuiește imediat prin Echipamente. Neconformitățile se înregistrează ca incident.",
    ),
  },
  {
    key: "disciplinary",
    category: "procedure",
    requiresAck: false,
    title: T("Disciplinary procedure", "Disziplinarverfahren", "Procedura disciplinară"),
    body: T(
      "1. Fact-finding and hearing of the employee\n2. Written warning (documented in Incidents & Warnings)\n3. Second warning / improvement plan\n4. Termination as last resort, per national law",
      "1. Sachverhaltsaufklärung und Anhörung\n2. Schriftliche Abmahnung (dokumentiert unter Vorfälle & Abmahnungen)\n3. Zweite Abmahnung / Verbesserungsplan\n4. Kündigung als letztes Mittel nach nationalem Recht",
      "1. Cercetare disciplinară și audierea salariatului\n2. Avertisment scris (documentat în Incidente și avertismente)\n3. Al doilea avertisment / plan de îmbunătățire\n4. Încetarea contractului ca ultimă măsură, conform legii",
    ),
  },
];
