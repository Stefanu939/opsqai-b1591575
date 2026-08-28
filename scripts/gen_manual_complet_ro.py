#!/usr/bin/env python3
"""OPSQAI - Manualul complet (RO), pentru angajati noi. Limbaj simplu, acoperire completa."""
from __future__ import annotations

import subprocess
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path("public/OPSQAI_Manual_Complet_RO.pdf")


def _fc(query: str) -> str | None:
    try:
        return subprocess.check_output(["fc-match", "-f", "%{file}", query], text=True).strip()
    except Exception:
        return None


for name, query in [
    ("Body", "DejaVu Sans"),
    ("Body-Bold", "DejaVu Sans:bold"),
    ("Body-Italic", "DejaVu Sans:italic"),
    ("Body-BoldItalic", "DejaVu Sans:bold:italic"),
    ("Mono", "DejaVu Sans Mono"),
]:
    path = _fc(query)
    if path:
        pdfmetrics.registerFont(TTFont(name, path))
registerFontFamily(
    "Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-BoldItalic"
)

NOIR = colors.HexColor("#0B0F0D")
GREEN = colors.HexColor("#0E3B2E")
INK = colors.HexColor("#16211C")
MUTED = colors.HexColor("#6B7280")
LINE = colors.HexColor("#E3E7E4")
GOLD = colors.HexColor("#C9A24C")
CREAM = colors.HexColor("#FBF7EE")
SOFT = colors.HexColor("#EEF4F1")

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

H1 = ParagraphStyle("H1", fontName="Body-Bold", fontSize=24, leading=29, textColor=GREEN, spaceAfter=6)
H2 = ParagraphStyle("H2", fontName="Body-Bold", fontSize=15, leading=20, textColor=NOIR, spaceBefore=12, spaceAfter=5)
H3 = ParagraphStyle("H3", fontName="Body-Bold", fontSize=11.5, leading=16, textColor=GREEN, spaceBefore=8, spaceAfter=3)
BODY = ParagraphStyle("Body", fontName="Body", fontSize=10.3, leading=15.4, textColor=INK, spaceAfter=5)
LEAD = ParagraphStyle("Lead", fontName="Body", fontSize=12, leading=18, textColor=INK, spaceAfter=8)
BULLET = ParagraphStyle("Bullet", parent=BODY, leftIndent=11, bulletIndent=2, spaceAfter=3)
QUOTE = ParagraphStyle(
    "Quote", fontName="Body-Italic", fontSize=10.6, leading=16, textColor=NOIR,
    leftIndent=10, rightIndent=10, spaceBefore=5, spaceAfter=9, backColor=CREAM, borderPadding=10,
)
CODE = ParagraphStyle("Code", fontName="Mono", fontSize=8.6, leading=12.4, textColor=NOIR,
                      backColor=SOFT, borderPadding=8, spaceBefore=10, spaceAfter=14)
TIP_TEXT = ParagraphStyle("TipText", fontName="Body-Italic", fontSize=10.6, leading=16, textColor=NOIR)
SMALL = ParagraphStyle("Small", fontName="Body", fontSize=8.6, leading=12, textColor=MUTED)
TBL_H = ParagraphStyle("TblH", fontName="Body-Bold", fontSize=9, leading=12, textColor=colors.white)
TBL_C = ParagraphStyle("TblC", fontName="Body", fontSize=9, leading=12.5, textColor=INK)


def h1(text):
    return Paragraph(text, H1)


def h2(text):
    return Paragraph(text, H2)


def h3(text):
    return Paragraph(text, H3)


def p(text, style=BODY):
    return Paragraph(text, style)


def bullets(items):
    return [Paragraph(f"\u2022&nbsp;&nbsp;{i}", BULLET) for i in items]


def numbered(items):
    return [Paragraph(f"<b>{n}.</b>&nbsp;&nbsp;{i}", BULLET) for n, i in enumerate(items, 1)]


def table(headers, rows, widths=None):
    avail = PAGE_W - 2 * MARGIN
    if widths is None:
        widths = [avail / len(headers)] * len(headers)
    else:
        total = sum(widths)
        widths = [w / total * avail for w in widths]
    data = [[Paragraph(h, TBL_H) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), TBL_C) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GREEN),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT]),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def tip(text):
    p = Paragraph(f"<b>Sfat:</b> {text}", TIP_TEXT)
    t = Table([[p]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return KeepTogether([Spacer(1, 4), t, Spacer(1, 8)])


# ---------------------------------------------------------------- content


def content():
    S: list = []

    # ---- Cover handled by page template; start body
    S.append(NextPageTemplate("body"))
    S.append(PageBreak())

    # ---- Cuprins
    S.append(h1("Cuprins"))
    toc = [
        "1. Bine ai venit \u2014 cum sa folosesti acest manual",
        "2. Ce este OPSQAI, pe scurt",
        "3. Problema pe care o rezolva",
        "4. Vocabular: toti termenii explicati simplu",
        "5. Cele trei suprafete ale produsului",
        "6. Ce vede un angajat: modulele, unul cate unul",
        "7. AI Chat \u2014 ghid complet de utilizare",
        "8. Knowledge Base \u2014 cum ajung documentele in AI",
        "9. FAQ, SOP-uri si Cereri interne",
        "10. Academy \u2014 invatare, quiz-uri, certificate",
        "11. Calendar si integrari (Outlook, Gmail, Teams)",
        "12. Chat intre colegi",
        "13. Dashboard \u2014 ce inseamna fiecare cifra",
        "14. AI Audit si Knowledge Gaps",
        "15. Roluri si drepturi de acces",
        "16. Licentiere: cum se deblocheaza modulele",
        "17. Cum functioneaza AI-ul pe dedesubt (RAG)",
        "18. Securitate si confidentialitate",
        "19. Instalare pe Windows si prima pornire",
        "20. Administrare zilnica: update, backup, recuperare",
        "21. Cand ceva nu merge \u2014 depanare",
        "22. Reguli de aur pentru angajati",
        "23. Intrebari frecvente",
        "24. Cuvinte finale si contact",
    ]
    for row in toc:
        S.append(Paragraph(row, BODY))
    S.append(PageBreak())

    # ---- 1
    S.append(h1("1. Bine ai venit"))
    S.append(
        p(
            "Acest manual este scris pentru <b>oricine incepe sa lucreze cu OPSQAI</b>: operator in depozit, "
            "coleg din productie, om de la calitate, HR, trainer sau administrator IT. Nu presupune cunostinte "
            "tehnice. Unde apare un cuvant tehnic, este explicat imediat, cu un exemplu din viata reala.",
            LEAD,
        )
    )
    S.append(h2("Cum citesti manualul"))
    S += bullets(
        [
            "Daca ai 10 minute: citeste capitolele 2, 7 si 22. Atat iti trebuie ca sa incepi sa lucrezi.",
            "Daca esti manager sau trainer: adauga capitolele 6, 10, 13 si 15.",
            "Daca esti IT / administrator: capitolele 16 pana la 21 sunt pentru tine.",
            "Capitolul 4 este un dictionar. Poti sari la el oricand nu intelegi un cuvant.",
        ]
    )
    S.append(tip("Nu trebuie sa retii nimic pe de rost. OPSQAI e facut ca sa intrebi cu cuvintele tale.")) 

    S.append(h2("Ce vei sti la final"))
    S += bullets(
        [
            "Ce face OPSQAI si ce <i>nu</i> face.",
            "Cum pui o intrebare buna si cum verifici raspunsul.",
            "Ce inseamna fiecare modul si buton pe care il vezi in aplicatie.",
            "Cum sunt protejate datele companiei si de ce nu pleaca nicaieri.",
            "Pe cine intrebi cand ceva nu merge.",
        ]
    )
    S.append(PageBreak())

    # ---- 2
    S.append(h1("2. Ce este OPSQAI, pe scurt"))
    S.append(
        p(
            "OPSQAI este un <b>asistent AI privat al companiei</b>. Se instaleaza pe calculatoarele firmei si "
            "raspunde la intrebari <b>doar</b> pe baza documentelor firmei: proceduri, manuale, instructiuni de "
            "siguranta, materiale de training, reguli interne, FAQ-uri.",
            LEAD,
        )
    )
    S.append(
        p(
            "Imagineaza-ti un coleg care a citit absolut tot ce s-a scris vreodata in firma, isi aminteste "
            "perfect si iti spune mereu din ce document a luat raspunsul. Acela este OPSQAI."
        )
    )
    S.append(h2("Trei lucruri care il fac diferit"))
    S.append(
        table(
            ["Principiu", "Ce inseamna concret"],
            [
                ("Nu inventeaza", "Raspunde din documentele tale. Daca informatia nu exista, spune <b>\u201enu stiu\u201d</b>, nu improvizeaza."),
                ("Datele raman la tine", "Aplicatia ruleaza pe serverele companiei. Nici echipa OPSQAI nu are acces la continutul vostru."),
                ("Fiecare raspuns are sursa", "Sub raspuns apare documentul si sectiunea exacta. Poti verifica in doua secunde."),
            ],
            widths=[1, 2.6],
        )
    )
    S.append(h2("Ce NU este OPSQAI"))
    S += bullets(
        [
            "Nu e un chatbot de divertisment care discuta despre orice subiect.",
            "Nu e ChatGPT public. Nu trimite documentele voastre pe internet ca sa fie invatate de altii.",
            "Nu e o arhiva de fisiere \u2014 e un asistent care <i>intelege</i> continutul fisierelor.",
            "Nu inlocuieste oamenii. Le da raspunsuri mai repede si mai corect.",
            "Nu e un sistem de ticketing sau un DMS. Se integreaza cu ele, nu le inlocuieste.",
        ]
    )
    S.append(PageBreak())

    # ---- 3
    S.append(h1("3. Problema pe care o rezolva"))
    S += bullets(
        [
            "Cunostintele firmei sunt imprastiate: foldere, e-mailuri, wiki, foi printate, memoria colegilor vechi.",
            "Un angajat nou are nevoie de luni de zile ca sa devina productiv.",
            "La audit, intrebarea \u201ecum dovediti ca s-a respectat procedura curenta?\u201d ramane fara raspuns rapid.",
            "Un AI public nu poate fi folosit, pentru ca datele nu au voie sa iasa din firma.",
        ]
    )
    S.append(h2("Ce se schimba dupa OPSQAI"))
    S.append(
        table(
            ["Situatie", "Inainte", "Cu OPSQAI"],
            [
                ("Intrebare de procedura", "Cauti 20 de minute sau intrebi un coleg", "Raspuns in cateva secunde, cu sursa"),
                ("Angajat nou", "Luni de acomodare", "Invata singur, cu Academy si Chat"),
                ("Audit", "Vanatoare de documente", "Istoric si evidenta in Audit Log"),
                ("Procedura actualizata", "Nu stii ce versiune e valida", "Versiuni si confirmari de citire"),
            ],
            widths=[1, 1.2, 1.4],
        )
    )
    S.append(
        Paragraph(
            "\u201eE ca si cum retetele bunicii ar fi in 20 de caiete, 3 telefoane si memoria a patru matusi \u2014 "
            "si de fiecare data cand vrei sarmale trebuie sa suni pe toata lumea.\u201d",
            QUOTE,
        )
    )
    S.append(PageBreak())

    # ---- 4 Vocabular
    S.append(h1("4. Vocabular \u2014 toti termenii, pe intelesul tuturor"))
    S.append(p("Poti reveni oricand la aceasta pagina. Nimic din aplicatie nu ramane un cuvant misterios."))
    S.append(
        table(
            ["Termen", "Explicatie simpla"],
            [
                ("AI / Inteligenta artificiala", "Un program care intelege limbajul omenesc si formuleaza raspunsuri."),
                ("Model", "\u201eCreierul\u201d AI-ului. Poate fi al OpenAI, Azure sau unul care ruleaza local, in firma."),
                ("Prompt", "Intrebarea sau instructiunea pe care i-o dai tu."),
                ("Self-Hosted", "Instalat pe calculatoarele firmei, nu in cloud strain. Ca Microsoft Word, nu ca Gmail."),
                ("Cloud", "Servere din internet. La OPSQAI, cloud-ul e folosit doar pentru licente si actualizari."),
                ("Management Center", "Panoul echipei OPSQAI: licente, versiuni, suport. Clientul nu intra aici."),
                ("Customer Portal", "Zona ta din opsqai.de: descarci installer, actualizari si licente."),
                ("Modul", "O parte a aplicatiei: Chat, Knowledge Base, Academy, FAQ etc."),
                ("Licenta", "Un fisier semnat digital care deblocheaza un modul pana la o anumita data."),
                ("Instalare / install_id", "Codul unic al aplicatiei voastre. Pe el se leaga licentele."),
                ("Knowledge Base (KB)", "Biblioteca de documente pe care AI-ul le poate citi."),
                ("Chunk", "O bucata mica dintr-un document (cateva paragrafe). AI-ul cauta la nivel de bucata."),
                ("Embedding", "Traducerea unui text in numere, ca sa poata fi cautat dupa <i>sens</i>, nu doar dupa cuvinte."),
                ("RAG", "\u201eCauta, apoi raspunde\u201d. Intai gaseste bucatile potrivite, apoi formuleaza raspunsul din ele."),
                ("Citare / sursa", "Documentul din care a venit raspunsul, afisat sub el."),
                ("SOP", "Procedura standard de lucru (Standard Operating Procedure)."),
                ("Audit Log", "Jurnalul cu tot ce s-a intamplat: cine, ce, cand."),
                ("Knowledge Gap", "O intrebare la care AI-ul nu a gasit raspuns \u2014 semn ca lipseste un document."),
                ("Heartbeat", "Un semnal periodic prin care instalarea spune \u201esunt vie si sanatoasa\u201d."),
                ("Backup", "Copie de siguranta a datelor."),
                ("Restore / DR", "Refacerea aplicatiei dintr-un backup, dupa un incident."),
                ("Rol", "Ce ai voie sa faci: SuperAdmin, Admin, Manager, Angajat."),
                ("Ed25519 / JWT", "Semnatura digitala care dovedeste ca licenta e reala si nemodificata."),
            ],
            widths=[1, 3],
        )
    )
    S.append(PageBreak())

    # ---- 5
    S.append(h1("5. Cele trei suprafete ale produsului"))
    S.append(p("Acelasi produs are trei fete. E important sa nu le confunzi.", LEAD))
    S.append(
        table(
            ["Suprafata", "Cine intra", "La ce serveste"],
            [
                ("Self-Hosted (Windows)", "Angajatii companiei", "<b>Produsul propriu-zis</b>: Chat, Knowledge Base, FAQ, Academy, Calendar, Audit, Utilizatori."),
                ("Customer Portal (opsqai.de)", "Persoana de contact IT a clientului", "Descarcare installer, actualizari, pachete de activare, documentatie, suport."),
                ("Management Center (opsqai.de)", "Doar echipa OPSQAI", "Companii, instalari, licente, chei de semnare, versiuni, suport."),
            ],
            widths=[1.1, 1, 2.2],
        )
    )
    S.append(h2("Regula de aur"))
    S.append(
        p(
            "Datele operationale (documentele, intrebarile, utilizatorii vostri) exista <b>numai</b> in instalarea "
            "voastra. Cloud-ul OPSQAI stie doar lucruri administrative: ce licente aveti, ce versiune rulati, daca "
            "instalarea e pornita. Nu exista niciun canal prin care OPSQAI sa intre in aplicatia voastra."
        )
    )
    S.append(h2("Cum arata pe scurt"))
    S.append(
        Paragraph(
            "Compania ta:  Aplicatia Web  \u2192  Baza de date (PostgreSQL + pgvector)  \u2192  Stocare fisiere<br/>"
            "                      \u2193<br/>"
            "        Furnizor AI ales de tine (OpenAI / Azure / local)<br/><br/>"
            "Instalarea \u2192 (semnal semnat, doar in aceasta directie) \u2192 OPSQAI Cloud (licente)",
            CODE,
        )
    )
    S.append(PageBreak())

    # ---- 6 modules
    S.append(h1("6. Modulele, unul cate unul"))
    S.append(h2("Module de baza (Basic \u2014 incluse in orice instalare licentiata)"))
    S.append(
        table(
            ["Modul", "Ce face"],
            [
                ("Administrare platforma", "Utilizatori, roluri, integrari, setari, starea sistemului."),
                ("Audit Log", "Jurnalul tuturor evenimentelor importante pentru guvernanta."),
                ("Vizualizator documentatie", "Manualele produsului, direct in aplicatie."),
                ("Setup Wizard", "Configurarea initiala, pas cu pas, reluabila."),
                ("Doctor", "Autodiagnostic: baza de date, stocare, AI, e-mail, licenta."),
                ("Recovery", "Refacere in caz de dezastru (break-glass si token de bootstrap)."),
            ],
            widths=[1, 2.4],
        )
    )
    S.append(h2("Module cu licenta separata"))
    S.append(
        table(
            ["Modul", "Cheie", "Ce face"],
            [
                ("Knowledge Base", "knowledge", "Incarcare documente, impartire in bucati, cautare semantica."),
                ("Chat", "chat", "Conversatie cu AI-ul, ancorata in documentele voastre."),
                ("FAQ", "faq", "Intrebari frecvente curatate manual, cu revenire la cautare AI."),
                ("Academy", "academy", "Lectii, capitole, quiz-uri, certificate."),
                ("SOPs", "sops", "Proceduri cu versiuni si confirmare de citire."),
                ("Brand", "brand", "Biblioteca de materiale de brand si reguli de ton."),
                ("Internal Requests", "requests", "Cereri interne si triaj automat."),
                ("Workspace", "workspace", "Spatiu de lucru AI pe sesiune, cu fisiere si rezultate."),
            ],
            widths=[1.1, 0.8, 2.4],
        )
    )
    S.append(
        p(
            "Un modul se vede in meniu doar daca exista o licenta valabila pentru el. Daca licenta expira, "
            "modulul se blocheaza, dar <b>datele raman intacte</b> \u2014 se redeschid la reinnoire."
        )
    )
    S.append(PageBreak())

    # ---- 7 chat
    S.append(h1("7. AI Chat \u2014 ghid complet"))
    S.append(p("Este ecranul pe care il vei folosi cel mai des. Arata ca o aplicatie de mesagerie.", LEAD))
    S.append(h2("Cum pui o intrebare"))
    S += numbered(
        [
            "Deschide <b>AI Chat</b> din meniul din stanga.",
            "Scrie intrebarea cu cuvintele tale, ca unui coleg: <i>\u201eCe fac cu un palet avariat la receptie?\u201d</i>",
            "Apasa Enter. Raspunsul apare in cateva secunde.",
            "Citeste sursa de sub raspuns si deschide documentul daca vrei detalii.",
            "Poti continua conversatia: \u201esi daca lipsesc si cutii?\u201d \u2014 AI-ul tine minte contextul.",
        ]
    )
    S.append(h2("Ce poti trimite in chat"))
    S += bullets(
        [
            "<b>Text</b> \u2014 intrebarea normala.",
            "<b>Imagini</b> \u2014 poza cu o eticheta, un utilaj, un formular. AI-ul o poate analiza.",
            "<b>Voce</b> \u2014 apesi microfonul, vorbesti, mesajul se transcrie automat.",
            "<b>Fisiere</b> \u2014 un document despre care vrei sa pui intrebari (daca ai dreptul).",
        ]
    )
    S.append(h2("Limba"))
    S.append(
        p(
            "AI-ul iti raspunde <b>in limba in care scrii</b>, corect gramatical. Daca scrii in romana, primesti "
            "romana. Daca schimbi limba interfetei, se schimba si limba raspunsurilor si a quiz-urilor."
        )
    )
    S.append(h2("Intrebari bune vs. intrebari slabe"))
    S.append(
        table(
            ["Slab", "Bun", "De ce"],
            [
                ("\u201emarfa?\u201d", "\u201eCe pasi urmez la receptia unei marfe avariate?\u201d", "Contextul complet ajuta cautarea."),
                ("\u201eunde e formularul\u201d", "\u201eCe formular completez pentru o reclamatie de transport?\u201d", "Numesti scopul, nu doar obiectul."),
                ("\u201eajutor\u201d", "\u201eCine aproba concediul in departamentul logistica?\u201d", "Intrebare concreta = raspuns concret."),
            ],
            widths=[1, 1.6, 1.4],
        )
    )
    S.append(h2("Cand AI-ul spune \u201enu stiu\u201d"))
    S.append(
        p(
            "Nu e o eroare, e o functie de siguranta: informatia nu exista in documentele incarcate. Intrebarea "
            "este inregistrata automat ca <b>Knowledge Gap</b>, iar responsabilii pot adauga documentul lipsa. "
            "Intre timp, intreaba-ti seful direct."
        )
    )
    S.append(tip("Verifica intotdeauna sursa inainte de o actiune cu risc (siguranta, bani, calitate)."))
    S.append(PageBreak())

    # ---- 8 KB
    S.append(h1("8. Knowledge Base \u2014 de la fisier la raspuns"))
    S.append(h2("Ce documente se pot incarca"))
    S += bullets(
        [
            "PDF-uri: proceduri, manuale, fise tehnice, instructiuni de siguranta.",
            "Documente Word, prezentari, foi de calcul.",
            "Text simplu si pagini de wiki exportate.",
            "Imagini din documente \u2014 sunt extrase si pot fi citite.",
        ]
    )
    S.append(h2("Ce se intampla dupa incarcare"))
    S += numbered(
        [
            "Documentul este citit si curatat de formatari inutile.",
            "Este taiat in <b>bucati (chunks)</b> de cateva paragrafe, cu suprapunere, ca sa nu se piarda contextul.",
            "Fiecare bucata primeste un <b>embedding</b> \u2014 o reprezentare numerica a sensului.",
            "Bucatile intra in baza de date cu <b>pgvector</b>, motorul de cautare dupa sens.",
            "Din acel moment, documentul poate fi folosit in raspunsuri.",
        ]
    )
    S.append(h2("Ciclul de viata al unui document"))
    S.append(
        table(
            ["Stare", "Ce inseamna"],
            [
                ("Draft", "Incarcat, dar inca nefolosit in raspunsuri."),
                ("Publicat", "Activ; AI-ul il poate cita."),
                ("Necesita revizuire", "A trecut termenul de revizuire; trebuie verificat de un responsabil."),
                ("Arhivat", "Scos din raspunsuri, dar pastrat pentru istoric si audit."),
            ],
            widths=[1, 3],
        )
    )
    S.append(h2("Drepturi la nivel de bucata"))
    S.append(
        p(
            "Accesul se verifica pana la nivel de bucata de document. Daca un manual e doar pentru mentenanta, "
            "un coleg din alt departament nu va primi acel continut in raspuns \u2014 nici macar indirect."
        )
    )
    S.append(tip("Calitatea raspunsurilor depinde de calitatea documentelor. Documente clare = raspunsuri clare."))
    S.append(PageBreak())

    # ---- 9 FAQ SOP requests
    S.append(h1("9. FAQ, SOP-uri si Cereri interne"))
    S.append(h2("FAQ"))
    S.append(
        p(
            "Intrebari frecvente cu raspunsuri scrise si aprobate de oameni. Sunt afisate primele, pentru ca sunt "
            "verificate. Daca intrebarea ta nu se afla acolo, sistemul trece automat la cautarea in Knowledge Base."
        )
    )
    S.append(h2("SOP-uri (proceduri standard)"))
    S += bullets(
        [
            "Fiecare procedura are <b>versiune</b> (ex. v2.4). Vezi mereu care e cea valabila.",
            "Se poate cere <b>confirmare de citire</b>: apesi \u201eam citit si am inteles\u201d, iar sistemul retine.",
            "Istoricul arata ce versiune era valabila la o anumita data \u2014 exact ce cere un auditor.",
            "OPSQAI poate <b>genera automat</b> propuneri de SOP acolo unde detecteaza lipsuri de cunostinte.",
        ]
    )
    S.append(h2("Cereri interne"))
    S.append(
        p(
            "Ai nevoie de ceva de la alt departament (acces, echipament, o clarificare)? Deschizi o cerere, iar "
            "AI-ul o clasifica si o trimite catre echipa potrivita, sugerand raspunsuri deja existente."
        )
    )
    S.append(h2("Cum lucreaza impreuna"))
    S.append(
        Paragraph(
            "Intrebare \u2192 FAQ (raspuns verificat de om?) \u2192 daca nu \u2192 Knowledge Base + SOP-uri (raspuns cu sursa) "
            "\u2192 daca nu \u2192 Knowledge Gap inregistrat \u2192 propunere de SOP/FAQ nou.",
            CODE,
        )
    )
    S.append(PageBreak())

    # ---- 10 academy
    S.append(h1("10. Academy \u2014 invatare si certificate"))
    S.append(p("Modulul de instruire. Transforma materialele firmei in cursuri pe care le parcurgi singur.", LEAD))
    S.append(h2("Structura"))
    S += bullets(
        [
            "<b>Curs</b> \u2014 tema mare (ex. \u201eReceptia marfii\u201d).",
            "<b>Capitole si lectii</b> \u2014 pasi mici, de 5\u201310 minute.",
            "<b>Quiz</b> \u2014 intrebari de verificare la finalul lectiei.",
            "<b>Scor de trecere</b> \u2014 procentul minim stabilit de trainer.",
            "<b>Certificat</b> \u2014 emis automat la promovare, cu data si numele tau.",
        ]
    )
    S.append(h2("Cum dai un quiz"))
    S += numbered(
        [
            "Deschizi lectia si apesi <b>Start quiz</b>.",
            "Quiz-ul este generat in <b>limba ta</b>, pe baza continutului lectiei.",
            "Raspunzi la intrebari; poti reveni la lectie oricand.",
            "La final vezi scorul si explicatiile pentru raspunsurile gresite.",
            "Daca treci pragul, primesti certificatul in profil.",
        ]
    )
    S.append(h2("Trainer adaptiv"))
    S.append(
        p(
            "Sistemul observa unde gresesc mai multi colegi si propune lectii suplimentare exact pe acele "
            "subiecte. Managerii vad progresul echipei si cine mai are de recuperat."
        )
    )
    S.append(tip("Un quiz picat nu e o problema. Sistemul retine tema slaba si iti propune recapitulare."))
    S.append(PageBreak())

    # ---- 11 calendar & integrations
    S.append(h1("11. Calendar si integrari"))
    S.append(h2("Calendarul"))
    S += bullets(
        [
            "Evenimente interne: instruiri, termene de revizuire a procedurilor, mentenanta, audituri.",
            "Mini-calendar si lista <b>\u201eUrmeaza\u201d</b> pe dashboard.",
            "Poti <b>abona</b> calendarul in aplicatia ta obisnuita printr-un link de tip ICS.",
        ]
    )
    S.append(h2("Cum il adaugi in Outlook sau Google"))
    S += numbered(
        [
            "Deschide <b>Calendar</b> si apasa butonul de abonare.",
            "Copiaza link-ul ICS afisat (sau foloseste butonul direct pentru Google / Outlook).",
            "In Outlook: <i>Adauga calendar \u2192 Abonare din web \u2192 lipeste link-ul</i>.",
            "In Google Calendar: <i>Alte calendare \u2192 De la URL \u2192 lipeste link-ul</i>.",
            "Sincronizarea e in sens unic: evenimentele OPSQAI apar la tine, fara sa expui datele firmei.",
        ]
    )
    S.append(h2("Extensia Inbox Companion"))
    S.append(
        p(
            "O extensie de browser pentru Outlook Web si Gmail. Cand citesti un e-mail, poti intreba OPSQAI direct "
            "din bara laterala si poti insera raspunsul cu sursa in mesaj. Se descarca din dashboard, sectiunea "
            "Integrari."
        )
    )
    S.append(h2("Microsoft Teams"))
    S.append(p("Se poate configura notificarea echipei prin Teams pentru evenimente importante (ex. o procedura noua)."))
    S.append(PageBreak())

    # ---- 12 chat colegi
    S.append(h1("12. Chat intre colegi"))
    S.append(
        p(
            "Pe langa AI Chat, exista si un chat intre oameni, cu un aspect familiar, de tip aplicatie de "
            "mesagerie."
        )
    )
    S += bullets(
        [
            "Mesaje text, cu bule de conversatie si marcaje de citire.",
            "<b>Emoji</b> din selector.",
            "<b>Poze si fisiere</b> atasate direct in conversatie.",
            "Istoricul ramane in aplicatie, deci si in firma \u2014 nu pe telefoane personale.",
        ]
    )
    S.append(h2("De ce conteaza"))
    S.append(
        p(
            "Discutiile despre munca raman langa documentele despre care se discuta. Nimic nu se pierde intr-un "
            "grup de WhatsApp privat, iar informatia sensibila nu iese din companie."
        )
    )
    S.append(PageBreak())

    # ---- 13 dashboard
    S.append(h1("13. Dashboard \u2014 ce inseamna fiecare cifra"))
    S.append(p("Prima pagina dupa autentificare. Are rol de tablou de bord operational."))
    S.append(
        table(
            ["Card", "Ce iti spune"],
            [
                ("Capacitate utilizatori", "Cate locuri (seats) sunt folosite din cate sunt licentiate."),
                ("Get Started", "Pasi ramasi pentru o configurare completa (documente, utilizatori, module)."),
                ("Stare mentenanta", "Pana cand aveti dreptul la actualizari si suport."),
                ("KPI + Insight", "Intrebari puse, raspunsuri cu sursa, documente active, lectii finalizate."),
                ("Knowledge Gaps", "Cate intrebari au ramas fara raspuns \u2014 unde trebuie completata baza de cunostinte."),
                ("Calendar / Urmeaza", "Urmatoarele evenimente si termene."),
                ("Integrari", "Starea conexiunilor cu Outlook, Gmail, Teams."),
                ("Sanatatea sistemului", "Baza de date, stocare, furnizor AI, e-mail, licenta, heartbeat."),
            ],
            widths=[1, 2.6],
        )
    )
    S.append(tip("Daca un card apare gol, nu e defect: inseamna ca inca nu exista date. Cardul iti spune si ce pas sa faci."))
    S.append(PageBreak())

    # ---- 14 audit + gaps
    S.append(h1("14. AI Audit si Knowledge Gaps"))
    S.append(h2("AI Audit"))
    S.append(
        p(
            "Fiecare raspuns generat este inregistrat: modelul folosit, durata, numarul de cuvinte procesate, "
            "amprentele intrebarii si raspunsului si bucatile de document folosite. Astfel se poate reconstitui "
            "oricand <b>de ce</b> a raspuns AI-ul intr-un anumit fel."
        )
    )
    S.append(h2("Health Check si Executive Summary"))
    S += bullets(
        [
            "Rezultatele sunt grupate in <b>Passed</b>, <b>Warning</b> si <b>Critical</b>.",
            "Cand sunt multe (peste 5 avertismente sau 10 critice), rezumatul nu le afiseaza pe toate: intri pe card si vezi detaliile.",
            "Fiecare problema vine cu o recomandare concreta, de exemplu \u201ecreeaza un SOP pentru X\u201d.",
        ]
    )
    S.append(h2("Remediere automata"))
    S.append(
        p(
            "Exista un buton de <b>generare automata</b>: pe baza lipsurilor detectate, sistemul propune SOP-uri si "
            "intrari FAQ, gata de revizuit si publicat in Knowledge Base. Un om aproba intotdeauna inainte de publicare."
        )
    )
    S.append(h2("Audit Log"))
    S.append(
        p(
            "Jurnal separat, in lant de valori de verificare (hash chain), pentru toate actiunile importante: "
            "autentificari, incarcari de documente, schimbari de rol, activari de licenta, exporturi. Nu poate fi "
            "modificat discret."
        )
    )
    S.append(PageBreak())

    # ---- 15 roluri
    S.append(h1("15. Roluri si drepturi"))
    S.append(
        table(
            ["Rol", "Ce poate face"],
            [
                ("SuperAdmin", "Acces complet. Poate crea alti SuperAdmini, gestiona licente, module si toti utilizatorii. Ultimul SuperAdmin activ nu poate fi sters sau retrogradat."),
                ("Admin", "Administreaza utilizatori, documente, module si setari, in limitele stabilite."),
                ("Manager", "Vede echipa sa: progres Academy, cereri, rapoarte. Poate publica continut."),
                ("Angajat", "Foloseste Chat, FAQ, Knowledge Base, Academy si Calendar, in limita modulelor primite."),
            ],
            widths=[1, 3.2],
        )
    )
    S.append(h2("Acces pe module"))
    S.append(
        p(
            "Pe langa rol, fiecare utilizator primeste acces pe module. Se poate ca doi angajati cu acelasi rol sa "
            "vada meniuri diferite: unul are Academy, celalalt nu. Verificarea se face pe server, nu doar in "
            "interfata \u2014 deci nu poate fi ocolita."
        )
    )
    S.append(h2("Primul utilizator"))
    S.append(
        p(
            "La instalare se creeaza primul SuperAdmin. Acesta invita ceilalti colegi si le atribuie rol si module. "
            "Rolurile nu sunt stocate pe profil, ci intr-un tabel separat de drepturi \u2014 o masura de securitate "
            "impotriva escaladarii de privilegii."
        )
    )
    S.append(PageBreak())

    # ---- 16 licentiere
    S.append(h1("16. Licentiere \u2014 cum se deblocheaza modulele"))
    S.append(p("Nu exista pachete de tip \u201eStarter / Pro / Enterprise\u201d. Sunt doua axe simple.", LEAD))
    S.append(h2("Axa 1 \u2014 Licenta de instalare (obligatorie)"))
    S += bullets(
        [
            "Una singura per instalare (<i>install_id</i>).",
            "Contine numarul de locuri (seats) si fereastra de mentenanta.",
            "Fara ea, aplicatia porneste doar in mod de recuperare.",
        ]
    )
    S.append(h2("Axa 2 \u2014 Licenta de modul (optionala, cate una per modul)"))
    S += bullets(
        [
            "<b>expires_at</b> \u2014 pana cand modulul este disponibil.",
            "<b>maintenance_expires_at</b> \u2014 pana cand primiti actualizari si suport.",
        ]
    )
    S.append(h2("Formatul licentei"))
    S.append(
        p(
            "Fiecare licenta este un token semnat digital (JWT cu semnatura Ed25519, algoritm EdDSA). Nu se poate "
            "falsifica si nu se poate modifica fara sa fie detectat. Se poate activa si complet offline, printr-un "
            "<b>pachet de activare</b> descarcat din Customer Portal."
        )
    )
    S.append(h2("Cum activezi o licenta noua"))
    S += numbered(
        [
            "Deschizi <b>Module</b> \u2192 <b>Add New License</b>.",
            "Incarci fisierul primit sau lipesti tokenul.",
            "Aplicatia verifica local semnatura (nu are nevoie de internet).",
            "Vezi un <b>preview</b>: ce modul, pana cand, cate locuri.",
            "Apesi <b>Activate</b>. Modulul apare imediat in meniu.",
            "Activarea este inregistrata in istoric si in Audit Log.",
        ]
    )
    S.append(h2("Ce se intampla la expirare"))
    S.append(
        table(
            ["Situatie", "Efect"],
            [
                ("A expirat expires_at", "Modulul se blocheaza in interfata. Datele raman intacte."),
                ("A expirat mentenanta", "Modulul functioneaza, dar nu se mai pot instala actualizari noi."),
                ("Licenta revocata", "Modulul se blocheaza la urmatoarea sincronizare sau import."),
            ],
            widths=[1, 2],
        )
    )
    S.append(PageBreak())

    # ---- 17 RAG
    S.append(h1("17. Cum functioneaza AI-ul pe dedesubt"))
    S.append(p("Explicatia tehnica, tot in cuvinte simple. Numele mecanismului este <b>RAG</b>.", LEAD))
    S += numbered(
        [
            "Scrii intrebarea.",
            "Intrebarea este transformata in numere (embedding), ca sa poata fi comparata dupa <i>sens</i>.",
            "Motorul <b>pgvector</b> cauta in baza de date bucatile de document cele mai apropiate ca sens.",
            "Se verifica drepturile tale: primesti doar bucatile la care ai acces.",
            "Bucatile gasite, intrebarea ta si regulile sistemului merg la modelul AI.",
            "Modelul formuleaza raspunsul <b>doar din materialul primit</b>, in limba ta.",
            "Raspunsul, sursele si datele de audit sunt salvate.",
        ]
    )
    S.append(h2("Ce furnizor AI se poate folosi"))
    S.append(
        table(
            ["Optiune", "Observatii"],
            [
                ("OpenAI (cheia clientului)", "Simplu de pornit; contractul cu furnizorul guverneaza datele."),
                ("Azure OpenAI", "Resursa proprie a clientului, in regiunea aleasa de el."),
                ("Model local (Ollama, vLLM, LM Studio)", "Totul ramane in retea interna; nicio iesire spre internet."),
                ("Gateway OPSQAI", "Doar daca instalarea permite explicit trafic catre opsqai.de."),
            ],
            widths=[1.2, 2.2],
        )
    )
    S.append(h2("Nu se antreneaza pe datele voastre"))
    S.append(
        p(
            "OPSQAI nu trimite continutul vostru inapoi la opsqai.de si nu il foloseste pentru antrenarea vreunui "
            "model. Optiunea de excludere de la antrenare, la nivelul furnizorului AI, tine de contractul "
            "clientului cu acel furnizor."
        )
    )
    S.append(PageBreak())

    # ---- 18 securitate
    S.append(h1("18. Securitate si confidentialitate"))
    S.append(
        table(
            ["Zona", "Masura"],
            [
                ("Transport", "HTTPS peste tot; certificatul este al clientului."),
                ("Autentificare", "E-mail si parola, Google, optional SSO SAML/OIDC pentru companii mari."),
                ("Parole", "Stocate cu hashing modern (argon2id), niciodata in clar."),
                ("Autorizare", "Roluri in tabel separat, verificate pe server, plus drepturi la nivel de bucata de document."),
                ("Licente", "Semnaturi Ed25519, chei rotite, lista de revocare semnata."),
                ("Audit", "Jurnal in lant de hash-uri pentru actiuni de guvernanta."),
                ("Break-glass", "Secret de urgenta, pastrat doar ca hash (scrypt)."),
                ("Recuperare", "Doua cai independente criptografic pentru situatii de dezastru."),
                ("Izolare", "O instalare = un client. Nu exista date comune intre clienti."),
            ],
            widths=[1, 2.6],
        )
    )
    S.append(h2("Ce inseamna pentru tine, ca angajat"))
    S += bullets(
        [
            "Nu partaja contul tau. Fiecare actiune e legata de numele tau in jurnal.",
            "Nu copia continut confidential in aplicatii externe (ChatGPT public, traducatoare online).",
            "Daca vezi ceva ce nu ar trebui sa vezi, anunta administratorul \u2014 e o problema de drepturi.",
            "Nu incarca in Knowledge Base documente cu date personale care nu sunt necesare muncii.",
        ]
    )
    S.append(h2("GDPR"))
    S.append(
        p(
            "Datele raman la client, in jurisdictia aleasa de el. Clientul este operatorul de date; infrastructura "
            "sa nu este subcontractor al OPSQAI. Exista setari de conformitate pe tara si evidenta pentru cereri "
            "de tip acces/stergere."
        )
    )
    S.append(PageBreak())

    # ---- 19 instalare
    S.append(h1("19. Instalare pe Windows si prima pornire"))
    S.append(p("Sectiune pentru IT. Un angajat obisnuit nu face acesti pasi."))
    S.append(h2("De ce ai nevoie"))
    S += bullets(
        [
            "Un server sau statie Windows dedicata, cu spatiu pe disc si memorie suficiente.",
            "Drepturi de administrator pentru instalarea serviciilor.",
            "Licenta de instalare (token semnat) sau pachetul de activare.",
            "Optional: SMTP pentru e-mailuri, cheie pentru furnizorul AI, tinta de backup.",
        ]
    )
    S.append(h2("Pasii instalarii"))
    S += numbered(
        [
            "Descarci installer-ul din Customer Portal.",
            "Il rulezi; asistentul verifica sistemul si instaleaza baza de date, stocarea si serviciile.",
            "La final se deschide aplicatia locala (shell desktop), nu un site din internet.",
            "Prima pornire duce automat la <b>/first-run</b>.",
        ]
    )
    S.append(h2("Asistentul de prima pornire"))
    S += numbered(
        [
            "Acceptarea termenilor.",
            "Importul licentei de instalare.",
            "Configurarea stocarii (test de scriere/citire/stergere).",
            "Alegerea furnizorului AI si a cheii.",
            "Configurarea SMTP.",
            "SSO (optional, se poate face si mai tarziu).",
            "Configurarea backup-ului.",
            "Testarea conexiunilor \u2014 o eroare blocheaza avansarea.",
            "Crearea primului administrator (SuperAdmin).",
            "Finalizare si autentificare.",
        ]
    )
    S.append(
        p(
            "Asistentul este <b>reluabil</b>: daca inchizi browserul, reia de la primul pas neterminat. Dupa "
            "crearea primului administrator, pagina se inchide definitiv \u2014 o masura de securitate."
        )
    )
    S.append(PageBreak())

    # ---- 20 administrare
    S.append(h1("20. Administrare zilnica"))
    S.append(h2("Actualizari"))
    S += bullets(
        [
            "Pachetele de actualizare sunt semnate digital si verificate inainte de aplicare.",
            "Se aplica atomic: ori reuseste complet, ori se revine la versiunea anterioara.",
            "Sunt permise doar daca fereastra de mentenanta este valabila.",
        ]
    )
    S.append(h2("Backup"))
    S += bullets(
        [
            "Cuprinde baza de date, fisierele incarcate si configurarea (inclusiv fisierul de secrete).",
            "Tinta poate fi disc local, S3, Azure Blob sau NAS.",
            "Se verifica integritatea copiilor; exista evidenta a instantaneelor.",
        ]
    )
    S.append(h2("Restaurare si recuperare"))
    S += bullets(
        [
            "Restaurare normala dintr-un backup, cu verificare de integritate.",
            "Recuperare in caz de dezastru: acces de urgenta (break-glass) sau token de bootstrap emis de OPSQAI.",
            "Recuperarea este intotdeauna initiata de client. OPSQAI nu poate intra in instalare.",
        ]
    )
    S.append(h2("Doctor si heartbeat"))
    S.append(
        p(
            "Panoul <b>Doctor</b> (si comanda <i>opsqai doctor</i>) verifica: baza de date, cheile de semnare, "
            "furnizorul AI, stocarea, SMTP, valabilitatea licentei si prospetimea heartbeat-ului. Heartbeat-ul "
            "trimite periodic, semnat, doar starea instalarii \u2014 niciodata continut."
        )
    )
    S.append(h2("Cine raspunde de ce"))
    S.append(
        table(
            ["Zona", "OPSQAI", "Client"],
            [
                ("Emiterea licentelor", "Da", "\u2014"),
                ("Versiuni semnate si documentatie", "Da", "\u2014"),
                ("Tokenuri de recuperare", "Da", "\u2014"),
                ("Servere, retea, stocare", "\u2014", "Da"),
                ("Baza de date, SMTP, cheile AI", "\u2014", "Da"),
                ("Backup si exercitii de restaurare", "\u2014", "Da"),
                ("Conturi, roluri, continut", "\u2014", "Da"),
            ],
            widths=[2, 0.7, 0.7],
        )
    )
    S.append(PageBreak())

    # ---- 21 depanare
    S.append(h1("21. Cand ceva nu merge"))
    S.append(
        table(
            ["Simptom", "Cauza probabila", "Ce faci"],
            [
                ("Nu vad un modul in meniu", "Licenta lipsa/expirata sau acces nealocat", "Cere administratorului acces sau reinnoirea licentei."),
                ("AI-ul spune mereu \u201enu stiu\u201d", "Documentul nu e incarcat sau e in stare Draft", "Verifica in Knowledge Base; cere publicarea."),
                ("Raspuns in alta limba", "Limba interfetei diferita", "Schimba limba din profil si reformuleaza."),
                ("Quiz-ul nu porneste", "Lectia nu are continut suficient", "Anunta trainerul; reincarca pagina."),
                ("Nu pot descarca calendarul", "Link ICS blocat de politica IT", "Foloseste butonul direct Google/Outlook sau cere deblocarea link-ului."),
                ("Aplicatia nu porneste", "Un serviciu Windows oprit", "Ruleaza Doctor; reporneste serviciul OPSQAI Platform."),
                ("Nu ma pot autentifica", "Parola gresita sau cont dezactivat", "Foloseste resetarea; daca nu vine e-mailul, verifica SMTP."),
                ("Instalarea nu apare la furnizor", "Heartbeat blocat de firewall", "Permite iesirea HTTPS catre opsqai.de."),
            ],
            widths=[1.1, 1.2, 1.7],
        )
    )
    S.append(h2("Inainte sa ceri ajutor, aduna"))
    S += bullets(
        [
            "Ce faceai exact si ce te asteptai sa se intample.",
            "Ora aproximativa si numele tau de utilizator.",
            "O captura de ecran a mesajului de eroare.",
            "Rezultatul panoului Doctor, daca esti administrator.",
        ]
    )
    S.append(PageBreak())

    # ---- 22 reguli
    S.append(h1("22. Reguli de aur pentru angajati"))
    rules = [
        ("Intreaba natural.", "Scrie ca unui coleg, cu propozitii complete."),
        ("Verifica sursa.", "Mai ales inainte de o decizie care implica siguranta sau bani."),
        ("\u201eNu stiu\u201d e un raspuns bun.", "Inseamna ca informatia lipseste, nu ca AI-ul e stricat. Semnaleaza."),
        ("Nu scoate date din firma.", "Nu copia continut in aplicatii publice."),
        ("Contul e al tau.", "Nu-l imprumuta. Fiecare actiune ramane in jurnal."),
        ("Semnaleaza lipsurile.", "O intrebare fara raspuns azi devine o procedura scrisa maine."),
        ("Actualizeaza-ti cunostintele.", "Cand apare o versiune noua de procedura, confirma citirea."),
        ("Foloseste limba ta.", "Raspunsurile vin corect in limba in care scrii."),
    ]
    for title, text in rules:
        S.append(Paragraph(f"<b>{title}</b> {text}", BODY))
    S.append(Spacer(1, 8))
    S.append(h2("O zi cu OPSQAI"))
    S.append(
        p(
            "Andrei e in prima zi la depozit. Primeste un palet cu folia rupta si cutii indoite. Deschide OPSQAI de "
            "pe tableta si scrie: <i>\u201eCe fac cu un palet avariat la receptie?\u201d</i> In trei secunde primeste pasii, "
            "pe cine sa anunte si ce formular sa completeze. Sub raspuns scrie: <i>\u201eSursa: SOP-Receptie-Marfa v2.4, "
            "sectiunea 3.2\u201d</i>. Apasa, vede procedura oficiala, confirma citirea. Fara sa deranjeze pe nimeni, fara "
            "sa greseasca."
        )
    )
    S.append(PageBreak())

    # ---- 23 FAQ
    S.append(h1("23. Intrebari frecvente"))
    faq = [
        ("Unde sunt datele noastre?", "In baza de date si in stocarea companiei voastre. Nu pe opsqai.de."),
        ("Poate OPSQAI sa intre in instalarea noastra?", "Nu. Nu exista canal de intoarcere. Orice recuperare e initiata de client."),
        ("Ce se intampla daca cloud-ul OPSQAI e oprit?", "Instalarile continua sa functioneze; licentele se verifica local. Doar emiterea de licente noi are nevoie de cloud."),
        ("Ce se intampla la expirarea unei licente?", "Modulul se blocheaza, datele raman. Reinnoiesti, reimporti pachetul, gata."),
        ("Va antrenati pe datele noastre?", "Nu. Furnizorul AI este ales de client, iar excluderea de la antrenare tine de contractul lui."),
        ("Este multi-tenant?", "Nu. Fiecare instalare deserveste un singur client."),
        ("Exista varianta SaaS?", "Nu. In cloud ruleaza doar Management Center si Customer Portal, fara date operationale."),
        ("Functioneaza fara internet?", "Da, daca folositi un model AI local. Licentele se pot activa offline."),
        ("Cate limbi suporta?", "Raspunde in limba utilizatorului; interfata si materialele pot fi multilingve."),
        ("Cat dureaza pana devine util?", "Din momentul in care primele proceduri sunt incarcate si publicate \u2014 de regula in aceeasi zi."),
        ("Ne inlocuieste trainerii?", "Nu. Le multiplica munca: materialul lor devine curs si raspuns disponibil non-stop."),
        ("Cine vede ce am intrebat?", "Intrebarile sunt inregistrate pentru audit si imbunatatire; accesul la ele este restrictionat prin roluri."),
    ]
    for q, a in faq:
        S.append(Paragraph(f"<b>{q}</b>", H3))
        S.append(Paragraph(a, BODY))
    S.append(PageBreak())

    # ---- 24
    S.append(h1("24. Cuvinte finale"))
    S.append(
        p(
            "OPSQAI nu e un program pe care trebuie sa il inveti. E un coleg pe care il intrebi. Cu cat il "
            "folosesti mai des si cu cat semnalezi mai des ce lipseste, cu atat devine mai bun pentru toata echipa.",
            LEAD,
        )
    )
    S.append(
        Paragraph(
            "\u201eAm facut un program care ajuta firmele sa gaseasca rapid informatii in propriile documente. "
            "Angajatii intreaba in limbaj normal si primesc imediat raspuns, cu sursa afisata. Programul ruleaza la "
            "ei in firma, deci datele nu pleaca nicaieri. E ca un coleg foarte citit care nu oboseste niciodata.\u201d",
            QUOTE,
        )
    )
    S.append(h2("Pe cine intrebi"))
    S += bullets(
        [
            "Intrebari despre continut si proceduri \u2192 seful direct sau responsabilul de calitate.",
            "Cont, parola, drepturi, module \u2192 administratorul intern (SuperAdmin/Admin).",
            "Probleme tehnice de instalare, licente, actualizari \u2192 persoana de contact IT, prin Customer Portal.",
        ]
    )
    S.append(Spacer(1, 14))
    S.append(Paragraph("opsqai.de &nbsp;\u00b7&nbsp; info@opsqai.de", SMALL))
    S.append(Paragraph("OPSQAI \u2014 Enterprise Operational AI, self-hosted, cu suveranitatea datelor.", SMALL))
    S.append(Paragraph("Manual complet in limba romana \u00b7 versiunea 1.0", SMALL))
    return S


# ---------------------------------------------------------------- doc


def cover_page(canv, doc):
    canv.saveState()
    canv.setFillColor(NOIR)
    canv.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canv.setFillColor(GREEN)
    canv.rect(0, PAGE_H * 0.80, PAGE_W, PAGE_H * 0.20, stroke=0, fill=1)
    canv.setStrokeColor(GOLD)
    canv.setLineWidth(2)
    canv.line(25 * mm, PAGE_H - 48 * mm, 25 * mm + 40 * mm, PAGE_H - 48 * mm)
    canv.setFillColor(GOLD)
    canv.setFont("Body-Bold", 12)
    canv.drawString(25 * mm, PAGE_H - 40 * mm, "OPSQAI")
    canv.setFillColor(colors.white)
    canv.setFont("Body-Bold", 40)
    canv.drawString(25 * mm, PAGE_H - 90 * mm, "Manualul")
    canv.drawString(25 * mm, PAGE_H - 106 * mm, "complet")
    canv.setFillColor(GOLD)
    canv.setFont("Body", 15)
    canv.drawString(25 * mm, PAGE_H - 122 * mm, "Tot ce trebuie sa stii despre OPSQAI")
    canv.setFillColor(colors.whitesmoke)
    canv.setFont("Body-Italic", 12.5)
    sub = (
        "Ghid complet pentru angajati noi: ce este, ce face, cum se foloseste, "
        "cum e securizat si cum se administreaza. In limba romana, fara jargon."
    )
    words = sub.split()
    line = ""
    y = PAGE_H - 145 * mm
    for w in words:
        trial = (line + " " + w).strip()
        if canv.stringWidth(trial, "Body-Italic", 12.5) > PAGE_W - 50 * mm:
            canv.drawString(25 * mm, y, line)
            y -= 17
            line = w
        else:
            line = trial
    if line:
        canv.drawString(25 * mm, y, line)
    canv.setFillColor(GOLD)
    canv.circle(PAGE_W - 32 * mm, 42 * mm, 16 * mm, stroke=0, fill=1)
    canv.setFillColor(NOIR)
    canv.setFont("Body-Bold", 22)
    canv.drawCentredString(PAGE_W - 32 * mm, 37 * mm, "?")
    canv.setFillColor(GOLD)
    canv.setFont("Body", 10)
    canv.drawString(25 * mm, 22 * mm, "opsqai.de")
    canv.setFillColor(colors.HexColor("#8A8A94"))
    canv.drawRightString(PAGE_W - 55 * mm, 22 * mm, "Manual de utilizare \u00b7 RO \u00b7 v1.0")
    canv.restoreState()


def body_page(canv, doc):
    canv.saveState()
    canv.setFont("Body", 8)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN, 10 * mm, "OPSQAI \u2014 Manualul complet (RO)")
    canv.drawRightString(PAGE_W - MARGIN, 10 * mm, f"pagina {doc.page}")
    canv.setStrokeColor(LINE)
    canv.line(MARGIN, 13 * mm, PAGE_W - MARGIN, 13 * mm)
    canv.setStrokeColor(GOLD)
    canv.setLineWidth(1.4)
    canv.line(MARGIN, PAGE_H - 15 * mm, MARGIN + 22 * mm, PAGE_H - 15 * mm)
    canv.restoreState()


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title="OPSQAI \u2014 Manualul complet (RO)",
        author="OPSQAI",
        subject="Ghid complet pentru angajati noi",
    )
    doc.addPageTemplates(
        [
            PageTemplate(
                id="cover",
                frames=[Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)],
                onPage=cover_page,
            ),
            PageTemplate(
                id="body",
                frames=[Frame(MARGIN, 17 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 36 * mm, id="body")],
                onPage=body_page,
            ),
        ]
    )
    doc.build(content())
    print("Wrote:", OUT)


if __name__ == "__main__":
    build()
