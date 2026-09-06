#!/usr/bin/env python3
"""
Generates the three OPSQAI lead magnets in EN / DE / RO into public/resources/.

  1. sop-30-day-checklist      — 30-day SOP digitisation checklist
  2. knowledge-tco-calculator  — the real cost of lost operational knowledge
  3. knowledge-audit-template  — 20 questions operational knowledge audit

Reuses the brand primitives of the product overview generator so all PDFs
share one visual identity.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas as pdfcanvas

ROOT = Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location(
    "oq_pdf_base", ROOT / "scripts" / "gen_product_overview_pdf.py"
)
base = importlib.util.module_from_spec(_spec)
assert _spec.loader
_spec.loader.exec_module(base)

W, H, M = base.W, base.H, base.M
BODY, BOLD, SERIF = base.BODY, base.BOLD, base.SERIF
GOLD, GOLD_SOFT, GOLD_LINE = base.GOLD, base.GOLD_SOFT, base.GOLD_LINE
CREAM, CREAM_DIM = base.CREAM, base.CREAM_DIM
page_bg, mark, eyebrow, wrap, para, bullets, card = (
    base.page_bg, base.mark, base.eyebrow, base.wrap, base.para, base.bullets, base.card
)
CONTENT_W = W - 2 * M
OUT_DIR = ROOT / "public" / "resources"


def cover(c, eyebrow_text: str, title: str, accent: str, blurb: str) -> None:
    page_bg(c)
    mark(c, W / 2, H - 58 * 2.834, 15 * 2.834)
    y = H - 150 * 2.834 / 2
    eyebrow(c, M, y, eyebrow_text)
    y -= 26
    c.setFillColor(CREAM)
    c.setFont(BOLD, 26)
    for line in wrap(c, title, BOLD, 26, CONTENT_W):
        c.drawString(M, y, line)
        y -= 31
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 26)
    for line in wrap(c, accent, SERIF, 26, CONTENT_W):
        c.drawString(M, y, line)
        y -= 31
    y -= 12
    y = para(c, M, y, blurb, CONTENT_W, size=10.4, leading=15.4)
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 8.6)
    c.drawString(M, M * 1.3, "opsqai.de")


def section(c, y: float, title: str, items: list[str]) -> float:
    if y < M + 140:
        c.showPage()
        page_bg(c, alt=True)
        y = H - M - 20
    c.setFillColor(GOLD)
    c.setFont(BOLD, 11)
    c.drawString(M, y, title)
    y -= 18
    for it in items:
        if y < M + 40:
            c.showPage()
            page_bg(c, alt=True)
            y = H - M - 20
        c.setFillColor(GOLD_SOFT)
        c.setFont(BODY, 9.4)
        c.drawString(M, y, "\u25a1")
        c.setFillColor(CREAM_DIM)
        c.setFont(BODY, 9.4)
        lines = wrap(c, it, BODY, 9.4, CONTENT_W - 16)
        for ln in lines:
            c.drawString(M + 16, y, ln)
            y -= 13.6
        y -= 3
    return y - 12


def build(doc: dict, out: Path) -> None:
    c = pdfcanvas.Canvas(str(out), pagesize=A4)
    cover(c, doc["eyebrow"], doc["title"], doc["accent"], doc["blurb"])
    c.showPage()
    page_bg(c, alt=True)
    y = H - M - 20
    for sec in doc["sections"]:
        y = section(c, y, sec["title"], sec["items"])
    if y < M + 90:
        c.showPage()
        page_bg(c)
        y = H - M - 20
    c.setFillColor(GOLD)
    c.setFont(BOLD, 11)
    c.drawString(M, y, doc["cta_title"])
    y -= 18
    para(c, M, y, doc["cta_body"], CONTENT_W, size=9.6, leading=14)
    c.showPage()
    c.save()
    print("wrote", out.relative_to(ROOT))


# --------------------------------------------------------------------------- #
# content
# --------------------------------------------------------------------------- #
DOCS: dict[str, dict[str, dict]] = {
    "sop-30-day-checklist": {
        "en": {
            "eyebrow": "Checklist",
            "title": "30 days to digitise",
            "accent": "your operating procedures.",
            "blurb": "A week-by-week plan any operations team can run without consultants: collect what exists, standardise it, make it answerable, and keep it current.",
            "sections": [
                {"title": "Week 1 — Inventory", "items": [
                    "List every process a new hire needs in their first 30 days.",
                    "Collect existing documents: files, chats, emails, printed folders.",
                    "Name one owner per process. No owner means no procedure.",
                    "Mark the five processes where mistakes cost the most money.",
                    "Record how people ask questions today (who they call, when).",
                ]},
                {"title": "Week 2 — Standardise", "items": [
                    "Write each of the five critical processes on one page.",
                    "Use the same structure: purpose, trigger, steps, exceptions, contact.",
                    "Add the real numbers: limits, tolerances, deadlines, thresholds.",
                    "Remove every step nobody actually performs.",
                    "Have the person doing the work review the page, not only the manager.",
                ]},
                {"title": "Week 3 — Make it answerable", "items": [
                    "Load the pages into one searchable place with access control.",
                    "Convert the 20 most frequent questions into short FAQ answers.",
                    "Check that every answer cites the document it comes from.",
                    "Define what happens when no answer exists (who gets the question).",
                    "Test with three employees who did not write the documents.",
                ]},
                {"title": "Week 4 — Keep it current", "items": [
                    "Set a review date per document and an owner reminder.",
                    "Log unanswered questions as knowledge gaps and assign them.",
                    "Track acknowledgements for procedures that carry legal weight.",
                    "Review one KPI weekly: questions answered from documents.",
                    "Schedule a quarterly audit and archive superseded versions.",
                ]},
            ],
            "cta_title": "Run the last two weeks with OPSQAI",
            "cta_body": "OPSQAI is installed on your own Windows Server. It answers only from your approved documents, records every unanswered question as a knowledge gap, and keeps ownership, review dates and acknowledgements in one place. Free 30-day pilot: opsqai.de/pilot",
        },
        "de": {
            "eyebrow": "Checkliste",
            "title": "30 Tage bis zur Digitalisierung",
            "accent": "Ihrer Arbeitsanweisungen.",
            "blurb": "Ein Wochenplan, den jedes Operations-Team ohne Berater umsetzen kann: erfassen, standardisieren, beantwortbar machen und aktuell halten.",
            "sections": [
                {"title": "Woche 1 — Inventar", "items": [
                    "Alle Prozesse auflisten, die neue Mitarbeitende in 30 Tagen brauchen.",
                    "Vorhandene Dokumente sammeln: Dateien, Chats, E-Mails, Ordner.",
                    "Pro Prozess eine verantwortliche Person benennen.",
                    "Die fünf Prozesse markieren, bei denen Fehler am teuersten sind.",
                    "Festhalten, wie Fragen heute gestellt werden (wer wird angerufen).",
                ]},
                {"title": "Woche 2 — Standardisieren", "items": [
                    "Jeden der fünf kritischen Prozesse auf einer Seite beschreiben.",
                    "Gleiche Struktur: Zweck, Auslöser, Schritte, Ausnahmen, Kontakt.",
                    "Echte Werte ergänzen: Grenzwerte, Toleranzen, Fristen.",
                    "Jeden Schritt entfernen, den niemand tatsächlich ausführt.",
                    "Die ausführende Person prüfen lassen, nicht nur die Führungskraft.",
                ]},
                {"title": "Woche 3 — Beantwortbar machen", "items": [
                    "Seiten an einem durchsuchbaren Ort mit Zugriffskontrolle ablegen.",
                    "Die 20 häufigsten Fragen als kurze FAQ-Antworten formulieren.",
                    "Prüfen, dass jede Antwort ihr Quelldokument nennt.",
                    "Festlegen, was passiert, wenn keine Antwort existiert.",
                    "Mit drei Personen testen, die die Dokumente nicht geschrieben haben.",
                ]},
                {"title": "Woche 4 — Aktuell halten", "items": [
                    "Prüfdatum und Erinnerung pro Dokument setzen.",
                    "Unbeantwortete Fragen als Wissenslücken erfassen und zuweisen.",
                    "Bestätigungen für rechtlich relevante Anweisungen nachverfolgen.",
                    "Wöchentlich eine Kennzahl prüfen: aus Dokumenten beantwortete Fragen.",
                    "Quartals-Audit planen und veraltete Versionen archivieren.",
                ]},
            ],
            "cta_title": "Die letzten zwei Wochen mit OPSQAI umsetzen",
            "cta_body": "OPSQAI läuft auf Ihrem eigenen Windows Server. Es antwortet ausschließlich aus Ihren freigegebenen Dokumenten, erfasst jede unbeantwortete Frage als Wissenslücke und hält Verantwortung, Prüftermine und Bestätigungen an einem Ort. Kostenloser 30-Tage-Pilot: opsqai.de/pilot",
        },
        "ro": {
            "eyebrow": "Checklist",
            "title": "30 de zile pentru digitizarea",
            "accent": "procedurilor de lucru.",
            "blurb": "Un plan săptămânal pe care orice echipă de operațiuni îl poate rula fără consultanți: colectezi, standardizezi, faci informația căutabilă și o menții actuală.",
            "sections": [
                {"title": "Săptămâna 1 — Inventar", "items": [
                    "Listează procesele de care are nevoie un angajat nou în primele 30 de zile.",
                    "Adună documentele existente: fișiere, conversații, e-mailuri, dosare.",
                    "Numește un responsabil pentru fiecare proces.",
                    "Marchează cele cinci procese unde greșelile costă cel mai mult.",
                    "Notează cum se pun întrebările astăzi (pe cine sună oamenii).",
                ]},
                {"title": "Săptămâna 2 — Standardizare", "items": [
                    "Scrie fiecare dintre cele cinci procese critice pe o singură pagină.",
                    "Aceeași structură: scop, declanșator, pași, excepții, contact.",
                    "Adaugă valorile reale: limite, toleranțe, termene, praguri.",
                    "Elimină orice pas pe care nimeni nu îl execută în realitate.",
                    "Pune omul care face munca să verifice pagina, nu doar managerul.",
                ]},
                {"title": "Săptămâna 3 — Fă informația căutabilă", "items": [
                    "Încarcă paginile într-un singur loc căutabil, cu drepturi de acces.",
                    "Transformă cele 20 de întrebări frecvente în răspunsuri scurte.",
                    "Verifică ca fiecare răspuns să indice documentul din care vine.",
                    "Stabilește ce se întâmplă când nu există răspuns.",
                    "Testează cu trei angajați care nu au scris documentele.",
                ]},
                {"title": "Săptămâna 4 — Menținere", "items": [
                    "Setează dată de revizuire și responsabil pentru fiecare document.",
                    "Înregistrează întrebările fără răspuns ca lipsuri de cunoștințe.",
                    "Urmărește confirmările pentru procedurile cu greutate legală.",
                    "Verifică săptămânal un indicator: întrebări răspunse din documente.",
                    "Programează un audit trimestrial și arhivează versiunile depășite.",
                ]},
            ],
            "cta_title": "Rulează ultimele două săptămâni cu OPSQAI",
            "cta_body": "OPSQAI se instalează pe serverul tău Windows. Răspunde exclusiv din documentele aprobate, înregistrează fiecare întrebare fără răspuns ca lipsă de cunoștințe și ține responsabilii, termenele de revizuire și confirmările într-un singur loc. Pilot gratuit 30 de zile: opsqai.de/pilot",
        },
    },
    "knowledge-tco-calculator": {
        "en": {
            "eyebrow": "Cost model",
            "title": "What lost knowledge",
            "accent": "actually costs you.",
            "blurb": "A simple worksheet to estimate the yearly cost of searching, asking and re-doing work — with the numbers your finance team will accept.",
            "sections": [
                {"title": "Step 1 — Collect your inputs", "items": [
                    "Number of operational employees (A).",
                    "Average fully loaded hourly cost, incl. taxes and overhead (B).",
                    "Minutes per person per day spent searching or asking (C).",
                    "Working days per year (D), typically 220.",
                    "Number of onboardings per year (E) and days to productivity (F).",
                ]},
                {"title": "Step 2 — Search and interruption cost", "items": [
                    "Yearly search cost = A x (C / 60) x D x B.",
                    "Example: 120 people x 0.5 h x 220 days x 28 EUR = 369,600 EUR.",
                    "Add interruption cost: every question also stops an expert.",
                    "Expert cost = questions per day x 10 min x expert hourly cost x D.",
                ]},
                {"title": "Step 3 — Onboarding and rework cost", "items": [
                    "Onboarding cost = E x F x B x 8 h x share of unproductive time.",
                    "Rework cost = incidents per month x average cost per incident x 12.",
                    "Include penalties: late deliveries, failed audits, rejected claims.",
                    "Include turnover cost when procedures live only in people's heads.",
                ]},
                {"title": "Step 4 — Compare with the fix", "items": [
                    "Assume a conservative 30% reduction of search time in year one.",
                    "Savings = yearly search cost x 0.30 + onboarding savings.",
                    "Compare with a self-hosted licence plus your own server cost.",
                    "Decide on payback months, not on feature lists.",
                ]},
            ],
            "cta_title": "Validate your own numbers in a 30-day pilot",
            "cta_body": "Run OPSQAI on your own server for 30 days, measure how many questions get answered directly from your documents, and compare the result with this worksheet. Apply at opsqai.de/pilot",
        },
        "de": {
            "eyebrow": "Kostenmodell",
            "title": "Was verlorenes Wissen",
            "accent": "tatsächlich kostet.",
            "blurb": "Ein einfaches Arbeitsblatt für die Jahreskosten von Suchen, Nachfragen und Nacharbeit — mit Zahlen, die Ihre Finanzabteilung akzeptiert.",
            "sections": [
                {"title": "Schritt 1 — Eingaben sammeln", "items": [
                    "Anzahl operativer Mitarbeitender (A).",
                    "Durchschnittlicher Vollkosten-Stundensatz (B).",
                    "Minuten pro Person und Tag für Suchen oder Nachfragen (C).",
                    "Arbeitstage pro Jahr (D), typischerweise 220.",
                    "Einarbeitungen pro Jahr (E) und Tage bis zur Produktivität (F).",
                ]},
                {"title": "Schritt 2 — Such- und Unterbrechungskosten", "items": [
                    "Jährliche Suchkosten = A x (C / 60) x D x B.",
                    "Beispiel: 120 Personen x 0,5 h x 220 Tage x 28 EUR = 369.600 EUR.",
                    "Unterbrechungskosten ergänzen: jede Frage stoppt auch eine Fachkraft.",
                    "Fachkraftkosten = Fragen pro Tag x 10 Min x Stundensatz x D.",
                ]},
                {"title": "Schritt 3 — Einarbeitung und Nacharbeit", "items": [
                    "Einarbeitung = E x F x B x 8 h x Anteil unproduktiver Zeit.",
                    "Nacharbeit = Vorfälle pro Monat x Kosten pro Vorfall x 12.",
                    "Strafen einbeziehen: Verspätungen, gescheiterte Audits, Reklamationen.",
                    "Fluktuationskosten einbeziehen, wenn Wissen nur in Köpfen liegt.",
                ]},
                {"title": "Schritt 4 — Mit der Lösung vergleichen", "items": [
                    "Konservativ 30 % weniger Suchzeit im ersten Jahr annehmen.",
                    "Einsparung = Suchkosten x 0,30 + Einsparung bei Einarbeitung.",
                    "Mit Self-Hosted-Lizenz plus eigenen Serverkosten vergleichen.",
                    "Nach Amortisationsmonaten entscheiden, nicht nach Funktionslisten.",
                ]},
            ],
            "cta_title": "Eigene Zahlen im 30-Tage-Pilot prüfen",
            "cta_body": "Betreiben Sie OPSQAI 30 Tage auf Ihrem eigenen Server, messen Sie, wie viele Fragen direkt aus Ihren Dokumenten beantwortet werden, und vergleichen Sie das Ergebnis mit diesem Arbeitsblatt. Bewerbung: opsqai.de/pilot",
        },
        "ro": {
            "eyebrow": "Model de cost",
            "title": "Cât te costă, de fapt,",
            "accent": "cunoștințele pierdute.",
            "blurb": "O foaie de lucru simplă pentru costul anual al căutării, întrebărilor și muncii refăcute — cu cifre pe care le acceptă și financiarul.",
            "sections": [
                {"title": "Pasul 1 — Adună datele", "items": [
                    "Numărul de angajați operaționali (A).",
                    "Cost orar total mediu, cu taxe și cheltuieli indirecte (B).",
                    "Minute pe zi, per persoană, pierdute căutând sau întrebând (C).",
                    "Zile lucrătoare pe an (D), tipic 220.",
                    "Număr de angajări pe an (E) și zile până la productivitate (F).",
                ]},
                {"title": "Pasul 2 — Costul căutării și al întreruperii", "items": [
                    "Cost anual de căutare = A x (C / 60) x D x B.",
                    "Exemplu: 120 oameni x 0,5 h x 220 zile x 28 EUR = 369.600 EUR.",
                    "Adaugă costul întreruperii: fiecare întrebare oprește și un expert.",
                    "Cost expert = întrebări pe zi x 10 min x cost orar expert x D.",
                ]},
                {"title": "Pasul 3 — Integrare și muncă refăcută", "items": [
                    "Cost integrare = E x F x B x 8 h x procent de timp neproductiv.",
                    "Cost refacere = incidente pe lună x cost mediu per incident x 12.",
                    "Include penalitățile: livrări întârziate, audituri picate, reclamații.",
                    "Include costul plecărilor când procedurile există doar în minte.",
                ]},
                {"title": "Pasul 4 — Compară cu soluția", "items": [
                    "Presupune conservator 30% mai puțin timp de căutare în primul an.",
                    "Economie = cost căutare x 0,30 + economia la integrare.",
                    "Compară cu licența self-hosted plus costul serverului tău.",
                    "Decide după lunile de amortizare, nu după liste de funcții.",
                ]},
            ],
            "cta_title": "Verifică-ți cifrele într-un pilot de 30 de zile",
            "cta_body": "Rulează OPSQAI 30 de zile pe serverul tău, măsoară câte întrebări primesc răspuns direct din documentele tale și compară rezultatul cu această foaie de lucru. Aplică pe opsqai.de/pilot",
        },
    },
    "knowledge-audit-template": {
        "en": {
            "eyebrow": "Template",
            "title": "Operational knowledge audit",
            "accent": "20 questions.",
            "blurb": "Score each question from 0 to 5 with your operations leads. Anything under 3 is a risk you can name, cost and fix this quarter.",
            "sections": [
                {"title": "Coverage", "items": [
                    "Can a new hire find every critical procedure without asking a colleague?",
                    "Is each procedure owned by a named person, not a department?",
                    "Are exceptions and edge cases written down, not remembered?",
                    "Do procedures contain the real numbers people need in the moment?",
                    "Is there one place employees trust more than asking a colleague?",
                ]},
                {"title": "Freshness", "items": [
                    "Does every document have a review date that is actually enforced?",
                    "Do you know which documents are outdated right now?",
                    "Are superseded versions archived instead of circulating?",
                    "Does a legal or customer change trigger a document review?",
                    "Do you measure how old your average procedure is?",
                ]},
                {"title": "Access and control", "items": [
                    "Can you show who has access to which procedure?",
                    "Can you prove who read and acknowledged a critical procedure?",
                    "Does knowledge stay inside your own infrastructure?",
                    "Can you produce an audit trail for the last 12 months?",
                    "Would a customer or auditor accept your evidence today?",
                ]},
                {"title": "Learning loop", "items": [
                    "Are unanswered questions recorded instead of lost in chats?",
                    "Does someone own closing those gaps within a deadline?",
                    "Is training built from the same documents used in daily work?",
                    "Do you retrain people when a procedure changes materially?",
                    "Do you review one knowledge KPI in your weekly management meeting?",
                ]},
            ],
            "cta_title": "Turn the audit into a plan",
            "cta_body": "Send us your scores and we will map each low score to a concrete 30-day action, with or without OPSQAI. Free workshop: opsqai.de/contact",
        },
        "de": {
            "eyebrow": "Vorlage",
            "title": "Audit des operativen Wissens",
            "accent": "20 Fragen.",
            "blurb": "Bewerten Sie jede Frage mit Ihren Operations-Verantwortlichen von 0 bis 5. Alles unter 3 ist ein Risiko, das Sie benennen, beziffern und in diesem Quartal beheben können.",
            "sections": [
                {"title": "Abdeckung", "items": [
                    "Findet eine neue Person jede kritische Anweisung ohne zu fragen?",
                    "Hat jede Anweisung eine namentliche Verantwortung?",
                    "Sind Ausnahmen und Sonderfälle dokumentiert statt erinnert?",
                    "Enthalten Anweisungen die konkreten Werte für den Moment?",
                    "Gibt es einen Ort, dem Mitarbeitende mehr vertrauen als Kollegen?",
                ]},
                {"title": "Aktualität", "items": [
                    "Hat jedes Dokument ein tatsächlich durchgesetztes Prüfdatum?",
                    "Wissen Sie, welche Dokumente jetzt veraltet sind?",
                    "Werden alte Versionen archiviert statt weiter verteilt?",
                    "Löst eine Rechts- oder Kundenänderung eine Prüfung aus?",
                    "Messen Sie das Durchschnittsalter Ihrer Anweisungen?",
                ]},
                {"title": "Zugriff und Kontrolle", "items": [
                    "Können Sie zeigen, wer auf welche Anweisung Zugriff hat?",
                    "Können Sie belegen, wer eine kritische Anweisung bestätigt hat?",
                    "Bleibt das Wissen in Ihrer eigenen Infrastruktur?",
                    "Können Sie einen Prüfpfad der letzten 12 Monate erzeugen?",
                    "Würde ein Kunde oder Auditor Ihre Nachweise heute akzeptieren?",
                ]},
                {"title": "Lernschleife", "items": [
                    "Werden unbeantwortete Fragen erfasst statt im Chat verloren?",
                    "Ist jemand verantwortlich, Lücken fristgerecht zu schließen?",
                    "Basiert Schulung auf denselben Dokumenten wie die Arbeit?",
                    "Schulen Sie nach, wenn sich eine Anweisung wesentlich ändert?",
                    "Prüfen Sie eine Wissens-Kennzahl im wöchentlichen Meeting?",
                ]},
            ],
            "cta_title": "Aus dem Audit einen Plan machen",
            "cta_body": "Senden Sie uns Ihre Bewertungen und wir ordnen jeder schwachen Bewertung eine konkrete 30-Tage-Maßnahme zu — mit oder ohne OPSQAI. Kostenloser Workshop: opsqai.de/contact",
        },
        "ro": {
            "eyebrow": "Șablon",
            "title": "Audit de cunoștințe operaționale",
            "accent": "20 de întrebări.",
            "blurb": "Notează fiecare întrebare de la 0 la 5 împreună cu responsabilii de operațiuni. Orice sub 3 este un risc pe care îl poți numi, cuantifica și rezolva în acest trimestru.",
            "sections": [
                {"title": "Acoperire", "items": [
                    "Un angajat nou găsește orice procedură critică fără să întrebe?",
                    "Fiecare procedură are un responsabil cu nume, nu un departament?",
                    "Excepțiile și cazurile speciale sunt scrise, nu ținute minte?",
                    "Procedurile conțin valorile concrete necesare pe moment?",
                    "Există un loc în care oamenii au mai multă încredere decât în colegi?",
                ]},
                {"title": "Actualitate", "items": [
                    "Fiecare document are o dată de revizuire respectată efectiv?",
                    "Știi chiar acum care documente sunt depășite?",
                    "Versiunile vechi sunt arhivate, nu lăsate să circule?",
                    "O schimbare legală sau de client declanșează o revizuire?",
                    "Măsori vechimea medie a procedurilor tale?",
                ]},
                {"title": "Acces și control", "items": [
                    "Poți arăta cine are acces la fiecare procedură?",
                    "Poți dovedi cine a citit și confirmat o procedură critică?",
                    "Cunoștințele rămân în infrastructura proprie?",
                    "Poți produce o pistă de audit pentru ultimele 12 luni?",
                    "Un client sau un auditor ar accepta dovezile tale astăzi?",
                ]},
                {"title": "Bucla de învățare", "items": [
                    "Întrebările fără răspuns sunt înregistrate, nu pierdute în chat?",
                    "Există un responsabil care închide lipsurile într-un termen clar?",
                    "Instruirea se face din aceleași documente folosite în muncă?",
                    "Reinstruiești oamenii când o procedură se schimbă semnificativ?",
                    "Analizezi un indicator de cunoștințe în ședința săptămânală?",
                ]},
            ],
            "cta_title": "Transformă auditul în plan",
            "cta_body": "Trimite-ne scorurile și mapăm fiecare notă slabă pe o acțiune concretă de 30 de zile, cu sau fără OPSQAI. Workshop gratuit: opsqai.de/contact",
        },
    },
}


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for slug, langs in DOCS.items():
        for lang, doc in langs.items():
            build(doc, OUT_DIR / f"opsqai-{slug}-{lang}.pdf")


if __name__ == "__main__":
    main()
