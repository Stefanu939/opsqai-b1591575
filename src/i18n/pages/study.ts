// Public OPSQAI study questionnaire — self-contained 9-language dictionary.
// This page has its own language selector (independent of the site EN/DE/RO switcher)
// because the study is distributed across Europe via LinkedIn.

export const STUDY_LOCALES = ["en", "de", "ro", "fr", "it", "es", "nl", "pl", "hu"] as const;
export type StudyLocale = (typeof STUDY_LOCALES)[number];

export const STUDY_LOCALE_LABELS: Record<StudyLocale, string> = {
  en: "English",
  de: "Deutsch",
  ro: "Română",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  nl: "Nederlands",
  pl: "Polski",
  hu: "Magyar",
};

// Country options are shown in their native/short form in every language.
export const STUDY_COUNTRIES = [
  "DE",
  "AT",
  "CH",
  "RO",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "PL",
  "HU",
  "CZ",
  "SK",
  "BG",
  "OTHER",
] as const;

export const STUDY_COUNTRY_LABELS: Record<string, string> = {
  DE: "Deutschland",
  AT: "Österreich",
  CH: "Schweiz",
  RO: "România",
  FR: "France",
  IT: "Italia",
  ES: "España",
  NL: "Nederland",
  BE: "Belgique / België",
  PL: "Polska",
  HU: "Magyarország",
  CZ: "Česko",
  SK: "Slovensko",
  BG: "България",
  OTHER: "—",
};

/** Stable question + option identifiers. Never localise these. */
export const STUDY_QUESTIONS = [
  { id: "sector", options: ["logistics", "transport", "manufacturing", "construction", "services", "retail", "other"] },
  { id: "size", options: ["s1_9", "s10_49", "s50_249", "s250_plus"] },
  { id: "storage", options: ["shared_drive", "sharepoint_teams", "paper", "chat", "nowhere"] },
  { id: "search_time", options: ["under5", "m5_15", "m15_60", "over60", "often_never"] },
  { id: "audit_prep", options: ["hours", "d1_2", "d3_5", "over_week", "no_audits"] },
  { id: "onboarding", options: ["under1w", "w1_4", "m1_3", "over3m"] },
  { id: "public_ai", options: ["allowed", "uncontrolled", "banned_but_happens", "no", "dont_know"] },
  { id: "biggest_cost", options: ["rework", "missed_deadline", "audit_finding", "lost_knowledge", "complaint", "none"] },
] as const;

export type StudyQuestionId = (typeof STUDY_QUESTIONS)[number]["id"];

interface StudyCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  headline: string;
  serifAccent: string;
  intro: string;
  why: string;
  privacy: string;
  langLabel: string;
  start: string;
  progress: string; // "{current} / {total}"
  back: string;
  next: string;
  submit: string;
  countryLabel: string;
  countryOther: string;
  submitting: string;
  errorGeneric: string;
  thanksTitle: string;
  thanksBody: string;
  benchmarkTitle: string;
  benchmarkLocked: string;
  benchmarkResponses: string;
  contactTitle: string;
  contactBody: string;
  optional: string;
  nameLabel: string;
  companyLabel: string;
  emailLabel: string;
  wantsReport: string;
  wantsPilot: string;
  consent: string;
  contactSubmit: string;
  contactDone: string;
  skip: string;
  questions: Record<StudyQuestionId, { label: string; options: Record<string, string> }>;
}

const en: StudyCopy = {
  meta: {
    title: "European Operations Study 2026 — how companies really find information",
    description:
      "Anonymous 2-minute study: where your procedures live, how long people search, what audits cost. No email required. Compare yourself against the benchmark.",
  },
  eyebrow: "Operations Study 2026",
  headline: "How much does",
  serifAccent: "not knowing cost you?",
  intro:
    "Eight questions, about two minutes. Anonymous — no email needed. We are collecting how European companies actually store procedures, search for information and prepare for audits.",
  why: "Why we ask: everyone talks about AI. Almost nobody measures what an unanswered question costs on the shop floor. This study fixes that.",
  privacy:
    "No personal data is stored with your answers. An email address is optional and only used to send you the results. You can ask us to delete it at any time.",
  langLabel: "Language",
  start: "Start the study",
  progress: "Question {current} of {total}",
  back: "Back",
  next: "Next",
  submit: "Send my answers",
  countryLabel: "Country of operation",
  countryOther: "Other",
  submitting: "Sending…",
  errorGeneric: "We could not save your answers. Please try again.",
  thanksTitle: "Thank you — your answers are recorded.",
  thanksBody: "Anonymously, and they now count in the benchmark below.",
  benchmarkTitle: "The benchmark so far",
  benchmarkLocked:
    "The benchmark opens once enough companies have answered. Leave your email below and we will send you the report when it does.",
  benchmarkResponses: "companies answered",
  contactTitle: "Want the full report?",
  contactBody: "Optional. Your answers are already saved — this only decides whether we can send you the results.",
  optional: "Optional",
  nameLabel: "Your name",
  companyLabel: "Company",
  emailLabel: "Email",
  wantsReport: "Send me the study report when it is published",
  wantsPilot: "I would like to discuss a 30-day pilot",
  consent: "I agree that OPSQAI may contact me about this study.",
  contactSubmit: "Send",
  contactDone: "Noted — we will be in touch.",
  skip: "No thanks, I'm done",
  questions: {
    sector: {
      label: "What does your company do?",
      options: {
        logistics: "Logistics / warehousing",
        transport: "Road transport / fleet",
        manufacturing: "Manufacturing / production",
        construction: "Construction",
        services: "Services",
        retail: "Retail / wholesale",
        other: "Something else",
      },
    },
    size: {
      label: "How many people work there?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Where do your procedures and instructions actually live?",
      options: {
        shared_drive: "Shared drive / folders",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Paper, binders, printouts",
        chat: "In chats and email threads",
        nowhere: "Mostly in people's heads",
      },
    },
    search_time: {
      label: "How long does someone typically need to find the right document?",
      options: {
        under5: "Under 5 minutes",
        m5_15: "5–15 minutes",
        m15_60: "15–60 minutes",
        over60: "More than an hour",
        often_never: "Often they never find it and ask a colleague",
      },
    },
    audit_prep: {
      label: "How much work is preparing for an audit or inspection?",
      options: {
        hours: "A few hours",
        d1_2: "1–2 days",
        d3_5: "3–5 days",
        over_week: "More than a week",
        no_audits: "We have no audits",
      },
    },
    onboarding: {
      label: "How long before a new hire works independently?",
      options: { under1w: "Under a week", w1_4: "1–4 weeks", m1_3: "1–3 months", over3m: "More than 3 months" },
    },
    public_ai: {
      label: "Do your people use public AI tools with company information?",
      options: {
        allowed: "Yes, and it is allowed",
        uncontrolled: "Yes, without any control",
        banned_but_happens: "It is forbidden, but it happens",
        no: "No",
        dont_know: "We don't know",
      },
    },
    biggest_cost: {
      label: "What did missing or outdated information cost you most recently?",
      options: {
        rework: "Rework / a job done twice",
        missed_deadline: "A missed deadline",
        audit_finding: "An audit finding or fine",
        lost_knowledge: "Knowledge that left with an employee",
        complaint: "A customer complaint",
        none: "Nothing measurable",
      },
    },
  },
};

const de: StudyCopy = {
  meta: {
    title: "Europäische Operations-Studie 2026 — wie Unternehmen wirklich Informationen finden",
    description:
      "Anonyme 2-Minuten-Studie: Wo liegen Ihre Verfahren, wie lange wird gesucht, was kosten Audits? Ohne E-Mail. Vergleichen Sie sich mit dem Benchmark.",
  },
  eyebrow: "Operations-Studie 2026",
  headline: "Was kostet es,",
  serifAccent: "es nicht zu wissen?",
  intro:
    "Acht Fragen, rund zwei Minuten. Anonym — keine E-Mail nötig. Wir erheben, wie europäische Unternehmen Verfahren tatsächlich ablegen, Informationen suchen und Audits vorbereiten.",
  why: "Warum wir fragen: Alle reden über KI. Kaum jemand messt, was eine unbeantwortete Frage im Betrieb kostet. Diese Studie ändert das.",
  privacy:
    "Zu Ihren Antworten werden keine personenbezogenen Daten gespeichert. Eine E-Mail-Adresse ist optional und wird nur für den Ergebnisversand genutzt. Löschung jederzeit möglich.",
  langLabel: "Sprache",
  start: "Studie starten",
  progress: "Frage {current} von {total}",
  back: "Zurück",
  next: "Weiter",
  submit: "Antworten senden",
  countryLabel: "Land",
  countryOther: "Anderes",
  submitting: "Wird gesendet…",
  errorGeneric: "Ihre Antworten konnten nicht gespeichert werden. Bitte erneut versuchen.",
  thanksTitle: "Danke — Ihre Antworten sind erfasst.",
  thanksBody: "Anonym, und sie zählen ab jetzt im Benchmark unten mit.",
  benchmarkTitle: "Der Benchmark bisher",
  benchmarkLocked:
    "Der Benchmark öffnet, sobald genügend Unternehmen geantwortet haben. Hinterlassen Sie unten Ihre E-Mail, dann senden wir Ihnen den Bericht.",
  benchmarkResponses: "Unternehmen haben geantwortet",
  contactTitle: "Möchten Sie den vollständigen Bericht?",
  contactBody:
    "Optional. Ihre Antworten sind bereits gespeichert — hier entscheiden Sie nur, ob wir Ihnen die Ergebnisse senden dürfen.",
  optional: "Optional",
  nameLabel: "Ihr Name",
  companyLabel: "Unternehmen",
  emailLabel: "E-Mail",
  wantsReport: "Studienbericht bei Veröffentlichung zusenden",
  wantsPilot: "Ich möchte über einen 30-Tage-Pilot sprechen",
  consent: "Ich bin damit einverstanden, dass OPSQAI mich zu dieser Studie kontaktiert.",
  contactSubmit: "Senden",
  contactDone: "Notiert — wir melden uns.",
  skip: "Danke, ich bin fertig",
  questions: {
    sector: {
      label: "Was macht Ihr Unternehmen?",
      options: {
        logistics: "Logistik / Lager",
        transport: "Straßentransport / Flotte",
        manufacturing: "Produktion / Fertigung",
        construction: "Bau",
        services: "Dienstleistungen",
        retail: "Handel / Großhandel",
        other: "Etwas anderes",
      },
    },
    size: {
      label: "Wie viele Personen arbeiten dort?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Wo liegen Ihre Verfahren und Anweisungen tatsächlich?",
      options: {
        shared_drive: "Netzlaufwerk / Ordner",
        sharepoint_teams: "SharePoint / Teams / Intranet",
        paper: "Papier, Ordner, Ausdrucke",
        chat: "In Chats und E-Mail-Verläufen",
        nowhere: "Vor allem in den Köpfen der Mitarbeiter",
      },
    },
    search_time: {
      label: "Wie lange braucht jemand typischerweise, um das richtige Dokument zu finden?",
      options: {
        under5: "Unter 5 Minuten",
        m5_15: "5–15 Minuten",
        m15_60: "15–60 Minuten",
        over60: "Mehr als eine Stunde",
        often_never: "Oft findet man es nicht und fragt einen Kollegen",
      },
    },
    audit_prep: {
      label: "Wie viel Aufwand ist die Vorbereitung eines Audits oder einer Prüfung?",
      options: {
        hours: "Wenige Stunden",
        d1_2: "1–2 Tage",
        d3_5: "3–5 Tage",
        over_week: "Mehr als eine Woche",
        no_audits: "Wir haben keine Audits",
      },
    },
    onboarding: {
      label: "Wie lange dauert es, bis neue Mitarbeitende selbstständig arbeiten?",
      options: { under1w: "Unter einer Woche", w1_4: "1–4 Wochen", m1_3: "1–3 Monate", over3m: "Mehr als 3 Monate" },
    },
    public_ai: {
      label: "Nutzen Ihre Mitarbeitenden öffentliche KI-Tools mit Firmeninformationen?",
      options: {
        allowed: "Ja, und es ist erlaubt",
        uncontrolled: "Ja, ohne jede Kontrolle",
        banned_but_happens: "Es ist verboten, passiert aber",
        no: "Nein",
        dont_know: "Wir wissen es nicht",
      },
    },
    biggest_cost: {
      label: "Was haben fehlende oder veraltete Informationen zuletzt gekostet?",
      options: {
        rework: "Nacharbeit / doppelte Arbeit",
        missed_deadline: "Einen verpassten Termin",
        audit_finding: "Eine Auditfeststellung oder ein Bußgeld",
        lost_knowledge: "Wissen, das mit einem Mitarbeiter ging",
        complaint: "Eine Kundenbeschwerde",
        none: "Nichts Messbares",
      },
    },
  },
};

const ro: StudyCopy = {
  meta: {
    title: "Studiul european de operațiuni 2026 — cum găsesc firmele informația",
    description:
      "Studiu anonim de 2 minute: unde stau procedurile, cât se caută, cât costă auditurile. Fără email. Compară-te cu media.",
  },
  eyebrow: "Studiu operațional 2026",
  headline: "Cât te costă",
  serifAccent: "faptul că nu știi?",
  intro:
    "Opt întrebări, aproximativ două minute. Anonim — nu ai nevoie de email. Colectăm cum stochează firmele europene procedurile, cum caută informația și cum se pregătesc de audit.",
  why: "De ce întrebăm: toată lumea vorbește despre AI. Aproape nimeni nu măsoară cât costă o întrebare fără răspuns în operațiuni. Studiul acesta măsoară.",
  privacy:
    "Nu salvăm date personale împreună cu răspunsurile. Adresa de email este opțională și o folosim doar pentru a-ți trimite rezultatele. Poți cere ștergerea oricând.",
  langLabel: "Limba",
  start: "Începe studiul",
  progress: "Întrebarea {current} din {total}",
  back: "Înapoi",
  next: "Mai departe",
  submit: "Trimite răspunsurile",
  countryLabel: "Țara în care operați",
  countryOther: "Alta",
  submitting: "Se trimite…",
  errorGeneric: "Nu am putut salva răspunsurile. Încearcă din nou.",
  thanksTitle: "Mulțumim — răspunsurile au fost înregistrate.",
  thanksBody: "Anonim, și intră de acum în media de mai jos.",
  benchmarkTitle: "Media colectată până acum",
  benchmarkLocked:
    "Rezultatele se deschid după ce răspund suficiente firme. Lasă emailul mai jos și îți trimitem raportul atunci.",
  benchmarkResponses: "firme au răspuns",
  contactTitle: "Vrei raportul complet?",
  contactBody: "Opțional. Răspunsurile sunt deja salvate — aici decizi doar dacă îți putem trimite rezultatele.",
  optional: "Opțional",
  nameLabel: "Numele tău",
  companyLabel: "Firma",
  emailLabel: "Email",
  wantsReport: "Trimiteți-mi raportul studiului la publicare",
  wantsPilot: "Vreau să discut un pilot de 30 de zile",
  consent: "Accept ca OPSQAI să mă contacteze în legătură cu acest studiu.",
  contactSubmit: "Trimite",
  contactDone: "Notat — revenim cu un mesaj.",
  skip: "Mulțumesc, am terminat",
  questions: {
    sector: {
      label: "Cu ce se ocupă firma?",
      options: {
        logistics: "Logistică / depozit",
        transport: "Transport rutier / flotă",
        manufacturing: "Producție",
        construction: "Construcții",
        services: "Servicii",
        retail: "Comerț / distribuție",
        other: "Altceva",
      },
    },
    size: {
      label: "Câți oameni lucrează acolo?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Unde stau, de fapt, procedurile și instrucțiunile?",
      options: {
        shared_drive: "Pe un disc comun / în foldere",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Pe hârtie, în dosare",
        chat: "În conversații și emailuri",
        nowhere: "Mai ales în mintea oamenilor",
      },
    },
    search_time: {
      label: "Cât durează, de obicei, până cineva găsește documentul corect?",
      options: {
        under5: "Sub 5 minute",
        m5_15: "5–15 minute",
        m15_60: "15–60 de minute",
        over60: "Peste o oră",
        often_never: "Deseori nu îl găsește și întreabă un coleg",
      },
    },
    audit_prep: {
      label: "Cât efort cere pregătirea unui audit sau a unui control?",
      options: {
        hours: "Câteva ore",
        d1_2: "1–2 zile",
        d3_5: "3–5 zile",
        over_week: "Peste o săptămână",
        no_audits: "Nu avem audituri",
      },
    },
    onboarding: {
      label: "Cât trece până când un angajat nou lucrează singur?",
      options: { under1w: "Sub o săptămână", w1_4: "1–4 săptămâni", m1_3: "1–3 luni", over3m: "Peste 3 luni" },
    },
    public_ai: {
      label: "Folosesc oamenii tăi unelte AI publice cu informații din firmă?",
      options: {
        allowed: "Da, și este permis",
        uncontrolled: "Da, fără niciun control",
        banned_but_happens: "Este interzis, dar se întâmplă",
        no: "Nu",
        dont_know: "Nu știm",
      },
    },
    biggest_cost: {
      label: "Ce te-a costat cel mai recent informația lipsă sau depășită?",
      options: {
        rework: "Muncă refăcută",
        missed_deadline: "Un termen ratat",
        audit_finding: "O neconformitate sau o amendă",
        lost_knowledge: "Cunoștințe plecate cu un angajat",
        complaint: "O reclamație de la client",
        none: "Nimic măsurabil",
      },
    },
  },
};

const fr: StudyCopy = {
  meta: {
    title: "Étude européenne des opérations 2026 — comment les entreprises trouvent l'information",
    description:
      "Étude anonyme de 2 minutes : où sont vos procédures, combien de temps on cherche, ce que coûtent les audits. Sans e-mail.",
  },
  eyebrow: "Étude opérationnelle 2026",
  headline: "Combien vous coûte",
  serifAccent: "le fait de ne pas savoir ?",
  intro:
    "Huit questions, environ deux minutes. Anonyme — aucun e-mail requis. Nous mesurons comment les entreprises européennes stockent réellement leurs procédures, cherchent l'information et préparent leurs audits.",
  why: "Pourquoi cette étude : tout le monde parle d'IA. Presque personne ne mesure ce que coûte une question sans réponse sur le terrain.",
  privacy:
    "Aucune donnée personnelle n'est enregistrée avec vos réponses. L'e-mail est optionnel et sert uniquement à l'envoi des résultats. Suppression possible à tout moment.",
  langLabel: "Langue",
  start: "Commencer l'étude",
  progress: "Question {current} sur {total}",
  back: "Retour",
  next: "Suivant",
  submit: "Envoyer mes réponses",
  countryLabel: "Pays d'activité",
  countryOther: "Autre",
  submitting: "Envoi…",
  errorGeneric: "Impossible d'enregistrer vos réponses. Merci de réessayer.",
  thanksTitle: "Merci — vos réponses sont enregistrées.",
  thanksBody: "De façon anonyme, et elles comptent désormais dans les résultats ci-dessous.",
  benchmarkTitle: "Les résultats à ce jour",
  benchmarkLocked:
    "Les résultats s'ouvrent lorsque suffisamment d'entreprises auront répondu. Laissez votre e-mail et nous vous enverrons le rapport.",
  benchmarkResponses: "entreprises ont répondu",
  contactTitle: "Vous voulez le rapport complet ?",
  contactBody: "Optionnel. Vos réponses sont déjà enregistrées — ceci décide seulement si nous pouvons vous écrire.",
  optional: "Optionnel",
  nameLabel: "Votre nom",
  companyLabel: "Entreprise",
  emailLabel: "E-mail",
  wantsReport: "Envoyez-moi le rapport à sa publication",
  wantsPilot: "Je souhaite discuter d'un pilote de 30 jours",
  consent: "J'accepte qu'OPSQAI me contacte au sujet de cette étude.",
  contactSubmit: "Envoyer",
  contactDone: "C'est noté — nous revenons vers vous.",
  skip: "Non merci, j'ai terminé",
  questions: {
    sector: {
      label: "Quelle est l'activité de votre entreprise ?",
      options: {
        logistics: "Logistique / entrepôt",
        transport: "Transport routier / flotte",
        manufacturing: "Production / industrie",
        construction: "Construction",
        services: "Services",
        retail: "Commerce / distribution",
        other: "Autre",
      },
    },
    size: {
      label: "Combien de personnes y travaillent ?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Où se trouvent réellement vos procédures et consignes ?",
      options: {
        shared_drive: "Disque partagé / dossiers",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Papier, classeurs, impressions",
        chat: "Dans les messageries et e-mails",
        nowhere: "Surtout dans la tête des gens",
      },
    },
    search_time: {
      label: "Combien de temps faut-il pour trouver le bon document ?",
      options: {
        under5: "Moins de 5 minutes",
        m5_15: "5–15 minutes",
        m15_60: "15–60 minutes",
        over60: "Plus d'une heure",
        often_never: "Souvent on ne le trouve pas et on demande à un collègue",
      },
    },
    audit_prep: {
      label: "Quel effort représente la préparation d'un audit ou d'un contrôle ?",
      options: {
        hours: "Quelques heures",
        d1_2: "1–2 jours",
        d3_5: "3–5 jours",
        over_week: "Plus d'une semaine",
        no_audits: "Nous n'avons pas d'audits",
      },
    },
    onboarding: {
      label: "Combien de temps avant qu'un nouvel arrivant soit autonome ?",
      options: { under1w: "Moins d'une semaine", w1_4: "1–4 semaines", m1_3: "1–3 mois", over3m: "Plus de 3 mois" },
    },
    public_ai: {
      label: "Vos équipes utilisent-elles des IA publiques avec des informations de l'entreprise ?",
      options: {
        allowed: "Oui, et c'est autorisé",
        uncontrolled: "Oui, sans aucun contrôle",
        banned_but_happens: "C'est interdit, mais cela arrive",
        no: "Non",
        dont_know: "Nous ne savons pas",
      },
    },
    biggest_cost: {
      label: "Que vous a coûté récemment une information manquante ou obsolète ?",
      options: {
        rework: "Du travail refait",
        missed_deadline: "Un délai manqué",
        audit_finding: "Une non-conformité ou une amende",
        lost_knowledge: "Un savoir parti avec un salarié",
        complaint: "Une réclamation client",
        none: "Rien de mesurable",
      },
    },
  },
};

const it: StudyCopy = {
  meta: {
    title: "Studio europeo sulle operazioni 2026 — come le aziende trovano le informazioni",
    description:
      "Studio anonimo di 2 minuti: dove stanno le procedure, quanto si cerca, quanto costano gli audit. Senza e-mail.",
  },
  eyebrow: "Studio operativo 2026",
  headline: "Quanto vi costa",
  serifAccent: "non saperlo?",
  intro:
    "Otto domande, circa due minuti. Anonimo — nessuna e-mail richiesta. Rileviamo come le aziende europee conservano davvero le procedure, cercano informazioni e preparano gli audit.",
  why: "Perché lo chiediamo: tutti parlano di IA. Quasi nessuno misura quanto costa una domanda senza risposta in operazioni.",
  privacy:
    "Non salviamo dati personali insieme alle risposte. L'e-mail è facoltativa e serve solo per inviarvi i risultati. Cancellazione possibile in qualsiasi momento.",
  langLabel: "Lingua",
  start: "Inizia lo studio",
  progress: "Domanda {current} di {total}",
  back: "Indietro",
  next: "Avanti",
  submit: "Invia le risposte",
  countryLabel: "Paese di attività",
  countryOther: "Altro",
  submitting: "Invio…",
  errorGeneric: "Non è stato possibile salvare le risposte. Riprovate.",
  thanksTitle: "Grazie — le risposte sono state registrate.",
  thanksBody: "In forma anonima, e da ora contano nei risultati qui sotto.",
  benchmarkTitle: "I risultati finora",
  benchmarkLocked:
    "I risultati si aprono quando avranno risposto abbastanza aziende. Lasciate l'e-mail e vi invieremo il report.",
  benchmarkResponses: "aziende hanno risposto",
  contactTitle: "Volete il report completo?",
  contactBody: "Facoltativo. Le risposte sono già salvate — qui decidete solo se possiamo scrivervi.",
  optional: "Facoltativo",
  nameLabel: "Il vostro nome",
  companyLabel: "Azienda",
  emailLabel: "E-mail",
  wantsReport: "Inviatemi il report alla pubblicazione",
  wantsPilot: "Vorrei parlare di un pilota di 30 giorni",
  consent: "Acconsento che OPSQAI mi contatti in merito a questo studio.",
  contactSubmit: "Invia",
  contactDone: "Annotato — vi ricontattiamo.",
  skip: "No grazie, ho finito",
  questions: {
    sector: {
      label: "Di cosa si occupa la vostra azienda?",
      options: {
        logistics: "Logistica / magazzino",
        transport: "Trasporto su strada / flotta",
        manufacturing: "Produzione",
        construction: "Edilizia",
        services: "Servizi",
        retail: "Commercio / distribuzione",
        other: "Altro",
      },
    },
    size: {
      label: "Quante persone vi lavorano?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Dove si trovano realmente le vostre procedure e istruzioni?",
      options: {
        shared_drive: "Disco condiviso / cartelle",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Carta, raccoglitori, stampe",
        chat: "In chat ed e-mail",
        nowhere: "Soprattutto nella testa delle persone",
      },
    },
    search_time: {
      label: "Quanto tempo serve di solito per trovare il documento giusto?",
      options: {
        under5: "Meno di 5 minuti",
        m5_15: "5–15 minuti",
        m15_60: "15–60 minuti",
        over60: "Più di un'ora",
        often_never: "Spesso non lo si trova e si chiede a un collega",
      },
    },
    audit_prep: {
      label: "Quanto lavoro richiede la preparazione di un audit o di un controllo?",
      options: {
        hours: "Qualche ora",
        d1_2: "1–2 giorni",
        d3_5: "3–5 giorni",
        over_week: "Più di una settimana",
        no_audits: "Non abbiamo audit",
      },
    },
    onboarding: {
      label: "Quanto tempo passa prima che un nuovo assunto lavori in autonomia?",
      options: { under1w: "Meno di una settimana", w1_4: "1–4 settimane", m1_3: "1–3 mesi", over3m: "Più di 3 mesi" },
    },
    public_ai: {
      label: "Il personale usa strumenti IA pubblici con informazioni aziendali?",
      options: {
        allowed: "Sì, ed è consentito",
        uncontrolled: "Sì, senza alcun controllo",
        banned_but_happens: "È vietato, ma accade",
        no: "No",
        dont_know: "Non lo sappiamo",
      },
    },
    biggest_cost: {
      label: "Cosa vi è costato di recente un'informazione mancante o superata?",
      options: {
        rework: "Lavoro rifatto",
        missed_deadline: "Una scadenza mancata",
        audit_finding: "Una non conformità o una sanzione",
        lost_knowledge: "Conoscenza uscita con un dipendente",
        complaint: "Un reclamo di un cliente",
        none: "Nulla di misurabile",
      },
    },
  },
};

const es: StudyCopy = {
  meta: {
    title: "Estudio europeo de operaciones 2026 — cómo encuentran las empresas la información",
    description:
      "Estudio anónimo de 2 minutos: dónde están sus procedimientos, cuánto se busca, cuánto cuestan las auditorías. Sin correo.",
  },
  eyebrow: "Estudio operativo 2026",
  headline: "¿Cuánto le cuesta",
  serifAccent: "no saberlo?",
  intro:
    "Ocho preguntas, unos dos minutos. Anónimo — no hace falta correo. Medimos cómo guardan realmente las empresas europeas sus procedimientos, cómo buscan información y cómo preparan auditorías.",
  why: "Por qué lo preguntamos: todos hablan de IA. Casi nadie mide lo que cuesta una pregunta sin respuesta en la operación.",
  privacy:
    "No guardamos datos personales junto a sus respuestas. El correo es opcional y solo se usa para enviarle los resultados. Puede pedir su borrado en cualquier momento.",
  langLabel: "Idioma",
  start: "Empezar el estudio",
  progress: "Pregunta {current} de {total}",
  back: "Atrás",
  next: "Siguiente",
  submit: "Enviar mis respuestas",
  countryLabel: "País de operación",
  countryOther: "Otro",
  submitting: "Enviando…",
  errorGeneric: "No pudimos guardar sus respuestas. Inténtelo de nuevo.",
  thanksTitle: "Gracias — sus respuestas quedaron registradas.",
  thanksBody: "De forma anónima, y ya cuentan en los resultados de abajo.",
  benchmarkTitle: "Los resultados hasta ahora",
  benchmarkLocked:
    "Los resultados se abren cuando hayan respondido suficientes empresas. Deje su correo y le enviaremos el informe.",
  benchmarkResponses: "empresas han respondido",
  contactTitle: "¿Quiere el informe completo?",
  contactBody: "Opcional. Sus respuestas ya están guardadas — aquí solo decide si podemos escribirle.",
  optional: "Opcional",
  nameLabel: "Su nombre",
  companyLabel: "Empresa",
  emailLabel: "Correo",
  wantsReport: "Envíenme el informe cuando se publique",
  wantsPilot: "Quiero hablar de un piloto de 30 días",
  consent: "Acepto que OPSQAI me contacte sobre este estudio.",
  contactSubmit: "Enviar",
  contactDone: "Anotado — le contactaremos.",
  skip: "No, gracias, he terminado",
  questions: {
    sector: {
      label: "¿A qué se dedica su empresa?",
      options: {
        logistics: "Logística / almacén",
        transport: "Transporte por carretera / flota",
        manufacturing: "Producción",
        construction: "Construcción",
        services: "Servicios",
        retail: "Comercio / distribución",
        other: "Otra cosa",
      },
    },
    size: {
      label: "¿Cuántas personas trabajan allí?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "¿Dónde están realmente sus procedimientos e instrucciones?",
      options: {
        shared_drive: "Disco compartido / carpetas",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Papel, carpetas, impresiones",
        chat: "En chats y correos",
        nowhere: "Sobre todo en la cabeza de la gente",
      },
    },
    search_time: {
      label: "¿Cuánto tarda alguien normalmente en encontrar el documento correcto?",
      options: {
        under5: "Menos de 5 minutos",
        m5_15: "5–15 minutos",
        m15_60: "15–60 minutos",
        over60: "Más de una hora",
        often_never: "A menudo no lo encuentra y pregunta a un compañero",
      },
    },
    audit_prep: {
      label: "¿Cuánto trabajo supone preparar una auditoría o inspección?",
      options: {
        hours: "Unas horas",
        d1_2: "1–2 días",
        d3_5: "3–5 días",
        over_week: "Más de una semana",
        no_audits: "No tenemos auditorías",
      },
    },
    onboarding: {
      label: "¿Cuánto tarda un nuevo empleado en trabajar de forma autónoma?",
      options: { under1w: "Menos de una semana", w1_4: "1–4 semanas", m1_3: "1–3 meses", over3m: "Más de 3 meses" },
    },
    public_ai: {
      label: "¿Usa su personal herramientas de IA públicas con información de la empresa?",
      options: {
        allowed: "Sí, y está permitido",
        uncontrolled: "Sí, sin ningún control",
        banned_but_happens: "Está prohibido, pero ocurre",
        no: "No",
        dont_know: "No lo sabemos",
      },
    },
    biggest_cost: {
      label: "¿Qué le costó últimamente una información que faltaba o estaba obsoleta?",
      options: {
        rework: "Trabajo repetido",
        missed_deadline: "Un plazo incumplido",
        audit_finding: "Un hallazgo de auditoría o una multa",
        lost_knowledge: "Conocimiento que se fue con un empleado",
        complaint: "Una queja de cliente",
        none: "Nada medible",
      },
    },
  },
};

const nl: StudyCopy = {
  meta: {
    title: "Europees operations-onderzoek 2026 — hoe bedrijven informatie vinden",
    description:
      "Anoniem onderzoek van 2 minuten: waar staan uw procedures, hoe lang wordt gezocht, wat kosten audits. Zonder e-mail.",
  },
  eyebrow: "Operations-onderzoek 2026",
  headline: "Wat kost het u",
  serifAccent: "om het niet te weten?",
  intro:
    "Acht vragen, ongeveer twee minuten. Anoniem — geen e-mail nodig. Wij meten hoe Europese bedrijven procedures echt bewaren, informatie zoeken en audits voorbereiden.",
  why: "Waarom wij dit vragen: iedereen praat over AI. Bijna niemand meet wat een onbeantwoorde vraag op de werkvloer kost.",
  privacy:
    "Bij uw antwoorden worden geen persoonsgegevens opgeslagen. Een e-mailadres is optioneel en wordt alleen gebruikt om u de resultaten te sturen. Verwijderen kan altijd.",
  langLabel: "Taal",
  start: "Start het onderzoek",
  progress: "Vraag {current} van {total}",
  back: "Terug",
  next: "Volgende",
  submit: "Antwoorden versturen",
  countryLabel: "Land",
  countryOther: "Anders",
  submitting: "Versturen…",
  errorGeneric: "We konden uw antwoorden niet opslaan. Probeer het opnieuw.",
  thanksTitle: "Bedankt — uw antwoorden zijn vastgelegd.",
  thanksBody: "Anoniem, en ze tellen vanaf nu mee in de resultaten hieronder.",
  benchmarkTitle: "De resultaten tot nu toe",
  benchmarkLocked:
    "De resultaten openen zodra genoeg bedrijven hebben geantwoord. Laat uw e-mail achter en wij sturen u het rapport.",
  benchmarkResponses: "bedrijven hebben geantwoord",
  contactTitle: "Wilt u het volledige rapport?",
  contactBody: "Optioneel. Uw antwoorden zijn al opgeslagen — hier bepaalt u alleen of wij u mogen mailen.",
  optional: "Optioneel",
  nameLabel: "Uw naam",
  companyLabel: "Bedrijf",
  emailLabel: "E-mail",
  wantsReport: "Stuur mij het rapport bij publicatie",
  wantsPilot: "Ik wil een pilot van 30 dagen bespreken",
  consent: "Ik ga ermee akkoord dat OPSQAI mij over dit onderzoek contacteert.",
  contactSubmit: "Versturen",
  contactDone: "Genoteerd — wij nemen contact op.",
  skip: "Nee bedankt, ik ben klaar",
  questions: {
    sector: {
      label: "Wat doet uw bedrijf?",
      options: {
        logistics: "Logistiek / warehousing",
        transport: "Wegtransport / vloot",
        manufacturing: "Productie",
        construction: "Bouw",
        services: "Diensten",
        retail: "Retail / groothandel",
        other: "Iets anders",
      },
    },
    size: {
      label: "Hoeveel mensen werken er?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Waar staan uw procedures en instructies werkelijk?",
      options: {
        shared_drive: "Netwerkschijf / mappen",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Papier, mappen, prints",
        chat: "In chats en e-mails",
        nowhere: "Vooral in de hoofden van mensen",
      },
    },
    search_time: {
      label: "Hoe lang duurt het meestal om het juiste document te vinden?",
      options: {
        under5: "Minder dan 5 minuten",
        m5_15: "5–15 minuten",
        m15_60: "15–60 minuten",
        over60: "Meer dan een uur",
        often_never: "Vaak vinden ze het niet en vragen ze een collega",
      },
    },
    audit_prep: {
      label: "Hoeveel werk is het voorbereiden van een audit of inspectie?",
      options: {
        hours: "Een paar uur",
        d1_2: "1–2 dagen",
        d3_5: "3–5 dagen",
        over_week: "Meer dan een week",
        no_audits: "Wij hebben geen audits",
      },
    },
    onboarding: {
      label: "Hoe lang voordat een nieuwe medewerker zelfstandig werkt?",
      options: { under1w: "Minder dan een week", w1_4: "1–4 weken", m1_3: "1–3 maanden", over3m: "Meer dan 3 maanden" },
    },
    public_ai: {
      label: "Gebruiken uw mensen publieke AI-tools met bedrijfsinformatie?",
      options: {
        allowed: "Ja, en het mag",
        uncontrolled: "Ja, zonder enige controle",
        banned_but_happens: "Het mag niet, maar het gebeurt",
        no: "Nee",
        dont_know: "Wij weten het niet",
      },
    },
    biggest_cost: {
      label: "Wat kostte ontbrekende of verouderde informatie u recent?",
      options: {
        rework: "Dubbel werk",
        missed_deadline: "Een gemiste deadline",
        audit_finding: "Een auditbevinding of boete",
        lost_knowledge: "Kennis die met een medewerker vertrok",
        complaint: "Een klantklacht",
        none: "Niets meetbaars",
      },
    },
  },
};

const pl: StudyCopy = {
  meta: {
    title: "Europejskie badanie operacyjne 2026 — jak firmy znajdują informacje",
    description:
      "Anonimowe badanie na 2 minuty: gdzie są procedury, ile trwa szukanie, ile kosztują audyty. Bez podawania e-maila.",
  },
  eyebrow: "Badanie operacyjne 2026",
  headline: "Ile kosztuje was to,",
  serifAccent: "że nie wiecie?",
  intro:
    "Osiem pytań, około dwie minuty. Anonimowo — e-mail nie jest wymagany. Badamy, jak europejskie firmy naprawdę przechowują procedury, szukają informacji i przygotowują audyty.",
  why: "Dlaczego pytamy: wszyscy mówią o AI. Prawie nikt nie mierzy, ile kosztuje pytanie bez odpowiedzi w codziennej pracy.",
  privacy:
    "Wraz z odpowiedziami nie zapisujemy danych osobowych. E-mail jest opcjonalny i służy tylko do przesłania wyników. Możecie w każdej chwili poprosić o usunięcie.",
  langLabel: "Język",
  start: "Rozpocznij badanie",
  progress: "Pytanie {current} z {total}",
  back: "Wstecz",
  next: "Dalej",
  submit: "Wyślij odpowiedzi",
  countryLabel: "Kraj działalności",
  countryOther: "Inny",
  submitting: "Wysyłanie…",
  errorGeneric: "Nie udało się zapisać odpowiedzi. Spróbujcie ponownie.",
  thanksTitle: "Dziękujemy — odpowiedzi zostały zapisane.",
  thanksBody: "Anonimowo i od teraz liczą się w wynikach poniżej.",
  benchmarkTitle: "Wyniki do tej pory",
  benchmarkLocked:
    "Wyniki otworzą się, gdy odpowie wystarczająco dużo firm. Zostawcie e-mail, a wyślemy wam raport.",
  benchmarkResponses: "firm odpowiedziało",
  contactTitle: "Chcecie pełny raport?",
  contactBody: "Opcjonalnie. Odpowiedzi są już zapisane — tutaj decydujecie tylko, czy możemy napisać.",
  optional: "Opcjonalnie",
  nameLabel: "Imię i nazwisko",
  companyLabel: "Firma",
  emailLabel: "E-mail",
  wantsReport: "Wyślijcie mi raport po publikacji",
  wantsPilot: "Chcę porozmawiać o 30-dniowym pilotażu",
  consent: "Zgadzam się, aby OPSQAI skontaktował się ze mną w sprawie tego badania.",
  contactSubmit: "Wyślij",
  contactDone: "Zapisane — odezwiemy się.",
  skip: "Nie, dziękuję, skończyłem",
  questions: {
    sector: {
      label: "Czym zajmuje się wasza firma?",
      options: {
        logistics: "Logistyka / magazyn",
        transport: "Transport drogowy / flota",
        manufacturing: "Produkcja",
        construction: "Budownictwo",
        services: "Usługi",
        retail: "Handel / hurt",
        other: "Coś innego",
      },
    },
    size: {
      label: "Ile osób tam pracuje?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Gdzie naprawdę znajdują się wasze procedury i instrukcje?",
      options: {
        shared_drive: "Dysk sieciowy / foldery",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Papier, segregatory, wydruki",
        chat: "W czatach i e-mailach",
        nowhere: "Głównie w głowach ludzi",
      },
    },
    search_time: {
      label: "Ile czasu zajmuje zwykle znalezienie właściwego dokumentu?",
      options: {
        under5: "Poniżej 5 minut",
        m5_15: "5–15 minut",
        m15_60: "15–60 minut",
        over60: "Ponad godzinę",
        often_never: "Często nie znajdują i pytają kolegę",
      },
    },
    audit_prep: {
      label: "Ile pracy wymaga przygotowanie audytu lub kontroli?",
      options: {
        hours: "Kilka godzin",
        d1_2: "1–2 dni",
        d3_5: "3–5 dni",
        over_week: "Ponad tydzień",
        no_audits: "Nie mamy audytów",
      },
    },
    onboarding: {
      label: "Ile czasu mija, aż nowa osoba pracuje samodzielnie?",
      options: { under1w: "Poniżej tygodnia", w1_4: "1–4 tygodnie", m1_3: "1–3 miesiące", over3m: "Ponad 3 miesiące" },
    },
    public_ai: {
      label: "Czy pracownicy używają publicznych narzędzi AI z danymi firmy?",
      options: {
        allowed: "Tak, i jest to dozwolone",
        uncontrolled: "Tak, bez żadnej kontroli",
        banned_but_happens: "Jest zakazane, ale się zdarza",
        no: "Nie",
        dont_know: "Nie wiemy",
      },
    },
    biggest_cost: {
      label: "Co ostatnio kosztowały was brakujące lub nieaktualne informacje?",
      options: {
        rework: "Powtórzona praca",
        missed_deadline: "Niedotrzymany termin",
        audit_finding: "Niezgodność audytowa lub kara",
        lost_knowledge: "Wiedza, która odeszła z pracownikiem",
        complaint: "Skarga klienta",
        none: "Nic wymiernego",
      },
    },
  },
};

const hu: StudyCopy = {
  meta: {
    title: "Európai működési tanulmány 2026 — hogyan találják meg a cégek az információt",
    description:
      "Anonim, 2 perces tanulmány: hol vannak az eljárások, mennyi ideig keresnek, mennyibe kerül az audit. E-mail nélkül.",
  },
  eyebrow: "Működési tanulmány 2026",
  headline: "Mennyibe kerül,",
  serifAccent: "hogy nem tudjátok?",
  intro:
    "Nyolc kérdés, körülbelül két perc. Anonim — e-mail nem kell. Azt mérjük fel, hogyan tárolják valójában az európai cégek az eljárásokat, hogyan keresnek információt és hogyan készülnek auditra.",
  why: "Miért kérdezzük: mindenki az AI-ról beszél. Szinte senki nem méri, mennyibe kerül egy megválaszolatlan kérdés a napi működésben.",
  privacy:
    "A válaszok mellé nem tárolunk személyes adatot. Az e-mail megadása opcionális, és csak az eredmények elküldésére használjuk. Törlést bármikor kérhet.",
  langLabel: "Nyelv",
  start: "Tanulmány indítása",
  progress: "{current}. kérdés / {total}",
  back: "Vissza",
  next: "Tovább",
  submit: "Válaszok elküldése",
  countryLabel: "Működési ország",
  countryOther: "Egyéb",
  submitting: "Küldés…",
  errorGeneric: "Nem sikerült elmenteni a válaszokat. Kérjük, próbálja újra.",
  thanksTitle: "Köszönjük — a válaszokat rögzítettük.",
  thanksBody: "Anonim módon, és mostantól beleszámítanak az alábbi eredményekbe.",
  benchmarkTitle: "Az eddigi eredmények",
  benchmarkLocked:
    "Az eredmények akkor nyílnak meg, ha elég cég válaszolt. Hagyja meg az e-mail-címét, és elküldjük a jelentést.",
  benchmarkResponses: "cég válaszolt",
  contactTitle: "Kéri a teljes jelentést?",
  contactBody: "Opcionális. A válaszai már mentve vannak — itt csak arról dönt, írhatunk-e Önnek.",
  optional: "Opcionális",
  nameLabel: "Az Ön neve",
  companyLabel: "Cég",
  emailLabel: "E-mail",
  wantsReport: "Küldjék el a jelentést a megjelenéskor",
  wantsPilot: "Szeretnék egy 30 napos pilotról beszélni",
  consent: "Hozzájárulok, hogy az OPSQAI megkeressen ezzel a tanulmánnyal kapcsolatban.",
  contactSubmit: "Küldés",
  contactDone: "Rögzítettük — jelentkezünk.",
  skip: "Köszönöm, készen vagyok",
  questions: {
    sector: {
      label: "Mivel foglalkozik a cégük?",
      options: {
        logistics: "Logisztika / raktár",
        transport: "Közúti fuvarozás / flotta",
        manufacturing: "Gyártás",
        construction: "Építőipar",
        services: "Szolgáltatás",
        retail: "Kereskedelem / nagykereskedelem",
        other: "Valami más",
      },
    },
    size: {
      label: "Hány ember dolgozik ott?",
      options: { s1_9: "1–9", s10_49: "10–49", s50_249: "50–249", s250_plus: "250+" },
    },
    storage: {
      label: "Hol vannak valójában az eljárások és utasítások?",
      options: {
        shared_drive: "Közös meghajtó / mappák",
        sharepoint_teams: "SharePoint / Teams / intranet",
        paper: "Papír, dossziék, nyomtatások",
        chat: "Chatekben és e-mailekben",
        nowhere: "Főleg az emberek fejében",
      },
    },
    search_time: {
      label: "Mennyi idő kell általában a megfelelő dokumentum megtalálásához?",
      options: {
        under5: "5 percnél kevesebb",
        m5_15: "5–15 perc",
        m15_60: "15–60 perc",
        over60: "Több mint egy óra",
        often_never: "Gyakran nem találják, és kollégát kérdeznek",
      },
    },
    audit_prep: {
      label: "Mennyi munka egy audit vagy ellenőrzés előkészítése?",
      options: {
        hours: "Néhány óra",
        d1_2: "1–2 nap",
        d3_5: "3–5 nap",
        over_week: "Több mint egy hét",
        no_audits: "Nincs auditunk",
      },
    },
    onboarding: {
      label: "Mennyi idő, míg egy új munkatárs önállóan dolgozik?",
      options: { under1w: "Egy hétnél kevesebb", w1_4: "1–4 hét", m1_3: "1–3 hónap", over3m: "Több mint 3 hónap" },
    },
    public_ai: {
      label: "Használnak nyilvános AI-eszközöket céges információval?",
      options: {
        allowed: "Igen, és engedélyezett",
        uncontrolled: "Igen, minden kontroll nélkül",
        banned_but_happens: "Tilos, de megtörténik",
        no: "Nem",
        dont_know: "Nem tudjuk",
      },
    },
    biggest_cost: {
      label: "Mibe került legutóbb a hiányzó vagy elavult információ?",
      options: {
        rework: "Újra elvégzett munka",
        missed_deadline: "Elmaradt határidő",
        audit_finding: "Audit-megállapítás vagy bírság",
        lost_knowledge: "Munkatárssal elment tudás",
        complaint: "Vevői reklamáció",
        none: "Semmi mérhető",
      },
    },
  },
};

export const STUDY_COPY: Record<StudyLocale, StudyCopy> = { en, de, ro, fr, it, es, nl, pl, hu };

export function studyCopy(locale: StudyLocale): StudyCopy {
  return STUDY_COPY[locale] ?? en;
}

/** Minimum number of responses before the benchmark is shown publicly. */
export const STUDY_BENCHMARK_MIN = 50;
