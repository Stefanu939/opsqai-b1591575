#!/usr/bin/env python3
# OPSQAI — Ghid de vanzare: problema / solutie (RO)
# Genereaza /mnt/documents/OPSQAI_Probleme_Soluții_RO.pdf
#
# Continutul reflecta functiile reale din OPSQAI Core, Transport si HR.

import subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

OUT = "/mnt/documents/OPSQAI_Probleme_Soluții_RO.pdf"

GRAPHITE = HexColor("#101315")
SLATE = HexColor("#252B2D")
PAPER = HexColor("#F1F3EF")
GREEN = HexColor("#26A67A")
TEAL = HexColor("#247D91")
RED = HexColor("#B3392F")
MUTED = HexColor("#6B7375")
HAIR = HexColor("#D5D9D2")

W, H = A4
M = 20 * mm


def font(spec, name):
    path = subprocess.check_output(["fc-match", "-f", "%{file}", spec], text=True).strip()
    pdfmetrics.registerFont(TTFont(name, path))
    return name


BODY = font("DejaVu Sans", "DJ")
BOLD = font("DejaVu Sans:bold", "DJB")
ITAL = font("DejaVu Sans:italic", "DJI")


# ---------------------------------------------------------------- content

INTRO = (
    "Acest document este instrumentul de vânzare al OPSQAI. Pentru fiecare funcție a "
    "produsului sunt scrise problemele reale pe care le întâlnește o firmă și modul "
    "concret în care OPSQAI le rezolvă. Nu vindem funcții, vindem eliminarea unor "
    "pierderi măsurabile: timp pierdut, greșeli repetate, informație care nu se găsește, "
    "documente expirate, oameni care întreabă de două ori același lucru."
)

HOWTO = [
    "Fiecare funcție are cel puțin două perechi Problemă → Soluție.",
    "În discuția cu clientul, alege problemele pe care le recunoaște el, nu toate.",
    "Formula care funcționează: „Recunoașteți asta?” → problema → ce face OPSQAI → ce se schimbă luni dimineața.",
    "AI-ul din OPSQAI asistă: extrage, compară, semnalează, propune. Decizia rămâne la om. Spune asta explicit — crește încrederea.",
    "OPSQAI rulează în cloud sau Self-Hosted, pe infrastructura clientului, cu AI local. Pentru firmele sensibile la date, acesta este argumentul decisiv.",
]

PRODUCTS = [
    (
        "OPSQAI CORE",
        "Nucleul comun: cunoașterea firmei, AI-ul care răspunde strict din ea, "
        "instruirea oamenilor, incidentele și inteligența operațională. Este inclus "
        "întotdeauna, nu se vinde separat.",
        [
            (
                "Knowledge Base (SOP-uri, proceduri, documente)",
                [
                    ("Firma are 10 SOP-uri răspândite în 20 de locuri: e-mail, WhatsApp, un dosar pe server, un teanc printat la birou.",
                     "KB le ține într-un singur loc, cu proprietar, departament și versiune. Un singur punct de adevăr pentru toată firma."),
                    ("Nimeni nu știe care versiune e valabilă; oamenii lucrează după o procedură veche de doi ani.",
                     "Fiecare document are versiune, data ultimei revizii și stare „la zi / de revizuit / expirat”, cu reamintire automată când termenul trece."),
                    ("Când pleacă o persoană-cheie, pleacă și jumătate din felul în care se lucrează.",
                     "Cunoașterea este scrisă, atribuită unui departament și rămâne în firmă, indiferent de fluctuația de personal."),
                ],
            ),
            (
                "FAQ (întrebări frecvente pe departament)",
                [
                    ("Aceleași 30 de întrebări ajung zilnic la șef sau la colegul cu experiență; acesta își pierde ziua răspunzând.",
                     "Răspunsurile se scriu o singură dată ca FAQ și sunt găsite de oricine, fără să deranjeze pe nimeni."),
                    ("Doi colegi dau două răspunsuri diferite la aceeași întrebare și urmează o greșeală.",
                     "Un singur răspuns oficial, aprobat, per întrebare, cu istoric al modificărilor."),
                ],
            ),
            (
                "Chat AI ancorat în documentele firmei",
                [
                    ("Un AI obișnuit inventează răspunsuri, iar în operațiune un răspuns inventat costă bani sau siguranță.",
                     "Chatul OPSQAI răspunde exclusiv din KB și FAQ-ul firmei. Dacă informația nu există, spune că nu există — nu improvizează."),
                    ("Angajatul nou nu știe unde să caute și întreabă din om în om.",
                     "Pune întrebarea în limba lui și primește răspunsul cu sursă: ce document, care secțiune."),
                    ("Un angajat din depozit vede informații care nu îl privesc.",
                     "Răspunsurile sunt limitate la departamentul și drepturile utilizatorului."),
                ],
            ),
            (
                "Knowledge Gaps (ce lipsește din cunoașterea firmei)",
                [
                    ("Firma nu știe ce nu are scris; află doar când se produce paguba.",
                     "Fiecare întrebare fără răspuns este înregistrată ca lipsă reală, cu număr de repetări și departament."),
                    ("Documentația se scrie după impresii, nu după nevoie.",
                     "Lista de lipsuri se transformă direct în sarcină de scris o procedură sau un FAQ, în ordinea în care oamenii au avut nevoie."),
                ],
            ),
            (
                "AI Audit (calitatea cunoașterii)",
                [
                    ("Documentele sunt încărcate, dar sunt vagi, incomplete sau se contrazic între ele.",
                     "Auditul verifică documentele și semnalează ce este neclar, duplicat, contradictoriu sau lipsit de pași verificabili."),
                    ("Nimeni nu are timp să citească 300 de pagini ca să vadă ce e de reparat.",
                     "Rezultatul vine ca listă prioritizată pe severitate, cu accesul direct la locul din document."),
                ],
            ),
            (
                "Academy (cursuri, teste, certificate)",
                [
                    ("Instruirea se face „din vorbă”, iar la control nu există nicio dovadă.",
                     "Cursurile se generează din SOP-urile reale, iar fiecare absolvire produce un certificat PDF verificabil, cu istoric."),
                    ("Firma nu știe cine a înțeles procedura și cine doar a semnat o listă de prezență.",
                     "Test cu întrebări Adevărat/Fals sau Da/Nu, corectare automată, prag de promovare și reluare — se vede exact cine știe."),
                    ("Procedura se schimbă, dar instruirea rămâne pe versiunea veche.",
                     "Cursul este legat de documentul-sursă; când documentul se schimbă, instruirea apare de reactualizat."),
                ],
            ),
            (
                "Operations — incidente și daune",
                [
                    ("Incidentele se povestesc, nu se înregistrează; la final de an nimeni nu poate spune câte au fost și cât au costat.",
                     "Fiecare incident are număr de referință, tip, departament, locație, persoane implicate, timp pierdut și cost."),
                    ("Aceeași pagubă se repetă lunar, pentru că nimeni nu leagă cazurile între ele.",
                     "Incidentele se grupează pe tip, departament și cauză, iar repetarea devine vizibilă imediat."),
                ],
            ),
            (
                "Root Cause Intelligence (5 Why / clasificare Lean)",
                [
                    ("Se tratează simptomul: cineva e certat, și peste două săptămâni se repetă.",
                     "Analiza 5 Why conduce de la cauza imediată la cauza reală și o leagă de procedura încălcată sau de procesul care lipsește."),
                    ("Analiza depinde de cine o face și de cât de bine își amintește.",
                     "Structura este fixă și documentată, iar pașii care nu au acoperire în cunoașterea firmei sunt marcați explicit ca necunoscuți — nu ghiciți."),
                ],
            ),
            (
                "Acțiuni corective și preventive",
                [
                    ("Concluziile analizelor rămân în minută și nimeni nu le mai execută.",
                     "Fiecare concluzie devine acțiune cu responsabil, termen și stare, urmărită până la închidere."),
                    ("Șefii nu știu ce a rămas restant.",
                     "Acțiunile deschise și întârziate apar în overview și în raport, nu trebuie cerute."),
                ],
            ),
            (
                "Analize și costuri operaționale",
                [
                    ("Conducerea simte că „se pierd bani”, dar nu poate arăta unde.",
                     "Costul direct, impactul anualizat, minutele pierdute și distribuția pe departament și tip sunt calculate din datele înregistrate."),
                    ("Deciziile de investiție se iau pe intuiție.",
                     "Top cauze, top proceduri încălcate și trendul pe 12 luni arată unde merită puși banii întâi."),
                ],
            ),
            (
                "Rapoarte PDF",
                [
                    ("Pentru fiecare ședință sau control, cineva construiește manual un raport din mai multe fișiere.",
                     "Raportul se generează cu un clic, în format A4, cu tipul documentului, data și nivelul de confidențialitate."),
                    ("Fișierele Excel circulă modificate și nimeni nu știe care e originalul.",
                     "Exportul pentru utilizatori este exclusiv PDF: un document stabil, care nu se rescrie pe drum."),
                ],
            ),
            (
                "Calendar, concedii și prezență",
                [
                    ("Concediile se cer pe WhatsApp, se aprobă verbal și se uită.",
                     "Cererea intră în sistem, ajunge la aprobator cu nume, perioadă și motiv, iar decizia se notifică automat solicitantului."),
                    ("În ziua planificării se descoperă că trei oameni-cheie lipsesc simultan.",
                     "Concediile aprobate apar în calendarul comun, deci absențele se văd înainte, nu în dimineața respectivă."),
                ],
            ),
            (
                "Notificări",
                [
                    ("Termenele scapă pentru că nimeni nu se uită în aplicație la momentul potrivit.",
                     "Sistemul anunță aprobările, incidentele, expirările și sarcinile în inboxul intern al utilizatorului."),
                    ("Informația importantă se pierde între sute de e-mailuri.",
                     "Notificările sunt legate direct de înregistrarea la care se referă, cu un singur clic până la ea."),
                ],
            ),
            (
                "Documente, imagini și dovezi",
                [
                    ("Dovada unei probleme e o poză pe telefonul cuiva.",
                     "Fotografiile și documentele se atașează la incident, audit sau angajat și rămân în dosarul respectiv."),
                    ("La control, dovezile trebuie strânse din patru locuri.",
                     "Dosarul este complet în sine și poate fi listat ca PDF."),
                ],
            ),
            (
                "Utilizatori, roluri și departamente",
                [
                    ("Toată lumea vede tot: salarii, sancțiuni, documente sensibile.",
                     "Drepturi pe rol și pe departament; datele sensibile sunt vizibile doar celor autorizați explicit."),
                    ("Când pleacă un om, accesul lui rămâne activ luni de zile.",
                     "Contul și drepturile se dezactivează controlat, iar acțiunile rămân în jurnalul de audit."),
                ],
            ),
            (
                "Licențiere și instalare (Self-Hosted)",
                [
                    ("Firma nu acceptă ca datele ei operaționale să iasă din companie.",
                     "OPSQAI se instalează pe infrastructura clientului, cu AI local, și funcționează și fără internet permanent."),
                    ("O instalare veche putea expune datele firmei precedente de pe același calculator.",
                     "Instalarea este legată de compania din licență; o licență diferită cere decizie explicită: continuare sau instalare curată."),
                ],
            ),
            (
                "Backup, restaurare și actualizări",
                [
                    ("Nimeni nu a testat vreodată că se poate reveni după o defecțiune.",
                     "Copii de siguranță cu verificare de integritate și procedură de restaurare documentată."),
                    ("Actualizările se amână, iar sistemul rămâne pe o versiune veche.",
                     "Verificare, descărcare și instalare a versiunilor semnate, în fereastra de mentenanță, cu revenire automată dacă ceva eșuează."),
                ],
            ),
        ],
    ),
    (
        "OPSQAI TRANSPORT",
        "Produs pentru firmele cu flotă: vehicule, remorci, șoferi, controale "
        "săptămânale, expirări, incidente și costuri. Se vinde pe licență, peste Core.",
        [
            (
                "Overview flotă",
                [
                    ("Dimineața nimeni nu poate spune în 30 de secunde câte camioane merg și câte stau.",
                     "Un singur ecran: vehicule active din total, cine e în service, cine e liber, cine lucrează azi."),
                    ("Informația despre flotă e la trei persoane diferite și nu coincide.",
                     "Toți se uită la aceleași date, actualizate din înregistrările reale."),
                ],
            ),
            (
                "Vehicule",
                [
                    ("Documentele vehiculelor (ITP, asigurare, tahograf) expiră și se află la control sau în trafic.",
                     "Fiecare vehicul are termenele înregistrate, iar expirările apropiate apar ca risc, înainte de scadență."),
                    ("Istoricul unei mașini e împrăștiat în bonuri și mesaje.",
                     "Dosarul vehiculului adună mentenanța, combustibilul, incidentele și auditurile la un loc."),
                ],
            ),
            (
                "Șoferi",
                [
                    ("Un șofer pleacă în cursă cu un permis sau o atestare expirată.",
                     "Documentele șoferilor sunt urmărite cu termen; expirarea nu mai vine ca surpriză."),
                    ("Nu se știe cine lucrează azi și cine e liber.",
                     "Starea zilnică a șoferilor este vizibilă în overview, legată de concedii și ture."),
                ],
            ),
            (
                "Remorci și cuplaje",
                [
                    ("Cine trage ce se știe „din cap”, iar la incident nu există dovadă.",
                     "Cuplajele mașină–remorcă–șofer se atribuie vizual și rămân înregistrate cu dată."),
                    ("Remorcile nu sunt urmărite ca active separate și le expiră documentele.",
                     "Remorca are dosar propriu, termene proprii și apare în aceleași alerte."),
                ],
            ),
            (
                "Registre: combustibil, tură, mentenanță",
                [
                    ("Consumul se vede doar la factură, la sfârșit de lună, când nu se mai poate face nimic.",
                     "Combustibilul se înregistrează pe vehicul și rută, deci abaterile se văd în cursul lunii."),
                    ("Reparațiile se fac pe fugă și nu rămâne nicio evidență a costului real pe mașină.",
                     "Registrul de mentenanță arată cât a costat fiecare vehicul și care este cel mai scump."),
                ],
            ),
            (
                "Proceduri și audituri săptămânale",
                [
                    ("Controlul săptămânal se face „când se poate” și de fiecare dată altfel.",
                     "Lista de verificare este fixă, pornită imediat sau pentru o zi aleasă, cu țintă pe vehicul sau șofer."),
                    ("Rezultatele se notează pe hârtie și dispar.",
                     "Fiecare punct acceptă valoare numerică sau text, cu unitate și limită; depășirea limitei devine automat problemă, iar totul rămâne în audit, cu semnătură și dovezi."),
                    ("Nu se vede dacă situația se îmbunătățește sau se degradează.",
                     "Trendul auditurilor arată evoluția pe săptămâni, nu doar rezultatul de azi."),
                ],
            ),
            (
                "Incidente de transport",
                [
                    ("Avariile, amenzile și întârzierile se tratează individual și se uită.",
                     "Incidentul se înregistrează cu tip, cost, vehicul, șofer și dovezi, și intră în statistici."),
                    ("Nu se știe care rută sau care șofer produce cele mai multe pierderi.",
                     "Distribuția pe vehicul, șofer și tip arată unde se concentrează problema."),
                ],
            ),
            (
                "Hartă și locații",
                [
                    ("Dispecerul sună șoferul ca să afle unde este.",
                     "Poziția se vede pe hartă, cu iconiță pentru camion, remorcă, camionetă sau autoturism, și poate fi setată și manual."),
                    ("Cine e activ și cine e oprit nu se distinge.",
                     "Vehiculele inactive apar în gri; starea se vede dintr-o privire."),
                ],
            ),
            (
                "Expirări, risc și trenduri",
                [
                    ("Riscurile devin urgențe abia când devin amenzi.",
                     "Benzi de risc critic / gestionabil, cu ce expiră acum și ce expiră în curând, direct în overview."),
                    ("Conducerea află târziu, prin telefon.",
                     "Digest pe e-mail cu situația flotei, la intervalul configurat."),
                ],
            ),
            (
                "CMR și documente de transport",
                [
                    ("CMR-ul se completează manual, de fiecare dată de la zero, cu greșeli.",
                     "Formulare salvate ca ciorne denumite, refolosite și editate, exportate ca PDF."),
                    ("Documentele emise nu se regăsesc când sunt cerute.",
                     "Rămân în dosarul cursei, cu dată și autor."),
                ],
            ),
            (
                "Rapoarte flotă (PDF)",
                [
                    ("Raportul pentru client sau pentru conducere se face manual, ore întregi.",
                     "Raportul Fleet Status se generează în format A4, complet, cu un clic."),
                    ("Fișierele editabile circulă modificate.",
                     "Doar PDF: documentul rămâne așa cum a fost emis."),
                ],
            ),
        ],
    ),
    (
        "OPSQAI HR",
        "Produs pentru ciclul de viață al angajatului: de la candidat la plecare — "
        "contracte, onboarding, echipament, instruire, conformitate, salarizare. "
        "Se vinde pe licență, peste Core.",
        [
            (
                "Angajați și fișa 360°",
                [
                    ("Datele unui angajat sunt în cinci locuri: un Excel, un dosar, e-mailuri și memoria cuiva.",
                     "Un singur dosar cu număr de angajat, date de angajare, contract, documente, instruire, echipament și istoric."),
                    ("Când cineva întreabă „ce s-a întâmplat cu omul acesta”, nimeni nu poate reconstitui.",
                     "Cronologia se completează automat din contracte, onboarding, instruire, echipament, incidente și documente."),
                ],
            ),
            (
                "Contracte și șabloane",
                [
                    ("Fiecare contract se scrie manual, prin copiere din altul, și rămân greșeli din documentul precedent.",
                     "Șabloane cu câmpuri completate din dosarul angajatului, pe tipurile de contract din Germania și România."),
                    ("Contractele pe perioadă determinată expiră fără ca nimeni să observe.",
                     "Termenul este urmărit și anunțat înainte de expirare."),
                ],
            ),
            (
                "Documente și semnare",
                [
                    ("Documentele semnate se pierd sau rămân doar pe hârtie, într-un dosar la sediu.",
                     "Documentul se generează ca PDF, se descarcă, se încarcă înapoi semnat sau se semnează pe ecran, și rămâne în dosar cu versiune."),
                    ("Nu se știe ce a semnat cine și când.",
                     "Stare, istoric al versiunilor, reamintiri și jurnal de audit pentru fiecare document."),
                ],
            ),
            (
                "Onboarding",
                [
                    ("Omul nou vine luni și nimeni nu i-a pregătit contul, echipamentul sau instruirea.",
                     "Listă de sarcini pe poziție, repartizată pe HR, IT, depozit și manager, cu termene și progres."),
                    ("Nimeni nu știe unde s-a blocat integrarea.",
                     "Progresul este vizibil, iar sarcinile restante apar în alerte."),
                ],
            ),
            (
                "Offboarding",
                [
                    ("La plecare se uită revocarea accesului și predarea echipamentului.",
                     "Plecarea generează automat lista finală: documente, acces, echipament, arhivare."),
                    ("Firma descoperă după luni că un laptop nu s-a mai întors.",
                     "Echipamentul nepredat produce alertă și sarcină, nu o discuție târzie."),
                ],
            ),
            (
                "Echipament și pachete",
                [
                    ("Nu se știe ce echipament are fiecare om și cât valorează.",
                     "Fiecare activ are cod, tip, serie, stare și titular, cu istoric de atribuire."),
                    ("Pentru fiecare angajat nou se decide de la zero ce primește.",
                     "Pachete predefinite pe rol: se atribuie complet, dintr-o singură acțiune."),
                ],
            ),
            (
                "Incidente HR și avertismente",
                [
                    ("Abaterile se discută verbal, iar la conflict firma nu are nimic scris.",
                     "Incident cu tip, severitate, dovezi, investigație și responsabil; avertismentele rămân documentate."),
                    ("Notele sensibile ajung sub ochii cui nu trebuie.",
                     "Notele HR și datele sensibile sunt restrânse la rolurile autorizate."),
                ],
            ),
            (
                "Politici, cereri și instruire",
                [
                    ("Regulamentele există, dar nimeni nu confirmă că le-a citit.",
                     "Politicile se distribuie pentru confirmare, cu evidență pe angajat."),
                    ("Cererile (concediu, adeverințe, documente) se fac pe mesaje și se pierd.",
                     "Cererile intră într-un flux cu stare, aprobator și termen."),
                    ("Instruirile obligatorii expiră fără să observe nimeni.",
                     "Instruirea este legată de dosar, cu termen de reînnoire și alertă."),
                ],
            ),
            (
                "Conformitate și retenție de date",
                [
                    ("Firma păstrează date personale mai mult decât trebuie, fără să își dea seama.",
                     "Politici de retenție configurabile pe jurisdicție, cu semnalarea dosarelor care trebuie curățate."),
                    ("Cerințele diferite din Germania și România se amestecă.",
                     "Câmpurile obligatorii, tipurile de contract și documentele sunt pe jurisdicție."),
                ],
            ),
            (
                "Salarizare (în fișa angajatului)",
                [
                    ("Istoricul salarial e într-un Excel al unei singure persoane.",
                     "Istoric salarial în dosar, cu adăugări și rețineri lunare introduse manual și fluturaș PDF."),
                    ("Datele salariale sunt vizibile cui nu trebuie.",
                     "Drept dedicat de salarizare: fără el, sumele și controalele nu apar deloc în interfață."),
                ],
            ),
            (
                "Candidate Screening (profiluri, CV, scor, dovezi)",
                [
                    ("La 80 de CV-uri pentru un post, selecția se face pe primele zece și pe noroc.",
                     "Profil de post salvat o dată, cu criterii obligatorii și preferate, refolosit la orice recrutare; CV-urile se analizează pe aceleași criterii."),
                    ("Nu se poate explica de ce a fost respins un candidat.",
                     "Fiecare criteriu are scor și dovadă citată din CV; ce lipsește este marcat „necunoscut”, nu „nu are”."),
                    ("Selecția poate fi influențată de nume, vârstă sau fotografie.",
                     "Screening orb opțional, cu dezvăluirea candidatului doar când firma decide. AI-ul recomandă; decizia de angajare rămâne la HR."),
                ],
            ),
            (
                "HR Intelligence, analitice și alerte",
                [
                    ("Întrebările despre proceduri HR ajung toate la o singură persoană.",
                     "Asistentul răspunde din baza de cunoștințe HR, în limitele drepturilor celui care întreabă."),
                    ("Conducerea nu are cifre despre fluctuație, absențe sau instruire.",
                     "Analitice pe angajări, plecări, absențe, instruire și incidente, exportabile ca PDF."),
                    ("Problemele se află târziu.",
                     "Alerte pentru contracte care expiră, documente lipsă, onboarding neterminat, echipament nepredat, instruire expirată."),
                ],
            ),
        ],
    ),
]

OBJECTIONS = [
    ("„Avem deja proceduri scrise.”",
     "Foarte bine — problema nu e scrierea, e găsirea și actualizarea lor. OPSQAI le pune la un loc, le versionează și arată ce a expirat."),
    ("„Nu vrem datele în cloud.”",
     "Self-Hosted, pe serverul dumneavoastră, cu AI local. Datele nu ies din firmă."),
    ("„AI-ul inventează.”",
     "Al nostru răspunde doar din documentele dumneavoastră. Dacă nu are sursă, spune că nu știe."),
    ("„Oamenii nu vor folosi încă o aplicație.”",
     "Intră și întreabă în limba lui, ca pe WhatsApp. Nu trebuie să învețe o structură de dosare."),
    ("„Nu avem timp de implementare.”",
     "Se pornește cu documentele care există deja. Restul se completează pe baza întrebărilor reale ale oamenilor."),
    ("„Cine garantează că angajații au înțeles?”",
     "Test cu corectare automată și certificat verificabil, nu o listă de prezență."),
    ("„Avem un ERP / TMS.”",
     "ERP-ul ține tranzacțiile. OPSQAI ține cunoașterea, instruirea și cauzele problemelor — ceea ce ERP-ul nu face."),
    ("„E scump.”",
     "Comparați cu costul incidentelor repetate dintr-un an. Calculatorul de pe opsqai.de/pricing arată cifra pentru cazul dumneavoastră."),
    ("„Nu avem informatician.”",
     "Instalare cu asistent, verificare de sănătate, copii de siguranță și actualizări automate semnate."),
    ("„Ce facem cu limbile?”",
     "Interfața și conținutul în română, germană și engleză."),
    ("„Datele sensibile?”",
     "Drepturi pe rol și pe departament; salariile, datele medicale și notele HR sunt izolate."),
    ("„Și dacă vrem să plecăm?”",
     "Documentele și datele rămân ale dumneavoastră și pot fi exportate."),
]


# ---------------------------------------------------------------- layout

class Doc:
    def __init__(self, path):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.page = 0
        self.y = 0
        self.section = ""

    # --- primitives
    def bg(self):
        self.c.setFillColor(PAPER)
        self.c.rect(0, 0, W, H, stroke=0, fill=1)

    def new_page(self, section=None):
        if self.page:
            self.footer()
            self.c.showPage()
        self.page += 1
        if section is not None:
            self.section = section
        self.bg()
        self.header()
        self.y = H - M - 18 * mm

    def header(self):
        c = self.c
        c.setFont(BOLD, 8)
        c.setFillColor(GRAPHITE)
        c.drawString(M, H - M + 2 * mm, "OPSQAI")
        c.setFont(BODY, 8)
        c.setFillColor(MUTED)
        c.drawRightString(W - M, H - M + 2 * mm, self.section)
        c.setStrokeColor(HAIR)
        c.setLineWidth(0.6)
        c.line(M, H - M - 1 * mm, W - M, H - M - 1 * mm)

    def footer(self):
        c = self.c
        c.setStrokeColor(HAIR)
        c.setLineWidth(0.5)
        c.line(M, M - 4 * mm, W - M, M - 4 * mm)
        c.setFont(BODY, 7.5)
        c.setFillColor(MUTED)
        c.drawString(M, M - 9 * mm, "Ghid de vânzare — problemă / soluție · Intern · opsqai.de")
        c.drawRightString(W - M, M - 9 * mm, str(self.page))

    def space(self, h):
        if self.y - h < M + 6 * mm:
            self.new_page()

    def wrap(self, text, fname, size, width):
        words = text.split()
        lines, cur = [], ""
        for w in words:
            t = f"{cur} {w}".strip()
            if pdfmetrics.stringWidth(t, fname, size) <= width:
                cur = t
            else:
                if cur:
                    lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        return lines or [""]

    def para(self, text, size=9.5, fname=None, color=SLATE, x=None, width=None, leading=None):
        fname = fname or BODY
        x = M if x is None else x
        width = (W - 2 * M) if width is None else width
        leading = leading or size * 1.42
        for ln in self.wrap(text, fname, size, width):
            self.space(leading)
            self.c.setFont(fname, size)
            self.c.setFillColor(color)
            self.c.drawString(x, self.y, ln)
            self.y -= leading

    # --- blocks
    def product_cover(self, title, blurb):
        self.new_page(title)
        self.y = H / 2 + 30 * mm
        self.c.setFillColor(GREEN)
        self.c.rect(M, self.y + 12 * mm, 26 * mm, 2.4 * mm, stroke=0, fill=1)
        self.c.setFont(BOLD, 26)
        self.c.setFillColor(GRAPHITE)
        self.c.drawString(M, self.y, title)
        self.y -= 13 * mm
        self.para(blurb, size=11, color=SLATE, width=(W - 2 * M) * 0.82, leading=17)

    def function_title(self, name):
        need = 46 * mm
        if self.y - need < M + 6 * mm:
            self.new_page()
        self.y -= 3 * mm
        self.c.setFillColor(TEAL)
        self.c.rect(M, self.y - 1.5 * mm, 3 * mm, 3 * mm, stroke=0, fill=1)
        self.c.setFont(BOLD, 12.5)
        self.c.setFillColor(GRAPHITE)
        self.c.drawString(M + 6 * mm, self.y - 1 * mm, name)
        self.y -= 7 * mm

    def pair(self, idx, problem, solution):
        lx = M + 6 * mm
        width = W - M - lx
        # measure
        pl = self.wrap(problem, BODY, 9.5, width - 20 * mm)
        sl = self.wrap(solution, BODY, 9.5, width - 20 * mm)
        block = (len(pl) + len(sl)) * 13.5 + 12 * mm
        if self.y - block < M + 6 * mm:
            self.new_page()
        top = self.y + 3 * mm
        # problem
        self.c.setFont(BOLD, 8.5)
        self.c.setFillColor(RED)
        self.c.drawString(lx, self.y, f"PROBLEMA {idx}")
        self.y -= 5 * mm
        self.para(problem, size=9.5, color=GRAPHITE, x=lx, width=width - 20 * mm, leading=13.5)
        self.y -= 1.5 * mm
        self.c.setFont(BOLD, 8.5)
        self.c.setFillColor(GREEN)
        self.c.drawString(lx, self.y, "SOLUȚIA OPSQAI")
        self.y -= 5 * mm
        self.para(solution, size=9.5, color=SLATE, x=lx, width=width - 20 * mm, leading=13.5)
        self.y -= 4 * mm
        # left rule spanning the block (same page only)
        self.c.setStrokeColor(HAIR)
        self.c.setLineWidth(1.2)
        bottom = self.y + 2 * mm
        if bottom < top:
            self.c.line(M + 2 * mm, top, M + 2 * mm, bottom)


def build():
    d = Doc(OUT)

    # ---- cover
    d.page = 1
    d.bg()
    d.c.setFillColor(GRAPHITE)
    d.c.rect(0, H - 62 * mm, W, 62 * mm, stroke=0, fill=1)
    d.c.setFillColor(GREEN)
    d.c.rect(M, H - 62 * mm, 40 * mm, 3 * mm, stroke=0, fill=1)
    d.c.setFont(BOLD, 12)
    d.c.setFillColor(PAPER)
    d.c.drawString(M, H - 26 * mm, "OPSQAI")
    d.c.setFont(BODY, 9)
    d.c.setFillColor(HexColor("#9AA3A5"))
    d.c.drawString(M, H - 33 * mm, "Operational Intelligence Platform")

    d.c.setFont(BOLD, 30)
    d.c.setFillColor(GRAPHITE)
    d.c.drawString(M, H - 92 * mm, "Ce vindem.")
    d.c.drawString(M, H - 105 * mm, "Ce problemă rezolvăm.")
    d.c.setFillColor(GREEN)
    d.c.drawString(M, H - 118 * mm, "Cum o rezolvăm.")

    d.y = H - 138 * mm
    d.section = "Ghid de vânzare"
    d.para(INTRO, size=11, color=SLATE, width=(W - 2 * M) * 0.86, leading=17)
    d.y -= 6 * mm
    d.para("OPSQAI Core · OPSQAI Transport · OPSQAI HR", size=10, fname=BOLD, color=TEAL)
    d.c.setFont(BODY, 9)
    d.c.setFillColor(MUTED)
    d.c.drawString(M, M + 4 * mm, "Document intern de vânzare · limba română · opsqai.de")
    d.footer_skip = True

    # ---- how to read
    d.new_page("Cum se folosește")
    d.c.setFont(BOLD, 18)
    d.c.setFillColor(GRAPHITE)
    d.c.drawString(M, d.y, "Cum se folosește documentul")
    d.y -= 12 * mm
    for i, line in enumerate(HOWTO, 1):
        d.space(16)
        d.c.setFont(BOLD, 10)
        d.c.setFillColor(GREEN)
        d.c.drawString(M, d.y, f"{i:02d}")
        d.para(line, size=10, color=SLATE, x=M + 10 * mm, width=W - 2 * M - 10 * mm, leading=14.5)
        d.y -= 3 * mm

    d.y -= 6 * mm
    d.c.setFont(BOLD, 12.5)
    d.c.setFillColor(GRAPHITE)
    d.c.drawString(M, d.y, "Harta produsului")
    d.y -= 8 * mm
    for title, blurb, _ in PRODUCTS:
        d.space(20)
        d.c.setFont(BOLD, 10)
        d.c.setFillColor(TEAL)
        d.c.drawString(M, d.y, title)
        d.y -= 5 * mm
        d.para(blurb, size=9.5, color=SLATE, width=W - 2 * M, leading=13.5)
        d.y -= 4 * mm

    # ---- products
    for title, blurb, functions in PRODUCTS:
        d.product_cover(title, blurb)
        d.new_page(title)
        for name, pairs in functions:
            d.function_title(name)
            for i, (p, s) in enumerate(pairs, 1):
                d.pair(i, p, s)

    # ---- objections
    d.new_page("Obiecții frecvente")
    d.c.setFont(BOLD, 18)
    d.c.setFillColor(GRAPHITE)
    d.c.drawString(M, d.y, "Obiecții frecvente și răspunsul scurt")
    d.y -= 12 * mm
    for q, a in OBJECTIONS:
        d.space(24)
        d.para(q, size=10, fname=BOLD, color=GRAPHITE, leading=14)
        d.para(a, size=9.5, color=SLATE, x=M + 6 * mm, width=W - 2 * M - 6 * mm, leading=13.5)
        d.y -= 4 * mm

    # ---- contact
    d.new_page("Contact")
    d.c.setFont(BOLD, 20)
    d.c.setFillColor(GRAPHITE)
    d.c.drawString(M, d.y, "OPSQAI")
    d.y -= 12 * mm
    d.para("Cunoașterea firmei, AI ancorat în ea, instruire și inteligență operațională — "
           "în cloud sau pe infrastructura clientului.", size=11, color=SLATE,
           width=(W - 2 * M) * 0.8, leading=16)
    d.y -= 8 * mm
    d.para("opsqai.de", size=13, fname=BOLD, color=GREEN)
    d.para("Calculatorul de cost: opsqai.de/pricing#cost", size=10, color=MUTED)

    d.footer()
    d.c.save()
    print("pages:", d.page)


if __name__ == "__main__":
    build()
