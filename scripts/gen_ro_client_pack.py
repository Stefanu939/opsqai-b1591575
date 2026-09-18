#!/usr/bin/env python3
"""Pachetul OPSQAI de documente pentru clienți și parteneri — în română.

Aceeași structură ca setul englez (one pager, customer deck, pricing,
security & GDPR, pilot proposal, pilot SOW, investor deck, legal & IP,
business plan, financial model), dar mai adânc pe produs și strict adevărat:
doar funcții care există în cod.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ro_pdf_kit import (  # noqa: E402
    BLUE,
    CONTACT,
    KeepTogether,
    PageBreak,
    Spacer,
    VIOLET,
    build,
    bullets,
    callout,
    h1,
    h2,
    h3,
    lead,
    metrics_row,
    note,
    numbered,
    p,
    small,
    table,
)

OUT = Path("/mnt/documents")
ARCH = json.loads(Path("/tmp/arch.json").read_text())
VER = "Versiunea 1.0 · septembrie 2026"

DISCLAIMER_PRET = (
    "Prețurile sunt indicative până la confirmarea în scris a domeniului de aplicare, a "
    "modelului de instalare, a numărului de utilizatori și a nivelului de suport. Oferta "
    "fermă se emite pe firmă, într-o singură pagină."
)

SECURITATE_ADEVARATA = [
    "Instalare pe serverul firmei (Windows Self-Hosted). Datele operaționale, documentele și "
    "jurnalele rămân în infrastructura clientului.",
    "Parolele utilizatorilor se stochează cu Argon2id, nu în clar și nu reversibil.",
    "Acces pe roluri și drepturi pe zone de lucru (RBAC), verificat pe server, nu doar ascuns în interfață.",
    "Licența este un token semnat criptografic (Ed25519) care conține exact produsele cumpărate; "
    "instalarea verifică semnătura la fiecare pornire.",
    "Jurnal de audit al interacțiunilor AI, înlănțuit prin hash, cu sursele folosite pentru fiecare răspuns.",
    "Actualizări livrate cu verificare SHA-256 a pachetului înainte de instalare.",
    "Furnizorul de AI este configurabil, inclusiv varianta complet locală (fără ieșire în internet).",
    "Backup și restaurare cu verificarea integrității arhivei (hash recalculat).",
]

FARA_CERTIFICARE = (
    "Formulare corectă, pe care o folosim consecvent: OPSQAI este proiectat pentru conformitate "
    "GDPR prin arhitectură (date la client, minimizare, roluri, audit, export și ștergere). "
    "OPSQAI <b>nu este în prezent certificat</b> SOC 2 sau ISO 27001 și nu afirmă acest lucru în "
    "nicio propunere. Certificările pot fi obținute ulterior; până atunci, dovada oferită "
    "clientului este arhitectura, documentația tehnică și dreptul de audit al instalării."
)


def _impl(product_key: str):
    return [w for w in ARCH["workspaces"] if w["product"] == product_key and w["status"] == "implemented"]


# ──────────────────────────────────────────────────────────────────────────
# 1 · ONE PAGER
# ──────────────────────────────────────────────────────────────────────────
def one_pager() -> Path:
    story = [
        h1("OPSQAI pe scurt"),
        lead(
            "OPSQAI este o platformă AI instalată pe serverul firmei tale, care transformă "
            "procedurile, documentele, instruirile și întrebările interne în spații de lucru "
            "guvernate, cu răspunsuri bazate exclusiv pe informația ta."
        ),
        h2("Problema pe care o rezolvă"),
        *bullets([
            "Informația corectă e greu de găsit: se întreabă din nou aceleași lucruri, pe telefon și în chat.",
            "Procedurile există, dar nu sunt urmate, pentru că nu sunt la îndemână în momentul deciziei.",
            "Instruirea se repetă la fiecare angajat nou și nu se poate dovedi.",
            "Documentele expiră (contracte, autorizații, ITP, licențe) și nimeni nu vede asta la timp.",
            "Cunoașterea stă în capul a două-trei persoane. Când lipsesc, operațiunea încetinește.",
        ]),
        h2("Ce primește firma"),
        table(
            ["Element", "Ce înseamnă concret"],
            [
                ["Spații de lucru pe problemă", "Configurate în jurul procesului tău real, nu un chatbot generic."],
                ["Răspunsuri cu sursă", "Fiecare răspuns arată documentul din care provine. Când nu are bază, refuză."],
                ["Academy", "Cursuri, teste și certificate — instruirea devine dovadă, nu promisiune."],
                ["Audit AI", "Jurnal al fiecărei întrebări și al surselor folosite."],
                ["Roluri și drepturi", "Fiecare vede doar ce îi este permis, verificat pe server."],
                ["Datele tale, la tine", "Instalare pe serverul firmei; furnizorul AI poate fi complet local."],
            ],
            widths=[34, 66],
        ),
        h2("Modelul comercial"),
        metrics_row([
            ("12.000 €", "implementare, o singură dată (indicativ)"),
            ("2.000–6.000 €", "pe produs / modul configurat"),
            ("de la 500 €/lună", "mentenanță și actualizări"),
        ]),
        Spacer(1, 6),
        small("Prețuri indicative; oferta fermă se emite pe firmă, într-o singură pagină."),
        h2("Cum începem"),
        *numbered([
            "<b>Discovery</b> — o discuție de o oră: care e problema, cine o deține, cum se măsoară azi.",
            "<b>Propunere de pilot</b> — obiectiv, durată, indicatori, preț.",
            "<b>Pilot de 30 de zile</b> — un proces, utilizatori nominalizați, măsurare înainte/după.",
            "<b>Decizie</b> — trecem în producție doar dacă pilotul arată rezultat.",
        ]),
        Spacer(1, 8),
        callout("Contact", [f"Stefan Bari · {CONTACT} · opsqai.de",
                           "Cerere de ofertă: o pagină, cu preț fix pentru domeniul agreat."]),
    ]
    return build(
        OUT / "OPSQAI_One_Pager_RO.pdf",
        eyebrow="One Pager · Material pentru client",
        title="Spațiul tău de lucru.<br/>Construit în jurul<br/>problemelor tale.",
        subtitle="Platformă AI self-hosted pentru firme care vor răspunsuri corecte, proceduri respectate și instruire care se poate dovedi.",
        cover_footnote=VER + " · Material informativ. Oferta fermă se emite pe firmă.",
        footer="OPSQAI · One Pager (RO)",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 2 · PREZENTARE PENTRU CLIENT
# ──────────────────────────────────────────────────────────────────────────
def customer_deck() -> Path:
    from gen_ro_functii import CORE_RO, PRODUCT_RO
    core_rows = [[f"<b>{CORE_RO[c['key']][0]}</b>", CORE_RO[c["key"]][1]]
                 for c in ARCH["core"] if c["key"] in CORE_RO]
    story = [
        h1("1 · De ce există OPSQAI"),
        lead(
            "Firmele nu pierd bani pentru că nu au informație, ci pentru că informația nu ajunge "
            "la omul potrivit, în momentul deciziei, în forma corectă."
        ),
        p("Costurile reale sunt tăcute: timpul pierdut la căutat, întrebările repetate către "
          "aceiași doi oameni, procedura veche folosită din obișnuință, instruirea refăcută la "
          "fiecare angajat nou, weekendurile de pregătire pentru audit, amenzile pentru un "
          "document expirat."),
        callout("Punctul de plecare", "OPSQAI nu începe cu tehnologia, ci cu o problemă operațională "
                                      "care are un proprietar și se poate măsura. Fără asta, nu pornim un pilot."),
        h2("2 · Ce este OPSQAI"),
        p("O platformă instalată pe serverul firmei, în care se construiesc spații de lucru pe "
          "domenii (operațiuni, transport, resurse umane și altele). Fiecare spațiu conține "
          "documentele, procedurile, sarcinile și răspunsurile AI ale domeniului respectiv."),
        p("Diferența față de un asistent generic: OPSQAI răspunde numai din informația firmei "
          "tale și arată sursa. Dacă nu găsește o bază suficient de bună, spune că nu știe și "
          "marchează întrebarea ca lipsă de cunoaștere, ca să fie completată."),
        h2("3 · Cum funcționează, pas cu pas"),
        *numbered([
            "<b>Se încarcă informația</b> — proceduri, contracte, manuale, instrucțiuni, fișiere și imagini.",
            "<b>Se pregătește</b> — documentele sunt împărțite în fragmente și indexate semantic, local, în baza de date a firmei.",
            "<b>Se configurează spațiile</b> — produsele cumpărate deschid spațiile de lucru corespunzătoare.",
            "<b>Se stabilesc rolurile</b> — cine vede ce, cine aprobă, cine administrează.",
            "<b>Oamenii întreabă și lucrează</b> — răspuns cu sursă, sarcini, documente, cursuri, rapoarte.",
            "<b>Se măsoară</b> — audit AI, lipsuri de cunoaștere, rapoarte, starea spațiului de lucru.",
        ]),
        PageBreak(),
        h1("4 · Ce conține platforma (Core)"),
        p("Core este platforma însăși. Este inclusă întotdeauna, nu se vinde bucată cu bucată și "
          "nu se activează contra cost. Accesul la fiecare funcție rămâne controlat prin roluri."),
        table(["Funcție Core", "Ce face"], core_rows, widths=[27, 73]),
        h2("5 · Produse pe domeniu"),
        p("Peste Core se activează produse. Fiecare produs aduce spații de lucru proprii și se "
          "livrează prin licența semnată, fără reinstalare."),
        table(
            ["Produs", "Domeniu", "Stare", "Spații de lucru"],
            [[PRODUCT_RO.get(pr["key"], (pr["label"], pr["domain"]))[0],
              PRODUCT_RO.get(pr["key"], (pr["label"], pr["domain"]))[1],
              "disponibil" if pr["status"] == "available" else "planificat",
              str(len(_impl(pr["key"])))] for pr in ARCH["products"]],
            widths=[26, 30, 16, 28],
        ),
        small("„Planificat” înseamnă că arhitectura există, dar produsul nu se vinde ca disponibil astăzi."),
        PageBreak(),
        h1("6 · Cine folosește ce"),
        table(
            ["Rol", "Ce face zilnic în OPSQAI"],
            [
                ["Angajat / operator", "Întreabă și primește răspuns cu sursă, citește procedura, face cursuri, trimite cereri."],
                ["Șef de echipă", "Vede sarcinile deschise, expirările, cererile, incidentele; aprobă și repartizează."],
                ["Responsabil HR", "Generează contracte și documente, urmărește validitatea, aprobă după verificare."],
                ["Responsabil transport", "Vehicule, șoferi, cuplaje, registre, CMR, hartă, alerte de expirare."],
                ["Administrator / conducere", "Utilizatori, roluri, rapoarte, audit AI, starea instalării, actualizări."],
            ],
            widths=[24, 76],
        ),
        h2("7 · Securitate, în cuvinte simple"),
        *bullets(SECURITATE_ADEVARATA),
        note(FARA_CERTIFICARE),
        h2("8 · Implementare"),
        table(
            ["Etapă", "Durată orientativă", "Rezultat"],
            [
                ["Discovery", "1–2 zile", "Problema, proprietarul, indicatorul de bază."],
                ["Instalare pe server", "1 zi", "Platformă funcțională, licență activă, primul administrator."],
                ["Pregătirea informației", "3–10 zile", "Documente încărcate, proceduri structurate, FAQ inițial."],
                ["Configurare și roluri", "2–4 zile", "Spații de lucru, utilizatori, drepturi, notificări."],
                ["Instruire și go-live", "1–2 zile", "Echipa lucrează în platformă; Academy pornit."],
            ],
            widths=[24, 20, 56],
        ),
        h2("9 · Preț"),
        metrics_row([
            ("12.000 €", "implementare, o singură dată"),
            ("2.000–6.000 €", "pe produs configurat"),
            ("de la 500 €/lună", "mentenanță"),
        ]),
        Spacer(1, 7),
        p("Exemplu ilustrativ pentru primul an: implementare 12.000 € + două produse "
          "4.000–12.000 € + 12 luni mentenanță de la 6.000 € → de la 22.000 € în primul an. "
          "Este o ilustrare, nu o ofertă."),
        p(DISCLAIMER_PRET),
        h2("10 · Pașii următori"),
        *numbered([
            "O discuție de Discovery de 60 de minute.",
            "Propunere de pilot cu indicatori și preț.",
            "Pilot de 30 de zile pe un singur proces.",
            "Decizie de producție pe baza rezultatului măsurat.",
        ]),
        Spacer(1, 8),
        callout("Contact", f"Stefan Bari · {CONTACT} · opsqai.de"),
    ]
    return build(
        OUT / "OPSQAI_Prezentare_Client_RO.pdf",
        eyebrow="Prezentare pentru client",
        title="De la haos operațional<br/>la răspunsuri<br/>cu sursă.",
        subtitle="Ce este OPSQAI, cum funcționează, ce conține, cât costă și cum se implementează.",
        cover_footnote=VER + f" · Contact: {CONTACT}",
        footer="OPSQAI · Prezentare pentru client (RO)",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 3 · PREȚURI
# ──────────────────────────────────────────────────────────────────────────
def pricing() -> Path:
    story = [
        h1("1 · Arhitectura de preț"),
        lead("OPSQAI nu este un abonament SaaS pe utilizator. Este o licență perpetuă pe "
             "instalare, plus produsele pe care le activezi, plus mentenanță anuală."),
        table(
            ["Nivel", "Preț indicativ", "Ce include", "Rol comercial"],
            [
                ["Implementare", "12.000 € o singură dată",
                 "Discovery, definirea domeniului, configurarea spațiilor, pregătirea informației, roluri, instruire, go-live.",
                 "Intrarea în cont și primul rezultat."],
                ["Produse / module", "2.000–6.000 €",
                 "Capabilități suplimentare configurate pe procesul clientului.",
                 "Extinderea valorii."],
                ["Mentenanță", "de la 500 €/lună",
                 "Suport, actualizări semnate, mentenanță și continuitate conform nivelului agreat.",
                 "Serviciu recurent."],
            ],
            widths=[16, 18, 44, 22],
        ),
        note(DISCLAIMER_PRET),
        h2("2 · Ce este inclus fără cost suplimentar (Core)"),
        p("Platforma Core este inclusă în implementare și nu se taxează funcție cu funcție: "
          "chat AI cu surse, bază de cunoștințe, FAQ, Academy, audit AI, lipsuri de cunoaștere, "
          "versionare proceduri, cereri interne, chat intern, rapoarte, centru de suport, centru "
          "de conformitate, export, starea spațiului de lucru, roluri și drepturi, "
          "multilingvism (EN/DE/RO) și notificări."),
        h2("3 · Ce se licențiază separat"),
        table(
            ["Produs", "Stare astăzi"],
            [[__import__("gen_ro_functii").PRODUCT_RO.get(pr["key"], (pr["label"], pr["domain"]))[0]
              + " — " + __import__("gen_ro_functii").PRODUCT_RO.get(pr["key"], (pr["label"], pr["domain"]))[1],
              "disponibil" if pr["status"] == "available" else "planificat"]
             for pr in ARCH["products"]],
            widths=[62, 38],
        ),
        h2("4 · Capabilități opționale"),
        p("Următoarele au fost cândva add-on-uri separate și astăzi sunt livrate împreună cu "
          "funcția Core din care fac parte, fără comutator comercial separat: Analytics și "
          "Executive Dashboard (cu Rapoarte), Brand Center (cu Export), Generator AI de "
          "proceduri (cu Versionare proceduri), Audit AI al spațiului de lucru (cu Starea "
          "spațiului de lucru)."),
        PageBreak(),
        h1("5 · Pachete comerciale"),
        table(
            ["Pachet", "Pentru cine", "Conținut"],
            [
                ["Pilot", "Validarea unui singur proces",
                 "30 de zile, domeniu limitat, utilizatori nominalizați, măsurare înainte/după, recomandare de producție. Taxa de pilot se stabilește pe domeniu și se confirmă în SOW."],
                ["Workspace", "Prima problemă operațională reală",
                 "Implementare 12.000 € plus unul sau mai multe produse și mentenanță."],
                ["Extindere", "Mai multe procese, mai mulți utilizatori",
                 "Produse suplimentare, utilizatori, fluxuri, cerințe de instalare și suport extins. Se ofertează după ce se cunosc domeniul de producție și cerințele de securitate."],
            ],
            widths=[16, 26, 58],
        ),
        h2("6 · Exemplu ilustrativ pentru primul an"),
        table(
            ["Componentă", "Sumă ilustrativă"],
            [["Implementare", "12.000 €"],
             ["Două produse", "4.000–12.000 €"],
             ["12 luni mentenanță", "de la 6.000 €"],
             ["<b>Interval ilustrativ primul an</b>", "<b>de la 22.000 €</b>"]],
            widths=[66, 34],
        ),
        small("Ilustrare, nu ofertă. Prețul real depinde de domeniu, produse, instalare, taxe și contract."),
        h2("7 · Ce determină prețul final"),
        *bullets([
            "Numărul de produse și fluxuri de lucru configurate.",
            "Cerințele de instalare și de infrastructură.",
            "Volumul de documente și efortul de pregătire a informației.",
            "Numărul și tipul utilizatorilor.",
            "Integrări, configurări specifice și cerințe de limbă.",
            "Timpii de răspuns la suport și domeniul mentenanței.",
        ]),
        h2("8 · Procesul de cumpărare"),
        table(
            ["Etapă", "Decizia clientului", "Rezultatul OPSQAI"],
            [
                ["Discovery", "Problema este importantă, măsurabilă și are un proprietar?", "Descrierea problemei și valoarea de referință."],
                ["Propunere de pilot", "Domeniul este suficient de mic pentru a fi testat?", "Calendar, livrabile, indicatori, taxă."],
                ["SOW", "Ce se livrează exact și cine răspunde?", "Document de lucru semnat."],
                ["Pilot 30 de zile", "Rezultatul justifică producția?", "Măsurare înainte/după și recomandare."],
                ["Contract de producție", "Extindem?", "Licență, produse, mentenanță."],
            ],
            widths=[18, 42, 40],
        ),
        Spacer(1, 8),
        callout("Cerere de ofertă", f"Trimite dimensiunea firmei, domeniul și produsele necesare la {CONTACT}. "
                                   "Primești o ofertă fixă, pe o pagină."),
    ]
    return build(
        OUT / "OPSQAI_Preturi_RO.pdf",
        eyebrow="Prețuri & model comercial",
        title="Începe concentrat.<br/>Extinde când<br/>valoarea e dovedită.",
        subtitle="Cadru transparent pentru implementare, produse și mentenanță.",
        cover_footnote=VER + " · Propunerile și SOW-urile specifice fiecărui client definesc domeniul și prețul obligatoriu.",
        footer="OPSQAI · Prețuri (RO)",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 4 · SECURITATE & GDPR
# ──────────────────────────────────────────────────────────────────────────
def security() -> Path:
    story = [
        h1("1 · Principiul de bază"),
        lead("OPSQAI se instalează pe serverul firmei tale. Nu există o bază de date centrală "
             "OPSQAI în care să stea datele clienților."),
        p("Aceasta este decizia de arhitectură din care decurg toate celelalte răspunsuri de "
          "securitate: datele operaționale, documentele, jurnalele și indexul semantic rămân în "
          "infrastructura pe care clientul o controlează."),
        h2("2 · Unde stau datele"),
        table(
            ["Categorie de date", "Locație", "Observații"],
            [
                ["Documente, proceduri, contracte", "Serverul clientului", "Fișierele și textul extras nu părăsesc instalarea."],
                ["Index semantic (fragmente + vectori)", "Baza de date PostgreSQL a clientului", "Generat local, cu extensia pgvector."],
                ["Conturi și parole", "Baza de date a clientului", "Parole cu Argon2id; nerecuperabile."],
                ["Jurnal de audit AI", "Baza de date a clientului", "Înlănțuit prin hash, cu sursele fiecărui răspuns."],
                ["Date de licență", "Client + OPSQAI", "OPSQAI păstrează firma, produsele licențiate și starea instalării."],
                ["Cereri către furnizorul AI", "Depinde de furnizorul ales", "Cu model local: nu părăsesc rețeaua clientului."],
            ],
            widths=[28, 26, 46],
        ),
        h2("3 · Controlul accesului"),
        *bullets([
            "Autentificare cu parolă stocată prin Argon2id; sesiunile expiră după 30 de minute de inactivitate.",
            "Roluri și drepturi pe zone de lucru; verificarea se face pe server, la fiecare operațiune.",
            "Protecția ultimului SuperAdmin: nu poate fi șters sau retrogradat, ca instalarea să nu rămână fără administrator.",
            "Fiecare acțiune sensibilă lasă urmă în jurnal (cine, ce, când).",
        ]),
        h2("4 · Licență și integritatea instalării"),
        *bullets([
            "Licența este un token semnat cu Ed25519 care conține firma, produsele și limitele; instalarea verifică semnătura.",
            "Cheia privată de semnare stă separat de aplicație; instalarea cunoaște doar cheia publică.",
            "Pachetele de actualizare sunt verificate prin SHA-256 înainte de instalare; un pachet modificat este respins.",
            "Actualizările pot fi distribuite în rețeaua locală a clientului, verificate cu același hash.",
        ]),
        PageBreak(),
        h1("5 · Comportamentul AI"),
        *bullets([
            "Răspunsurile se construiesc exclusiv din informația încărcată de client.",
            "Fiecare răspuns arată sursele. Când potrivirea este slabă, sistemul refuză să răspundă în loc să inventeze.",
            "Întrebările fără răspuns devin „lipsuri de cunoaștere”, cu proprietar și posibilitatea de a fi promovate în procedură.",
            "AI-ul asistă; decizia operațională și răspunderea rămân la om. Niciun document nu se aprobă automat.",
            "Furnizorul de AI este configurabil, inclusiv un model rulat local, fără ieșire în internet.",
        ]),
        h2("6 · GDPR"),
        table(
            ["Cerință", "Cum este acoperită"],
            [
                ["Rolurile părților", "Clientul este operator de date. OPSQAI acționează ca furnizor de software și, unde prestează servicii de suport pe date, ca împuternicit, pe bază de contract."],
                ["Minimizare", "Se încarcă doar informația necesară procesului; câmpurile sensibile sunt restricționate prin drepturi."],
                ["Localizarea datelor", "Datele stau pe serverul clientului; nu există transfer implicit către terți."],
                ["Transferuri", "Apar doar dacă clientul alege un furnizor AI extern; atunci se aplică clauzele contractuale standard ale furnizorului respectiv. Varianta locală elimină transferul."],
                ["Drepturile persoanelor", "Export și ștergere la nivel de înregistrare, cu urmă în jurnal."],
                ["Retenție", "Politici de păstrare configurabile pe tipuri de date."],
                ["Securitatea prelucrării", "Argon2id, roluri verificate pe server, jurnal de audit, backup verificat prin hash."],
                ["Notificarea incidentelor", "Procedură internă OPSQAI de suport și comunicare; incidentul pe instalarea clientului este notificat clientului fără întârziere nejustificată."],
            ],
            widths=[24, 76],
        ),
        note(FARA_CERTIFICARE),
        h2("7 · Backup și continuitate"),
        *bullets([
            "Copii de siguranță ale bazei de date și ale fișierelor, cu hash SHA-256 memorat la momentul creării.",
            "Verificare periodică: arhiva este re-hashuită și comparată cu valoarea inițială.",
            "Restaurare testabilă pe un mediu separat înainte de a fi nevoie de ea.",
            "Licența perpetuă înseamnă că aplicația rămâne instalată și funcțională chiar dacă mentenanța nu este reînnoită.",
        ]),
        h2("8 · Ce poate cere clientul"),
        *bullets([
            "Documentația tehnică a arhitecturii și a fluxului de licențiere.",
            "Lista serviciilor instalate și a porturilor folosite.",
            "Dreptul de a audita propria instalare, inclusiv jurnalele.",
            "Configurarea unui furnizor AI local, dacă politica internă interzice ieșirea datelor.",
        ]),
        Spacer(1, 8),
        callout("Întrebări de securitate", f"Trimite chestionarul de securitate al firmei la {CONTACT}. "
                                           "Răspundem punct cu punct, fără afirmații care nu pot fi dovedite."),
    ]
    return build(
        OUT / "OPSQAI_Securitate_GDPR_RO.pdf",
        eyebrow="Securitate & GDPR",
        title="Datele rămân<br/>la tine.<br/>Verificabil.",
        subtitle="Arhitectură self-hosted, control pe roluri, licență semnată, audit AI și conformitate GDPR prin design.",
        cover_footnote=VER + " · Document informativ; nu înlocuiește consultanța juridică proprie a clientului.",
        footer="OPSQAI · Securitate & GDPR (RO)",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 5 · PROPUNERE DE PILOT
# ──────────────────────────────────────────────────────────────────────────
def pilot_proposal() -> Path:
    story = [
        h1("1 · Scopul pilotului"),
        lead("Un pilot OPSQAI nu demonstrează tehnologia. Demonstrează că o problemă "
             "operațională concretă se măsoară mai bine după 30 de zile."),
        h2("2 · Condiții de intrare"),
        *bullets([
            "O singură problemă, formulată în termeni operaționali.",
            "Un proprietar din firmă, cu autoritate de decizie.",
            "Un grup de utilizatori nominalizați (recomandat 5–15 persoane).",
            "Acces la documentele și procedurile relevante.",
            "Un indicator de bază măsurabil înainte de start.",
        ]),
        h2("3 · Calendar orientativ (30 de zile)"),
        table(
            ["Perioadă", "Activitate", "Rezultat"],
            [
                ["Ziua 1–3", "Discovery, valoarea de referință, criteriile de succes", "Fișa problemei, semnată de proprietar."],
                ["Ziua 4–7", "Instalare, licență de pilot, primul administrator", "Platformă funcțională la client."],
                ["Ziua 8–15", "Încărcarea și structurarea informației, FAQ, proceduri", "Spațiu de lucru utilizabil."],
                ["Ziua 16–20", "Roluri, notificări, instruirea utilizatorilor, Academy", "Echipa lucrează efectiv."],
                ["Ziua 21–28", "Utilizare reală, lipsuri de cunoaștere, ajustări", "Conținut completat, audit AI populat."],
                ["Ziua 29–30", "Măsurare, raport, recomandare", "Decizie de producție sau oprire."],
            ],
            widths=[14, 44, 42],
        ),
        h2("4 · Ce se măsoară"),
        table(
            ["Indicator", "Cum se măsoară"],
            [
                ["Timp până la răspunsul corect", "Estimare înainte (interviuri) vs. utilizare reală în platformă."],
                ["Întrebări repetate către experți", "Numărul de cereri interne și întrebări duplicate."],
                ["Acoperirea procedurilor", "Câte proceduri esențiale există, sunt actuale și confirmate de echipă."],
                ["Instruire dovedibilă", "Cursuri finalizate și certificate emise în Academy."],
                ["Lipsuri de cunoaștere", "Câte au fost identificate și câte au fost închise."],
                ["Documente cu risc de expirare", "Câte au fost descoperite și readuse în termen."],
            ],
            widths=[32, 68],
        ),
        h2("5 · Criterii de succes (se agreează înainte)"),
        *bullets([
            "Utilizarea: cel puțin 70% dintre utilizatorii nominalizați folosesc platforma săptămânal.",
            "Calitatea: răspunsurile cu sursă sunt considerate utile de proprietarul problemei în majoritatea cazurilor verificate.",
            "Îmbunătățirea indicatorului de bază, în direcția și mărimea agreate la start.",
            "Cel puțin un rezultat pe care proprietarul îl poate prezenta conducerii.",
        ]),
        h2("6 · Responsabilități"),
        table(
            ["OPSQAI", "Clientul"],
            [
                ["Instalare, configurare, pregătirea informației, instruire, suport în pilot, raport final.",
                 "Proprietarul problemei, utilizatorii nominalizați, accesul la server și documente, timpul pentru instruire."],
            ],
            widths=[50, 50],
        ),
        h2("7 · Preț și ce urmează"),
        p("Taxa de pilot se stabilește în funcție de domeniu și se confirmă în SOW. Dacă se trece "
          "în producție, pilotul se continuă fără reinstalare: se emite licența de producție cu "
          "produsele agreate."),
        p(DISCLAIMER_PRET),
        Spacer(1, 8),
        callout("Pasul următor", f"Stabilim o discuție de Discovery de 60 de minute. {CONTACT}"),
    ]
    return build(
        OUT / "OPSQAI_Propunere_Pilot_RO.pdf",
        eyebrow="Propunere de pilot",
        title="30 de zile.<br/>Un proces.<br/>Un rezultat măsurat.",
        subtitle="Obiectiv, calendar, indicatori, criterii de succes și responsabilități.",
        cover_footnote=VER + " · Domeniul obligatoriu se stabilește în SOW.",
        footer="OPSQAI · Propunere de pilot (RO)",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 6 · PILOT SOW
# ──────────────────────────────────────────────────────────────────────────
def pilot_sow() -> Path:
    story = [
        note("Acest document este un model de lucru (SOW). Câmpurile marcate [___] se completează "
             "și se confirmă în scris de ambele părți. Nu înlocuiește consultanța juridică."),
        h1("1 · Părțile și obiectul"),
        table(
            ["Element", "Valoare"],
            [
                ["Furnizor", "OPSQAI · Stefan Bari · " + CONTACT],
                ["Client", "[___ denumire, sediu, CUI/VAT ___]"],
                ["Proprietarul problemei", "[___ nume, funcție ___]"],
                ["Obiectul pilotului", "[___ o singură problemă operațională ___]"],
                ["Perioada", "[___ data start ___] – [___ data final ___] (30 de zile)"],
                ["Taxa de pilot", "[___ sumă ___] EUR, fără TVA"],
            ],
            widths=[30, 70],
        ),
        h2("2 · Livrabile OPSQAI"),
        *numbered([
            "Instalarea platformei pe serverul indicat de client, cu licență de pilot limitată în timp.",
            "Configurarea spațiului de lucru pentru problema agreată.",
            "Pregătirea informației din documentele furnizate de client (volum estimat: [___] documente).",
            "Configurarea rolurilor și drepturilor pentru utilizatorii nominalizați.",
            "O sesiune de instruire pentru utilizatori și una pentru administrator.",
            "Suport pe durata pilotului: [___ canal și timp de răspuns ___].",
            "Raport final cu măsurarea înainte/după și recomandarea de producție.",
        ]),
        h2("3 · Obligațiile clientului"),
        *numbered([
            "Pune la dispoziție serverul și accesul necesar (cerințele tehnice sunt anexate).",
            "Nominalizează proprietarul problemei și utilizatorii.",
            "Furnizează documentele și procedurile relevante, în format electronic.",
            "Asigură timpul utilizatorilor pentru instruire și utilizare.",
            "Confirmă indicatorul de bază înainte de start.",
        ]),
        PageBreak(),
        h1("4 · Calendar și puncte de control"),
        table(
            ["Punct de control", "Termen", "Cine confirmă"],
            [
                ["Fișa problemei și indicatorul de bază", "ziua 3", "Proprietarul problemei"],
                ["Platformă instalată și accesibilă", "ziua 7", "Administratorul clientului"],
                ["Spațiu de lucru utilizabil", "ziua 15", "Proprietarul problemei"],
                ["Utilizatori instruiți", "ziua 20", "Proprietarul problemei"],
                ["Raport final și recomandare", "ziua 30", "Ambele părți"],
            ],
            widths=[44, 20, 36],
        ),
        h2("5 · Criterii de acceptanță"),
        p("Pilotul este considerat livrat dacă livrabilele din secțiunea 2 au fost furnizate și "
          "punctele de control au fost confirmate. Rezultatul comercial (trecerea în producție) "
          "depinde de criteriile de succes agreate, dar nu condiționează plata taxei de pilot, "
          "dacă nu se convine altfel în scris."),
        h2("6 · Ce NU este inclus"),
        *bullets([
            "Integrări cu sisteme terțe care nu sunt menționate expres aici.",
            "Migrarea istorică a datelor din alte aplicații.",
            "Dezvoltare de funcționalități noi, specifice clientului.",
            "Furnizarea de hardware, licențe de sistem de operare sau infrastructură.",
            "Consultanță juridică; documentele generate în platformă se verifică de un jurist al clientului.",
            "Servicii în afara intervalului de suport agreat.",
        ]),
        h2("7 · Date, confidențialitate, proprietate"),
        *bullets([
            "Datele rămân pe infrastructura clientului; clientul este operator de date.",
            "Conținutul încărcat de client rămâne proprietatea clientului.",
            "Platforma, codul, documentația și materialele OPSQAI rămân proprietatea OPSQAI; clientul primește un drept de utilizare.",
            "Ambele părți păstrează confidențialitatea informațiilor primite, pe durata pilotului și [___] ani după.",
        ]),
        h2("8 · Încetare și continuare"),
        *bullets([
            "Oricare parte poate opri pilotul cu notificare scrisă de [___] zile, cu plata activităților prestate.",
            "La trecerea în producție se emite licența de producție; instalarea nu se reface.",
            "La oprire, licența de pilot expiră; clientul primește export complet al conținutului încărcat.",
        ]),
        h2("9 · Semnături"),
        table(
            ["OPSQAI", "Client"],
            [["Nume: Stefan Bari<br/><br/>Funcție: Fondator<br/><br/>Data: [___]<br/><br/>Semnătură: ______________",
              "Nume: [___]<br/><br/>Funcție: [___]<br/><br/>Data: [___]<br/><br/>Semnătură: ______________"]],
            widths=[50, 50],
        ),
    ]
    return build(
        OUT / "OPSQAI_Pilot_SOW_RO.pdf",
        eyebrow="Document de lucru · SOW",
        title="Pilot OPSQAI<br/>Domeniu, livrabile,<br/>responsabilități.",
        subtitle="Model de document de lucru pentru pilotul de 30 de zile.",
        cover_footnote=VER + " · Model. Se completează și se verifică juridic înainte de semnare.",
        footer="OPSQAI · Pilot SOW (RO) · model",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 7 · PREZENTARE PENTRU INVESTITORI
# ──────────────────────────────────────────────────────────────────────────
def investor_deck() -> Path:
    story = [
        note("Document de lucru. Cifrele de venit și alocarea finanțării sunt ținte și proiecții "
             "ale fondatorului, nu rezultate realizate. Marja brută, costul livrării, ciclul de "
             "vânzare și retenția nu sunt încă măsurate pe clienți plătitori."),
        h1("1 · Problema"),
        lead("Firmele cu operațiuni intensive în documente pierd timp și bani pentru că "
             "informația corectă nu ajunge la om în momentul deciziei."),
        p("Soluțiile existente rezolvă părți: un chatbot generic nu cunoaște procedurile firmei, "
          "un intranet nu răspunde la întrebări, un ERP nu explică cum se face o operațiune, iar "
          "instruirea rămâne un fișier PowerPoint."),
        h2("2 · Produsul"),
        p("OPSQAI este o platformă self-hosted care creează spații de lucru AI în jurul "
          "problemelor concrete ale firmei: proceduri, documente, instruire, cereri interne și "
          "fluxuri de lucru, cu răspunsuri bazate strict pe informația clientului și cu audit."),
        metrics_row([
            (str(len(ARCH['core'])), "funcții de platformă (Core)"),
            (str(len([x for x in ARCH['products'] if x['status'] == 'available'])), "produse disponibile azi"),
            (str(len([w for w in ARCH['workspaces'] if w['status'] == 'implemented'])), "spații de lucru construite"),
        ]),
        h2("3 · Diferențierea"),
        *bullets([
            "Self-hosted, nu SaaS: răspunde direct obiecției „datele nu pleacă din firmă”.",
            "Răspuns exclusiv din informația clientului, cu surse și refuz când baza e slabă.",
            "Licențiere prin token semnat criptografic: produsele se activează fără reinstalare.",
            "Model de implementare centrat pe o problemă cu proprietar și indicator.",
            "Experiență de domeniu: fondator cu 10 ani în logistică.",
        ]),
        h2("4 · Model de business"),
        table(
            ["Flux", "Sumă indicativă", "Caracter"],
            [["Implementare", "12.000 € o singură dată", "la intrarea în cont"],
             ["Produse / module", "2.000–6.000 € fiecare", "extindere"],
             ["Mentenanță", "de la 500 €/lună", "recurent"]],
            widths=[30, 38, 32],
        ),
        PageBreak(),
        h1("5 · Stadiu"),
        *bullets([
            "Produsul este funcțional, în faza pre-pilot.",
            "A fost folosit gratuit de studenți în România, ca validare iniițală de produs.",
            "Nu există încă clienți plătitori; prioritatea este primul pilot plătit.",
        ]),
        h2("6 · Piața de start"),
        p("Produsul este orizontal, dar vânzarea începe concentrat: logistică și transport în "
          "Germania/DACH, unde fondatorul are credibilitate și acces. Urmează HR, producție, "
          "servicii și alte operațiuni intensive în documente."),
        h2("7 · Ținte de venit (proiecții ale fondatorului)"),
        table(
            ["An", "Țintă de venit"],
            [["2027", "260.000 €"], ["2028", "580.000 €"], ["2029", "960.000 €"]],
            widths=[30, 70],
        ),
        small("Proiecții, nu angajamente. Depind de rata de conversie a piloturilor și de capacitatea de livrare."),
        h2("8 · Finanțare"),
        p("OPSQAI caută <b>100.000 €</b> pre-seed pentru a transforma produsul funcțional într-o "
          "ofertă pregătită pentru clienți mari: consolidarea produsului, vânzare, infrastructură, "
          "operarea fondatorului și pregătire juridică/GDPR."),
        h2("9 · Riscuri, spuse direct"),
        table(
            ["Risc", "Cum îl tratăm"],
            [
                ["Poziționare prea largă", "Un singur segment de intrare, mesaj pe problemă, nu pe funcții."],
                ["Livrare dependentă de fondator", "Standardizarea Discovery, instalării și pregătirii informației; documentație internă completă."],
                ["Ciclu de vânzare lung la firme mari", "Pilot de 30 de zile, cu preț mic și decizie clară."],
                ["Cerințe de securitate la clienți mari", "Arhitectură self-hosted, documentație tehnică, plan de certificare ulterioară."],
                ["Fără clienți plătitori încă", "Obiectivul imediat: primele piloturi plătite și studii de caz."],
            ],
            widths=[30, 70],
        ),
        Spacer(1, 8),
        callout("Contact", f"Stefan Bari · Fondator · {CONTACT}"),
    ]
    return build(
        OUT / "OPSQAI_Prezentare_Investitori_RO.pdf",
        eyebrow="Prezentare pentru investitori · Document de lucru",
        title="Operațiuni<br/>transformate în<br/>spații de lucru AI.",
        subtitle="Problemă, produs, diferențiere, model de business, stadiu, plan și riscuri.",
        cover_footnote=VER + " · Confidențial. Proiecții ale fondatorului, nu rezultate realizate.",
        footer="OPSQAI · Prezentare investitori (RO) · confidențial",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 8 · LEGAL & PROPRIETATE INTELECTUALĂ
# ──────────────────────────────────────────────────────────────────────────
def legal_ip() -> Path:
    story = [
        note("Document informativ, redactat din perspectiva structurii tehnice reale a produsului. "
             "Nu este consultanță juridică; textele contractuale se validează cu un avocat înainte de utilizare."),
        h1("1 · Ce deține OPSQAI"),
        table(
            ["Activ", "Descriere", "Protecție"],
            [
                ["Codul platformei", "Aplicația web, serverul, spațiile de lucru, motorul de cunoaștere, fluxurile de lucru.", "Drept de autor; cod nepublicat, distribuit compilat/instalat."],
                ["Sistemul de licențiere", "Emiterea și verificarea tokenurilor semnate Ed25519, entitlements pe produs.", "Drept de autor + secret comercial (cheia privată de semnare)."],
                ["Lanțul de instalare Windows", "Installer, servicii, actualizare semnată și verificată prin hash.", "Drept de autor; chei de semnare păstrate offline."],
                ["Arhitectura de produs", "Modelul Core / Produse / Spații de lucru / Entitlements.", "Secret comercial + documentație internă."],
                ["Marca și materialele", "Numele OPSQAI, identitatea vizuală, documentele comerciale.", "Drept de autor; marca se poate înregistra pe clasele relevante."],
                ["Conținutul clientului", "Documente, proceduri, date operaționale.", "Rămâne proprietatea clientului."],
            ],
            widths=[22, 44, 34],
        ),
        h2("2 · Ce primește clientul"),
        *bullets([
            "Un drept de utilizare neexclusiv, netransferabil, pe instalarea proprie, pentru produsele licențiate.",
            "Licența platformei este perpetuă pe instalare: aplicația rămâne funcțională chiar dacă mentenanța nu se reînnoiește.",
            "Actualizările și suportul depind de contractul anual de mentenanță.",
            "Dreptul de export complet al propriului conținut, în orice moment.",
            "Fără drept de decompilare, revânzare, sublicențiere sau operare ca serviciu pentru terți.",
        ]),
        h2("3 · Structura contractuală recomandată"),
        table(
            ["Document", "Rol"],
            [
                ["Contract-cadru", "Părțile, definițiile, răspunderea, confidențialitatea, durata, legea aplicabilă."],
                ["Anexa de licență", "Produsele activate, numărul de instalări, limitele, perpetuitatea licenței."],
                ["Anexa de mentenanță", "Nivel de serviciu, timpi de răspuns, actualizări, condiții de reînnoire."],
                ["SOW / anexa de implementare", "Livrabile, calendar, criterii de acceptanță, ce nu este inclus."],
                ["Acord de prelucrare a datelor (DPA)", "Rolurile GDPR, categorii de date, subprocesatori, retenție, ștergere, notificare incidente."],
                ["NDA", "Confidențialitate reciprocă, înainte de Discovery."],
            ],
            widths=[30, 70],
        ),
        PageBreak(),
        h1("4 · Subprocesatori și transferuri"),
        p("Într-o instalare self-hosted, prelucrarea are loc pe infrastructura clientului. Apar "
          "terți doar în situațiile de mai jos, iar clientul le poate refuza."),
        table(
            ["Situație", "Terț implicat", "Cum se tratează"],
            [
                ["Furnizor AI extern, ales de client", "Furnizorul de modele selectat", "Contract și clauze contractuale standard ale furnizorului; alternativa este modelul local, fără transfer."],
                ["Suport la distanță", "OPSQAI", "Doar la cererea clientului, pe sesiune, cu urmă în jurnal."],
                ["Livrarea actualizărilor", "Rețea de distribuție a pachetelor", "Se transferă doar pachetul software, verificat prin SHA-256; nu date ale clientului."],
                ["Licențiere", "OPSQAI", "Se transferă date de identificare a firmei și starea instalării, nu conținut operațional."],
            ],
            widths=[24, 24, 52],
        ),
        h2("5 · Retenție și ștergere"),
        *bullets([
            "Clientul stabilește politicile de păstrare pe tipuri de date, în platformă.",
            "Ștergerea unei înregistrări lasă urmă în jurnalul de audit (cine, când), fără a păstra conținutul șters.",
            "La încetarea relației: clientul exportă conținutul; OPSQAI păstrează doar datele de facturare și de licență cerute de lege.",
            "Copiile de siguranță urmează ciclul de retenție configurat de client.",
        ]),
        h2("6 · Răspundere și limitări, formulate onest"),
        *bullets([
            "OPSQAI livrează un instrument. Deciziile operaționale, aprobarea documentelor și respectarea legii rămân la client.",
            "Documentele generate în platformă (contracte, proceduri, documente HR) sunt proiecte care trebuie verificate de un jurist al clientului; platforma are un pas explicit de verificare și aprobare exact din acest motiv.",
            "Răspunderea se limitează contractual, de regulă la valoarea plătită în ultimele 12 luni, cu excepțiile impuse de lege.",
            "Nu se garantează absența erorilor sau disponibilitatea 100%; se garantează suport cu timpi de răspuns definiți.",
        ]),
        h2("7 · Igiena internă a proprietății intelectuale"),
        *bullets([
            "Cheile private de semnare (licență și actualizări) stau offline, separat de aplicație.",
            "Fiecare colaborator semnează cesiune de drepturi de autor și NDA înainte de acces la cod.",
            "Dependențele externe se verifică pentru compatibilitatea licențelor înainte de includere.",
            "Marca și domeniile se mențin înregistrate pe entitatea care deține produsul.",
        ]),
        Spacer(1, 8),
        callout("Contact juridic/comercial", f"Stefan Bari · {CONTACT}"),
    ]
    return build(
        OUT / "OPSQAI_Legal_Proprietate_Intelectuala_RO.pdf",
        eyebrow="Legal & proprietate intelectuală",
        title="Ce deține OPSQAI.<br/>Ce primește<br/>clientul.",
        subtitle="Active, licențiere, structură contractuală, subprocesatori, retenție și răspundere.",
        cover_footnote=VER + " · Document informativ, nu consultanță juridică.",
        footer="OPSQAI · Legal & IP (RO)",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 9 · PLAN DE AFACERI
# ──────────────────────────────────────────────────────────────────────────
def business_plan() -> Path:
    story = [
        h1("0 · Cum se citește acest plan"),
        note("Prima versiune master a planului de afaceri OPSQAI. Se bazează pe informațiile "
             "fondatorului și pe documentația de produs existentă. Nu înlocuiește validarea "
             "juridică, contabilă sau de piață din surse externe."),
        h3("Date confirmate"),
        *bullets([
            "OPSQAI este funcțional, în faza pre-pilot.",
            "Fondator: Stefan Bari, 10 ani de experiență în logistică.",
            "Platforma creează spații de lucru în jurul problemei concrete a firmei.",
            "Aplicația a fost folosită gratuit de studenți în România, ca validare inițială.",
            "Preț indicativ: 12.000 € implementare; 2.000–6.000 € produse; mentenanță de la 500 €/lună.",
            "Ținte de venit: 260.000 € în 2027, 580.000 € în 2028, 960.000 € în 2029.",
            "Necesar de finanțare: 100.000 €.",
        ]),
        h3("Ipoteze de validat"),
        *bullets([
            "Segment comercial inițial: firme mici și medii cu probleme operaționale repetabile și procese documentate.",
            "Vârful de lance recomandat: logistică și transport în Germania/DACH, fără a limita produsul la acest sector.",
            "Poziționare: produs orizontal, go-to-market concentrat.",
            "Marja brută, costul livrării, ciclul de vânzare și retenția nu sunt încă măsurate pe clienți plătitori.",
        ]),
        h2("1 · Sinteză"),
        p("OPSQAI transformă problemele operaționale în spații de lucru AI utilizabile. În loc de "
          "un chatbot generic, clientul primește un mediu guvernat, cu produse, roluri, date "
          "izolate și impact măsurabil."),
        p("Traseul comercial este: Problemă → Discovery → Spațiu de lucru → ROI măsurat."),
        h2("2 · Fondator"),
        p("Stefan Bari are 10 ani de experiență în logistică. De aici vine punctul de plecare "
          "practic al produsului: procesele reale nu sunt doar documente, ci combinații de "
          "oameni, excepții, termene, responsabilități, instruire și decizii luate sub presiune."),
        PageBreak(),
        h1("3 · Produs și stadiu tehnic"),
        table(
            ["Componentă", "Stare astăzi"],
            [
                ["Platforma Core", f"{len(ARCH['core'])} funcții implementate (chat cu surse, cunoaștere, Academy, audit, roluri, rapoarte etc.)"],
                ["Produse disponibile", ", ".join(x["label"] for x in ARCH["products"] if x["status"] == "available")],
                ["Produse planificate", ", ".join(x["label"] for x in ARCH["products"] if x["status"] == "planned")],
                ["Spații de lucru construite", f"{len([w for w in ARCH['workspaces'] if w['status'] == 'implemented'])}"],
                ["Instalare", "Windows Self-Hosted, cu installer, servicii și actualizare semnată"],
                ["Licențiere", "Token semnat Ed25519, cu produse și limite, verificat la instalare"],
            ],
            widths=[28, 72],
        ),
        h2("4 · Client-țintă"),
        *bullets([
            "Firme de 20–500 de angajați, cu operațiuni intensive în documente și proceduri.",
            "Sectoare de intrare: transport și logistică; apoi HR, producție, servicii.",
            "Semnale de cumpărare: fluctuație de personal, audituri, amenzi, dependență de 2–3 experți interni.",
            "Decidentul: proprietar sau director de operațiuni; utilizatorul: dispecer, șef de echipă, HR.",
        ]),
        h2("5 · Go-to-market"),
        *numbered([
            "Contact direct în DACH, pe problema operațională, nu pe tehnologie.",
            "Discovery de 60 de minute, cu fișa problemei ca rezultat.",
            "Pilot plătit de 30 de zile, cu indicator măsurat.",
            "Studiu de caz după fiecare pilot reușit; referințe în sector.",
            "Extindere în cont: produse noi, mai mulți utilizatori, mentenanță superioară.",
        ]),
        h2("6 · Concurență"),
        table(
            ["Alternativă", "Limita ei", "Poziția OPSQAI"],
            [
                ["Asistenți AI generici", "Nu cunosc procedurile firmei; inventează.", "Răspuns doar din informația clientului, cu surse și refuz."],
                ["Intranet / SharePoint", "Depozit pasiv; nimeni nu caută în el.", "Răspuns în context, sarcini și instruire legate de proceduri."],
                ["ERP / TMS", "Execută tranzacții, nu explică operațiunea.", "Strat de cunoaștere și guvernanță deasupra proceselor."],
                ["Platforme de instruire", "Instruire separată de operațiune.", "Academy legat de procedurile reale, cu certificate."],
                ["AI SaaS cloud", "Obiecția „datele pleacă din firmă”.", "Self-hosted, cu opțiune de model AI local."],
            ],
            widths=[22, 34, 44],
        ),
        PageBreak(),
        h1("7 · Model de venit"),
        table(
            ["Flux", "Sumă indicativă", "Frecvență"],
            [["Implementare", "12.000 €", "o singură dată, la intrare"],
             ["Produs / modul", "2.000–6.000 €", "la fiecare extindere"],
             ["Mentenanță", "de la 500 €/lună", "lunar/anual, recurent"]],
            widths=[30, 34, 36],
        ),
        h2("8 · Plan operațional pe 18 luni"),
        table(
            ["Perioadă", "Obiectiv"],
            [
                ["Luna 1–3", "Primele 3 piloturi plătite; standardizarea Discovery și a instalării."],
                ["Luna 4–6", "Primele contracte de producție; două studii de caz; documentație completă pentru client."],
                ["Luna 7–12", "Repetabilitate: proces de vânzare, livrare în timp previzibil, mentenanță activă."],
                ["Luna 13–18", "Extinderea produselor (Finance, Inventory), primul coleg de livrare, pregătire pentru cerințe de securitate ale firmelor mari."],
            ],
            widths=[20, 80],
        ),
        h2("9 · Utilizarea finanțării de 100.000 €"),
        table(
            ["Direcție", "Scop"],
            [
                ["Consolidarea produsului", "Stabilitate, instalare fără fricțiuni, actualizări, documentație."],
                ["Vânzare și marketing", "Generare de cereri în DACH, materiale, participare la evenimente."],
                ["Infrastructură", "Medii de test, semnare de cod, instrumente de suport."],
                ["Operarea fondatorului", "Dedicare full-time pe produs și vânzare."],
                ["Juridic și GDPR", "Contracte, DPA, pregătirea cerințelor de securitate ale clienților mari."],
            ],
            widths=[30, 70],
        ),
        h2("10 · Riscuri"),
        *bullets([
            "Poziționare prea largă → un singur segment de intrare.",
            "Dependența livrării de fondator → standardizare și documentație internă.",
            "Ciclu de vânzare lung → pilot mic, ieftin, cu decizie clară.",
            "Cerințe de securitate ale firmelor mari → arhitectură self-hosted și plan de certificare.",
            "Lipsa clienților plătitori → prioritate absolută pe primele piloturi plătite.",
        ]),
        Spacer(1, 8),
        callout("Decizia strategică centrală",
                "OPSQAI poate servi orice firmă, dar nu trebuie să vândă „oricui” în prima fază "
                "comercială. Produsul rămâne orizontal; mesajul, exemplele și vânzarea încep acol"
                " unde fondatorul are credibilitate și acces."),
    ]
    return build(
        OUT / "OPSQAI_Plan_de_Afaceri_RO.pdf",
        eyebrow="Plan de afaceri · Document de lucru",
        title="Spațiul tău de lucru.<br/>Construit în jurul<br/>problemelor tale.",
        subtitle="Platformă AI self-hosted care transformă cunoașterea și procesele firmei în spații de lucru guvernate și măsurabile.",
        cover_footnote="Draft 0.1 · septembrie 2026 · Fondator: Stefan Bari · Stadiu: funcțional / pre-pilot",
        footer="OPSQAI · Plan de afaceri (RO) · document de lucru confidențial",
        story=story,
    )


# ──────────────────────────────────────────────────────────────────────────
# 10 · SINTEZĂ MODEL FINANCIAR
# ──────────────────────────────────────────────────────────────────────────
def financial_model() -> Path:
    story = [
        note("Toate cifrele sunt ținte și ipoteze de lucru, nu rezultate realizate. Nu există "
             "încă venit de la clienți plătitori. Modelul trebuie revizuit după primele piloturi "
             "plătite și verificat de un contabil."),
        h1("1 · Țintele fondatorului"),
        table(
            ["An", "Țintă de venit", "Ce trebuie să fie adevărat"],
            [
                ["2027", "260.000 €", "aproximativ 8–12 implementări plus mentenanță în creștere"],
                ["2028", "580.000 €", "livrare repetabilă, extindere în conturile existente, primul coleg de livrare"],
                ["2029", "960.000 €", "portofoliu de produse mai larg și bază de mentenanță consistentă"],
            ],
            widths=[14, 26, 60],
        ),
        h2("2 · Elementele de venit"),
        table(
            ["Element", "Valoare unitară indicativă", "Caracter"],
            [["Implementare", "12.000 €", "o singură dată"],
             ["Produs configurat", "2.000–6.000 €", "la extindere"],
             ["Mentenanță", "de la 500 €/lună (de la 6.000 €/an)", "recurent"]],
            widths=[26, 40, 34],
        ),
        h2("3 · Exemplu de cont nou (ilustrativ)"),
        table(
            ["Componentă", "Sumă"],
            [["Implementare", "12.000 €"],
             ["Două produse", "4.000–12.000 €"],
             ["Mentenanță, 12 luni", "de la 6.000 €"],
             ["<b>Total primul an</b>", "<b>de la 22.000 €</b>"],
             ["Anul doi (doar mentenanță)", "de la 6.000 €"]],
            widths=[66, 34],
        ),
        h2("4 · Ipoteze de cost (de validat)"),
        table(
            ["Categorie", "Comentariu"],
            [
                ["Livrare (implementare)", "Efort de zile-om pentru Discovery, instalare, pregătirea informației, instruire. Costul real se cunoaște după primele 3 piloturi."],
                ["Suport și mentenanță", "Timp recurent pe client; scade cu maturitatea documentației."],
                ["Vânzare", "Generarea cererilor în DACH, deplasări, materiale."],
                ["Infrastructură și instrumente", "Medii de test, semnare de cod, monitorizare, instrumente de suport."],
                ["Juridic și conformitate", "Contracte, DPA, pregătirea răspunsurilor la chestionare de securitate."],
            ],
            widths=[26, 74],
        ),
        PageBreak(),
        h1("5 · Alocarea finanțării de 100.000 €"),
        table(
            ["Direcție", "Rol în plan"],
            [
                ["Produs", "Stabilitate, instalare fără fricțiuni, actualizări, documentație pentru client."],
                ["Vânzare și marketing", "Primele piloturi plătite și studii de caz în DACH."],
                ["Infrastructură", "Medii, semnare, suport."],
                ["Operarea fondatorului", "Dedicare full-time."],
                ["Juridic / GDPR", "Contracte, DPA, pregătire pentru clienți mari."],
            ],
            widths=[28, 72],
        ),
        small("Procentele exacte se fixează la momentul finanțării, în funcție de primele rezultate comerciale."),
        h2("6 · Planificarea numerarului"),
        *bullets([
            "Implementarea se facturează în tranșe legate de punctele de control, ca să nu finanțeze furnizorul livrarea.",
            "Mentenanța se facturează anual, în avans, unde clientul acceptă.",
            "Pilotul se plătește la start; acoperă costul de livrare al pilotului.",
            "Rezerva de siguranță: minimum trei luni de costuri fixe.",
        ]),
        h2("7 · Indicatorii de urmărit de la primul client"),
        table(
            ["Indicator", "De ce contează"],
            [
                ["Zile-om pe implementare", "Determină marja brută reală."],
                ["Rata de conversie pilot → producție", "Cel mai important indicator comercial al fazei actuale."],
                ["Venit recurent din mentenanță", "Baza de predictibilitate."],
                ["Extinderea în cont", "Câte produse se adaugă după primul an."],
                ["Ore de suport pe client și lună", "Costul real al serviciului recurent."],
                ["Durata ciclului de vânzare", "Planificarea numerarului."],
            ],
            widths=[34, 66],
        ),
        h2("8 · Sensibilități"),
        *bullets([
            "Dacă implementarea cere cu 50% mai mult efort decât estimat, marja scade semnificativ: prima măsură este standardizarea pregătirii informației.",
            "Dacă doar una din trei piloturi ajunge în producție, ținta 2027 necesită aproximativ de trei ori mai multe piloturi.",
            "Dacă mentenanța nu se reînnoiește, venitul recurent dispare, dar licența perpetuă rămâne la client — de aceea calitatea suportului este parte din produs.",
        ]),
        Spacer(1, 8),
        callout("Contact", f"Stefan Bari · {CONTACT}"),
    ]
    return build(
        OUT / "OPSQAI_Model_Financiar_RO.pdf",
        eyebrow="Model financiar · sinteză",
        title="Scenariu de bază<br/>2027–2029.",
        subtitle="Ținte de venit, alocarea finanțării, ipoteze de operare și planificarea numerarului.",
        cover_footnote="Monedă: EUR · " + VER + " · Proiecții, nu rezultate realizate.",
        footer="OPSQAI · Model financiar (RO) · proiecții",
        story=story,
    )


def main() -> None:
    made = [
        one_pager(),
        customer_deck(),
        pricing(),
        security(),
        pilot_proposal(),
        pilot_sow(),
        investor_deck(),
        legal_ip(),
        business_plan(),
        financial_model(),
    ]
    for m in made:
        print("ok", m)


if __name__ == "__main__":
    main()
