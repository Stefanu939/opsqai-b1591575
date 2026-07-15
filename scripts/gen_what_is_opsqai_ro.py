#!/usr/bin/env python3
"""OPSQAI — Ce este OPSQAI? (RO, plain-language, non-technical)."""
from __future__ import annotations
import subprocess
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, NextPageTemplate,
    Table, TableStyle, KeepTogether, Flowable,
)

OUT = Path("/mnt/documents/OPSQAI-Ce-Este.pdf")

def _fc(n):
    try: return subprocess.check_output(["fc-match","-f","%{file}",n],text=True).strip()
    except: return None
for name, q in [("Body","DejaVu Sans"),("Body-Bold","DejaVu Sans:bold"),
                ("Body-Italic","DejaVu Sans:italic"),("Body-BoldItalic","DejaVu Sans:bold:italic")]:
    p = _fc(q)
    if p: pdfmetrics.registerFont(TTFont(name, p))
registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-BoldItalic")

NOIR   = colors.HexColor("#0B0B0F")
INK    = colors.HexColor("#111827")
MUTED  = colors.HexColor("#6B7280")
LINE   = colors.HexColor("#E5E7EB")
BG     = colors.HexColor("#F8FAFC")
GOLD   = colors.HexColor("#C9A24B")
ACCENT = colors.HexColor("#1E40AF")
CREAM  = colors.HexColor("#FBF7EE")
SOFT   = colors.HexColor("#EEF2FF")

H1  = ParagraphStyle("H1", fontName="Body-Bold", fontSize=30, leading=36, textColor=NOIR, spaceAfter=10)
H2  = ParagraphStyle("H2", fontName="Body-Bold", fontSize=19, leading=25, textColor=NOIR, spaceBefore=14, spaceAfter=8)
H3  = ParagraphStyle("H3", fontName="Body-Bold", fontSize=13, leading=18, textColor=ACCENT, spaceBefore=10, spaceAfter=4)
BODY= ParagraphStyle("Body", fontName="Body", fontSize=12.5, leading=19, textColor=INK, spaceAfter=8)
LEAD= ParagraphStyle("Lead", fontName="Body", fontSize=14, leading=22, textColor=INK, spaceAfter=10)
QUOTE=ParagraphStyle("Quote", fontName="Body-Italic", fontSize=13, leading=20, textColor=NOIR,
                     leftIndent=14, rightIndent=14, spaceBefore=6, spaceAfter=10, backColor=CREAM, borderPadding=12)
SMALL=ParagraphStyle("Small", fontName="Body", fontSize=9.5, leading=13, textColor=MUTED)
COVER_TITLE=ParagraphStyle("CT", fontName="Body-Bold", fontSize=44, leading=52, textColor=colors.white)
COVER_SUB  =ParagraphStyle("CS", fontName="Body", fontSize=16, leading=24, textColor=GOLD)
COVER_LEAD =ParagraphStyle("CL", fontName="Body-Italic", fontSize=15, leading=23, textColor=colors.whitesmoke)

PAGE_W, PAGE_H = A4
MARGIN = 20*mm

# ---------- Flowables ----------
class CoverBG(Flowable):
    def __init__(self,w,h): super().__init__(); self.w=w; self.h=h
    def wrap(self,*a): return (self.w,self.h)
    def draw(self):
        c=self.canv
        c.setFillColor(NOIR); c.rect(0,0,self.w,self.h,stroke=0,fill=1)
        c.setFillColor(colors.HexColor("#141420")); c.rect(0,self.h*0.55,self.w,self.h*0.45,stroke=0,fill=1)
        c.setStrokeColor(GOLD); c.setLineWidth(2)
        c.line(30, self.h-140, 30+120, self.h-140)
        # speech bubble motif
        c.setFillColor(GOLD); c.setStrokeColor(GOLD)
        c.circle(self.w-90, 120, 46, stroke=0, fill=1)
        c.setFillColor(NOIR)
        c.setFont("Body-Bold", 32); c.drawCentredString(self.w-90, 108, "?")

class Step(Flowable):
    def __init__(self,w,h,num,title,text):
        super().__init__(); self.w=w; self.h=h; self.num=num; self.title=title; self.text=text
    def wrap(self,*a): return (self.w,self.h)
    def draw(self):
        c=self.canv
        c.setFillColor(SOFT); c.roundRect(0,0,self.w,self.h,10,stroke=0,fill=1)
        c.setFillColor(ACCENT); c.circle(20,self.h-20,12,stroke=0,fill=1)
        c.setFillColor(colors.white); c.setFont("Body-Bold",11); c.drawCentredString(20,self.h-23,str(self.num))
        c.setFillColor(NOIR); c.setFont("Body-Bold",10.5)
        # title wraps too
        def wrap(text, font, size, maxw, x, y, line_h):
            words=text.split(); line=""
            for w in words:
                trial=(line+" "+w).strip()
                if c.stringWidth(trial,font,size) > maxw:
                    c.drawString(x,y,line); y-=line_h; line=w
                else: line=trial
            if line: c.drawString(x,y,line)
            return y
        y = wrap(self.title, "Body-Bold", 10.5, self.w-16, 8, self.h-44, 13)
        c.setFillColor(INK); c.setFont("Body",9)
        wrap(self.text, "Body", 9, self.w-16, 8, y-10, 11)

class HouseDiagram(Flowable):
    def __init__(self,w,h): super().__init__(); self.w=w; self.h=h
    def wrap(self,*a): return (self.w,self.h)
    def draw(self):
        c=self.canv
        # building
        c.setStrokeColor(NOIR); c.setLineWidth(1.5); c.setFillColor(CREAM)
        c.roundRect(20, 20, self.w-40, self.h-60, 8, stroke=1, fill=1)
        # roof
        c.setFillColor(NOIR)
        c.saveState()
        from reportlab.pdfgen.canvas import Canvas
        p=c.beginPath(); p.moveTo(10,self.h-60); p.lineTo(self.w/2, self.h-15); p.lineTo(self.w-10,self.h-60); p.close()
        c.drawPath(p, stroke=0, fill=1)
        c.restoreState()
        c.setFillColor(NOIR); c.setFont("Body-Bold",11)
        c.drawCentredString(self.w/2, self.h-40, "Compania ta")
        # laptop inside
        cx=self.w/2; cy=self.h/2-10
        c.setFillColor(ACCENT); c.roundRect(cx-60, cy-30, 120, 70, 6, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont("Body-Bold",13); c.drawCentredString(cx,cy+8,"OPSQAI")
        c.setFont("Body",9); c.drawCentredString(cx,cy-8,"instalat local")
        # arrow that does NOT leave
        c.setStrokeColor(colors.HexColor("#B91C1C")); c.setLineWidth(1.5); c.setDash(3,2)
        c.line(cx+70, cy, self.w-30, cy)
        c.line(self.w-30, cy, self.w-30, cy-20)
        c.setFillColor(colors.HexColor("#B91C1C")); c.setFont("Body-Bold",9)
        c.drawRightString(self.w-30, cy-32, "datele NU pleaca")
        c.setDash()

class Divider(Flowable):
    def __init__(self,w=None): super().__init__(); self.w=w
    def wrap(self,aw,ah): return (self.w or aw, 14)
    def draw(self):
        c=self.canv; w=self._width if hasattr(self,"_width") else 400
        c.setStrokeColor(GOLD); c.setLineWidth(1); c.line(0,7,60,7)

# ---------- Doc ----------
def header_footer(c, doc):
    c.saveState()
    if doc.page > 1:
        c.setFont("Body", 8); c.setFillColor(MUTED)
        c.drawString(MARGIN, 12*mm, "OPSQAI — Ce este OPSQAI?")
        c.drawRightString(PAGE_W-MARGIN, 12*mm, f"pagina {doc.page}")
        c.setStrokeColor(LINE); c.line(MARGIN, 14*mm, PAGE_W-MARGIN, 14*mm)
    c.restoreState()

def build():
    doc = BaseDocTemplate(str(OUT), pagesize=A4,
                          leftMargin=MARGIN, rightMargin=MARGIN,
                          topMargin=18*mm, bottomMargin=18*mm,
                          title="OPSQAI — Ce este OPSQAI?", author="OPSQAI")
    frame_cover = Frame(0,0,PAGE_W,PAGE_H, leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0, id="cover")
    frame_body  = Frame(MARGIN, 16*mm, PAGE_W-2*MARGIN, PAGE_H-34*mm, id="body")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame_cover]),
        PageTemplate(id="body", frames=[frame_body], onPage=header_footer),
    ])

    S = []
    # ===== COVER =====
    S.append(CoverBG(PAGE_W, PAGE_H))
    S.append(NextPageTemplate("body"))
    S.append(PageBreak())

    # ===== 1. Răspuns într-o propoziție =====
    S.append(Paragraph("Ce este OPSQAI?", H1))
    S.append(Divider())
    S.append(Paragraph(
        "OPSQAI este un <b>asistent AI privat</b> pe care o companie îl instalează pe propriile sale calculatoare, "
        "ca angajații să poată pune întrebări despre <b>documentele propriei companii</b> și să primească răspunsuri "
        "de încredere, cu sursa afișată.", LEAD))
    S.append(Spacer(1,6))
    S.append(Paragraph(
        "Pe scurt: e ca și cum ai avea un coleg care a citit <i>toate</i> manualele, procedurile și instrucțiunile "
        "firmei, își amintește totul și îți spune mereu de unde a luat răspunsul.", BODY))

    S.append(Paragraph("Problema de zi cu zi", H2))
    S.append(Paragraph(
        "Într-o companie mare există mii de documente: proceduri de lucru, manuale, instrucțiuni de siguranță, "
        "materiale de training, reguli interne. Sunt împrăștiate prin foldere, e-mailuri, imprimate pe pereți sau "
        "„în capul” colegilor cu experiență.", BODY))
    S.append(Paragraph(
        "Rezultatul: angajații pierd ore căutând răspunsuri, noii angajați au nevoie de luni de zile ca să devină "
        "productivi, iar când vine un audit nimeni nu știe exact ce versiune a procedurii era valabilă.", BODY))
    S.append(Paragraph(
        "„E ca și cum rețetele bunicii ar fi în 20 de caiete, 3 telefoane și memoria a patru mătuși — și de fiecare "
        "dată când vrei sarmale trebuie să suni pe toată lumea.”", QUOTE))

    S.append(PageBreak())

    # ===== 2. De ce nu ChatGPT =====
    S.append(Paragraph("Bine, dar de ce nu folosesc pur și simplu ChatGPT?", H2))
    S.append(Paragraph("Două motive simple:", BODY))
    S.append(Paragraph(
        "<b>1. Documentele companiei sunt confidențiale.</b> Nu le poți trimite unui AI public — sunt contracte, "
        "proceduri, know-how. E ca și cum ai pune actele firmei pe Facebook.", BODY))
    S.append(Paragraph(
        "<b>2. Un AI public nu cunoaște regulile firmei tale.</b> Îți dă un răspuns generic, uneori inventat. Nu știe "
        "cum se procedează <i>la voi</i> când vine o marfă avariată în depozit.", BODY))
    S.append(Paragraph(
        "OPSQAI rezolvă amândouă problemele: rulează <b>la tine, în firmă</b>, și răspunde <b>doar</b> pe baza "
        "documentelor tale. Dacă nu găsește răspunsul în documente, îți spune sincer că nu știe — nu inventează.", BODY))

    # ===== 3. Ce face =====
    S.append(Paragraph("Ce face OPSQAI, mai exact", H2))
    steps = [
        (1, "Citește documentele", "Îi dai manualele, procedurile, FAQ-urile. Le înțelege și le organizează."),
        (2, "Angajatul întreabă", "Un coleg scrie o întrebare în limbaj normal, ca pe WhatsApp."),
        (3, "OPSQAI răspunde", "Formulează răspunsul în cuvinte simple, în limba angajatului."),
        (4, "Arată sursa", "Sub răspuns apare exact documentul din care a venit informația."),
    ]
    row = []
    sw = (PAGE_W - 2*MARGIN - 3*6) / 4
    for n,t,txt in steps:
        row.append(Step(sw, 100, n, t, txt))
    t = Table([row], colWidths=[sw]*4)
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),3)]))
    S.append(t)
    S.append(Spacer(1,10))
    S.append(Paragraph("Cheia e la pasul 4: <b>fiecare răspuns are sursă</b>. Ca notele de subsol dintr-o carte serioasă.", BODY))

    S.append(PageBreak())

    # ===== 4. Unde locuiește =====
    S.append(Paragraph("Unde „locuiește” OPSQAI?", H2))
    S.append(Paragraph(
        "OPSQAI se instalează pe <b>calculatoarele companiei</b> (Windows), nu în cloud-ul unei firme străine. "
        "Datele nu pleacă din companie.", BODY))
    S.append(Spacer(1,6))
    S.append(HouseDiagram(PAGE_W-2*MARGIN, 220))
    S.append(Spacer(1,6))
    S.append(Paragraph(
        "„E ca și cum ai instala Microsoft Word — rulează la tine pe computer. Nu e ca Gmail, unde datele sunt pe "
        "serverele altcuiva.”", QUOTE))

    S.append(Paragraph("Cine îl folosește?", H2))
    users = [
        ("Depozite și logistică", "Cum manipulez o marfă avariată? Ce fac dacă lipsește un colet?"),
        ("Fabrici și producție", "Care e procedura pentru schimbarea de tură? Ce EPP e obligatoriu la această linie?"),
        ("Angajați noi", "Cum se completează formularul X? Cine aprobă concediul?"),
        ("Traineri și HR", "Materialul de curs devine căutabil. Angajații se pregătesc singuri."),
        ("Calitate și conformitate", "Ce versiune de procedură era validă acum 6 luni? Cine a citit-o?"),
    ]
    for who, ex in users:
        S.append(Paragraph(f"<b>{who}.</b> {ex}", BODY))

    S.append(PageBreak())

    # ===== 5. Ce îl face diferit =====
    S.append(Paragraph("Ce îl face diferit", H2))
    diffs = [
        ("Nu inventează.", "Răspunde doar din documentele tale. Dacă nu găsește, spune „nu știu”. Fără povești, fără halucinații."),
        ("Datele rămân la tine.", "Nimic nu iese din compania ta. Nici măcar noi, cei care am făcut OPSQAI, nu avem acces la datele voastre."),
        ("Vezi sursa fiecărui răspuns.", "Sub fiecare răspuns apare documentul exact. Poți verifica în 2 secunde."),
    ]
    for h,t in diffs:
        S.append(Paragraph(f"<b>{h}</b> {t}", BODY))

    S.append(Paragraph("O zi cu OPSQAI", H2))
    S.append(Paragraph(
        "Andrei e în prima lui zi la depozit. Primește un palet care are folia ruptă și cutii îndoite. Nu știe ce să "
        "facă. Deschide OPSQAI de pe tabletă și scrie: <i>„Ce fac cu un palet avariat la recepție?”</i>", BODY))
    S.append(Paragraph(
        "OPSQAI îi răspunde în 3 secunde: pașii de urmat, pe cine să anunțe, ce formular să completeze. Sub răspuns "
        "scrie: <i>„Sursa: SOP-Recepție-Marfă v2.4, secțiunea 3.2”</i>. Andrei apasă și vede procedura oficială. Fără "
        "să deranjeze pe nimeni. Fără să greșească.", BODY))

    S.append(Paragraph("Ce NU este OPSQAI", H2))
    S.append(Paragraph("• Nu e un chatbot de jucărie care conversează despre orice.", BODY))
    S.append(Paragraph("• Nu înlocuiește oamenii — le dă răspunsuri mai rapide.", BODY))
    S.append(Paragraph("• Nu e un AI public gen ChatGPT. Rulează local, cu datele firmei.", BODY))
    S.append(Paragraph("• Nu e o arhivă de documente — e un asistent care <i>înțelege</i> documentele.", BODY))

    S.append(PageBreak())

    # ===== 6. Pentru bunica =====
    S.append(Paragraph("Într-un paragraf, pentru bunica", H2))
    S.append(Paragraph(
        "„Am făcut un program care ajută firmele mari să găsească rapid informații în propriile lor documente. "
        "Angajații pun întrebări în limbaj normal — „cum fac asta?”, „ce zice regulamentul aici?” — și programul "
        "le răspunde imediat, arătând și de unde a luat răspunsul. Programul rulează la ei în firmă, deci datele nu "
        "pleacă nicăieri. E ca un coleg foarte citit care nu obosește niciodată.”", QUOTE))

    S.append(Paragraph("Într-o frază, pentru un prieten IT", H2))
    S.append(Paragraph(
        "OPSQAI e o platformă self-hosted de AI operațional pentru companii: RAG pe documentele clientului, rulează pe "
        "Windows la client, licențiere per-modul, răspunsuri cu citări, zero date trimise în afara instalării.", BODY))

    S.append(Paragraph("Într-o frază, pentru șeful tău", H2))
    S.append(Paragraph(
        "OPSQAI transformă manualele, procedurile și training-urile firmei într-un asistent AI pe care angajații îl "
        "întreabă direct, cu sursă vizibilă, fără ca datele să iasă din companie.", BODY))

    S.append(Spacer(1, 20))
    S.append(Paragraph("opsqai.de &nbsp;·&nbsp; hello@opsqai.de", SMALL))
    S.append(Paragraph("Enterprise Operational AI — self-hosted, cu suveranitatea datelor.", SMALL))

    # Build with a canvas hook to draw cover text on page 1
    def on_first(canv, doc):
        # Cover text overlay
        canv.saveState()
        canv.setFillColor(GOLD); canv.setFont("Body-Bold", 12)
        canv.drawString(30*mm, PAGE_H-40*mm, "OPSQAI")
        canv.setFillColor(colors.white); canv.setFont("Body-Bold", 44)
        canv.drawString(30*mm, PAGE_H-90*mm, "Ce este")
        canv.drawString(30*mm, PAGE_H-108*mm, "OPSQAI?")
        canv.setFillColor(GOLD); canv.setFont("Body", 14)
        canv.drawString(30*mm, PAGE_H-125*mm, "Explicat pe înțelesul tuturor")
        canv.setFillColor(colors.whitesmoke); canv.setFont("Body-Italic", 13)
        # wrap subtitle
        sub = ("Un asistent AI privat pe care o companie îl instalează pe propriile calculatoare, "
               "ca angajații să găsească răspunsuri în documentele firmei — cu sursa afișată.")
        # naive wrap
        words = sub.split(); line=""; y = PAGE_H-155*mm
        for w in words:
            trial = (line+" "+w).strip()
            if canv.stringWidth(trial,"Body-Italic",13) > PAGE_W-60*mm:
                canv.drawString(30*mm, y, line); y -= 20; line = w
            else: line = trial
        if line: canv.drawString(30*mm, y, line)
        canv.setFillColor(GOLD); canv.setFont("Body", 10)
        canv.drawString(30*mm, 25*mm, "opsqai.de")
        canv.setFillColor(colors.HexColor("#8A8A94"))
        canv.drawRightString(PAGE_W-30*mm, 25*mm, "Document informativ · non-tehnic · RO")
        canv.restoreState()

    # Register the first-page hook
    doc.pageTemplates[0].onPageEnd = on_first
    doc.build(S)
    print("Wrote:", OUT)

if __name__ == "__main__":
    build()
