#!/usr/bin/env python3
"""OPSQAI — Pilot SOW (RO) completat cu date FICTIVE, ca exemplu de completare.

Aceeași structură ca modelul `OPSQAI_Pilot_SOW_RO.pdf`, dar toate câmpurile
[___] sunt completate cu un caz inventat. Marcat clar drept exemplu.
"""
from __future__ import annotations

from pathlib import Path

from ro_pdf_kit import (  # type: ignore
    CONTACT,
    PageBreak,
    build,
    bullets,
    h1,
    h2,
    note,
    numbered,
    p,
    table,
)

OUT = Path("/mnt/documents")
VER = "Versiunea 1.0 · septembrie 2026"
EX = "EXEMPLU · date fictive"


def pilot_sow_exemplu() -> Path:
    story = [
        note("<b>EXEMPLU DE COMPLETARE · DATE FICTIVE.</b> Firma, persoanele, sumele și "
             "termenele din acest document sunt inventate și servesc doar ca model de "
             "completare. Nu este un document valabil și nu înlocuiește consultanța juridică."),
        h1("1 · Părțile și obiectul"),
        table(
            ["Element", "Valoare"],
            [
                ["Furnizor", "OPSQAI · Stefan Bari · " + CONTACT],
                ["Client", "Transdacia Logistic SRL, Str. Fabricii 118, Cluj-Napoca, CUI RO12345678"],
                ["Proprietarul problemei", "Ioana Marcu, Director Operațiuni"],
                ["Obiectul pilotului",
                 "Expirările de documente de flotă și de șoferi ratate (ITP, asigurări, "
                 "tahograf, permise, atestate) — o singură problemă operațională"],
                ["Perioada", "5 octombrie 2026 – 3 noiembrie 2026 (30 de zile)"],
                ["Taxa de pilot", "3.500 EUR, fără TVA"],
            ],
            widths=[30, 70],
        ),
        h2("2 · Livrabile OPSQAI"),
        *numbered([
            "Instalarea platformei pe serverul indicat de client (Windows Server 2022, "
            "în rețeaua internă), cu licență de pilot limitată la 30 de zile.",
            "Configurarea spațiului de lucru Transport pentru evidența documentelor de "
            "flotă, șoferi și remorci, cu alertele de expirare active.",
            "Pregătirea informației din documentele furnizate de client "
            "(volum estimat: 180 documente).",
            "Configurarea rolurilor și drepturilor pentru 12 utilizatori nominalizați "
            "(1 administrator, 2 dispeceri, 1 responsabil flotă, 8 cititori).",
            "O sesiune de instruire pentru utilizatori (2 ore) și una pentru "
            "administrator (2 ore), online.",
            "Suport pe durata pilotului: e-mail și telefon, răspuns în 8 ore lucrătoare, "
            "luni–vineri 09:00–18:00 (ora României).",
            "Raport final cu măsurarea înainte/după și recomandarea de producție.",
        ]),
        h2("3 · Obligațiile clientului"),
        *numbered([
            "Pune la dispoziție serverul și accesul necesar (cerințele tehnice sunt anexate).",
            "Nominalizează proprietarul problemei (Ioana Marcu) și cei 12 utilizatori.",
            "Furnizează documentele și procedurile relevante, în format electronic, "
            "până în ziua 5.",
            "Asigură timpul utilizatorilor pentru instruire și utilizare "
            "(minimum 2 ore de instruire + utilizare zilnică).",
            "Confirmă indicatorul de bază înainte de start: 9 expirări ratate în "
            "ultimele 3 luni.",
        ]),
        PageBreak(),
        h1("4 · Calendar și puncte de control"),
        table(
            ["Punct de control", "Termen", "Cine confirmă"],
            [
                ["Fișa problemei și indicatorul de bază", "7 oct. (ziua 3)", "Ioana Marcu"],
                ["Platformă instalată și accesibilă", "11 oct. (ziua 7)", "Andrei Pop, IT"],
                ["Spațiu de lucru utilizabil", "19 oct. (ziua 15)", "Ioana Marcu"],
                ["Utilizatori instruiți", "24 oct. (ziua 20)", "Ioana Marcu"],
                ["Raport final și recomandare", "3 nov. (ziua 30)", "Ambele părți"],
            ],
            widths=[44, 20, 36],
        ),
        h2("5 · Criterii de acceptanță"),
        p("Pilotul este considerat livrat dacă livrabilele din secțiunea 2 au fost furnizate și "
          "punctele de control au fost confirmate. Rezultatul comercial (trecerea în producție) "
          "depinde de criteriile de succes agreate — 0 expirări ratate în luna pilotului și "
          "cel puțin 8 din 12 utilizatori activi săptămânal — dar nu condiționează plata taxei "
          "de pilot, dacă nu se convine altfel în scris."),
        h2("6 · Ce NU este inclus"),
        *bullets([
            "Integrări cu sisteme terțe care nu sunt menționate expres aici "
            "(ex. programul de facturare al clientului).",
            "Migrarea istorică a datelor din alte aplicații.",
            "Dezvoltare de funcționalități noi, specifice clientului.",
            "Furnizarea de hardware, licențe de sistem de operare sau infrastructură.",
            "Consultanță juridică; documentele generate în platformă se verifică de un "
            "jurist al clientului.",
            "Servicii în afara intervalului de suport agreat (09:00–18:00, luni–vineri).",
        ]),
        h2("7 · Date, confidențialitate, proprietate"),
        *bullets([
            "Datele rămân pe infrastructura clientului; clientul este operator de date.",
            "Conținutul încărcat de client rămâne proprietatea clientului.",
            "Platforma, codul, documentația și materialele OPSQAI rămân proprietatea "
            "OPSQAI; clientul primește un drept de utilizare pe durata licenței.",
            "Ambele părți păstrează confidențialitatea informațiilor primite, pe durata "
            "pilotului și 3 ani după.",
            "Raportare de utilizare: instalarea transmite către OPSQAI doar cifre agregate "
            "(utilizatori activi, timp petrecut, număr de acțiuni, alerte rezolvate, "
            "disponibilitate). Nu se transmite conținut, documente, nume sau date "
            "personale. Clientul poate opri raportarea oricând din aplicație; în acest caz "
            "raportul final de pilot se completează pe baza cifrelor citite de "
            "administratorul clientului.",
        ]),
        h2("8 · Încetare și continuare"),
        *bullets([
            "Oricare parte poate opri pilotul cu notificare scrisă de 10 zile, cu plata "
            "activităților prestate.",
            "La trecerea în producție se emite licența de producție; instalarea nu se reface.",
            "La oprire, licența de pilot expiră; clientul primește export complet al "
            "conținutului încărcat.",
        ]),
        h2("9 · Semnături"),
        table(
            ["OPSQAI", "Client"],
            [["Nume: Stefan Bari<br/><br/>Funcție: Fondator<br/><br/>Data: 30 septembrie 2026"
              "<br/><br/>Semnătură: ______________",
              "Nume: Ioana Marcu<br/><br/>Funcție: Director Operațiuni"
              "<br/><br/>Data: 30 septembrie 2026<br/><br/>Semnătură: ______________"]],
            widths=[50, 50],
        ),
        note("Acesta este un exemplu. Pentru un client real se folosește modelul "
             "necompletat și se verifică juridic înainte de semnare."),
    ]
    return build(
        OUT / "OPSQAI_Pilot_SOW_RO_EXEMPLU.pdf",
        eyebrow="Document de lucru · SOW · " + EX,
        title="Pilot OPSQAI<br/>Exemplu completat<br/>(date fictive).",
        subtitle="Cum arată SOW-ul de pilot după completare, pe un caz inventat.",
        cover_footnote=VER + " · " + EX + " · firmă, persoane și sume inventate.",
        footer="OPSQAI · Pilot SOW (RO) · EXEMPLU · date fictive",
        story=story,
    )


if __name__ == "__main__":
    print(pilot_sow_exemplu())
