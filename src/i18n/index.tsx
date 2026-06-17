import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "de" | "en";

const dict = {
  de: {
    appName: "LogiAssist",
    tagline: "KI-Assistent für Logistik & Lager",
    dashboard: "Dashboard",
    chat: "Chat",
    newChat: "Neue Unterhaltung",
    knowledge: "Wissensdatenbank",
    faq: "FAQ",
    admin: "Administration",
    users: "Benutzer",
    signIn: "Anmelden",
    signUp: "Registrieren",
    signOut: "Abmelden",
    email: "E-Mail",
    password: "Passwort",
    fullName: "Vollständiger Name",
    department: "Abteilung",
    continueWithGoogle: "Mit Google fortfahren",
    or: "oder",
    welcome: "Willkommen",
    askAnything: "Frag den Assistenten zu allen Logistik- und Lagerthemen.",
    conversations: "Unterhaltungen",
    documents: "Dokumente",
    faqs: "FAQs",
    activeUsers: "Aktive Benutzer",
    today: "Heute",
    recentChats: "Letzte Unterhaltungen",
    quickStart: "Schnellstart",
    inbound: "Wareneingang",
    outbound: "Warenausgang",
    loading: "Be- & Entladen",
    cmr: "CMR-Dokumente",
    processes: "Lagerprozesse",
    transport: "Transportplanung",
    safety: "Sicherheit",
    internal: "Interne Verfahren",
    sendMessage: "Nachricht senden",
    typeMessage: "Schreib deine Frage…",
    upload: "Hochladen",
    title: "Titel",
    category: "Kategorie",
    file: "Datei",
    extractedText: "Extrahierter Text",
    addFaq: "FAQ hinzufügen",
    question: "Frage",
    answer: "Antwort",
    search: "Suchen",
    edit: "Bearbeiten",
    delete: "Löschen",
    save: "Speichern",
    cancel: "Abbrechen",
    role: "Rolle",
    name: "Name",
    promoteAdmin: "Zum Admin machen",
    demoteEmployee: "Zum Mitarbeiter machen",
    noThreads: "Noch keine Unterhaltungen.",
    noDocs: "Noch keine Dokumente.",
    noFaqs: "Noch keine FAQs.",
    thinking: "Denke nach…",
    profile: "Profil",
    language: "Sprache",
    thisIsYou: "(Du)",
    confirm: "Bestätigen",
    errorOccurred: "Ein Fehler ist aufgetreten.",
    historyTitle: "Verlauf",
  },
  en: {
    appName: "LogiAssist",
    tagline: "AI Assistant for Logistics & Warehouse",
    dashboard: "Dashboard",
    chat: "Chat",
    newChat: "New conversation",
    knowledge: "Knowledge Base",
    faq: "FAQ",
    admin: "Administration",
    users: "Users",
    signIn: "Sign in",
    signUp: "Sign up",
    signOut: "Sign out",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    department: "Department",
    continueWithGoogle: "Continue with Google",
    or: "or",
    welcome: "Welcome",
    askAnything: "Ask the assistant about any logistics or warehouse topic.",
    conversations: "Conversations",
    documents: "Documents",
    faqs: "FAQs",
    activeUsers: "Active users",
    today: "Today",
    recentChats: "Recent conversations",
    quickStart: "Quick start",
    inbound: "Inbound (Wareneingang)",
    outbound: "Outbound (Warenausgang)",
    loading: "Loading & unloading",
    cmr: "CMR documents",
    processes: "Warehouse processes",
    transport: "Transport planning",
    safety: "Safety instructions",
    internal: "Internal procedures",
    sendMessage: "Send",
    typeMessage: "Type your question…",
    upload: "Upload",
    title: "Title",
    category: "Category",
    file: "File",
    extractedText: "Extracted text",
    addFaq: "Add FAQ",
    question: "Question",
    answer: "Answer",
    search: "Search",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    role: "Role",
    name: "Name",
    promoteAdmin: "Make admin",
    demoteEmployee: "Make employee",
    noThreads: "No conversations yet.",
    noDocs: "No documents yet.",
    noFaqs: "No FAQs yet.",
    thinking: "Thinking…",
    profile: "Profile",
    language: "Language",
    thisIsYou: "(You)",
    confirm: "Confirm",
    errorOccurred: "An error occurred.",
    historyTitle: "History",
  },
} as const;

export type DictKey = keyof typeof dict.en;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (k: DictKey) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (stored === "de" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: DictKey) => dict[lang][k] ?? k;

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useT() {
  const v = useContext(Ctx);
  if (!v) throw new Error("LanguageProvider missing");
  return v;
}
