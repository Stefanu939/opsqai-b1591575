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
    "Acest document este instrumentul de vanzare al OPSQAI. Pentru fiecare functie a "
    "produsului sunt scrise problemele reale pe care le intalneste o firma si modul "
    "concret in care OPSQAI le rezolva. Nu vindem functii, vindem eliminarea unor "
    "pierderi masurabile: timp pierdut, greseli repetate, informatie care nu se gaseste, "
    "documente expirate, oameni care intreaba de doua ori acelasi lucru."
)

HOWTO = [
    "Fiecare functie are cel putin doua perechi Problema -> Solutie.",
    "In discutia cu clientul, alege problemele pe care le recunoaste el, nu toate.",
    "Formula care functioneaza: „Recunoasteti asta?” -> problema -> ce face OPSQAI -> ce se schimba luni dimineata.",
    "AI-ul din OPSQAI asista: extrage, compara, semnaleaza, propune. Decizia ramane la om. Spune asta explicit — creste increderea.",
    "OPSQAI ruleaza in Cloud sau Self-Hosted, pe infrastructura clientului, cu AI local. Pentru firmele sensibile la date, acesta este argumentul decisiv.",
]

PRODUCTS = [
    (
        "OPSQAI CORE",
        "Nucleul comun: cunoasterea firmei, AI-ul care raspunde strict din ea, "
        "instruirea oamenilor, incidentele si inteligenta operationala. Este inclus "
        "intotdeauna, nu se vinde separat.",
        [
            (
                "Knowledge Base (SOP-uri, proceduri, documente)",
                [
                    ("Firma are 10 SOP-uri raspandite in 20 de locuri: e-mail, WhatsApp, un dosar pe server, un teanc printat la birou.",
                     "KB le tine intr-un singur loc, cu proprietar, departament si versiune. Un singur punct de adevar pentru toata firma."),
                    ("Nimeni nu stie care versiune e valabila; oamenii lucreaza dupa o procedura veche de doi ani.",
                     "Fiecare document are versiune, data ultimei revizii si stare „la zi / de revizuit / expirat”, cu reamintire automata cand termenul trece."),
                    ("Cand pleaca o persoana-cheie, pleaca si jumatate din felul in care se lucreaza.",
                     "Cunoasterea este scrisa, atribuita unui departament si ramane in firma, indiferent de fluctuatia de personal."),
                ],
            ),
            (
                "FAQ (intrebari frecvente pe departament)",
                [
                    ("Aceleasi 30 de intrebari ajung zilnic la sef sau la coleg cu experienta; acesta isi pierde ziua raspunzand.",
                     "Raspunsurile se scriu o singura data ca FAQ si sunt gasite de oricine, fara sa deranjeze pe nimeni."),
                    ("Doi colegi dau doua raspunsuri diferite la aceeasi intrebare si urmeaza o greseala.",
                     "Un singur raspuns oficial, aprobat, per intrebare, cu istoric al modificarilor."),
                ],
            ),
            (
                "Chat AI ancorat in documentele firmei",
                [
                    ("Un AI obisnuit inventeaza raspunsuri, iar in operatiune un raspuns inventat costa bani sau siguranta.",
                     "Chatul OPSQAI raspunde exclusiv din KB si FAQ-ul firmei. Daca informatia nu exista, spune ca nu exista — nu improvizeaza."),
                    ("Angajatul nou nu stie unde sa caute si intreaba din om in om.",
                     "Pune intrebarea in limba lui si primeste raspunsul cu sursa: ce document, care sectiune."),
                    ("Un angajat din depozit vede informatii care nu il privesc.",
                     "Raspunsurile sunt limitate la departamentul si drepturile utilizatorului."),
                ],
            ),
            (
                "Knowledge Gaps (ce lipseste din cunoasterea firmei)",
                [
                    ("Firma nu stie ce nu are scris; afla doar cand se produce paguba.",
                     "Fiecare intrebare fara raspuns este inregistrata ca lipsa reala, cu numar de repetari si departament."),
                    ("Documentatia se scrie dupa impresii, nu dupa nevoie.",
                     "Lista de lipsuri se transforma direct in sarcina de scris o procedura sau un FAQ, in ordinea in care oamenii au avut nevoie."),
                ],
            ),
            (
                "AI Audit (calitatea cunoasterii)",
                [
                    ("Documentele sunt incarcate, dar sunt vagi, incomplete sau se contrazic intre ele.",
                     "Auditul verifica documentele si semnaleaza ce este neclar, duplicat, contradictoriu sau lipsit de pasi verificabili."),
                    ("Nimeni nu are timp sa citeasca 300 de pagini ca sa vada ce e de reparat.",
                     "Rezultatul vine ca lista prioritizata pe severitate, cu accesul direct la locul din document."),
                ],
            ),
            (
                "Academy (cursuri, teste, certificate)",
                [
                    ("Instruirea se face „din vorba”, iar la control nu exista nicio dovada.",
                     "Cursurile se genereaza din SOP-urile reale, iar fiecare absolvire produce un certificat PDF verificabil, cu istoric."),
                    ("Firma nu stie cine a inteles procedura si cine doar a semnat o lista de prezenta.",
                     "Test cu intrebari Adevarat/Fals sau Da/Nu, corectare automata, prag de promovare si reluare — se vede exact cine stie."),
                    ("Procedura se schimba, dar instruirea ramane pe versiunea veche.",
                     "Cursul este legat de documentul-sursa; cand documentul se schimba, instruirea apare de reactualizat."),
                ],
            ),
            (
                "Operations — incidente si daune",
                [
                    ("Incidentele se povestesc, nu se inregistreaza; la final de an nimeni nu poate spune cate au fost si cat au costat.",
                     "Fiecare incident are numar de referinta, tip, departament, locatie, persoane implicate, timp pierdut si cost."),
                    ("Aceeasi paguba se repeta lunar, pentru ca nimeni nu leaga cazurile intre ele.",
                     "Incidentele se grupeaza pe tip, departament si cauza, iar repetarea devine vizibila imediat."),
                ],
            ),
            (
                "Root Cause Intelligence (5 Why / clasificare Lean)",
                [
                    ("Se trateaza simptomul: cineva e certat, si peste doua saptamani se repeta.",
                     "Analiza 5 Why conduce de la cauza imediata la cauza reala si o leaga de procedura incalcata sau de procesul care lipseste."),
                    ("Analiza depinde de cine o face si de cat de bine isi aminteste.",
                     "Structura este fixa si documentata, iar pasii care nu au acoperire in cunoasterea firmei sunt marcati explicit ca necunoscuti — nu ghiciti."),
                ],
            ),
            (
                "Acțiuni corective si preventive",
                [
                    ("Concluziile analizelor rămân in minuta si nimeni nu le mai executa.",
                     "Fiecare concluzie devine actiune cu responsabil, termen si stare, urmarita pana la inchidere."),
                    ("Sefii nu stiu ce a rămas restant.",
                     "Actiunile deschise si intarziate apar in overview si in raport, nu trebuie cerute."),
                ],
            ),
            (
                "Analize si costuri operationale",
                [
                    ("Conducerea simte ca „se pierd bani”, dar nu poate arata unde.",
                     "Costul direct, impactul anualizat, minutele pierdute si distributia pe departament si tip sunt calculate din datele inregistrate."),
                    ("Deciziile de investitie se iau pe intuitie.",
                     "Top cauze, top proceduri incalcate si trendul pe 12 luni arata unde merita pusi banii intai."),
                ],
            ),
            (
                "Rapoarte PDF",
                [
                    ("Pentru fiecare sedinta sau control, cineva construieste manual un raport din mai multe fisiere.",
                     "Raportul se genereaza cu un clic, in format A4, cu tipul documentului, data si nivelul de confidentialitate."),
                    ("Fisierele Excel circula modificate si nimeni nu stie care e originalul.",
                     "Exportul pentru utilizatori este exclusiv PDF: un document stabil, care nu se rescrie pe drum."),
                ],
            ),
            (
                "Calendar, concedii si prezenta",
                [
                    ("Concediile se cer pe WhatsApp, se aproba verbal si se uita.",
                     "Cererea intra in sistem, ajunge la aprobator cu nume, perioada si motiv, iar decizia se notifica automat solicitantului."),
                    ("In ziua planificarii se descopera ca trei oameni-cheie lipsesc simultan.",
                     "Concediile aprobate apar in calendarul comun, deci absentele se vad inainte, nu in dimineata respectiva."),
                ],
            ),
            (
                "Notificari",
                [
                    ("Termenele scapa pentru ca nimeni nu se uita in aplicatie la momentul potrivit.",
                     "Sistemul anunta aprobarile, incidentele, expirarile si sarcinile in inbox-ul intern al utilizatorului."),
                    ("Informatia importanta se pierde intre sute de e-mailuri.",
                     "Notificarile sunt legate direct de inregistrarea la care se refera, cu un singur clic pana la ea."),
                ],
            ),
            (
                "Documente, imagini si dovezi",
                [
                    ("Dovada unei probleme e o poza pe telefonul cuiva.",
                     "Fotografiile si documentele se atasează la incident, audit sau angajat si ramân in dosarul respectiv."),
                    ("La control, dovezile trebuie strânse din patru locuri.",
                     "Dosarul este complet in sine si poate fi listat ca PDF."),
                ],
            ),
            (
                "Utilizatori, roluri si departamente",
                [
                    ("Toata lumea vede tot: salarii, sanctiuni, documente sensibile.",
                     "Drepturi pe rol si pe departament; datele sensibile sunt vizibile doar celor autorizati explicit."),
                    ("Cand pleaca un om, accesul lui rămâne activ luni de zile.",
                     "Contul si drepturile se dezactiveaza controlat, iar actiunile rămân in jurnalul de audit."),
                ],
            ),
            (
                "Licentiere si instalare (Self-Hosted)",
                [
                    ("Firma nu accepta ca datele ei operationale sa iasa din companie.",
                     "OPSQAI se instaleaza pe infrastructura clientului, cu AI local, si functioneaza si fara internet permanent."),
                    ("O instalare veche putea expune datele firmei precedente pe acelasi calculator.",
                     "Instalarea este legata de compania din licenta; o licenta diferita cere decizie explicita: continuare sau instalare curata."),
                ],
            ),
            (
                "Backup, restaurare si actualizari",
                [
                    ("Nimeni nu a testat vreodata ca se poate reveni dupa o defectiune.",
                     "Copii de siguranta cu verificare de integritate si procedura de restaurare documentata."),
                    ("Actualizarile se amana, iar sistemul rămâne pe o versiune veche.",
                     "Verificare, descarcare si instalare a versiunilor semnate, in fereastra de mentenanta, cu revenire automata daca ceva eseueaza."),
                ],
            ),
        ],
    ),
    (
        "OPSQAI TRANSPORT",
        "Produs pentru firmele cu flota: vehicule, remorci, soferi, controale "
        "saptamanale, expirari, incidente si costuri. Se vinde pe licenta, peste Core.",
        [
            (
                "Overview flota",
                [
                    ("Dimineata nimeni nu poate spune in 30 de secunde cate camioane merg si cate stau.",
                     "Un singur ecran: vehicule active din total, cine e in service, cine e liber, cine lucreaza azi."),
                    ("Informatia despre flota e la trei persoane diferite si nu coincide.",
                     "Toti se uita la aceleasi date, actualizate din inregistrarile reale."),
                ],
            ),
            (
                "Vehicule",
                [
                    ("Documentele vehiculelor (ITP, asigurare, tahograf) expira si se afla la control sau in trafic.",
                     "Fiecare vehicul are termenele inregistrate, iar expirarile apropiate apar ca risc, inainte de scadenta."),
                    ("Istoricul unei masini e imprastiat in bonuri si mesaje.",
                     "Dosarul vehiculului aduna mentenanta, combustibil, incidente si audituri la un loc."),
                ],
            ),
            (
                "Soferi",
                [
                    ("Un sofer pleaca in cursa cu un permis sau o atestare expirata.",
                     "Documentele soferilor sunt urmarite cu termen; expirarea blocheaza surpriza, nu cursa."),
                    ("Nu se stie cine lucreaza azi si cine e liber.",
                     "Starea zilnica a soferilor este vizibila in overview, legata de concedii si ture."),
                ],
            ),
            (
                "Remorci si cuplaje",
                [
                    ("Cine trage ce se stie „din cap”, iar la incident nu exista dovada.",
                     "Cuplajele masina-remorca-sofer se atribuie vizual si rămân inregistrate cu data."),
                    ("Remorcile nu sunt urmarite ca active separate si le expira documentele.",
                     "Remorca are dosar propriu, termene proprii si apare in aceleasi alerte."),
                ],
            ),
            (
                "Registre: combustibil, tura, mentenanta",
                [
                    ("Consumul se vede doar la factura, la sfârsit de luna, cand nu se mai poate face nimic.",
                     "Combustibilul se inregistreaza pe vehicul si ruta, deci abaterile se vad in cursul lunii."),
                    ("Reparatiile se fac pe fuga si nu rămâne nicio evidenta a costului real pe masina.",
                     "Registrul de mentenanta arata cat a costat fiecare vehicul si care este cel mai scump."),
                ],
            ),
            (
                "Proceduri si audituri saptamanale",
                [
                    ("Controlul saptamanal se face „cand se poate” si de fiecare data altfel.",
                     "Lista de verificare este fixa, pornita imediat sau pentru o zi aleasa, cu tinta pe vehicul sau sofer."),
                    ("Rezultatele se noteaza pe hârtie si dispar.",
                     "Fiecare punct accepta valoare numerica sau text, cu unitate si limita; depasirea limitei devine automat problema, iar totul rămâne in audit cu semnatura si dovezi."),
                    ("Nu se vede daca situatia se imbunatateste sau se degradeaza.",
                     "Trendul auditurilor arata evolutia pe saptamâni, nu doar rezultatul de azi."),
                ],
            ),
            (
                "Incidente de transport",
                [
                    ("Avariile, amenzile si intârzierile se trateaza individual si se uita.",
                     "Incidentul se inregistreaza cu tip, cost, vehicul, sofer si dovezi, si intra in statistici."),
                    ("Nu se stie care ruta sau care sofer produce cele mai multe pierderi.",
                     "Distributia pe vehicul, sofer si tip arata unde se concentreaza problema."),
                ],
            ),
            (
                "Harta si locatii",
                [
                    ("Dispecerul suna soferul ca sa afle unde este.",
                     "Poziția se vede pe harta, cu iconita pentru camion, remorca, camioneta sau autoturism, si poate fi setata si manual."),
                    ("Cine e activ si cine e oprit nu se distinge.",
                     "Vehiculele inactive apar in gri; starea e vizibila dintr-o privire."),
                ],
            ),
            (
                "Expirari, risc si trenduri",
                [
                    ("Riscurile devin urgente abia cand devin amenzi.",
                     "Benzi de risc critic / gestionabil, cu ce expira acum si ce expira in curând, direct in overview."),
                    ("Conducerea afla tarziu, prin telefon.",
                     "Digest pe e-mail cu situatia flotei, la intervalul configurat."),
                ],
            ),
            (
                "CMR si documente de transport",
                [
                    ("CMR-ul se completeaza manual, de fiecare data de la zero, cu greseli.",
                     "Formulare salvate ca ciorne denumite, refolosite si editate, exportate ca PDF."),
                    ("Documentele emise nu se regasesc cand sunt cerute.",
                     "Rămân in dosarul cursei, cu data si autor."),
                ],
            ),
            (
                "Rapoarte flota (PDF)",
                [
                    ("Raportul pentru client sau pentru conducere se face manual, ore intregi.",
                     "Raportul Fleet Status se genereaza in format A4, complet, cu un clic."),
                    ("Fisierele editabile circula modificate.",
                     "Doar PDF: documentul rămâne asa cum a fost emis."),
                ],
            ),
        ],
    ),
    (
        "OPSQAI HR",
        "Produs pentru ciclul de viata al angajatului: de la candidat la plecare — "
        "contracte, onboarding, echipament, instruire, conformitate, salarizare. "
        "Se vinde pe licenta, peste Core.",
        [
            (
                "Angajati si fisa 360°",
                [
                    ("Datele unui angajat sunt in cinci locuri: un Excel, un dosar, e-mailuri si memoria cuiva.",
                     "Un singur dosar cu numar de angajat, date de angajare, contract, documente, instruire, echipament si istoric."),
                    ("Cand cineva intreaba „ce s-a intâmplat cu acest om”, nimeni nu poate reconstitui.",
                     "Cronologia se completeaza automat din contracte, onboarding, instruire, echipament, incidente si documente."),
                ],
            ),
            (
                "Contracte si sabloane",
                [
                    ("Fiecare contract se scrie manual, prin copiere din altul, si rămân greseli din documentul precedent.",
                     "Sabloane cu câmpuri completate din dosarul angajatului, pe tipurile de contract din Germania si România."),
                    ("Contractele determinate expira fara ca nimeni sa observe.",
                     "Termenul este urmarit si anunțat inainte de expirare."),
                ],
            ),
            (
                "Documente si semnare",
                [
                    ("Documentele semnate se pierd sau rămân doar pe hârtie, intr-un dosar la sediu.",
                     "Documentul se genereaza ca PDF, se descarca, se incarca inapoi semnat sau se semneaza pe ecran, si rămâne in dosar cu versiune."),
                    ("Nu se stie ce a semnat cine si cand.",
                     "Stare, istoric al versiunilor, reamintiri si jurnal de audit pentru fiecare document."),
                ],
            ),
            (
                "Onboarding",
                [
                    ("Omul nou vine luni si nimeni nu i-a pregatit contul, echipamentul sau instruirea.",
                     "Lista de sarcini pe pozitie, repartizata pe HR, IT, depozit si manager, cu termene si progres."),
                    ("Nimeni nu stie unde s-a blocat integrarea.",
                     "Progresul este vizibil, iar sarcinile restante apar in alerte."),
                ],
            ),
            (
                "Offboarding",
                [
                    ("La plecare se uita revocarea accesului si predarea echipamentului.",
                     "Plecarea genereaza automat lista finala: documente, acces, echipament, arhivare."),
                    ("Firma descopera dupa luni ca un laptop nu s-a mai intors.",
                     "Echipamentul nepredat produce alerta si sarcina, nu o discutie tardiva."),
                ],
            ),
            (
                "Echipament si pachete",
                [
                    ("Nu se stie ce echipament are fiecare om si cât valoreaza.",
                     "Fiecare activ are cod, tip, serie, stare si titular, cu istoric de atribuire."),
                    ("Pentru fiecare angajat nou se decide de la zero ce primeste.",
                     "Pachete predefinite pe rol: se atribuie complet, dintr-o actiune."),
                ],
            ),
            (
                "Incidente HR si avertismente",
                [
                    ("Abaterile se discuta verbal, iar la conflict firma nu are nimic scris.",
                     "Incident cu tip, severitate, dovezi, investigatie si responsabil; avertismentele rămân documentate."),
                    ("Notele sensibile ajung sub ochii cui nu trebuie.",
                     "Notele HR si datele sensibile sunt restrânse la rolurile autorizate."),
                ],
            ),
            (
                "Politici, cereri si instruire",
                [
                    ("Regulamentele exista, dar nimeni nu confirma ca le-a citit.",
                     "Politicile se distribuie pentru confirmare, cu evidenta pe angajat."),
                    ("Cererile (concediu, adeverinte, documente) se fac pe mesaje si se pierd.",
                     "Cererile intra intr-un flux cu stare, aprobator si termen."),
                    ("Instruirile obligatorii expira fara sa observe nimeni.",
                     "Instruirea este legata de dosar, cu termen de reinnoire si alerta."),
                ],
            ),
            (
                "Conformitate si retentie de date",
                [
                    ("Firma pastreaza date personale mai mult decât trebuie, fara sa isi dea seama.",
                     "Politici de retentie configurabile pe jurisdictie, cu semnalarea dosarelor care trebuie curatate."),
                    ("Cerintele diferite din Germania si România se amesteca.",
                     "Câmpurile obligatorii, tipurile de contract si documentele sunt pe jurisdictie."),
                ],
            ),
            (
                "Salarizare (in fisa angajatului)",
                [
                    ("Istoricul salarial e intr-un Excel al unei singure persoane.",
                     "Istoric salarial in dosar, cu adaugari si retineri lunare introduse manual si fluturas PDF."),
                    ("Datele salariale sunt vizibile cui nu trebuie.",
                     "Drept dedicat de salarizare: fara el, sumele si controalele nu apar deloc in interfata."),
                ],
            ),
            (
                "Candidate Screening (profiluri, CV, scor, dovezi)",
                [
                    ("La 80 de CV-uri pentru un post, selectia se face pe primele zece si pe noroc.",
                     "Profil de post salvat o data, cu criterii obligatorii si preferate, refolosit la orice recrutare; CV-urile se analizeaza pe aceleasi criterii."),
                    ("Nu se poate explica de ce a fost respins un candidat.",
                     "Fiecare criteriu are scor si dovada citata din CV; ce lipseste este marcat „necunoscut”, nu „nu are”."),
                    ("Selectia poate fi influentata de nume, vârsta sau fotografie.",
                     "Screening orb opțional, cu dezvaluirea candidatului doar cand firma decide. AI-ul recomanda; decizia de angajare rămâne la HR."),
                ],
            ),
            (
                "HR Intelligence, analitice si alerte",
                [
                    ("Intrebarile despre proceduri HR ajung toate la o singura persoana.",
                     "Asistentul raspunde din baza de cunostinte HR, in limitele drepturilor celui care intreaba."),
                    ("Conducerea nu are cifre despre fluctuatie, absente sau instruire.",
                     "Analitice pe angajari, plecari, absente, instruire si incidente, exportabile ca PDF."),
                    ("Problemele se afla tarziu.",
                     "Alerte pentru contracte care expira, documente lipsa, onboarding neterminat, echipament nepredat, instruire expirata."),
                ],
            ),
        ],
    ),
]

OBJECTIONS = [
    ("„Avem deja proceduri scrise.”",
     "Foarte bine — problema nu e scrierea, e gasirea si actualizarea lor. OPSQAI le pune la un loc, le versioneaza si arata ce a expirat."),
    ("„Nu vrem datele in cloud.”",
     "Self-Hosted, pe serverul dumneavoastra, cu AI local. Datele nu ies din firma."),
    ("„AI-ul inventeaza.”",
     "Al nostru raspunde doar din documentele dumneavoastra. Daca nu are sursa, spune ca nu stie."),
    ("„Oamenii nu vor folosi inca o aplicatie.”",
     "Intra si intreaba in limba lui, ca pe WhatsApp. Nu trebuie sa invete o structura de dosare."),
    ("„Nu avem timp de implementare.”",
     "Se porneste cu documentele care exista deja. Restul se completeaza pe baza intrebarilor reale ale oamenilor."),
    ("„Cine garanteaza ca angajatii au inteles?”",
     "Test cu corectare automata si certificat verificabil, nu o lista de prezenta."),
    ("„Avem un ERP / TMS.”",
     "ERP-ul tine tranzactiile. OPSQAI tine cunoasterea, instruirea si cauzele problemelor — ceea ce ERP-ul nu face."),
    ("„E scump.”",
     "Comparati cu costul incidentelor repetate dintr-un an. Calculatorul de pe opsqai.de/pricing arata cifra pentru cazul dumneavoastra."),
    ("„Nu avem informatician.”",
     "Instalare cu asistent, verificare de sanatate, copii de siguranta si actualizari automate semnate."),
    ("„Ce facem cu limbile?”",
     "Interfata si continutul in româna, germana si engleza."),
    ("„Datele sensibile?”",
     "Drepturi pe rol si pe departament; salarii, medical si note HR sunt izolate."),
    ("„Si daca vrem sa plecam?”",
     "Documentele si datele rămân ale dumneavoastra si pot fi exportate."),
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
        need = 26 * mm
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
