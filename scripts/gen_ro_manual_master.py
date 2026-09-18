#!/usr/bin/env python3
"""OPSQAI — Manual master de instalare și operare (RO). UZ INTERN."""
from __future__ import annotations

import json
import re
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
    code,
    h1,
    h2,
    h3,
    lead,
    note,
    numbered,
    p,
    small,
    table,
)

OUT = Path("/mnt/documents/OPSQAI_Manual_Master_Instalare_RO.pdf")
ARCH = json.loads(Path("/tmp/arch.json").read_text())
MIGR = sorted(Path("migrations/selfhost").glob("*.sql"))
VER = "Versiunea 1.0 · septembrie 2026"

INTERN = ("UZ INTERN — NU SE TRIMITE CLIENTULUI. Documentul conține comenzi de "
          "administrare, denumiri de servicii și pași de depanare pentru instalarea "
          "de la client.")


def migr_table():
    rows = []
    for f in MIGR:
        m = re.match(r"(\d+)_(.+)\.sql", f.name)
        if not m:
            continue
        rows.append([m.group(1), m.group(2).replace("_", " ")])
    return rows


def main() -> None:
    rows = migr_table()
    story = [
        note(INTERN),
        h1("0 · Ce trebuie să fie clar înainte de orice instalare"),
        lead("OPSQAI sunt două produse separate. Nu se amestecă niciodată."),
        table(
            ["Produs", "Unde rulează", "Pentru cine", "Ce conține"],
            [
                ["Self-Hosted", "Serverul Windows al clientului", "Clientul final",
                 "Platforma Core + produsele licențiate. Transport și Operations există numai aici."],
                ["Management Center + Portal", "opsqai.de (cloud)", "Echipa OPSQAI",
                 "Clienți, licențe, produse activate, pachete de actualizare, telemetrie. Clientul nu are acces."],
            ],
            widths=[20, 24, 18, 38],
        ),
        p("Cele două comunică doar prin interfețe delimitate: licență, pachet de actualizare și "
          "telemetrie. Nu se adaugă ecrane de Management Center în instalarea clientului și "
          "invers."),
        h2("1 · Pregătirea serverului clientului"),
        table(
            ["Element", "Cerință minimă", "Recomandat"],
            [
                ["Sistem de operare", "Windows Server 2019 / Windows 10 Pro x64", "Windows Server 2022"],
                ["Procesor", "4 nuclee", "8 nuclee (mai mult dacă modelul AI rulează local)"],
                ["Memorie", "8 GB", "16–32 GB cu model AI local"],
                ["Spațiu pe disc", "40 GB liberi", "100 GB+ (documente, index, copii de siguranță)"],
                ["Rețea", "acces la 443 în rețeaua internă", "nume DNS intern + certificat"],
                ["Drepturi", "cont cu drepturi de administrator local", "cont de serviciu dedicat"],
            ],
            widths=[20, 40, 40],
        ),
        *bullets([
            "Porturi: 443 pentru accesul utilizatorilor (Caddy), 127.0.0.1:3000 pentru aplicație (intern), 55432 pentru baza de date încorporată (intern).",
            "Antivirus: adaugă excepții pentru %ProgramFiles%\\OPSQAI și %ProgramData%\\OPSQAI, altfel scanarea blochează pornirea serviciilor.",
            "Dacă se folosește PostgreSQL extern, este nevoie de PostgreSQL 15+ cu extensia pgvector 0.5+ și un utilizator cu drept de creare de obiecte.",
            "Ora serverului trebuie să fie corectă (verificarea licenței și alertele depind de ea).",
        ]),
        PageBreak(),
        h1("2 · Instalarea pe Windows"),
        p("Installer-ul (OPSQAI-Setup.exe) livrează aplicația, runtime-ul Node, PostgreSQL cu "
          "pgvector, Caddy, wrapperele de serviciu și asistentul de configurare. Rulează "
          "installer-ul ca administrator."),
        h3("Serviciile create"),
        table(
            ["Serviciu", "Rol"],
            [
                ["OpsqaiDatabase", "PostgreSQL încorporat (dacă nu se folosește o bază externă)."],
                ["OpsqaiPlatform", "Aplicația web (serverul aplicației, pe 127.0.0.1:3000)."],
                ["OpsqaiWorker", "Sarcini de fundal: indexare, alerte, e-mail, curățenie."],
                ["OpsqaiCaddy", "Proxy HTTPS în față, pe 443."],
                ["OpsqaiUpdater", "Verifică, descarcă și instalează actualizările; execută comenzile de repornire."],
            ],
            widths=[26, 74],
        ),
        h3("Ordinea pornirii și verificarea"),
        code([
            "opsqai status",
            "opsqai doctor",
            "opsqai logs OpsqaiPlatform --tail 200",
        ]),
        h3("Modul instalării — greșeala clasică"),
        p("Serviciul aplicației trebuie să pornească cu <b>OPSQAI_MODE=selfhost</b>. Dacă "
          "lipsește, aplicația se consideră instalare cloud: asistentul de primă configurare nu "
          "apare, funcțiile rezervate instalării locale nu se încarcă, iar meniul pierde "
          "intrări (de exemplu Users). Variabilele vechi OPSQAI_PLATFORM_MODE și "
          "OPSQAI_DEPLOYMENT_TYPE sunt acceptate ca rezervă, dar valoarea corectă se setează în "
          "lansatorul serviciului."),
        h3("Fișierele importante"),
        table(
            ["Cale", "Conținut"],
            [
                ["%ProgramFiles%\\OPSQAI\\app", "Aplicația, serverul, migrările."],
                ["%ProgramFiles%\\OPSQAI\\runtime\\node", "Runtime-ul Node livrat cu produsul."],
                ["%ProgramData%\\OPSQAI\\config\\config.json", "Configurația instalării: installId, baza de date, licență, actualizări."],
                ["%ProgramData%\\OPSQAI\\logs", "Jurnalele serviciilor."],
                ["%ProgramData%\\OPSQAI\\data", "Fișiere încărcate, pachete de actualizare, copii de siguranță."],
            ],
            widths=[38, 62],
        ),
        PageBreak(),
        h1("3 · Baza de date"),
        p("Baza de date poate fi cea încorporată (recomandat pentru majoritatea clienților) sau "
          f"una externă. Schema se construiește din migrările din app\\migrations, "
          f"aplicate în ordine numerică: {len(rows)} migrări, de la {rows[0][0]} la {rows[-1][0]}."),
        h3("Cum se aplică"),
        p("Nu se rulează SQL manual. Migrările le aplică migratorul livrat cu aplicația, care "
          "creează baza și rolul, aplică fișierele în ordine, înregistrează fiecare migrare și "
          "creează primul administrator:"),
        code([
            'set OPSQAI_CONFIG=%ProgramData%\\OPSQAI\\config\\config.json',
            'set OPSQAI_ADMIN_EMAIL=admin@client.ro',
            'set OPSQAI_ADMIN_PASSWORD=<parola initiala>',
            '"%ProgramFiles%\\OPSQAI\\runtime\\node\\node.exe" "%ProgramFiles%\\OPSQAI\\app\\server\\migrate.mjs"',
        ]),
        p("Același pas rulează automat prin asistentul de instalare și la fiecare actualizare. "
          "Bootstrap-ul îl apelează după ce baza răspunde la pg_isready."),
        h3("Verificarea"),
        code([
            "opsqai doctor",
            "-- in psql:",
            "select count(*) from schema_migrations;",
            "select extname, extversion from pg_extension where extname = 'vector';",
        ]),
        h3("Când o migrare eșuează"),
        *numbered([
            "Citește jurnalul: %ProgramData%\\OPSQAI\\logs — migratorul scrie un cod structurat (de exemplu OPSQAI-E1102 pentru baza care nu răspunde, OPSQAI-E1902 pentru pachet incomplet).",
            "Bază care nu răspunde: verifică serviciul OpsqaiDatabase, portul 55432 și parola din config.json.",
            "Lipsă pgvector pe o bază externă: rulează CREATE EXTENSION vector; sau acordă utilizatorului dreptul de a crea extensii.",
            "Drepturi insuficiente: utilizatorul bazei trebuie să poată crea schema, tabele, indexuri și extensii.",
            "Migrare aplicată parțial: restaurează ultima copie de siguranță, remediază cauza, reia migratorul. Nu edita manual schema_migrations.",
            "Doar pe o instalare de test, resetarea completă: opsqai db reset --yes",
        ]),
        note("Dimensiunea vectorilor de embedding este fixată de migrări (vezi 0010 și 0017). "
             "Dacă schimbi furnizorul de embedding cu unul care produce altă dimensiune, indexul "
             "trebuie reconstruit; nu se amestecă dimensiuni în același tabel."),
        h3("Lista migrărilor"),
        table(["Nr.", "Conținut"], rows, widths=[10, 90], keep=False),
        PageBreak(),
        h1("4 · Prima pornire"),
        *numbered([
            "Deschide https://<numele-serverului>/ din rețeaua clientului.",
            "Asistentul de primă configurare apare numai în modul selfhost. Dacă nu apare, verifică OPSQAI_MODE.",
            "Creează primul SuperAdmin (e-mail real al clientului, parolă schimbată la prima intrare).",
            "Completează profilul firmei: denumire, domeniu de activitate, limbă implicită, fus orar.",
            "Activează licența (secțiunea 5).",
            "Configurează furnizorul de AI (secțiunea 6).",
            "Creează departamentele și rolurile, apoi invită utilizatorii.",
        ]),
        note("Ultimul SuperAdmin este protejat: nu poate fi șters sau retrogradat. Dacă trebuie "
             "schimbat, creează mai întâi noul SuperAdmin."),
        h1("5 · Licența"),
        *numbered([
            "În Management Center: creează clientul (firmă, contact, profil de activitate).",
            "Activează produsele cumpărate și funcțiile Core (toate funcțiile Core sunt active implicit pe o licență nouă).",
            "Emite licența. Rezultatul este un token semnat Ed25519 care conține: identificatorul instalării, firma, produsele și capabilitățile, limitele și data de expirare.",
            "Copiază tokenul și introdu-l în instalarea clientului, la secțiunea de licență.",
            "Instalarea verifică semnătura cu cheia publică livrată în pachet și reține entitlements.",
            "Ai vândut un produs nou? Reemiți licența în Management Center și clientul o reintroduce (sau o preia automat, dacă are legătură cu serverul de licențe). Nu este nevoie de reinstalare.",
        ]),
        *bullets([
            "Cheia privată de semnare stă offline. Nu ajunge niciodată pe serverul clientului sau în repository.",
            "Licența platformei este perpetuă: la expirarea mentenanței aplicația rămâne funcțională, dar actualizările și suportul se opresc.",
            "Verificare rapidă în instalare: opsqai doctor arată starea licenței și produsele active.",
        ]),
        PageBreak(),
        h1("6 · Furnizorul de AI"),
        *bullets([
            "Se configurează în instalarea clientului, la setările de AI: tipul furnizorului, adresa și cheia (dacă e nevoie).",
            "Varianta complet locală: un server de modele instalat pe rețeaua clientului (de exemplu Ollama) — nicio cerere nu iese în internet. Recomandat când politica clientului interzice ieșirea datelor.",
            "Varianta externă: furnizor comercial de modele; atunci intră în discuție clauzele de transfer de date și trebuie menționat în DPA.",
            "Modelul de embedding trebuie să rămână același cât timp indexul există; schimbarea cere reindexare.",
            "Dacă furnizorul nu răspunde: chatul afișează eroare și nu inventează răspunsuri; restul aplicației funcționează normal.",
        ]),
        h1("7 · Copii de siguranță și restaurare"),
        code([
            "opsqai backup create --tag inainte-de-update",
            "opsqai backup list",
            "opsqai backup verify <snapshot-id>",
            "opsqai backup restore <snapshot-id>",
            "opsqai backup schedule",
        ]),
        *bullets([
            "Copia include baza de date și fișierele încărcate; hash-ul SHA-256 se memorează la creare.",
            "verify recalculează hash-ul și îl compară — o copie coruptă se descoperă înainte de a fi nevoie de ea.",
            "Testează restaurarea pe un server de test, cel puțin o dată la predarea instalării și apoi periodic.",
            "Programează copii automate la client și stabilește unde se duplică în afara serverului.",
        ]),
        h1("8 · Actualizări"),
        *numbered([
            "Canalul (stable / beta) și fereastra de mentenanță se setează în ecranul Updates al clientului.",
            "Verificare: opsqai update check — sau automat, la ciclul de interogare.",
            "Descărcare: bară de progres pe octeții primiți efectiv, apoi verificare SHA-256 față de descriptorul semnat. Dacă nu vin date 90 de secunde, descărcarea se oprește cu mesaj; una rămasă agățată apare ca eșuată după 3 minute și poate fi reluată.",
            "Instalare: opsqai update apply (sau butonul din interfață). Se aplică binarele și migrările.",
            "Instalare din fișier: dacă clientul a descărcat pachetul de pe site, îl încarcă din ecranul Updates — se verifică față de aceeași semnătură înainte de instalare.",
            "Distribuție în rețeaua clientului: pe instalarea care are pachetul se activează servirea către colegi; celelalte instalări îl iau din rețeaua locală, cu același control de hash și cu un token de acces.",
            "La final apare confirmarea versiunii, cu opțiunea de repornire a computerului (serviciul execută repornirea cu 20 de secunde de avertizare) sau de închidere a ferestrei.",
            "Istoric: opsqai update history.",
        ]),
        note("Înainte de fiecare actualizare la un client: copie de siguranță, verificarea ei și "
             "anunțarea utilizatorilor. Actualizarea repornește serviciile."),
        PageBreak(),
        h1("9 · Depanare — erori reale și cauza lor"),
        table(
            ["Simptom", "Cauză probabilă", "Ce faci"],
            [
                ["Meniul nu are Users; funcțiile nu se încarcă; nu pot fi adăugate licențe sau documente",
                 "Instalarea nu rulează în modul selfhost (OPSQAI_MODE lipsește) sau încărcarea permisiunilor a eșuat",
                 "Verifică OPSQAI_MODE în lansatorul serviciului, repornește OpsqaiPlatform; în interfață apare un banner de eroare de permisiuni cu buton de reîncercare"],
                ["Aplicația repornește în buclă, HTTP 500",
                 "config.json fără installId valid sau baza inaccesibilă",
                 "opsqai logs OpsqaiPlatform --tail 200; corectează config.json (nu inventa installId) și repornește"],
                ["FATAL: config path… la pornire",
                 "config.json lipsă sau corupt",
                 "Reia asistentul de configurare sau services\\bootstrap\\init.js"],
                ["Descărcarea actualizării blocată la 99%",
                 "Progres calculat pe mărimea anunțată, legătură întreruptă",
                 "Versiunea actuală calculează pe octeții primiți și marchează eșecul; reia din butonul de descărcare"],
                ["Documentul HR nu poate fi aprobat",
                 "Verificarea juridică nu e închisă sau utilizatorul nu are dreptul de verificare",
                 "Fă verificarea internă sau externă, ori trimite linkul de verificare; dreptul se acordă pe acțiunile de aprobare/administrare"],
                ["Chatul nu răspunde, dar interfața merge",
                 "Furnizorul de AI inaccesibil",
                 "Verifică adresa și cheia; testează serverul de modele local"],
                ["Căutarea nu găsește documente noi",
                 "Indexarea în așteptare sau OpsqaiWorker oprit",
                 "opsqai status; repornește OpsqaiWorker; verifică jurnalul lui"],
                ["Eroare de coloană inexistentă într-un raport",
                 "Migrare neaplicată după actualizare",
                 "Rulează migratorul, apoi opsqai doctor"],
                ["Utilizatorii nu ajung la aplicație",
                 "Caddy oprit, certificat sau DNS intern",
                 "opsqai status; opsqai logs OpsqaiCaddy --tail 200"],
            ],
            widths=[24, 30, 46],
            keep=False,
        ),
        h3("Comenzi de diagnostic"),
        code([
            "opsqai status",
            "opsqai doctor",
            "opsqai logs <OpsqaiPlatform|OpsqaiWorker|OpsqaiDatabase|OpsqaiCaddy|OpsqaiUpdater> --tail 200",
            "opsqai update check | apply | history",
            "opsqai telemetry status",
            "opsqai config get <cheie.punctata>",
            "opsqai config set <cheie.punctata> <valoare>",
        ]),
        PageBreak(),
        h1("10 · Verificări finale înainte de predare"),
        table(
            ["#", "Verificare", "Cum confirmi"],
            [
                ["1", "Toate cele cinci servicii pornite", "opsqai status"],
                ["2", "Modul instalării este selfhost", "Asistentul de configurare a apărut; meniul are Users"],
                ["3", "Toate migrările aplicate", "opsqai doctor; numărul din schema_migrations"],
                ["4", "Licența activă, produsele corecte", "Ecranul de licență; opsqai doctor"],
                ["5", "Primul SuperAdmin predat clientului", "Parolă schimbată la prima intrare"],
                ["6", "Roluri și departamente configurate", "Un utilizator de test vede exact ce trebuie"],
                ["7", "Furnizorul AI funcțional", "O întrebare de test primește răspuns cu sursă"],
                ["8", "Documente încărcate și indexate", "Căutarea le găsește"],
                ["9", "Copie de siguranță creată și verificată", "opsqai backup create / verify"],
                ["10", "Restaurare testată", "Pe un server de test"],
                ["11", "Actualizare testată", "opsqai update check trece; canalul e setat"],
                ["12", "Acces HTTPS din rețeaua clientului", "De pe două stații diferite"],
                ["13", "Excepții de antivirus puse", "Lista de excluderi a clientului"],
                ["14", "Instruirea administratorului clientului", "A rulat singur opsqai status și o copie de siguranță"],
            ],
            widths=[6, 44, 50],
            keep=False,
        ),
        h2("Ce se predă clientului"),
        *bullets([
            "One Pager, Prezentarea pentru client, Prețuri, Securitate & GDPR, Funcțiile aplicației.",
            "Datele de acces ale primului administrator și procedura de schimbare a parolei.",
            "Cum se cere suport și care sunt timpii de răspuns.",
            "Acest manual NU se predă clientului.",
        ]),
        Spacer(1, 8),
        callout("Notă finală",
                "Manualul descrie instalarea așa cum o livrează pachetul actual. La fiecare "
                "versiune nouă, verifică numărul migrărilor și ecranul de actualizări înainte de "
                f"a-l folosi la un client. Întrebări: {CONTACT}"),
        small("Generat automat din structura reală a proiectului: "
              f"{len(rows)} migrări, {len(ARCH['core'])} funcții Core, "
              f"{len([w for w in ARCH['workspaces'] if w['status'] == 'implemented'])} spații de lucru."),
    ]
    build(
        OUT,
        eyebrow="Manual master · uz intern",
        title="Instalare și operare<br/>OPSQAI la client.",
        subtitle="Server, baza de date, migrări, prima pornire, licență, AI, copii de siguranță, actualizări, depanare și verificări finale.",
        cover_footnote=VER + " · UZ INTERN. Nu se trimite clientului.",
        footer="OPSQAI · Manual master (RO) · UZ INTERN",
        story=story,
    )
    print("ok", OUT)


if __name__ == "__main__":
    main()
