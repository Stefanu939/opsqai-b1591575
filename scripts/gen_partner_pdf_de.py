#!/usr/bin/env python3
"""
Generates public/OPSQAI_Partnerprogramm_DE.pdf — the German B2B sales &
partnership document ("Test- & Entwicklungspartner gesucht").

Reuses the brand primitives of the English product overview generator so both
documents share one visual identity (deep green field, gold rules, Sovereign
Mark, DejaVu Unicode fonts for correct German diacritics).
"""
from __future__ import annotations

import importlib.util
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
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

OUT = ROOT / "public" / "OPSQAI_Partnerprogramm_DE.pdf"
TOTAL = 12
CONTENT_W = W - 2 * M


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def footer(c, page: int) -> None:
    base.footer(c, page, TOTAL, label="OPSQAI · KI für operatives Unternehmenswissen")


def heading(c, y: float, first: str, accent: str | None = None, size: float = 19) -> float:
    c.setFillColor(CREAM)
    c.setFont(BOLD, size)
    for line in wrap(c, first, BOLD, size, CONTENT_W):
        c.drawString(M, y, line)
        y -= size + 4
    if accent:
        c.setFillColor(GOLD_SOFT)
        c.setFont(SERIF, size)
        for line in wrap(c, accent, SERIF, size, CONTENT_W):
            c.drawString(M, y, line)
            y -= size + 4
    return y - 14


def block(c, y: float, title: str, body: str | None, items: list[str] | None = None,
          x: float = M, w: float = CONTENT_W, pad: float = 10.0,
          title_size: float = 9.4, size: float = 8.8, leading: float = 12.2) -> float:
    """Card with gold title, optional paragraph and bullets. Auto height."""
    h = pad + title_size + 6
    if body:
        h += leading * len(wrap(c, body, BODY, size, w - 2 * pad))
    if items:
        for it in items:
            h += leading * len(wrap(c, it, BODY, size, w - 2 * pad - 9)) + 1.5
    h += pad
    card(c, x, y, w, h)
    cy = y - pad - title_size + 1
    c.setFillColor(GOLD)
    c.setFont(BOLD, title_size)
    c.drawString(x + pad, cy, title)
    cy -= 12
    if body:
        cy = para(c, x + pad, cy, body, w - 2 * pad, size=size, leading=leading)
    if items:
        cy = bullets(c, x + pad, cy, items, w - 2 * pad, size=size, leading=leading)
    return y - h - 5 * mm


def two_col(c, y: float, left: tuple[str, list[str]], right: tuple[str, list[str]]) -> float:
    gap = 6 * mm
    cw = (CONTENT_W - gap) / 2
    y1 = block(c, y, left[0], None, left[1], x=M, w=cw)
    y2 = block(c, y, right[0], None, right[1], x=M + cw + gap, w=cw)
    return min(y1, y2)


def check_list(c, y: float, items: list[str], size: float = 9.0, leading: float = 13.6) -> float:
    for it in items:
        c.setFillColor(GOLD)
        c.setFont(BOLD, size)
        c.drawString(M, y, "—")
        y = para(c, M + 12, y, it, CONTENT_W - 12, size=size, color=CREAM, leading=leading)
        y -= 2
    return y


def note(c, y: float, text: str) -> float:
    h = 10 + 12.2 * len(wrap(c, text, BODY, 8.6, CONTENT_W - 20)) + 10
    c.setFillColor(colors.HexColor("#073226"))
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.7)
    c.rect(M, y - h, CONTENT_W, h, stroke=1, fill=1)
    para(c, M + 10, y - 20, text, CONTENT_W - 20, size=8.6, leading=12.2, color=CREAM)
    return y - h - 5 * mm


# --------------------------------------------------------------------------- #
# pages
# --------------------------------------------------------------------------- #
def p1_cover(c) -> None:
    page_bg(c)
    mark(c, W / 2, H - 72 * mm, 21 * mm)

    c.setFillColor(CREAM)
    c.setFont(BOLD, 34)
    c.drawCentredString(W / 2, H - 100 * mm, "O P S Q A I")
    c.setFillColor(GOLD)
    c.setFont(BODY, 9.2)
    c.drawCentredString(W / 2, H - 109 * mm, " ".join("KI FÜR OPERATIVES UNTERNEHMENSWISSEN"))

    c.setStrokeColor(GOLD_LINE)
    c.setLineWidth(0.6)
    c.line(W / 2 - 45 * mm, H - 118 * mm, W / 2 + 45 * mm, H - 118 * mm)

    c.setFillColor(CREAM)
    c.setFont(BODY, 10.4)
    c.drawCentredString(W / 2, H - 128 * mm, "Self-Hosted.   Web-Based.   Erweiterbar.")

    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 16)
    c.drawCentredString(W / 2, H - 145 * mm, "Test- & Entwicklungspartner gesucht")

    y = H - 158 * mm
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 9.2)
    for line in wrap(
        c,
        "Wir suchen ausgewählte Test- und Entwicklungspartner für die nächste Phase von OPSQAI: "
        "Unternehmen, die die Plattform in einem realen operativen Umfeld erproben und ihre "
        "Weiterentwicklung aktiv mitgestalten möchten.",
        BODY, 9.2, 132 * mm,
    ):
        c.drawCentredString(W / 2, y, line)
        y -= 13.6

    labels = ["Wissensbasis", "KI-Antworten", "SOPs & FAQ", "Academy", "Self-Hosted", "Module"]
    bw = CONTENT_W / 6
    for i, lab in enumerate(labels):
        x = M + i * bw
        c.setStrokeColor(GOLD_LINE)
        c.rect(x, 34 * mm, bw, 12 * mm, stroke=1, fill=0)
        c.setFillColor(GOLD)
        c.setFont(BODY, 6.2)
        c.drawCentredString(x + bw / 2, 39 * mm, lab.upper())

    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 7.4)
    c.drawCentredString(W / 2, 26 * mm, "opsqai.de   ·   info@opsqai.de")


def p2_was_ist(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "Was ist OPSQAI")
    y = heading(c, y, "Freigegebenes Unternehmenswissen,", "in natürlicher Sprache abrufbar.")

    y = para(
        c, M, y,
        "OPSQAI ist eine KI-gestützte Wissensplattform. Sie führt das operative Wissen eines "
        "Unternehmens an einer Stelle zusammen und macht es für Mitarbeitende im Arbeitsalltag "
        "abrufbar. Mitarbeitende stellen ihre Frage in natürlicher Sprache und erhalten eine "
        "Antwort auf Basis der freigegebenen Unternehmensinformationen – mit Angabe der Quelle.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 10

    y = block(
        c, y, "Verwendbare Informationsquellen", None,
        [
            "SOPs und Arbeitsanweisungen",
            "Prozessbeschreibungen und Handbücher",
            "interne Dokumente und Richtlinien",
            "FAQs und bestehende Wissensdatenbanken",
        ],
    )

    y = two_col(
        c, y,
        ("Für Mitarbeitende", [
            "Antworten auf Basis freigegebener Informationen",
            "Quellenanzeige zu jeder Antwort",
            "mehrsprachige Interaktion",
            "schnellere Informationssuche im Tagesgeschäft",
        ]),
        ("Für Organisation & Führung", [
            "zentrale Wissensbasis statt verteilter Ablagen",
            "Unterstützung für SOPs und Arbeitsanweisungen",
            "Unterstützung beim Onboarding neuer Mitarbeitender",
            "geringere Abhängigkeit von einzelnen Wissensträgern",
            "Erkennung von Wissenslücken",
        ]),
    )

    note(
        c, y,
        "OPSQAI ersetzt keine fachliche Verantwortung. Die Qualität der Antworten hängt von der "
        "Qualität und Aktualität der bereitgestellten Unternehmensdokumente ab; freigegebene "
        "Inhalte bleiben in der Verantwortung des Unternehmens.",
    )
    footer(c, 2)


def p3_problem(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "Ausgangslage")
    y = heading(
        c, y,
        "Unternehmenswissen ist oft vorhanden –",
        "aber nicht verfügbar, wenn es gebraucht wird.",
        size=17,
    )

    y = para(
        c, M, y,
        "Viele Unternehmen kennen diese Situationen aus ihrem operativen Alltag:",
        CONTENT_W, size=10.0, leading=15.0, color=CREAM,
    )
    y -= 8

    situations = [
        ("Suche in Dokumenten",
         "Mitarbeitende durchsuchen Ordner, PDFs und Laufwerke, um eine konkrete Vorgabe zu finden."),
        ("Wiederkehrende Rückfragen",
         "Erfahrene Kolleginnen und Kollegen beantworten dieselben Fragen immer wieder."),
        ("Verteiltes Wissen",
         "Wichtige Informationen liegen an mehreren Orten und in unterschiedlichen Formaten."),
        ("Einarbeitungszeit",
         "Neue Mitarbeitende brauchen Zeit, um Prozesse und Zuständigkeiten zu verstehen."),
        ("Unterschiedliche Auskünfte",
         "Auf dieselbe Frage erhalten Mitarbeitende je nach Ansprechpartner unterschiedliche Antworten."),
        ("Zugriff im Tagesgeschäft",
         "Verfahrensanweisungen sind während der laufenden Arbeit schwer auffindbar."),
    ]
    gap = 6 * mm
    cw = (CONTENT_W - gap) / 2
    rows = []
    for i, (t, b) in enumerate(situations):
        col, row = i % 2, i // 2
        x = M + col * (cw + gap)
        top = y - row * (24 * mm)
        h = 20 * mm
        card(c, x, top, cw, h)
        c.setFillColor(GOLD)
        c.setFont(BOLD, 9.2)
        c.drawString(x + 10, top - 14, t)
        para(c, x + 10, top - 27, b, cw - 20, size=8.6, leading=11.8)
        rows.append(top - h)
    y = min(rows) - 8 * mm

    note(
        c, y,
        "OPSQAI ist darauf ausgelegt, freigegebenes operatives Wissen über eine dialogorientierte "
        "KI-Oberfläche leichter zugänglich zu machen – ohne bestehende Systeme zu ersetzen.",
    )
    footer(c, 3)


def p4_selfhosted(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "Betriebsmodell 1")
    y = heading(c, y, "OPSQAI Self-Hosted", "Betrieb in Ihrer eigenen Infrastruktur.")

    y = para(
        c, M, y,
        "Die Self-Hosted-Variante wird in der Infrastruktur des Unternehmens betrieben. Sie richtet "
        "sich an Unternehmen, die mehr Kontrolle über ihre Infrastruktur und ihre KI-Umgebung "
        "behalten möchten.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 12

    y = check_list(c, y, [
        "Installation und Betrieb innerhalb der eigenen Infrastruktur.",
        "Unternehmenswissen bleibt in der eigenen Umgebung.",
        "Lokale KI-Modelle können über Ollama genutzt werden.",
        "Für den lokalen KI-Betrieb ist keine externe KI-API erforderlich.",
        "Der Betrieb ist unabhängig von externen KI-Cloud-Diensten möglich.",
        "Ein offlinefähiger Betrieb ist – abhängig von Infrastruktur und Konfiguration – möglich.",
        "Interne Dokumente werden lokal verarbeitet und lokal durchsucht.",
    ])
    y -= 4 * mm

    gap = 6 * mm
    cw = (CONTENT_W - gap) / 2
    y1 = block(c, y, "Technische Basis", None, [
        "Windows-Installation mit geführtem Setup-Assistenten",
        "eigene Datenbank je Installation",
        "pgvector-basierte Wissenssuche",
        "lokale Embedding-Modelle",
    ], x=M, w=cw)
    y2 = block(c, y, "Kontrolle & Betrieb", None, [
        "rollenbasierte Zugriffsrechte",
        "modulbezogene Freischaltung über Lizenzen",
        "Protokollierung sicherheitsrelevanter Aktionen",
        "Sicherung und Wiederherstellung der Installation",
    ], x=M + cw + gap, w=cw)
    y = min(y1, y2)

    note(
        c, y,
        "Hinweis: OPSQAI verfügt derzeit über keine Zertifizierungen und stellt keine "
        "Zertifizierungsaussagen dar. Datenschutz- und Sicherheitsanforderungen werden je "
        "Projekt gemeinsam definiert und dokumentiert.",
    )
    footer(c, 4)


def p5_customer_center(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "Betriebsmodell 2")
    y = heading(c, y, "OPSQAI Customer Center", "Web-basierte Verwaltungsumgebung.")

    y = para(
        c, M, y,
        "Zu OPSQAI gehört ein web-basiertes Customer Center. Autorisierte Nutzerinnen und Nutzer "
        "verwalten darüber die OPSQAI-Umgebung über eine Browser-Oberfläche – ohne lokale "
        "Installation. Das Customer Center bildet die zentrale Verwaltungsebene der Plattform.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 10

    y = block(
        c, y,
        "Abhängig von Berechtigungen und Systemkonfiguration verfügbar",
        None,
        [
            "Benutzer- und Rollenverwaltung",
            "Verwaltung der Knowledge Base",
            "Dokumentenverwaltung",
            "FAQ-Verwaltung",
            "Verwaltung von Konversationen",
            "Strukturierung und Organisation von Wissen",
            "Überblick über die verfügbaren Informationen",
            "Identifikation potenzieller Wissenslücken",
        ],
    )

    gap = 6 * mm
    cw = (CONTENT_W - gap) / 2
    y1 = block(c, y, "Self-Hosted", None, [
        "Betrieb in der eigenen Infrastruktur",
        "lokale KI-Modelle über Ollama möglich",
        "Verarbeitung interner Dokumente vor Ort",
        "offlinefähiger Betrieb je Konfiguration möglich",
    ], x=M, w=cw)
    y2 = block(c, y, "Customer Center (Web)", None, [
        "Zugriff über den Browser, keine lokale Installation",
        "zentrale Verwaltung von Nutzern und Wissen",
        "Überblick über Dokumente, FAQs und Konversationen",
        "Verwaltungsebene für die OPSQAI-Plattform",
    ], x=M + cw + gap, w=cw)
    y = min(y1, y2)

    para(
        c, M, y,
        "Beide Betriebsmodelle folgen demselben Produktverständnis: freigegebenes Wissen, "
        "nachvollziehbare Antworten und klare Verantwortlichkeiten.",
        CONTENT_W, size=9.0, leading=13.0,
    )
    footer(c, 5)


def p6_module(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "Erweiterbarkeit")
    y = heading(
        c, y, "OPSQAI ist modular und kann", "mit Ihrem Unternehmen wachsen.", size=18,
    )

    y = para(
        c, M, y,
        "OPSQAI ist zunächst stark auf operative und logistiknahe Umgebungen ausgerichtet. Die "
        "Plattform ist jedoch modular aufgebaut und auf Erweiterung ausgelegt. Zusätzliche Module "
        "können auf Basis der konkreten Anforderungen eines Unternehmens entwickelt und in die "
        "OPSQAI-Umgebung integriert werden.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 12

    areas = [
        "Human Resources", "Finance", "Operations", "Quality Management",
        "Interne Prozesse", "Customer Service", "Compliance-bezogenes internes Wissen",
        "Technische Dokumentation", "Training & Onboarding",
    ]
    gap = 4 * mm
    cw = (CONTENT_W - 2 * gap) / 3
    for i, a in enumerate(areas):
        col, row = i % 3, i // 3
        x = M + col * (cw + gap)
        top = y - row * (16 * mm)
        card(c, x, top, cw, 13 * mm)
        c.setFillColor(GOLD)
        c.setFont(BOLD, 6.4)
        c.drawString(x + 9, top - 13, f"0{i + 1}")
        c.setFillColor(CREAM)
        c.setFont(BOLD, 8.6)
        for j, line in enumerate(wrap(c, a, BOLD, 8.6, cw - 18)):
            c.drawString(x + 9, top - 25 - j * 11, line)
    y = y - 3 * 16 * mm - 2 * mm

    y = note(
        c, y,
        "Wichtig: Die oben genannten Bereiche sind mögliche Erweiterungsfelder und keine bereits "
        "fertigen Module. Welche Module tatsächlich entstehen, wird gemeinsam mit dem Unternehmen "
        "auf Basis des konkreten Bedarfs festgelegt und vom OPSQAI-Team entwickelt.",
    )

    para(
        c, M, y,
        "Eine Erweiterung folgt immer demselben Weg: Anforderung verstehen, Umfang gemeinsam "
        "definieren, Modul entwickeln, in die bestehende OPSQAI-Umgebung integrieren.",
        CONTENT_W, size=9.0, leading=13.0,
    )
    footer(c, 6)


def p7_partner(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "Partnerprogramm")
    y = heading(c, y, "Wir suchen Test- und", "Entwicklungspartner.")

    y = para(
        c, M, y,
        "OPSQAI tritt in eine wichtige MVP- und Praxistestphase ein. Dafür suchen wir ausgewählte "
        "Unternehmen, die OPSQAI in einem realen Unternehmensumfeld testen möchten. Ziel der "
        "Zusammenarbeit ist ein gegenseitiger Nutzen: praxisnahe Weiterentwicklung auf der einen, "
        "früher Zugang und Mitgestaltung auf der anderen Seite.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 10

    y = block(c, y, "Ziel des Programms", None, [
        "OPSQAI in realen operativen Umgebungen testen",
        "praxisnahes Feedback erfassen",
        "tatsächliche Anforderungen der Kunden verstehen",
        "Verbesserungen und mögliche Module identifizieren",
        "OPSQAI gemeinsam mit ausgewählten Partnern weiterentwickeln",
    ])

    y = two_col(
        c, y,
        ("Nutzen für Ihr Unternehmen", [
            "früher Zugang zu OPSQAI",
            "Einfluss auf die weitere Entwicklung",
            "Test in einer realen operativen Umgebung",
            "Bewertung des praktischen Nutzens vor einer vollständigen Einführung",
            "direkte Kommunikation mit dem OPSQAI-Team",
            "mögliche Entwicklung unternehmensspezifischer Funktionen",
        ]),
        ("Nutzen für OPSQAI", [
            "Feedback aus der Praxis",
            "Verständnis operativer Anforderungen",
            "Verbesserung des Produkts",
            "Validierung realer Anwendungsfälle",
        ]),
    )
    footer(c, 7)


def p8_erwartungen(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "Zusammenarbeit")
    y = heading(c, y, "Was wir von unseren", "Testpartnern benötigen.")

    y = para(
        c, M, y,
        "Ein aussagekräftiger Test setzt eine begrenzte, aber verlässliche Mitwirkung des "
        "Unternehmens voraus. Der Aufwand bleibt bewusst klein und auf den vereinbarten "
        "Anwendungsfall beschränkt.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 12

    y = check_list(c, y, [
        "Zugang zu einer ausgewählten, begrenzten Menge relevanter Unternehmensinformationen "
        "oder Dokumente.",
        "Rückmeldungen ausgewählter Nutzerinnen und Nutzer.",
        "Informationen zum operativen Anwendungsfall.",
        "Kommunikation mit den relevanten Ansprechpartnern.",
        "Feedback zu Bedienbarkeit und praktischem Nutzen.",
        "Hinweise auf Verbesserungsmöglichkeiten.",
    ])
    y -= 3 * mm

    y = note(
        c, y,
        "Es werden ausschließlich jene Informationen verwendet, die ausdrücklich für die "
        "vereinbarte Testumgebung bereitgestellt werden. Ein unbeschränkter Zugriff auf "
        "Unternehmenssysteme oder vertrauliche Informationen ist weder erforderlich noch "
        "vorgesehen.",
    )

    y = block(c, y, "Rahmen der Zusammenarbeit", None, [
        "Der konkrete Umfang und die verwendeten Informationen werden vor Beginn eines "
        "Testprojekts gemeinsam definiert.",
        "Ansprechpartner, Zeitraum und Erfolgskriterien werden schriftlich festgehalten.",
        "Vertraulichkeit wird vor Projektstart vereinbart.",
    ])
    footer(c, 8)


def p9_referenz(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "Referenzen")
    y = heading(c, y, "Gemeinsam Erfahrungen aufbauen.", None)

    y = para(
        c, M, y,
        "OPSQAI baut ein Netzwerk aus frühen Partnern und praxisnahen Referenzen auf. Nach einem "
        "erfolgreichen Projekt oder einer erfolgreichen Testphase möchten wir zufriedene Partner "
        "gerne fragen, ob wir den Unternehmensnamen als Referenz für künftige Kunden nutzen dürfen.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 10

    y = block(c, y, "Mögliche Referenzformate", None, [
        "Kundenreferenz",
        "kurze Fallstudie (Case Study)",
        "gemeinsame Erfolgsgeschichte",
        "Testimonial",
        "Nennung als OPSQAI-Partner",
    ])

    y = note(
        c, y,
        "Die Verwendung des Unternehmensnamens, Logos oder einer gemeinsamen Projektreferenz "
        "erfolgt ausschließlich nach vorheriger ausdrücklicher Zustimmung des jeweiligen "
        "Unternehmens.",
    )

    y = block(c, y, "Freiwillig und jederzeit widerrufbar", None, [
        "Eine Referenz ist keine Voraussetzung für die Teilnahme am Testprogramm.",
        "Inhalt und Formulierung werden vor einer Veröffentlichung gemeinsam abgestimmt.",
        "Eine erteilte Zustimmung kann für künftige Verwendungen widerrufen werden.",
    ])
    footer(c, 9)


def p10_weiter(c) -> None:
    page_bg(c, alt=True)
    y = eyebrow(c, M, H - M - 14, "Nach dem Test")
    y = heading(c, y, "Vom Test zur vollständigen", "OPSQAI-Lösung.")

    steps = [
        ("SCHRITT 1", "MVP / Test", [
            "ausgewählter Anwendungsfall",
            "begrenzter operativer Umfang",
            "Test und strukturiertes Feedback",
        ]),
        ("SCHRITT 2", "Evaluierung", [
            "Ergebnisse gemeinsam auswerten",
            "Nutzen und Verbesserungspotenzial identifizieren",
            "Anforderungen für eine breitere Einführung definieren",
        ]),
        ("SCHRITT 3", "Vollständige Einführung", [
            "vollständige Self-Hosted-Installation",
            "größere Knowledge Base",
            "mehrere Abteilungen und weitere Nutzer",
            "individuelle Module und unternehmensspezifische Integrationen",
            "Ausweitung auf weitere Geschäftsbereiche",
        ]),
    ]
    for tag, title, items in steps:
        h = 12 + 12.6 * len(items) + 26
        card(c, M, y, CONTENT_W, h)
        c.setFillColor(GOLD)
        c.setFont(BOLD, 6.8)
        c.drawString(M + 12, y - 14, " ".join(tag))
        c.setFillColor(CREAM)
        c.setFont(BOLD, 12)
        c.drawString(M + 12, y - 29, title)
        bullets(c, M + 12, y - 44, items, CONTENT_W - 24, size=8.8, leading=12.6)
        y -= h + 4 * mm
        if tag != "SCHRITT 3":
            c.setStrokeColor(GOLD_LINE)
            c.setLineWidth(0.6)
            c.line(M + 22, y + 4 * mm, M + 22, y + 1 * mm)

    note(
        c, y,
        "Der Umfang einer vollständigen Einführung wird individuell auf Basis der Anforderungen "
        "des Unternehmens definiert.",
    )
    footer(c, 10)


def p11_heute(c) -> None:
    page_bg(c)
    y = eyebrow(c, M, H - M - 14, "Funktionsumfang")
    y = heading(c, y, "Bereits heute verfügbar.", None)

    y = para(
        c, M, y,
        "Die folgenden Funktionen sind Bestandteil der aktuellen OPSQAI-Plattform und im Rahmen "
        "eines Testprojekts nutzbar.",
        CONTENT_W, size=10.0, leading=15.0,
    )
    y -= 10

    groups = [
        ("Wissen", [
            "Knowledge Base",
            "Dokumenten-Upload und -Verarbeitung",
            "Organisation und Strukturierung von Wissen",
            "FAQ-Verwaltung",
        ]),
        ("KI-Nutzung", [
            "KI-gestützte Beantwortung von Fragen",
            "Antworten auf Basis des Unternehmenswissens",
            "Quellenangaben zu den Antworten",
            "mehrsprachige Interaktion",
        ]),
        ("Verwaltung", [
            "rollenbasierte Zugriffsrechte",
            "Verwaltung von Konversationen",
            "web-basiertes Customer Center",
            "Hinweise auf mögliche Wissenslücken",
        ]),
        ("Betrieb & Technik", [
            "Self-Hosted-Installation",
            "lokaler KI-Betrieb über Ollama",
            "lokale Embedding-Modelle",
            "pgvector-basierte Wissenssuche",
        ]),
    ]
    gap = 6 * mm
    cw = (CONTENT_W - gap) / 2
    rows = []
    for i, (title, items) in enumerate(groups):
        col, row = i % 2, i // 2
        x = M + col * (cw + gap)
        top = y - row * (48 * mm)
        rows.append(block(c, top, title, None, items, x=x, w=cw))
    y = min(rows)

    note(
        c, y,
        "Diese Übersicht enthält ausschließlich bereits vorhandene und funktionsfähige "
        "Funktionen. Geplante Erweiterungen sind hier nicht aufgeführt.",
    )
    footer(c, 11)


def p12_cta(c) -> None:
    page_bg(c, alt=True)
    mark(c, W / 2, H - 62 * mm, 16 * mm)

    c.setFillColor(GOLD)
    c.setFont(BOLD, 7.4)
    c.drawCentredString(W / 2, H - 86 * mm, " ".join("NÄCHSTER SCHRITT"))

    c.setFillColor(CREAM)
    c.setFont(BOLD, 21)
    c.drawCentredString(W / 2, H - 99 * mm, "Interesse an einer")
    c.setFillColor(GOLD_SOFT)
    c.setFont(SERIF, 21)
    c.drawCentredString(W / 2, H - 110 * mm, "gemeinsamen Testphase?")

    y = H - 126 * mm
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 9.6)
    for text in (
        "Wir suchen derzeit ausgewählte Unternehmen, die OPSQAI in einem realen "
        "Unternehmensumfeld testen und die weitere Entwicklung der Plattform aktiv "
        "mitgestalten möchten.",
        "Wenn Sie prüfen möchten, ob OPSQAI für Ihr Unternehmen oder einen bestimmten "
        "Geschäftsbereich relevant sein könnte, freuen wir uns über ein unverbindliches Gespräch.",
    ):
        for line in wrap(c, text, BODY, 9.6, 130 * mm):
            c.drawCentredString(W / 2, y, line)
            y -= 14
        y -= 8

    box_w, box_h = 110 * mm, 20 * mm
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.9)
    c.rect(W / 2 - box_w / 2, y - box_h, box_w, box_h, stroke=1, fill=0)
    c.setFillColor(GOLD)
    c.setFont(BOLD, 12.4)
    c.drawCentredString(W / 2, y - 12 * mm, "20–30 Minuten Kennenlernen & Produktdemo")
    y -= box_h + 14 * mm

    c.setFillColor(CREAM)
    c.setFont(BOLD, 9.6)
    c.drawCentredString(W / 2, y, "OPSQAI")
    y -= 14
    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 9.2)
    for line in ("info@opsqai.de", "opsqai.de", "Antwort in der Regel innerhalb eines Werktages"):
        c.drawCentredString(W / 2, y, line)
        y -= 13.6

    c.setFillColor(CREAM_DIM)
    c.setFont(BODY, 7.4)
    c.drawCentredString(
        W / 2, 26 * mm,
        "OPSQAI · KI für operatives Unternehmenswissen · Self-Hosted. Web-Based. Erweiterbar.",
    )
    footer(c, 12)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = pdfcanvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("OPSQAI – KI für operatives Unternehmenswissen")
    c.setAuthor("OPSQAI")
    c.setSubject("Test- & Entwicklungspartnerprogramm")
    for fn in (p1_cover, p2_was_ist, p3_problem, p4_selfhosted, p5_customer_center,
               p6_module, p7_partner, p8_erwartungen, p9_referenz, p10_weiter,
               p11_heute, p12_cta):
        fn(c)
        c.showPage()
    c.save()
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
