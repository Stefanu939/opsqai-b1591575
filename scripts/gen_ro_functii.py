#!/usr/bin/env python3
"""OPSQAI — Funcțiile aplicației, explicate (RO).

Lista este generată din arhitectura reală a produsului (/tmp/arch.json, produs
de scripts/dump_architecture.ts). Ce nu există în cod nu apare în document.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ro_pdf_kit import (  # noqa: E402
    CONTACT,
    PageBreak,
    Spacer,
    build,
    bullets,
    callout,
    h1,
    h2,
    h3,
    lead,
    note,
    p,
    small,
    table,
)

OUT = Path("/mnt/documents/OPSQAI_Functii_Explicate_RO.pdf")
ARCH = json.loads(Path("/tmp/arch.json").read_text())
VER = "Versiunea 1.0 · septembrie 2026"

# ── Traduceri pentru funcțiile Core ───────────────────────────────────────
CORE_RO: dict[str, tuple[str, str, str, str]] = {
    # key: (nume RO, ce face, la ce ajută, cine vede)
    "chat": ("Chat AI cu surse",
             "Răspunde la întrebări folosind exclusiv documentele și procedurile încărcate de firmă și arată sursa fiecărui răspuns.",
             "Oprește întrebările repetate către aceiași doi-trei oameni și dă răspunsul corect la primul contact.",
             "Toți utilizatorii; conținutul e filtrat de drepturile fiecăruia."),
    "kb": ("Bază de cunoștințe",
           "Încarcă documente și imagini, extrage textul, îl împarte în fragmente și îl indexează semantic în baza de date a firmei.",
           "Informația nu mai stă în foldere și e-mailuri; devine căutabilă în limbaj natural.",
           "Încărcare: roluri cu drept pe cunoaștere. Citire: toți, pe drepturi."),
    "faq": ("FAQ",
            "Întrebări frecvente cu răspunsuri curate, scrise și aprobate de firmă.",
            "Răspuns identic pentru toți la întrebările care revin zilnic.",
            "Citire: toți. Editare: responsabilul de cunoaștere."),
    "academy": ("Academy",
                "Cursuri, lecții, teste cu două variante (Adevărat/Fals sau Da/Nu) și certificate, construite pe procedurile reale.",
                "Instruirea devine dovadă: știi exact cine a parcurs ce și când.",
                "Cursanți: toți. Creare și publicare: instructor/administrator."),
    "audit_log": ("Audit AI",
                  "Jurnal al fiecărei interacțiuni AI, cu întrebarea, răspunsul și sursele folosite, înlănțuit prin hash.",
                  "Poți dovedi la audit pe ce s-a bazat fiecare răspuns.",
                  "Administrator și conducere."),
    "knowledge_gaps": ("Lipsuri de cunoaștere",
                       "Când sistemul nu are bază suficientă pentru un răspuns, întrebarea se înregistrează ca lipsă, primește proprietar și poate fi promovată în procedură.",
                       "Documentația se completează din întrebările reale ale oamenilor, nu din presupuneri.",
                       "Vizibil pentru responsabili și administratori."),
    "sop_versioning": ("Versionarea procedurilor",
                       "Istoric complet al fiecărei proceduri, cu versiuni și confirmări de citire de la angajați.",
                       "Știi ce versiune era în vigoare la o anumită dată și cine a confirmat-o.",
                       "Editare: responsabil de proces. Confirmare: angajații vizați."),
    "internal_requests": ("Cereri interne",
                          "Flux de tip „întreabă managerul”: cererea ajunge la responsabil, cu stare și răspuns.",
                          "Întrebările nu se mai pierd pe telefon sau în chat privat.",
                          "Toți trimit; responsabilii răspund."),
    "internal_chat": ("Chat intern",
                      "Conversații între angajați, cu atașamente și emoji.",
                      "Comunicarea operațională rămâne în platformă, lângă documente și sarcini.",
                      "Toți utilizatorii."),
    "reports": ("Rapoarte",
                "Rapoarte operaționale și exporturi, inclusiv panouri de indicatori pentru conducere.",
                "Conducerea vede starea reală fără să ceară rapoarte manuale.",
                "Roluri cu drept de raportare."),
    "support_center": ("Centru de suport",
                       "Cereri de suport create în aplicație și direcționate către responsabil.",
                       "Problemele tehnice au un traseu clar, nu un telefon.",
                       "Toți trimit; administratorul gestionează."),
    "workspace_health": ("Starea spațiului de lucru",
                         "Verificări continue ale calității conținutului: documente lipsă, proceduri neactualizate, lipsuri deschise.",
                         "Vezi din timp unde se degradează documentația.",
                         "Administrator și responsabili."),
    "rbac": ("Roluri și drepturi (RBAC)",
             "Roluri și drepturi fine pe zone de lucru, verificate pe server la fiecare operațiune.",
             "Fiecare vede și face doar ce îi este permis; ultimul SuperAdmin este protejat.",
             "Configurare: SuperAdmin/administrator."),
    "compliance_center": ("Centru de conformitate",
                          "Fluxuri de conformitate orientate pe GDPR și pe cerințe de tip ISO: sarcini, dovezi, responsabili.",
                          "Pregătirea pentru audit devine activitate continuă, nu weekend de panică.",
                          "Responsabil de conformitate și administrator."),
    "enterprise_export": ("Export",
                          "Export în masă al cunoașterii și al datelor de audit, inclusiv personalizarea documentelor cu identitatea firmei.",
                          "Datele tale pot ieși oricând din platformă, în format utilizabil.",
                          "Administrator."),
    "multi_language": ("Multilingvism",
                       "Interfață și conținut în engleză, germană și română.",
                       "Echipe mixte lucrează fiecare în limba lui, pe același conținut.",
                       "Toți utilizatorii."),
    "notifications": ("Notificări și Centru de activitate",
                      "Notificări în aplicație și pe e-mail, plus un centru care adună activitatea recentă.",
                      "Termenele și sarcinile nu se mai uită.",
                      "Toți utilizatorii."),
    "pwa": ("Aplicație instalabilă (PWA)",
            "Platforma se instalează pe telefon sau desktop și funcționează ca o aplicație.",
            "Acces rapid din teren, fără browser deschis manual.",
            "Toți utilizatorii."),
}

# ── Traduceri pentru spațiile de lucru ale produselor ─────────────────────
WS_RO: dict[str, tuple[str, str]] = {
    # logistics
    "logistics_overview": ("Privire de ansamblu logistică", "Activitate, elemente deschise și semnale operaționale din depozit și logistică."),
    "logistics_operations": ("Operațiuni", "Cunoașterea execuției zilnice și procesele operaționale de logistică."),
    "logistics_sop_library": ("Bibliotecă de proceduri", "Procedurile de logistică, versiunile lor și confirmările de citire."),
    "logistics_requests": ("Cereri operaționale", "Cererile ridicate de echipele de logistică, cu responsabil și stare."),
    "logistics_incidents": ("Incidente", "Excepții operaționale și cunoașterea acumulată din incidente."),
    "logistics_gaps": ("Lipsuri de cunoaștere", "Întrebări fără răspuns și informație lipsă în acest domeniu."),
    "logistics_intelligence": ("Asistent de domeniu", "Răspunsuri AI pe contextul logistic, bazate strict pe informația firmei."),
    # transport
    "transport_overview": ("Privire de ansamblu transport", "Activitate, elemente deschise și semnale operaționale pe flotă."),
    "transport_operations": ("Operațiuni de transport", "Dispecerat, procese de livrare și execuția zilnică."),
    "transport_coupling": ("Cuplaje", "Seturi camion + remorcă + șofer, construite prin tragere și disponibile la export."),
    "transport_procedures": ("Proceduri", "Procedurile de domeniu și documentele standard de operare."),
    "transport_incidents": ("Incidente", "Excepții operaționale și cunoașterea acumulată din incidente."),
    "transport_carriers": ("Cunoaștere transportatori", "Cerințele transportatorilor, contactele și modul de lucru cu fiecare."),
    "transport_requests": ("Cereri", "Cereri operaționale direcționate către responsabili."),
    "transport_intelligence": ("Asistent de domeniu", "Răspunsuri AI pe contextul de transport, bazate strict pe informația firmei."),
    "transport_map": ("Hartă", "Vehicule, șoferi, transportatori și incidente deschise pe o singură hartă."),
    "transport_cmr": ("CMR", "Scrisori de transport adaptate pe țară, editabile, cu export PDF și CSV."),
    "transport_settings": ("Setări transport", "Pachetul de țară și limbă, intervalele de alertă, harta și drepturile pe utilizator."),
    # hr
    "hr_overview": ("Privire de ansamblu HR", "Activitate, elemente deschise și semnale din resurse umane."),
    "hr_employees": ("Angajați", "Datele de bază ale angajaților, starea în ciclul de viață și dosarul complet."),
    "hr_tasks": ("Sarcini HR", "Integrare, plecare, expirări, aprobări și memento-uri, într-o singură listă."),
    "hr_documents": ("Contracte și documente", "Șabloane de contract, documente generate, încărcări, validitate și aprobare."),
    "hr_lifecycle": ("Integrare și plecare", "Liste de verificare reutilizabile, care se transformă în sarcini cu termene pentru fiecare angajat."),
    "hr_equipment": ("Echipament", "Echipamentul firmei, atribuirea către angajați și istoricul returnărilor."),
    "hr_incidents": ("Incidente și avertismente", "Incidente documentate, avertismente și măsurile luate."),
    "hr_screening": ("Evaluare candidați", "Profiluri de post, criterii salvate, analiza CV-urilor cu dovezi și comparație."),
    "hr_analytics": ("Analitice și alerte HR", "Efectiv, vechime, fluctuație, incidente și alertele derivate din ele."),
    "hr_settings": ("Setări HR", "Jurisdicția, numerotarea angajaților și datele de referință."),
    "hr_policies": ("Politici și proceduri", "Politicile interne și procedurile de resurse umane."),
    "hr_requests": ("Cereri ale angajaților", "Întrebările angajaților și cererile interne de HR."),
    "hr_knowledge": ("Cunoaștere HR", "Baza de cunoștințe, în context de resurse umane."),
    "hr_training": ("Instruire", "Trasee de instruire și cunoaștere pentru integrare."),
    "hr_compliance": ("Conformitate", "Urmărirea și documentarea conformității în resurse umane."),
    "hr_intelligence": ("Asistent de domeniu", "Răspunsuri AI pe contextul HR, bazate strict pe informația firmei."),
    # operations
    "operations_overview": ("Privire de ansamblu operațiuni", "Activitate, elemente deschise și semnale operaționale."),
    "operations_procedures": ("Proceduri", "Procedurile de domeniu și documentele standard de operare."),
    "operations_team_knowledge": ("Cunoaștere de echipă", "Cunoaștere între echipe, ghiduri și documentație internă."),
    "operations_requests": ("Cereri", "Cereri operaționale direcționate către responsabili."),
    "operations_reports": ("Rapoarte", "Raportare operațională pe domeniu."),
    "operations_gaps": ("Lipsuri de cunoaștere", "Întrebări fără răspuns și informație lipsă în acest domeniu."),
    "operations_intelligence": ("Asistent de domeniu", "Răspunsuri AI pe contextul operațional, bazate strict pe informația firmei."),
    # finance (planificat)
    "finance_overview": ("Privire de ansamblu financiar", "Activitate, elemente deschise și semnale financiare."),
    "finance_procedures": ("Proceduri", "Procedurile de domeniu și documentele standard de operare."),
    "finance_knowledge": ("Cunoaștere financiară", "Documente financiare, politici și interpretarea documentelor."),
    "finance_requests": ("Cereri", "Cereri operaționale direcționate către responsabili."),
    "finance_compliance": ("Conformitate", "Controale financiare și urmărirea conformității."),
    "finance_reports": ("Rapoarte", "Raportare operațională pe domeniu."),
    "finance_intelligence": ("Asistent de domeniu", "Răspunsuri AI pe context financiar, bazate strict pe informația firmei."),
    # inventory (planificat)
    "inventory_overview": ("Privire de ansamblu stocuri", "Activitate, elemente deschise și semnale pe stocuri."),
    "inventory_stock_operations": ("Operațiuni de stoc", "Proceduri de inventariere, tratarea diferențelor și manipularea stocului."),
    "inventory_procedures": ("Proceduri", "Procedurile de domeniu și documentele standard de operare."),
    "inventory_requests": ("Cereri de stoc", "Cereri privind stocul, venite de la echipele operaționale."),
    "inventory_incidents": ("Incidente", "Excepții operaționale și cunoașterea acumulată din incidente."),
    "inventory_knowledge": ("Cunoaștere depozit", "Cunoașterea de depozit și stocuri, în context."),
    "inventory_intelligence": ("Asistent de domeniu", "Răspunsuri AI pe contextul de stocuri, bazate strict pe informația firmei."),
}

PRODUCT_RO = {
    "opsqai_logistics": ("OPSQAI Logistics", "Logistică și depozit"),
    "opsqai_transport": ("OPSQAI Transport", "Transport și flotă"),
    "opsqai_hr": ("OPSQAI HR", "Resurse umane"),
    "opsqai_operations": ("OPSQAI Operations", "Operațiuni, indiferent de sector"),
    "opsqai_finance": ("OPSQAI Finance", "Financiar"),
    "opsqai_inventory": ("OPSQAI Inventory", "Stocuri"),
}

PRODUCT_INTRO = {
    "opsqai_logistics": "Pentru depozit și logistică: execuția zilnică, procedurile, incidentele și cererile echipelor.",
    "opsqai_transport": "Pentru firme de transport: dispecerat, cuplaje camion-remorcă-șofer, CMR, hartă, registre și alerte de expirare. Disponibil numai în instalarea de la client.",
    "opsqai_hr": "Pentru resurse umane: dosarul angajatului, contracte și documente generate, verificare și aprobare, integrare/plecare, echipament, incidente, evaluare candidați și analitice.",
    "opsqai_operations": "Pentru echipe care nu se încadrează într-un singur domeniu: proceduri, cunoaștere de echipă, cereri și raportare. Disponibil numai în instalarea de la client.",
    "opsqai_finance": "Planificat: proceduri financiare, aprobări, interpretarea documentelor și conformitate.",
    "opsqai_inventory": "Planificat: stocuri, inventariere, diferențe și cunoașterea de depozit.",
}

DETALII_SPECIALE = [
    ("Documentele HR, de la generare la aprobare",
     [
         "Alegi șablonul, completezi câmpurile marcate [___] și generezi documentul.",
         "Documentul intră în verificare. Ai două căi: verificare internă (rol cu drept de verificare juridică) sau verificare externă (nume jurist, cabinet, dată, referință și avizul atașat).",
         "Poți trimite un link temporar de verificare (implicit 14 zile, revocabil, valabil o singură dată), cu verdict „verific și accept” sau „cer modificări”.",
         "După verificare, butonul „Aprobă și blochează” devine activ; documentul se blochează la conținutul aprobat.",
         "Descarci PDF-ul, îl semnezi și încarci copia semnată în dosarul angajatului.",
     ]),
    ("Cum se comportă asistentul AI",
     [
         "Caută în documentele firmei, nu pe internet.",
         "Arată sursele; dacă potrivirea e slabă, refuză să răspundă.",
         "Întrebarea fără răspuns devine lipsă de cunoaștere, cu proprietar.",
         "În Academy, instructorul AI rămâne în materialul departamentului respectiv.",
     ]),
    ("Alerte și expirări",
     [
         "Documentele cu dată de validitate (contracte, autorizații, ITP, permise, licențe) generează alerte înainte de expirare.",
         "Intervalele de avertizare se configurează pe domeniu.",
         "Alertele apar în notificări, în lista de sarcini și în rapoarte.",
     ]),
    ("Actualizări și continuitate",
     [
         "Verificare automată pe canalul ales, descărcare cu bară de progres reală și verificare SHA-256.",
         "Poți instala și un pachet descărcat manual de pe site: se verifică față de aceeași semnătură.",
         "Pachetul poate fi distribuit în rețeaua locală către celelalte instalări ale firmei.",
         "La final apare confirmarea versiunii instalate, cu opțiunea de a reporni computerul sau de a închide fereastra.",
     ]),
]


def core_section():
    rows = []
    for c in ARCH["core"]:
        if c["key"] not in CORE_RO:
            continue
        nume, face, ajuta, cine = CORE_RO[c["key"]]
        rows.append([f"<b>{nume}</b>", face, ajuta, cine])
    out = [
        h1("Partea I · Platforma Core"),
        lead("Core este platforma însăși: este inclusă întotdeauna, nu se cumpără bucată cu "
             "bucată. Accesul la fiecare funcție rămâne controlat prin roluri și drepturi."),
    ]
    for nume_row in rows:
        out.append(table(["Funcție", "Ce face", "La ce ajută", "Cine o vede"], [nume_row],
                         widths=[18, 32, 30, 20], keep=True))
        out.append(Spacer(1, 3))
    out.append(small("Sursă: arhitectura de produs a aplicației, versiunea " + ARCH["version"] + "."))
    return out


def product_section(prod):
    key = prod["key"]
    nume, domeniu = PRODUCT_RO[key]
    ws = [w for w in ARCH["workspaces"] if w["product"] == key and w["status"] == "implemented"]
    stare = "disponibil astăzi" if prod["status"] == "available" else "planificat (nu se vinde ca disponibil)"
    rows = []
    for w in ws:
        ro = WS_RO.get(w["key"])
        if not ro:
            continue
        rows.append([f"<b>{ro[0]}</b>", ro[1], w["route"].replace("/app/products/", "")])
    return [
        h2(f"{nume} — {domeniu}"),
        p(f"<b>Stare:</b> {stare}. <b>Spații de lucru:</b> {len(ws)}."),
        p(PRODUCT_INTRO[key]),
        table(["Spațiu de lucru", "Ce conține", "Unde se găsește"], rows,
              widths=[24, 58, 18], keep=len(rows) <= 8),
        Spacer(1, 4),
    ]


def main() -> None:
    story = [
        note("Documentul descrie numai funcții care există efectiv în aplicație. Lista este "
             "generată din arhitectura de produs a codului, nu scrisă de mână, exact ca să nu "
             "promită nimic în plus."),
        h1("Cum este construită aplicația"),
        lead("OPSQAI are două niveluri: platforma Core, inclusă întotdeauna, și produsele pe "
             "domenii, activate prin licența semnată a firmei."),
        table(
            ["Nivel", "Ce este", "Cum se obține"],
            [
                ["Core", "Platforma: chat cu surse, cunoaștere, Academy, audit, roluri, rapoarte și restul.", "Inclus în implementare, pentru orice instalare."],
                ["Produs", "Un domeniu de lucru (transport, HR, logistică, operațiuni…) cu spații proprii.", "Activat de OPSQAI în licență, fără reinstalare."],
                ["Spațiu de lucru", "O zonă concretă din produs, cu ecran propriu în aplicație.", "Apare în meniu când produsul e activ și rolul permite."],
            ],
            widths=[16, 54, 30],
        ),
        p("Regulă de onestitate respectată în aplicație: un spațiu de lucru apare în meniu doar "
          "dacă are un ecran real. Ce este doar planificat nu se afișează niciodată ca "
          "funcțional."),
        PageBreak(),
        *core_section(),
        PageBreak(),
        h1("Partea II · Produse pe domeniu"),
        lead("Fiecare produs adaugă spații de lucru peste Core. Mai jos, fiecare spațiu cu ce "
             "conține și unde se găsește în meniu."),
    ]
    available = [x for x in ARCH["products"] if x["status"] == "available"]
    planned = [x for x in ARCH["products"] if x["status"] == "planned"]
    for prod in available:
        story.extend(product_section(prod))
    story.append(PageBreak())
    story.append(h1("Partea III · Produse planificate"))
    story.append(p("Arhitectura există în aplicație, dar aceste produse nu se vând astăzi ca "
                   "disponibile. Le listăm pentru transparență, ca să știi ce urmează."))
    for prod in planned:
        story.extend(product_section(prod))
    story.append(PageBreak())
    story.append(h1("Partea IV · Detalii care se întreabă cel mai des"))
    for titlu, puncte in DETALII_SPECIALE:
        story.append(h3(titlu))
        story.extend(bullets(puncte))
    story.append(Spacer(1, 6))
    story.append(h2("Ce nu face OPSQAI"))
    story.extend(bullets([
        "Nu răspunde din internet și nu inventează: dacă informația nu există la tine, spune că nu știe.",
        "Nu aprobă singur documente și nu ia decizii în locul oamenilor.",
        "Nu înlocuiește un ERP sau un program de contabilitate; lucrează peste procesele tale.",
        "Nu trimite datele tale în afara serverului firmei, dacă furnizorul AI este configurat local.",
    ]))
    story.append(Spacer(1, 8))
    story.append(callout("Întrebări despre o funcție anume",
                         f"Scrie la {CONTACT} și primești răspunsul cu ecranul și rolul care o folosește."))

    build(
        OUT,
        eyebrow="Funcțiile aplicației, explicate",
        title="Ce face fiecare<br/>funcție din<br/>OPSQAI.",
        subtitle="Platforma Core, produsele pe domeniu și fiecare spațiu de lucru: ce conține, la ce ajută, cine îl vede.",
        cover_footnote=VER + " · Generat din arhitectura reală a aplicației, versiunea " + ARCH["version"],
        footer="OPSQAI · Funcțiile aplicației (RO)",
        story=story,
    )
    print("ok", OUT)


if __name__ == "__main__":
    main()
