#!/usr/bin/env python3
# OPSQAI — Playbook de obiectii si intrebari de descoperire (RO + DE)
# Genereaza:
#   /mnt/documents/OPSQAI_Obiectii_Playbook_RO.pdf
#   /mnt/documents/OPSQAI_Einwaende_Playbook_DE.pdf

import subprocess
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

GRAPHITE = HexColor("#101315")
SLATE = HexColor("#252B2D")
PAPER = HexColor("#F1F3EF")
GREEN = HexColor("#26A67A")
TEAL = HexColor("#247D91")
RED = HexColor("#B3392F")
AMBER = HexColor("#9A6B12")
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


# ================================================================ CONTENT RO

RO = dict(
    out="/mnt/documents/OPSQAI_Obiectii_Playbook_RO.pdf",
    footer="Playbook de vânzare — obiecții și descoperire · Intern · opsqai.de",
    cover_title=["Cum vindem OPSQAI.", "Ce spunem când", "suntem refuzați."],
    cover_sub="Playbook de obiecții, răspunsuri și întrebări de descoperire",
    cover_note="Document intern de vânzare · limba română · opsqai.de",
    intro=(
        "OPSQAI nu se vinde ca licență de software. Se vinde ca rezolvare a unei probleme "
        "operaționale pe care clientul o simte deja: ore pierdute căutând informație, "
        "aceleași greșeli repetate, proceduri expirate, oameni noi care se integrează în "
        "trei luni în loc de trei săptămâni. Acest playbook conține exact ce spunem, ce "
        "întrebăm și ce răspundem — inclusiv atunci când primim „nu”."
    ),
    labels=dict(
        says="CE SPUNE CLIENTUL",
        means="CE ÎNSEAMNĂ DE FAPT",
        answer="RĂSPUNSUL NOSTRU",
        ask="ÎNTREBAREA DE ÎNTORS",
        avoid="DE EVITAT",
        category="Categorie",
        page_objections="Obiecții",
    ),
    method_title="Metoda: nu vindem produs, vindem diagnostic",
    method_intro=(
        "Regula de bază: cine pune întrebările conduce discuția. Nu prezentăm module în "
        "primele 20 de minute. Prezentăm doar după ce clientul a spus cu vorbele lui ce îl "
        "doare și cât îl costă. Vânzarea se face în patru pași."
    ),
    method_steps=[
        ("Problemă",
         "Îl lăsăm să povestească. Nu corectăm, nu vindem, nu comparăm cu concurența. "
         "Notăm exact cuvintele lui — le vom folosi în ofertă. Întrebarea de deschidere este "
         "mereu aceeași: „Ce vă consumă cel mai mult timp într-o săptămână normală?”"),
        ("Diagnostic",
         "Traducem simptomul în cauză: unde se rupe informația, care procedură cedează, ce "
         "pas mănâncă orele. Punem cifre pe el: câte ori pe lună, câte persoane, cât durează. "
         "Fără cifre nu există buget."),
        ("Proiectarea soluției",
         "Arătăm doar ce rezolvă cauza găsită. Un singur flux, cu numele lui, cu oamenii lui. "
         "Restul platformei rămâne pe planul doi — există, dar nu e subiectul discuției."),
        ("Workspace",
         "Propunem pilot de 30 de zile pe problema aceea, cu criteriu de succes scris înainte "
         "de start. Dacă criteriul nu e atins, clientul nu continuă — și o spunem noi, primii."),
    ],
    rules_title="Șapte reguli care schimbă rata de închidere",
    rules=[
        "Vorbește 30%, ascultă 70%. Dacă ai vorbit mai mult decât clientul, ai pierdut controlul discuției.",
        "Nu răspunde la o obiecție înainte de a o înțelege. Întreabă „ce vă face să spuneți asta?” și taci.",
        "Nu compara OPSQAI cu SAP, Microsoft sau ServiceNow. Spune: „noi nu pornim de la software, pornim de la problema dumneavoastră”.",
        "Fiecare afirmație are o cifră sau o dovadă. „Vă economisește timp” nu vinde. „Cele 40 de întrebări zilnice către șeful de depozit dispar” vinde.",
        "Spune deschis ce NU face produsul. Un „asta nu facem” aduce mai multă încredere decât zece funcții promise.",
        "Nu negocia prețul înainte de a stabili valoarea. Întâi cifra pierderii, apoi cifra investiției.",
        "Închide fiecare discuție cu un pas următor cu dată și nume. „Vă mai gândiți” nu este un pas următor.",
    ],
    discovery_title="Cum aflăm problema: întrebările de descoperire",
    discovery_intro=(
        "Clientul nu vine cu o cerință de software. Vine cu o frustrare. Rolul nostru este să "
        "transformăm frustrarea în cauză, iar cauza în cifră. Întrebările de mai jos se pun în "
        "ordine, nu toate — se aleg 10-12 pentru o discuție de o oră. Cele marcate cu ▸ sunt "
        "obligatorii în orice discuție."
    ),
    discovery=[
        ("Deschidere — lasă-l să povestească", [
            "▸ Ce vă consumă cel mai mult timp într-o săptămână normală?",
            "▸ Dacă ați putea repara un singur lucru în firmă mâine dimineață, care ar fi?",
            "Ce v-a făcut să acceptați discuția asta acum și nu acum șase luni?",
            "Cine în firmă simte cel mai tare problema — dumneavoastră sau altcineva?",
            "Povestiți-mi ultima dată când s-a întâmplat. Ce s-a rupt exact?",
            "Ce ați încercat deja și nu a funcționat?",
            "Ce se întâmplă dacă nu faceți nimic în următoarele 12 luni?",
        ]),
        ("Costul problemei — pune cifre", [
            "▸ Cât de des se întâmplă: zilnic, săptămânal, lunar?",
            "▸ Câte persoane sunt implicate de fiecare dată și cât durează?",
            "Care a fost cea mai scumpă greșeală de acest tip din ultimul an?",
            "Ați avut penalizări, retururi, reclamații sau amenzi din cauza asta?",
            "Cât durează până când un angajat nou lucrează la fel de bine ca unul vechi?",
            "Cât timp pierde șeful de departament răspunzând la aceleași întrebări?",
            "Când vine un control sau un audit, cât durează să adunați documentele?",
            "Dacă mâine pleacă persoana care știe cel mai bine procesul, ce se oprește?",
        ]),
        ("Cum lucrează firma azi — procesul real", [
            "▸ Unde stau azi procedurile: e-mail, dosare, WhatsApp, hârtie?",
            "Cine decide când o procedură se schimbă și cine află despre schimbare?",
            "Cum știe un om că lucrează după versiunea corectă?",
            "Cum se transmit instrucțiunile către oamenii din teren sau din depozit?",
            "Ce se întâmplă cu un incident: se scrie, se discută sau se uită?",
            "Cine face raportul lunar și din ce surse îl adună?",
            "Câte sisteme trebuie deschise ca să răspunzi la o singură întrebare de client?",
            "Ce parte din informație există doar în capul unui om?",
        ]),
        ("Oameni și adopție", [
            "▸ Cine ar folosi zilnic soluția și cât de confortabil e cu tehnologia?",
            "În ce limbi lucrează oamenii dumneavoastră?",
            "Ce s-a întâmplat ultima dată când ați introdus un sistem nou?",
            "Cine în firmă ar fi împotrivă și de ce?",
            "Cine ar fi primul care ar spune „în sfârșit”?",
            "Aveți oameni care nu stau la birou — șoferi, depozit, teren?",
        ]),
        ("Date, IT și constrângeri", [
            "▸ Aveți o regulă internă privind datele în cloud?",
            "Aveți server propriu și cine îl administrează?",
            "Ce cerințe vine de la juridic sau de la client-cheie privind datele?",
            "Ce sisteme trebuie să rămână obligatoriu în funcțiune (ERP, TMS, contabilitate)?",
            "Aveți departament IT sau furnizor extern?",
        ]),
        ("Decizie, buget, următorul pas", [
            "▸ Cum se ia decizia la dumneavoastră și cine mai trebuie să spună „da”?",
            "▸ Ce ar trebui să vedeți în 30 de zile ca să spuneți că a meritat?",
            "Există buget alocat pentru asta sau trebuie construit?",
            "Ce ar bloca proiectul chiar dacă îl vreți?",
            "Când vreți ca lucrurile să fie deja rezolvate?",
            "Vă propun un pilot de 30 de zile pe problema asta. Ce vă lipsește ca să începem luni?",
        ]),
    ],
    listen_title="Ce ascultăm: propoziții care valorează bani",
    listen=[
        ("„Fiecare face cum știe.”", "Nu există procedură unică. Intrare directă pentru Knowledge Base și versionare."),
        ("„Îl întreb pe Ion, el știe.”", "Cunoașterea e într-un singur om. Risc de plecare. Intrare pentru FAQ și chat ancorat."),
        ("„Am mai avut cazul asta.”", "Incident repetat. Se poate pune cifră imediat: de câte ori pe an × cost."),
        ("„Nu găsim documentul.”", "Timp pierdut zilnic, măsurabil. Intrare pentru căutare și KB."),
        ("„A fost instruit, dar…”", "Instruire fără dovadă. Intrare pentru Academy cu test și certificat."),
        ("„La control a fost complicat.”", "Frica de audit. Cel mai rapid buget aprobat din firmă."),
        ("„Oamenii noi întreabă tot.”", "Integrare lentă. Se calculează în zile de productivitate pierdută."),
        ("„Nu vreau încă un program.”", "Frica de adopție, nu de preț. Se răspunde cu simplitate, nu cu funcții."),
    ],
    obj_title="Obiecții frecvente și răspunsuri",
    obj_intro=(
        "Fiecare obiecție are patru părți: ce spune clientul, ce înseamnă de fapt, ce răspundem "
        "și ce întrebăm imediat după. Răspunsul nu se recită — se adaptează la cuvintele lui. "
        "Niciodată nu răspunzi la o obiecție cu o listă de funcții."
    ),
    refusal_title="Când suntem refuzați",
    refusal_intro=(
        "Un „nu” nu este sfârșitul discuției, este lipsă de informație — la el sau la noi. "
        "Regula: acceptă refuzul calm, cere un singur lucru, lasă ușa deschisă cu o dată. "
        "Nu insista în aceeași discuție de două ori; insistă în timp."
    ),
    refusals=[
        ("„Nu ne interesează.”",
         "Înțeleg, vă mulțumesc pentru sinceritate. Ca să nu vă mai deranjez degeaba: problema "
         "pe care o rezolvăm de obicei este că oamenii nu găsesc procedura corectă și se repetă "
         "aceleași greșeli. Dacă asta la dumneavoastră e rezolvată, chiar nu aveți nevoie de noi."),
        ("„Nu acum, poate mai târziu.”",
         "Perfect, atunci nu vă cer o decizie. Vă cer o dată. Vă sun în [lună] și, până atunci, vă "
         "las diagnosticul scris pe cazul dumneavoastră — e al dumneavoastră, chiar dacă nu lucrăm împreună."),
        ("„Am ales altă soluție.”",
         "Vă felicit pentru decizie. O întrebare, pentru mine: ce a cântărit cel mai mult în alegere? "
         "Și dacă în șase luni rămâne nerezolvată partea de proceduri și instruire, mă puteți suna direct."),
        ("„Nu avem buget.”",
         "Atunci nu vorbim despre buget. Vorbim despre cifra pe care o pierdeți acum. Dacă la final "
         "cifra pierderii este mai mică decât investiția, vă spun eu primul să nu cumpărați."),
        ("„Șeful a spus nu.”",
         "Corect, decizia e a lui. Ce a fost argumentul lui? Vă trimit o pagină, nu o prezentare: "
         "problema, cifra și ce se schimbă în 30 de zile. Dacă tot e nu, se închide curat."),
        ("Tăcere totală după ofertă",
         "Mesaj scurt, o singură dată la 10 zile, de maximum trei ori: „Închid dosarul sau îl las "
         "deschis?” Este singura formulare care primește răspuns."),
    ],
    followup_title="Mesaje de urmărire care primesc răspuns",
    followups=[
        ("După prima discuție (în aceeași zi)",
         "Am notat trei lucruri: [problema lui, cu cuvintele lui], [cifra], [ce ați vrea în 30 de zile]. "
         "Dacă am înțeles corect, vă trimit joi propunerea de pilot. Dacă am înțeles greșit, corectați-mă în două rânduri."),
        ("După ofertă, fără răspuns (ziua 4)",
         "O întrebare simplă: mai este problema [X] pe lista dumneavoastră din trimestrul acesta? "
         "Dacă nu mai este, vă las în pace și închid dosarul."),
        ("Reactivare după trei luni",
         "Ne-am văzut în [lună] și atunci problema era [X]. Între timp am rezolvat exact cazul acesta "
         "la o firmă de mărimea dumneavoastră. Vreți în 15 minute ce am învățat de acolo?"),
        ("Închiderea curată",
         "Închid dosarul dumneavoastră ca „nu acum”. Rămâne diagnosticul scris la dumneavoastră. "
         "Dacă se schimbă ceva, un mesaj și reluăm din locul în care am rămas."),
    ],
    script_title="Scenariul discuției de 45 de minute",
    script_intro=(
        "Structura de mai jos este cadrul unei prime discuții. Timpii sunt orientativi, ordinea nu. "
        "Dacă la minutul 25 nu ai o problemă exprimată cu cuvintele clientului și o cifră, nu treci "
        "la prezentare — mai pui întrebări."
    ),
    script=[
        ("00-03 min · Deschiderea",
         "„Mulțumesc pentru timp. Propun 45 de minute: primele 20 vă ascult, apoi vă arăt doar ce are "
         "legătură cu ce mi-ați spus, iar la final stabilim dacă merită un pas următor. Vi se pare corect?” "
         "Nu porniți nicio prezentare aici."),
        ("03-20 min · Descoperirea",
         "Întrebările din capitolul 02, alese pentru rolul lui. Notează cuvintele exacte. La fiecare "
         "problemă cere un exemplu concret și o frecvență. Nu propune soluții încă, nici dacă e evident."),
        ("20-25 min · Rezumatul care vinde",
         "„Ca să fiu sigur că am înțeles: problema principală este [cuvintele lui], se întâmplă [frecvență], "
         "vă costă aproximativ [cifră], iar dacă nu se schimbă, riscul este [risc]. Am înțeles corect?” "
         "Un „da” aici este jumătate din vânzare."),
        ("25-35 min · Demonstrația scurtă",
         "Arată maximum trei lucruri, toate legate de problema lui: întrebarea în limba lui cu sursă citată, "
         "documentul cu versiune și stare, testul cu certificat. Nu deschide meniuri care nu au fost cerute."),
        ("35-40 min · Obiecțiile",
         "Invită obiecția: „Ce v-ar face să nu mergeți mai departe?” Răspunde cu capitolul 03, o obiecție "
         "pe rând, fără liste de funcții."),
        ("40-45 min · Pasul următor",
         "„Vă propun un pilot de 30 de zile pe [problema lui], într-un singur departament, cu criteriul "
         "[criteriul lui]. Am nevoie de patru ore de la o persoană. Începem luni?” Ieși din discuție cu dată și nume."),
    ],
    prep_title="Pregătirea înainte de discuție",
    prep=[
        "Ce face firma, câți angajați, câte locații — două minute pe site-ul lor sunt suficiente.",
        "Ce reglementare sau audit îi presează (transport, HR, calitate, siguranță alimentară).",
        "Cine e persoana din față: proprietar, operațional, HR, calitate sau IT — schimbă complet accentul.",
        "Trei ipoteze de problemă scrise înainte, ca să le poți testa cu întrebări, nu cu afirmații.",
        "O cifră de referință din același domeniu, pregătită pentru comparație.",
        "Ce NU vom propune în prima discuție, ca să nu diluăm mesajul.",
    ],
    scenarios_title="Scenarii pe domenii: cu ce deschidem",
    scenarios=[
        ("Transport și logistică",
         "Șoferi fără acces la instrucțiuni, CMR-uri incomplete, timpi de conducere și pauze discutabile, incidente repetate cu marfă refuzată.",
         "„Când un șofer are marfă refuzată la 300 km de sediu, în cât timp știe exact ce are voie să facă — și cu ce document dovediți asta la control?”"),
        ("Resurse umane",
         "Integrare lentă, contracte și documente diferite pe țară, instruire fără dovadă, plecări care iau cunoașterea cu ele.",
         "„Cât durează azi până un angajat nou lucrează ca unul cu experiență, și cine dovedește că a fost instruit după versiunea corectă?”"),
        ("Producție și calitate",
         "Proceduri expirate la linie, audit pregătit manual, neconformități care se repetă din același motiv.",
         "„Ultimul audit — cât timp v-a luat pregătirea dosarului și câte observații s-au repetat de anul trecut?”"),
        ("Depozit și distribuție",
         "Ture care lucrează diferit, întrebări permanente către șeful de tură, erori la recepție și retur.",
         "„Dacă întreb acum tura de noapte care e procedura la un retur, primesc același răspuns ca de la tura de zi?”"),
        ("Firme de servicii și birouri",
         "Cunoaștere în capul câtorva oameni, răspunsuri diferite la aceeași întrebare de client, dependență de persoane-cheie.",
         "„Dacă mâine lipsește persoana care știe cel mai bine procesul, ce se oprește și pentru cât timp?”"),
    ],
    close_title="Formulări de închidere",
    closes=[
        "„Ce ar trebui să vedeți în 30 de zile ca să spuneți că a meritat?” — Scrie răspunsul lui, semnează-l ca criteriu de succes.",
        "„Începem cu o singură problemă, cea care vă doare cel mai mult. Care este?”",
        "„Vă propun pilot de 30 de zile, pe un singur departament, cu criteriu scris. Dacă nu îl atingem, ne oprim.”",
        "„Nu vă cer să schimbați firma. Vă cer patru ore din partea unei singure persoane.”",
        "„Cine mai trebuie să fie în discuția următoare pentru ca decizia să se poată lua?”",
        "„Dacă cifra pierderii nu depășește investiția, vă spun eu să nu cumpărați.”",
    ],
    contact_title="OPSQAI",
    contact_body=(
        "Problemă → Diagnostic → Proiectarea soluției → Workspace. Cunoașterea firmei, AI ancorat "
        "strict în ea, instruire cu dovadă și inteligență operațională — în cloud sau pe "
        "infrastructura clientului, cu AI local."
    ),
    contact_link="opsqai.de",
    contact_extra="Calculatorul de cost: opsqai.de/pricing#cost · Discovery: opsqai.de/discovery",
    categories=[
        ("Preț și buget", [
            ("„E scump.”",
             "Nu a văzut încă valoarea, nu compară cu nimic. „Scump” înseamnă „scump față de ce?”.",
             "Față de ce este scump? Puneți alături cifra dintr-un an de greșeli repetate, ore pierdute căutând informație și zile de integrare pentru fiecare angajat nou. Calculatorul de pe opsqai.de/pricing arată cifra pe cazul dumneavoastră, cu datele dumneavoastră. Dacă rezultatul e sub investiție, vă spun eu primul să nu cumpărați.",
             "Cât v-a costat ultima greșeală de acest tip și de câte ori s-a repetat anul trecut?",
             "Nu oferi discount aici. Discountul confirmă că prețul era umflat."),
            ("„Nu avem buget în acest an.”",
             "Fie e adevărat și e o chestiune de calendar, fie problema nu e prioritară.",
             "Atunci hai să pregătim bugetul, nu să-l forțăm. Facem Discovery-ul acum, aveți diagnosticul și cifra scrise, iar când se deschide bugetul intrați cu un dosar gata făcut, nu cu o idee. Discovery-ul nu vă blochează bugetul.",
             "Când se decide bugetul anului viitor și de ce cifre depinde decizia?",
             "Nu dispari șase luni. Stabilește o dată exactă de revenire."),
            ("„Vreau un discount.”",
             "Testează dacă prețul e real și dacă noi credem în el.",
             "Prețul reflectă ce se livrează. Ce pot ajusta este scopul: pornim cu un singur departament și o singură problemă, la un cost mai mic, și extindem după ce vedeți rezultatul. Reducem riscul, nu valoarea.",
             "Preferați un preț mai mic cu scop mai mic sau tot scopul, dar în etape?",
             "Nu tăia prețul păstrând tot scopul — devalorizează livrarea."),
            ("„Cei de la X sunt mai ieftini.”",
             "Compară două lucruri diferite și așteaptă să ne apărăm.",
             "Probabil sunt. Comparați ce intră în preț: la noi intră diagnosticul problemei, construirea cunoașterii firmei, instruirea cu dovadă și AI-ul care răspunde strict din documentele dumneavoastră. Dacă vă trebuie doar un depozit de fișiere, mai ieftin este corect.",
             "Ce anume vă rezolvă soluția cealaltă din problema pe care mi-ați descris-o?",
             "Nu vorbi rău despre concurență. Mută discuția pe conținutul prețului."),
            ("„Cât costă exact? Trimiteți-mi o listă de prețuri.”",
             "Vrea să compare pe hârtie ca să elimine repede furnizori.",
             "Vă trimit prețuri, dar nu vă trimit o listă care nu vă spune nimic. Cifra depinde de câți oameni intră și ce produse vă trebuie. În 20 de minute vă dau numărul dumneavoastră, nu un interval.",
             "Câți oameni ar folosi zilnic sistemul și în câte departamente?",
             "Nu trimite un preț mediu prin e-mail. Se compară cu altceva și pierzi discuția."),
            ("„Costurile ascunse? Ce se mai adaugă pe drum?”",
             "A fost păcălit înainte, cere predictibilitate.",
             "Nu există costuri per document, per întrebare pusă AI-ului sau per raport. Se plătește pe oameni și pe produsele active. Instalarea Self-Hosted, actualizările semnate și suportul intră în acord, iar orice serviciu suplimentar se aprobă în scris înainte.",
             "Ce v-a costat neprevăzut la ultimul furnizor de software?",
             "Nu spune „depinde”. Enumeră explicit ce nu se taxează."),
            ("„Trebuie să justific investiția la board.”",
             "Are nevoie de muniție, nu de entuziasm. E aliat, nu adversar.",
             "Vă construiesc justificarea: o pagină cu problema, cifra pierderii actuale, ce se schimbă în 30 de zile și cum se măsoară. Board-ul nu cumpără software, cumpără o cifră care scade. Vin și în discuție dacă e util.",
             "Ce cifră trebuie să vadă board-ul ca să spună da?",
             "Nu trimite broșura de produs către board. Trimite o pagină cu cifre."),
        ]),
        ("Timp și prioritate", [
            ("„Nu avem timp de implementare acum.”",
             "Se teme de un proiect lung cu resurse pe care nu le are.",
             "De aceea nu cerem un proiect. Pornim cu documentele care există deja, într-un singur departament. Efortul din partea dumneavoastră este de aproximativ patru ore de la o singură persoană, în prima săptămână. Restul se completează din întrebările reale ale oamenilor, pe măsură ce lucrează.",
             "Care departament are cea mai mare durere? Începem doar cu el.",
             "Nu promite „implementare în 5 minute”. Nu e credibil."),
            ("„Reveniți în alt trimestru.”",
             "Nu este prioritate, sau nu a înțeles că pierderea curge acum.",
             "Revin, cu plăcere, la o dată fixă. Un singur lucru: problema despre care ați vorbit continuă să genereze cost și în trimestrul acesta. Vă las diagnosticul scris ca să nu reluăm discuția de la zero.",
             "Ce se schimbă în trimestrul următor și face proiectul posibil?",
             "Nu accepta „reveniți” fără dată și fără nume."),
            ("„Suntem în plin sezon.”",
             "Argument real. În sezon nimeni nu schimbă nimic.",
             "Corect, în sezon nu se schimbă procese. Dar sezonul este exact momentul în care se vede unde se rupe procesul. Notăm acum ce nu funcționează, pornim configurarea după vârf, cu problemele reale documentate.",
             "Ce v-a durut cel mai mult în sezonul trecut și s-a repetat acum?",
             "Nu forța start în vârf de sezon. Pierzi adopția."),
            ("„Avem un alt proiect prioritar.”",
             "Concurență internă pe atenție, nu pe buget.",
             "Nu vă cer să schimbați prioritatea. Vă cer patru ore ca să documentăm problema, ca să nu o luați de la început în trimestrul următor. Când se eliberează echipa, aveți deja diagnosticul.",
             "Când se termină proiectul acela și cine se eliberează?",
             "Nu concura cu proiectul lor. Așează-te după el."),
            ("„Cât durează până vedem rezultat?”",
             "Vrea certitudine, nu viteză.",
             "Primele răspunsuri corecte din documentele dumneavoastră se văd în prima săptămână. Un rezultat măsurabil — mai puține întrebări repetate, proceduri găsite imediat, instruire cu dovadă — se vede în pilotul de 30 de zile, față de un criteriu scris înainte de start.",
             "Ce ați vrea să fie deja diferit peste 30 de zile?",
             "Nu da termene pe care nu le controlezi."),
            ("„Am mai avut o implementare care a eșuat.”",
             "Frică justificată. Vrea garanție de risc, nu funcții.",
             "Spuneți-mi ce a eșuat exact — de obicei nu tehnologia, ci lipsa unui responsabil și un scop prea mare. De asta pornim cu o problemă, un departament, un criteriu de succes scris. Dacă nu îl atingem, ne oprim și nu continuați.",
             "Ce a lipsit atunci: oamenii, scopul sau furnizorul?",
             "Nu minimiza eșecul anterior. Folosește-l ca structură de proiect."),
        ]),
        ("Încredere în AI", [
            ("„AI-ul inventează.”",
             "A încercat un chatbot general și a primit un răspuns fals.",
             "Aveți dreptate, un AI general inventează. Al nostru răspunde exclusiv din documentele dumneavoastră și citează sursa: ce document, care secțiune. Dacă informația nu există în firmă, spune că nu există și înregistrează lipsa ca sarcină de completat. Zero răspuns fără sursă.",
             "Vreți să vă arăt cum refuză să răspundă când nu are sursă?",
             "Nu spune „AI-ul nostru e mai bun”. Arată refuzul de a răspunde."),
            ("„Nu vrem ca AI-ul să decidă în locul oamenilor.”",
             "Teamă de pierdere a controlului și a responsabilității.",
             "Nici noi. AI-ul extrage, compară, semnalează și propune. Decizia și semnătura rămân la om, iar fiecare propunere are urmă: cine a acceptat, când, pe baza cărui document.",
             "Care decizii, la dumneavoastră, trebuie să rămână obligatoriu la om?",
             "Nu vinde automatizare totală. Vinde asistență cu urmă."),
            ("„Datele noastre ajung la antrenarea unui model?”",
             "Grijă reală de confidențialitate și proprietate intelectuală.",
             "Nu. În varianta Self-Hosted, AI-ul rulează local pe serverul dumneavoastră și datele nu ies din firmă. Documentele nu se folosesc pentru antrenarea unor modele publice.",
             "Aveți o regulă internă scrisă privind datele și AI-ul?",
             "Nu improviza afirmații juridice. Rămâi la ce se poate demonstra tehnic."),
            ("„Angajații se vor teme că îi înlocuiește.”",
             "Problemă de comunicare internă, nu de tehnologie.",
             "Mesajul care funcționează: AI-ul nu preia oameni, preia întrebările repetate. Șeful de departament nu mai răspunde de 40 de ori la aceeași întrebare, iar omul nou nu mai stă blocat o oră căutând un document.",
             "Cine în firmă ar duce mesajul mai bine către echipă?",
             "Nu evita subiectul. Formulează-l primul, tu."),
            ("„De unde știm că răspunsul e corect?”",
             "Cere verificabilitate, nu încredere.",
             "Fiecare răspuns arată sursa și versiunea documentului. Dacă documentul e greșit, se corectează la sursă și răspunsul se schimbă pentru toată firma. Nu credeți AI-ul — verificați sursa în două clicuri.",
             "Cine ar fi proprietarul documentelor care contează cel mai mult?",
             "Nu spune „e foarte precis”. Arată sursa citată."),
            ("„Avem deja Copilot / ChatGPT.”",
             "Confundă un asistent general cu cunoașterea firmei.",
             "Sunt utile pentru text general. Nu știu procedura dumneavoastră, versiunea valabilă, ce e voie pe rol și ce s-a schimbat luna trecută. Noi lucrăm doar pe cunoașterea firmei și o ținem la zi. Se pot folosi în paralel.",
             "Ce întrebare internă i-ați pus și nu a putut răspunde corect?",
             "Nu ataca instrumentul pe care îl folosesc. Delimitează teritoriul."),
        ]),
        ("Date, securitate, conformitate", [
            ("„Nu vrem datele în cloud.”",
             "Politică internă sau cerință de client. De obicei e definitiv.",
             "Atunci nu le punem în cloud. Varianta Self-Hosted rulează pe serverul dumneavoastră, cu AI local, iar datele nu părăsesc firma. Instalarea se face cu asistent, cu verificare de sănătate și copii de siguranță.",
             "Cine administrează serverul și ce cerințe are juridicul?",
             "Nu încerca să-l convingi de cloud. Este bătălie pierdută și inutilă."),
            ("„Ce se întâmplă cu datele personale? GDPR?”",
             "Are nevoie de răspuns pe care să-l poată repeta în audit.",
             "Datele rămân la dumneavoastră, cu drepturi pe rol și pe departament. Salariile, datele medicale și notele HR sunt izolate de restul. Există istoric al accesului, iar în Self-Hosted nu există transfer în afara firmei.",
             "Ce trebuie să demonstrați concret la un audit de date?",
             "Nu da consultanță juridică. Descrie mecanismul, nu conformitatea absolută."),
            ("„Dacă serverul cade, ce facem?”",
             "Continuitate operațională. Întrebare de om serios.",
             "Copii de siguranță programate, restaurare verificată și actualizări semnate. Documentele rămân exportabile în orice moment, în format citibil, fără noi.",
             "Cine face azi copiile de siguranță la sistemele critice?",
             "Nu răspunde vag despre backup. Dă mecanismul exact."),
            ("„Și dacă vrem să plecăm?”",
             "Frica de captivitate. Cere ieșire, nu rămânere.",
             "Documentele și datele sunt ale dumneavoastră și se exportă. Nu vă țin cu contractul, vă țin cu rezultatul. Dacă rezultatul nu mai există, plecarea trebuie să fie simplă — și este.",
             "Ce v-a ținut blocat la un furnizor anterior?",
             "Nu ascunde condițiile de ieșire. Spune-le primul."),
            ("„Trebuie aprobare de la IT / securitate.”",
             "Proces normal. IT-ul poate bloca o vânzare bună.",
             "Corect, și e bine. Le trimit direct informația tehnică: unde rulează, ce porturi, cum se face actualizarea, cum se administrează drepturile. Prefer o discuție de 30 de minute cu IT-ul acum decât un blocaj în luna a treia.",
             "Cine din IT trebuie să spună da și ce l-ar îngrijora cel mai mult?",
             "Nu ocoli IT-ul. Adu-l în discuție din proprie inițiativă."),
        ]),
        ("„Avem deja ceva”", [
            ("„Avem deja proceduri scrise.”",
             "Are documente, dar nu are acces, versiune și dovadă de instruire.",
             "Foarte bine — atunci pornim mai repede. Problema nu este scrierea, este găsirea, versionarea și dovada că oamenii le-au înțeles. Le punem la un loc, arătăm ce a expirat și ce se contrazice, iar apoi verificăm cine a înțeles.",
             "Dacă întreb un om din tura de noapte, în cât timp găsește procedura corectă?",
             "Nu sugera că documentele lor sunt slabe. Mută discuția pe acces și dovadă."),
            ("„Avem ERP / TMS.”",
             "Crede că se suprapune. Nu se suprapune.",
             "ERP-ul ține tranzacțiile: comenzi, facturi, stocuri. Noi ținem cunoașterea, instruirea și cauzele problemelor — adică ce nu intră niciodată în ERP. Nu înlocuim nimic, umplem golul dintre sisteme și oameni.",
             "Unde caută un om instrucțiunea când ERP-ul îi arată doar un câmp obligatoriu?",
             "Nu spune „e mai bun decât ERP-ul”. Delimitează clar teritoriul."),
            ("„Avem SharePoint / Google Drive / dosare pe server.”",
             "Are depozit de fișiere, nu cunoaștere activă.",
             "Un dosar păstrează fișiere, dar nu răspunde la întrebări, nu știe ce a expirat și nu dovedește că omul a înțeles. Noi punem deasupra întrebarea în limba omului, sursa citată, versiunea și testul.",
             "Cât durează azi până cineva găsește documentul corect, nu doar un document?",
             "Nu ceri să renunțe la depozit. Te așezi deasupra lui."),
            ("„Avem un consultant care ne face procedurile.”",
             "A plătit deja pentru documentație. Sensibil la duplicare.",
             "Perfect, consultantul scrie conținutul, noi îl facem viu: îl versionăm, îl transformăm în curs cu test, arătăm ce nu se folosește niciodată și ce lipsește. Munca lui devine măsurabilă.",
             "Ce se întâmplă cu procedurile lui după ce le predă?",
             "Nu concura cu consultantul. Fă-l aliat."),
            ("„Ne descurcăm cu WhatsApp și e-mail.”",
             "Funcționează la scară mică. Nu la creștere sau la audit.",
             "Merge până la prima problemă serioasă: la audit nu poți dovedi nimic, iar când pleacă un om, informația pleacă cu el. Păstrăm simplitatea WhatsApp în modul de întrebare, dar cu sursă, versiune și urmă.",
             "Cum ați dovedi la un control că omul a fost instruit după versiunea corectă?",
             "Nu ridiculiza WhatsApp. Preia simplitatea lui."),
            ("„Avem departament de calitate, ei se ocupă.”",
             "Există proces, dar probabil manual și supraîncărcat.",
             "Atunci ei sunt cei care câștigă cel mai mult. Auditul automat arată ce e vag, duplicat sau contradictoriu în documente, iar instruirea și dovada nu se mai adună manual înainte de control.",
             "Cât timp pierde calitatea pregătind un audit acum?",
             "Nu propune înlocuirea rolului. Propune eliberarea lui."),
        ]),
        ("Oameni și adopție", [
            ("„Oamenii nu vor folosi încă o aplicație.”",
             "Cea mai serioasă obiecție. Adoptarea decide proiectul.",
             "De acord, de asta nu cerem învățarea unei structuri de dosare. Omul intră și întreabă în limba lui, ca pe WhatsApp, și primește răspunsul cu sursă. Dacă e nevoie de instruire de o zi, produsul e greșit.",
             "Vreți să testăm cu cinci oameni din cel mai sceptic departament?",
             "Nu răspunde cu funcții. Răspunde cu simplitate și cu un test mic."),
            ("„Oamenii noștri nu sunt tehnici.”",
             "Grijă de excludere, mai ales pentru depozit și teren.",
             "Nu trebuie să fie. Ecran de întrebare, răspuns, sursă. Funcționează și pe telefon, în română, germană sau engleză, iar pentru cei din teren se poate folosi vocea.",
             "Câți oameni lucrează fără calculator, doar cu telefonul?",
             "Nu presupune că toți au calculator la birou."),
            ("„Cine îl întreține intern?”",
             "Frica de o sarcină nouă pe un om deja ocupat.",
             "Un responsabil de conținut, câteva ore pe lună. Sistemul îi spune singur ce trebuie făcut: ce document a expirat, ce întrebare nu are răspuns, cine nu a trecut testul. Nu caută el de lucru, primește listă.",
             "Cine ar fi omul acela la dumneavoastră?",
             "Nu spune „nu necesită întreținere”. Nu e credibil."),
            ("„Avem fluctuație mare de personal.”",
             "Durere reală și scumpă. Argument, nu obiecție.",
             "Atunci sunteți exact cazul nostru. Cunoașterea rămâne în firmă, nu în oameni: omul nou intră pe curs generat din procedurile reale, dă test și se vede clar dacă a înțeles. Integrarea scade de la luni la săptămâni.",
             "Cât durează azi până un om nou lucrează la fel ca unul cu experiență?",
             "Nu trata fluctuația ca pe un impediment. Este argumentul principal."),
            ("„Vorbim mai multe limbi în firmă.”",
             "Operațiune multinațională. Barieră reală de comunicare.",
             "Interfața și conținutul funcționează în română, germană și engleză. Omul întreabă în limba lui și primește răspuns din același document oficial — o singură sursă de adevăr, mai multe limbi.",
             "În câte limbi trebuie să existe instruirea obligatorie?",
             "Nu promite traducere juridică perfectă. Promite acces în limba omului."),
        ]),
        ("Decizie și politică internă", [
            ("„Trebuie să discut cu colegii.”",
             "Nu e decidentul singur sau evită un refuz direct.",
             "Normal. Ca discuția să fie utilă fără mine, vă las o pagină: problema cu cuvintele dumneavoastră, cifra, ce se schimbă în 30 de zile. Și vă întreb direct: dacă ar depinde doar de dumneavoastră, ce ați decide?",
             "Cine mai trebuie să spună da și ce l-ar îngrijora?",
             "Nu trimite o prezentare de 30 de pagini pe care nu o poți apăra."),
            ("„Decizia se ia la nivel de grup / în altă țară.”",
             "Ciclu lung. Riscă să se blocheze în ierarhie.",
             "Atunci construim un caz local puternic: un departament, un rezultat măsurat, o pagină de dovadă. Grupul aprobă mai ușor ceva ce funcționează deja decât o idee.",
             "Ce a aprobat grupul ultima dată și ce a avut dosarul acela în plus?",
             "Nu aștepta pasiv grupul. Livrează dovadă locală."),
            ("„Nu sunt eu cel care decide.”",
             "Îți spune cinstit că vorbești cu persoana greșită — sau te testează.",
             "Vă mulțumesc că mi-ați spus. Rămâneți util în discuția asta: dumneavoastră cunoașteți problema. Cum vă ajut să o duceți mai departe și cine ar trebui să fie în următoarea discuție?",
             "Ce l-ar convinge pe decident: cifra, riscul de audit sau timpul oamenilor?",
             "Nu-l ocoli. Fă-l campion interior."),
            ("„Trimiteți-mi o ofertă și vă anunțăm.”",
             "Deseori un refuz politicos.",
             "Vă trimit, dar nu vreau să pierdem amândoi timpul cu o ofertă generică. Am nevoie de 15 minute ca oferta să fie pe problema dumneavoastră, cu cifrele dumneavoastră. Altfel ajunge un document care se compară greșit.",
             "Care ar fi criteriul cu care judecați oferta?",
             "Nu trimite ofertă fără criteriu de decizie cunoscut."),
            ("„Facem licitație / comparăm trei furnizori.”",
             "Proces formal. Câștigă cine definește criteriile.",
             "Corect, participăm. Vă propun să includeți în criterii și lucrurile care se văd abia la lună trei: dacă răspunsul citează sursa, dacă instruirea produce dovadă, dacă datele pot rămâne în firmă. Așa comparați ce funcționează, nu ce se promite.",
             "Cine scrie criteriile și când se închid?",
             "Nu intra în licitație fără să influențezi criteriile."),
        ]),
        ("Îndoieli despre nevoie", [
            ("„Nu avem problema asta.”",
             "Nu recunoaște simptomul în formularea noastră.",
             "Se poate, atunci nu aveți nevoie de noi. Verific totuși un lucru: dacă întreb acum un om din tura de noapte care e procedura la o marfă refuzată, cât durează până răspunde corect și cu ce document?",
             "Când s-a întâmplat ultima dată o greșeală pentru care ați spus „asta nu trebuia să se repete”?",
             "Nu contrazice. Pune o întrebare care testează realitatea."),
            ("„La noi merge bine așa.”",
             "Merge pe oameni-cheie, nu pe sistem. Fragil.",
             "Vă cred. Întrebarea nu e dacă merge, e pe cine se sprijină. Dacă mâine lipsește persoana care știe cel mai bine procesul, ce se oprește și pentru cât timp?",
             "Care om, dacă pleacă, vă dă cel mai mult de furcă?",
             "Nu ataca succesul actual. Testează dependența."),
            ("„Suntem prea mici.”",
             "Crede că soluția e pentru corporații.",
             "Firmele mici simt mai tare, pentru că fiecare om ține un proces întreg. Pornim cu un singur departament și un cost pe măsura firmei. Nu vindem un proiect de corporație.",
             "Câți oameni ar folosi sistemul, realist, în prima lună?",
             "Nu supradimensiona propunerea. Redu scopul."),
            ("„Suntem prea complicați, la noi nu se aplică.”",
             "Mândrie profesională și teamă de standardizare.",
             "Nu venim cu un șablon. Tocmai de asta pornim cu diagnostic: procedurile sunt ale dumneavoastră, cu excepțiile dumneavoastră. Configurăm în jurul felului în care lucrați, nu invers.",
             "Care este partea din procesul dumneavoastră care nu seamănă cu nimeni?",
             "Nu prezenta un flux standard. Prezintă diagnosticul."),
            ("„Ce face concret, în două propoziții?”",
             "Test de claritate. Dacă te încurci, ai pierdut.",
             "Punem la un loc procedurile firmei, iar oamenii întreabă în limba lor și primesc răspunsul corect cu sursă, în loc să caute sau să întrebe un coleg. Apoi verificăm cu test și certificat că au înțeles, și arătăm ce lipsește din cunoașterea firmei.",
             "Care din cele două părți vă interesează mai mult: găsirea informației sau dovada instruirii?",
             "Nu enumera module. Două propoziții, cuvintele lui."),
        ]),
    ],
)


# ================================================================ CONTENT DE

DE = dict(
    out="/mnt/documents/OPSQAI_Einwaende_Playbook_DE.pdf",
    footer="Vertriebs-Playbook — Einwände und Bedarfsanalyse · Intern · opsqai.de",
    cover_title=["Wie wir OPSQAI", "verkaufen. Und was wir", "bei einem Nein sagen."],
    cover_sub="Playbook: Einwände, Antworten und Fragen zur Bedarfsanalyse",
    cover_note="Internes Vertriebsdokument · Deutsch · opsqai.de",
    intro=(
        "OPSQAI wird nicht als Softwarelizenz verkauft, sondern als Lösung eines operativen "
        "Problems, das der Kunde bereits spürt: verlorene Stunden bei der Suche nach "
        "Informationen, dieselben Fehler immer wieder, abgelaufene Arbeitsanweisungen, neue "
        "Mitarbeiter, die drei Monate statt drei Wochen zur Einarbeitung brauchen. Dieses "
        "Playbook enthält genau das, was wir sagen, fragen und antworten — auch dann, wenn "
        "wir ein Nein bekommen."
    ),
    labels=dict(
        says="WAS DER KUNDE SAGT",
        means="WAS ES WIRKLICH BEDEUTET",
        answer="UNSERE ANTWORT",
        ask="RÜCKFRAGE",
        avoid="ZU VERMEIDEN",
        category="Kategorie",
        page_objections="Einwände",
    ),
    method_title="Die Methode: kein Produkt, sondern eine Diagnose",
    method_intro=(
        "Grundregel: Wer fragt, führt das Gespräch. In den ersten 20 Minuten zeigen wir keine "
        "Module. Wir zeigen erst, wenn der Kunde mit seinen eigenen Worten gesagt hat, was ihm "
        "wehtut und was es ihn kostet. Der Verkauf läuft in vier Schritten."
    ),
    method_steps=[
        ("Problem",
         "Wir lassen ihn erzählen. Wir korrigieren nicht, verkaufen nicht und vergleichen nicht "
         "mit dem Wettbewerb. Wir notieren seine Worte wörtlich — wir verwenden sie später im "
         "Angebot. Die Eröffnungsfrage bleibt immer gleich: „Was kostet Sie in einer normalen "
         "Woche am meisten Zeit?“"),
        ("Diagnose",
         "Wir übersetzen das Symptom in eine Ursache: wo die Information abreißt, welche "
         "Anweisung versagt, welcher Schritt die Stunden frisst. Und wir hinterlegen Zahlen: "
         "wie oft im Monat, wie viele Personen, wie lange. Ohne Zahlen gibt es kein Budget."),
        ("Lösungsentwurf",
         "Wir zeigen ausschließlich, was die gefundene Ursache beseitigt. Ein Ablauf, mit "
         "seinem Namen und seinen Leuten. Der Rest der Plattform bleibt im Hintergrund — "
         "vorhanden, aber nicht Thema."),
        ("Workspace",
         "Wir schlagen einen 30-Tage-Pilot auf genau dieses Problem vor, mit einem vor dem Start "
         "schriftlich festgelegten Erfolgskriterium. Wird es nicht erreicht, macht der Kunde "
         "nicht weiter — und wir sagen es als Erste."),
    ],
    rules_title="Sieben Regeln, die die Abschlussquote verändern",
    rules=[
        "30 % reden, 70 % zuhören. Wer mehr redet als der Kunde, hat die Gesprächsführung verloren.",
        "Nie einen Einwand beantworten, bevor man ihn versteht. Frage „Was bringt Sie dazu, das zu sagen?“ und schweige.",
        "OPSQAI nicht mit SAP, Microsoft oder ServiceNow vergleichen. Sage: „Wir starten nicht bei der Software, wir starten bei Ihrem Problem.“",
        "Jede Aussage braucht eine Zahl oder einen Beweis. „Spart Zeit“ verkauft nicht. „Die 40 täglichen Rückfragen an den Lagerleiter verschwinden“ verkauft.",
        "Offen sagen, was das Produkt NICHT kann. Ein klares „Das machen wir nicht“ schafft mehr Vertrauen als zehn versprochene Funktionen.",
        "Nie über den Preis verhandeln, bevor der Wert steht. Erst die Verlustzahl, dann die Investitionszahl.",
        "Jedes Gespräch mit einem nächsten Schritt schließen — mit Datum und Namen. „Wir denken darüber nach“ ist kein nächster Schritt.",
    ],
    discovery_title="Wie wir das Problem finden: die Fragen der Bedarfsanalyse",
    discovery_intro=(
        "Der Kunde kommt nicht mit einer Software-Anforderung, sondern mit einem Ärgernis. "
        "Unsere Aufgabe: aus dem Ärgernis eine Ursache machen und aus der Ursache eine Zahl. "
        "Die Fragen werden in dieser Reihenfolge gestellt, aber nicht alle — für ein Gespräch "
        "von einer Stunde wählt man 10 bis 12. Die mit ▸ markierten sind in jedem Gespräch Pflicht."
    ),
    discovery=[
        ("Eröffnung — lass ihn erzählen", [
            "▸ Was kostet Sie in einer normalen Woche am meisten Zeit?",
            "▸ Wenn Sie morgen eine einzige Sache im Unternehmen reparieren könnten — welche?",
            "Warum führen Sie dieses Gespräch jetzt und nicht vor sechs Monaten?",
            "Wer im Unternehmen spürt das Problem am stärksten — Sie oder jemand anderes?",
            "Erzählen Sie mir den letzten Fall. Was genau ist da schiefgelaufen?",
            "Was haben Sie bereits versucht, und warum hat es nicht funktioniert?",
            "Was passiert, wenn Sie in den nächsten zwölf Monaten nichts ändern?",
        ]),
        ("Kosten des Problems — Zahlen hinterlegen", [
            "▸ Wie oft passiert das: täglich, wöchentlich, monatlich?",
            "▸ Wie viele Personen sind jedes Mal beteiligt und wie lange dauert es?",
            "Was war der teuerste Fehler dieser Art im letzten Jahr?",
            "Hatten Sie deswegen Vertragsstrafen, Retouren, Reklamationen oder Bußgelder?",
            "Wie lange braucht ein neuer Mitarbeiter, bis er so arbeitet wie ein erfahrener?",
            "Wie viel Zeit verliert eine Führungskraft mit immer denselben Rückfragen?",
            "Wie lange dauert es bei einer Prüfung oder einem Audit, die Unterlagen zusammenzutragen?",
            "Wenn morgen die Person fehlt, die den Prozess am besten kennt — was steht still?",
        ]),
        ("Wie heute gearbeitet wird — der echte Prozess", [
            "▸ Wo liegen die Arbeitsanweisungen heute: E-Mail, Ordner, WhatsApp, Papier?",
            "Wer entscheidet über eine Änderung und wer erfährt davon?",
            "Woran erkennt ein Mitarbeiter, dass er nach der gültigen Version arbeitet?",
            "Wie erreichen Anweisungen die Leute im Lager oder im Außendienst?",
            "Was passiert mit einem Vorfall: wird er dokumentiert, besprochen oder vergessen?",
            "Wer erstellt den Monatsbericht und aus welchen Quellen?",
            "Wie viele Systeme muss man öffnen, um eine einzige Kundenfrage zu beantworten?",
            "Welcher Teil des Wissens existiert ausschließlich im Kopf einer Person?",
        ]),
        ("Menschen und Akzeptanz", [
            "▸ Wer würde die Lösung täglich nutzen und wie sicher ist er mit Technik?",
            "In welchen Sprachen arbeiten Ihre Leute?",
            "Was ist beim letzten neu eingeführten System passiert?",
            "Wer wäre im Unternehmen dagegen und warum?",
            "Wer würde als Erster „endlich“ sagen?",
            "Haben Sie Mitarbeiter ohne Schreibtisch — Fahrer, Lager, Außendienst?",
        ]),
        ("Daten, IT und Rahmenbedingungen", [
            "▸ Gibt es eine interne Vorgabe zu Daten in der Cloud?",
            "Haben Sie einen eigenen Server und wer betreibt ihn?",
            "Welche Anforderungen kommen von der Rechtsabteilung oder von Schlüsselkunden?",
            "Welche Systeme müssen zwingend weiterlaufen (ERP, TMS, Buchhaltung)?",
            "Haben Sie eine eigene IT oder einen externen Dienstleister?",
        ]),
        ("Entscheidung, Budget, nächster Schritt", [
            "▸ Wie wird bei Ihnen entschieden und wer muss noch Ja sagen?",
            "▸ Was müssten Sie in 30 Tagen sehen, um zu sagen: das hat sich gelohnt?",
            "Ist Budget vorhanden oder muss es erst aufgebaut werden?",
            "Was würde das Projekt blockieren, selbst wenn Sie es wollen?",
            "Bis wann soll das Thema erledigt sein?",
            "Ich schlage einen 30-Tage-Pilot auf dieses Problem vor. Was fehlt, um Montag zu starten?",
        ]),
    ],
    listen_title="Worauf wir hören: Sätze, die Geld wert sind",
    listen=[
        ("„Jeder macht es, wie er es kennt.“", "Es gibt keinen einheitlichen Ablauf. Direkter Einstieg für Knowledge Base und Versionierung."),
        ("„Ich frage Herrn Meier, der weiß das.“", "Wissen steckt in einer Person. Ausfallrisiko. Einstieg für FAQ und quellenbasierten Chat."),
        ("„Den Fall hatten wir schon mal.“", "Wiederkehrender Vorfall. Sofort bezifferbar: Häufigkeit pro Jahr × Kosten."),
        ("„Wir finden das Dokument nicht.“", "Täglicher, messbarer Zeitverlust. Einstieg für Suche und Knowledge Base."),
        ("„Er wurde eingewiesen, aber …“", "Schulung ohne Nachweis. Einstieg für Academy mit Test und Zertifikat."),
        ("„Beim Audit war es mühsam.“", "Prüfungsangst. Das am schnellsten freigegebene Budget im Unternehmen."),
        ("„Die Neuen fragen ständig alles.“", "Langsame Einarbeitung. Rechenbar in verlorenen Produktivtagen."),
        ("„Noch ein Programm will keiner.“", "Angst vor Akzeptanz, nicht vor dem Preis. Antwort ist Einfachheit, nicht Funktionsumfang."),
    ],
    obj_title="Häufige Einwände und Antworten",
    obj_intro=(
        "Jeder Einwand hat vier Teile: was der Kunde sagt, was er wirklich meint, was wir "
        "antworten und was wir direkt danach fragen. Die Antwort wird nicht aufgesagt, sondern "
        "an seine Worte angepasst. Ein Einwand wird nie mit einer Funktionsliste beantwortet."
    ),
    refusal_title="Wenn wir ein Nein bekommen",
    refusal_intro=(
        "Ein Nein ist kein Gesprächsende, sondern fehlende Information — bei ihm oder bei uns. "
        "Regel: das Nein ruhig annehmen, um genau eine Sache bitten, die Tür mit einem Datum "
        "offen lassen. Nicht zweimal im gleichen Gespräch nachdrücken; dafür über die Zeit dranbleiben."
    ),
    refusals=[
        ("„Kein Interesse.“",
         "Verstanden, danke für die Klarheit. Damit ich Sie nicht unnötig weiter behellige: Wir "
         "lösen üblicherweise, dass Mitarbeiter die gültige Anweisung nicht finden und sich "
         "dieselben Fehler wiederholen. Wenn das bei Ihnen gelöst ist, brauchen Sie uns wirklich nicht."),
        ("„Nicht jetzt, vielleicht später.“",
         "Gut, dann bitte ich Sie nicht um eine Entscheidung, sondern um ein Datum. Ich melde mich "
         "im [Monat] und lasse Ihnen bis dahin die schriftliche Diagnose zu Ihrem Fall — die bleibt "
         "bei Ihnen, auch ohne Zusammenarbeit."),
        ("„Wir haben uns für eine andere Lösung entschieden.“",
         "Gratulation zur Entscheidung. Eine Frage für mich: Was hat am stärksten gewogen? Und wenn "
         "in sechs Monaten Anweisungen und Schulungsnachweise offen bleiben, rufen Sie mich direkt an."),
        ("„Wir haben kein Budget.“",
         "Dann sprechen wir nicht über Budget, sondern über die Zahl, die Sie heute verlieren. Wenn "
         "der Verlust am Ende kleiner ist als die Investition, sage ich Ihnen als Erster: kaufen Sie nicht."),
        ("„Die Geschäftsführung hat Nein gesagt.“",
         "In Ordnung, das ist ihre Entscheidung. Was war das Argument? Ich schicke Ihnen eine Seite, "
         "keine Präsentation: Problem, Zahl, was sich in 30 Tagen ändert. Bleibt es beim Nein, "
         "schließen wir es sauber ab."),
        ("Völlige Funkstille nach dem Angebot",
         "Kurze Nachricht, höchstens alle zehn Tage, maximal dreimal: „Schließe ich die Akte oder "
         "lasse ich sie offen?“ Das ist die einzige Formulierung, die zuverlässig Antwort bekommt."),
    ],
    followup_title="Nachfassnachrichten, die Antwort bekommen",
    followups=[
        ("Nach dem ersten Gespräch (am gleichen Tag)",
         "Ich habe drei Dinge notiert: [sein Problem, in seinen Worten], [die Zahl], [was in 30 Tagen "
         "anders sein soll]. Wenn das stimmt, schicke ich Donnerstag den Pilotvorschlag. Wenn nicht, "
         "korrigieren Sie mich in zwei Zeilen."),
        ("Nach dem Angebot, ohne Antwort (Tag 4)",
         "Eine einfache Frage: Steht das Thema [X] in diesem Quartal noch auf Ihrer Liste? Wenn nicht, "
         "lasse ich Sie in Ruhe und schließe die Akte."),
        ("Reaktivierung nach drei Monaten",
         "Wir sprachen im [Monat], damals war [X] das Thema. Inzwischen haben wir genau diesen Fall bei "
         "einem Unternehmen Ihrer Größe gelöst. Wollen Sie in 15 Minuten hören, was dort funktioniert hat?"),
        ("Sauberer Abschluss",
         "Ich schließe Ihre Akte als „nicht jetzt“. Die schriftliche Diagnose bleibt bei Ihnen. Wenn sich "
         "etwas ändert, eine Nachricht und wir machen dort weiter, wo wir stehen geblieben sind."),
    ],
    script_title="Der Gesprächsleitfaden für 45 Minuten",
    script_intro=(
        "Die folgende Struktur ist der Rahmen für ein Erstgespräch. Die Zeiten sind Richtwerte, die "
        "Reihenfolge nicht. Wenn du in Minute 25 kein in seinen Worten formuliertes Problem und keine "
        "Zahl hast, gehst du nicht in die Präsentation — du fragst weiter."
    ),
    script=[
        ("00-03 Min · Eröffnung",
         "„Danke für Ihre Zeit. Ich schlage 45 Minuten vor: die ersten 20 höre ich zu, danach zeige ich "
         "ausschließlich, was mit dem zu tun hat, was Sie mir gesagt haben, und am Ende klären wir, ob ein "
         "nächster Schritt sinnvoll ist. Passt das für Sie?“ Hier startet keine Präsentation."),
        ("03-20 Min · Bedarfsanalyse",
         "Die Fragen aus Kapitel 02, passend zu seiner Rolle. Seine Worte wörtlich notieren. Zu jedem "
         "Problem ein konkretes Beispiel und eine Häufigkeit erfragen. Noch keine Lösungen anbieten, "
         "auch wenn es naheliegt."),
        ("20-25 Min · Die Zusammenfassung, die verkauft",
         "„Damit ich sicher bin, dass ich es verstanden habe: Das Hauptproblem ist [seine Worte], es "
         "passiert [Häufigkeit], es kostet Sie etwa [Zahl], und ohne Änderung ist das Risiko [Risiko]. "
         "Habe ich das richtig verstanden?“ Ein Ja an dieser Stelle ist die halbe Entscheidung."),
        ("25-35 Min · Die kurze Demonstration",
         "Höchstens drei Dinge zeigen, alle mit Bezug zu seinem Problem: die Frage in seiner Sprache mit "
         "zitierter Quelle, das Dokument mit Version und Status, den Test mit Zertifikat. Keine Menüs "
         "öffnen, nach denen niemand gefragt hat."),
        ("35-40 Min · Die Einwände",
         "Den Einwand einladen: „Was würde Sie davon abhalten, weiterzumachen?“ Antworten nach Kapitel 03, "
         "ein Einwand nach dem anderen, ohne Funktionslisten."),
        ("40-45 Min · Der nächste Schritt",
         "„Ich schlage einen 30-Tage-Pilot auf [sein Problem] vor, in einer Abteilung, mit dem Kriterium "
         "[sein Kriterium]. Ich brauche vier Stunden einer Person. Starten wir Montag?“ Nie ohne Datum "
         "und Namen aus dem Termin gehen."),
    ],
    prep_title="Vorbereitung vor dem Gespräch",
    prep=[
        "Was das Unternehmen macht, wie viele Mitarbeiter, wie viele Standorte — zwei Minuten auf ihrer Website genügen.",
        "Welche Regulierung oder Prüfung Druck macht (Transport, HR, Qualität, Lebensmittelsicherheit).",
        "Wer gegenübersitzt: Inhaber, Operations, HR, Qualität oder IT — das verändert die Schwerpunkte vollständig.",
        "Drei vorab notierte Problemhypothesen, um sie mit Fragen zu prüfen statt mit Behauptungen.",
        "Eine Vergleichszahl aus derselben Branche, vorbereitet für die Gegenüberstellung.",
        "Was im Erstgespräch NICHT vorgeschlagen wird, damit die Botschaft nicht verwässert.",
    ],
    scenarios_title="Branchenszenarien: womit wir eröffnen",
    scenarios=[
        ("Transport und Logistik",
         "Fahrer ohne Zugriff auf Anweisungen, unvollständige Frachtbriefe, strittige Lenk- und Ruhezeiten, wiederkehrende Fälle mit abgelehnter Ware.",
         "„Wenn ein Fahrer 300 km vom Standort abgelehnte Ware hat — wie schnell weiß er genau, was er tun darf, und mit welchem Dokument belegen Sie das bei einer Kontrolle?“"),
        ("Personalwesen",
         "Langsame Einarbeitung, unterschiedliche Verträge und Dokumente je Land, Schulung ohne Nachweis, Abgänge, die das Wissen mitnehmen.",
         "„Wie lange braucht heute ein neuer Mitarbeiter, bis er wie ein erfahrener arbeitet, und wer belegt, dass nach der gültigen Version geschult wurde?“"),
        ("Produktion und Qualität",
         "Abgelaufene Anweisungen an der Linie, manuell vorbereitete Audits, Abweichungen, die sich aus demselben Grund wiederholen.",
         "„Das letzte Audit — wie lange hat die Vorbereitung gedauert und wie viele Feststellungen waren Wiederholungen aus dem Vorjahr?“"),
        ("Lager und Distribution",
         "Schichten, die unterschiedlich arbeiten, dauernde Rückfragen an den Schichtleiter, Fehler bei Annahme und Retoure.",
         "„Wenn ich jetzt die Nachtschicht nach dem Retourenablauf frage — bekomme ich dieselbe Antwort wie von der Tagschicht?“"),
        ("Dienstleister und Büroorganisationen",
         "Wissen in den Köpfen einiger Personen, unterschiedliche Antworten auf dieselbe Kundenfrage, Abhängigkeit von Schlüsselpersonen.",
         "„Wenn morgen die Person fehlt, die den Prozess am besten kennt — was steht still und wie lange?“"),
    ],
    close_title="Abschlussformulierungen",
    closes=[
        "„Was müssten Sie in 30 Tagen sehen, um zu sagen: das hat sich gelohnt?“ — Antwort mitschreiben und als Erfolgskriterium festhalten.",
        "„Wir starten mit einem einzigen Problem — dem, das am meisten wehtut. Welches ist das?“",
        "„Ich schlage 30 Tage Pilot vor, eine Abteilung, ein schriftliches Kriterium. Erreichen wir es nicht, hören wir auf.“",
        "„Ich bitte Sie nicht, das Unternehmen umzubauen. Ich bitte um vier Stunden von einer Person.“",
        "„Wer muss beim nächsten Termin dabei sein, damit entschieden werden kann?“",
        "„Wenn die Verlustzahl die Investition nicht übersteigt, sage ich Ihnen selbst: kaufen Sie nicht.“",
    ],
    contact_title="OPSQAI",
    contact_body=(
        "Problem → Diagnose → Lösungsentwurf → Workspace. Unternehmenswissen, KI streng darauf "
        "verankert, Schulung mit Nachweis und operative Auswertung — in der Cloud oder auf der "
        "Infrastruktur des Kunden, mit lokaler KI."
    ),
    contact_link="opsqai.de",
    contact_extra="Kostenrechner: opsqai.de/pricing#cost · Discovery: opsqai.de/discovery",
    categories=[
        ("Preis und Budget", [
            ("„Das ist zu teuer.“",
             "Er hat den Wert noch nicht gesehen und vergleicht mit nichts. „Teuer“ heißt „teuer im Vergleich zu was?“.",
             "Teuer im Vergleich zu was? Legen Sie die Zahl eines Jahres daneben: wiederkehrende Fehler, Suchzeiten, Einarbeitungstage pro neuem Mitarbeiter. Der Rechner auf opsqai.de/pricing zeigt Ihre Zahl mit Ihren Daten. Liegt das Ergebnis unter der Investition, sage ich Ihnen als Erster: kaufen Sie nicht.",
             "Was hat der letzte Fehler dieser Art gekostet und wie oft kam er im Vorjahr vor?",
             "Hier keinen Rabatt anbieten. Ein Rabatt bestätigt, dass der Preis überhöht war."),
            ("„Dieses Jahr ist kein Budget da.“",
             "Entweder Kalenderfrage — oder das Thema ist keine Priorität.",
             "Dann bauen wir das Budget vor, statt es zu erzwingen. Wir machen jetzt die Diagnose, Sie haben Ursache und Zahl schriftlich, und wenn das Budget aufgeht, gehen Sie mit einer fertigen Akte hinein statt mit einer Idee. Die Diagnose blockiert kein Budget.",
             "Wann wird das nächste Jahresbudget entschieden und von welchen Zahlen hängt es ab?",
             "Nicht sechs Monate verschwinden. Ein konkretes Rückmeldedatum festlegen."),
            ("„Ich möchte einen Rabatt.“",
             "Er testet, ob der Preis echt ist und ob wir selbst daran glauben.",
             "Der Preis entspricht dem Lieferumfang. Anpassen kann ich den Umfang: Start mit einer Abteilung und einem Problem, zu geringeren Kosten, Ausbau nach dem ersten Ergebnis. Wir senken das Risiko, nicht den Wert.",
             "Lieber kleinerer Preis mit kleinerem Umfang oder vollständiger Umfang in Etappen?",
             "Nicht den Preis senken und den Umfang gleich lassen — das entwertet die Leistung."),
            ("„Anbieter X ist günstiger.“",
             "Er vergleicht zwei verschiedene Dinge und erwartet, dass wir uns verteidigen.",
             "Wahrscheinlich stimmt das. Vergleichen Sie, was im Preis steckt: bei uns die Diagnose des Problems, der Aufbau des Unternehmenswissens, Schulung mit Nachweis und eine KI, die ausschließlich aus Ihren Dokumenten antwortet. Wenn Sie nur eine Dateiablage brauchen, ist günstiger richtig.",
             "Welchen Teil des von Ihnen beschriebenen Problems löst die andere Lösung?",
             "Nicht schlecht über den Wettbewerb reden. Auf den Inhalt des Preises lenken."),
            ("„Was kostet es genau? Schicken Sie eine Preisliste.“",
             "Er will auf Papier vergleichen, um schnell Anbieter auszusortieren.",
             "Preise bekommen Sie, aber keine Liste, die Ihnen nichts sagt. Die Zahl hängt von der Anzahl der Nutzer und den benötigten Produkten ab. In 20 Minuten nenne ich Ihnen Ihre Zahl, keine Spanne.",
             "Wie viele Personen würden das System täglich nutzen, in wie vielen Abteilungen?",
             "Keinen Durchschnittspreis per E-Mail schicken. Er wird falsch verglichen."),
            ("„Versteckte Kosten? Was kommt später dazu?“",
             "Er wurde schon einmal überrascht und will Planbarkeit.",
             "Es gibt keine Kosten pro Dokument, pro KI-Frage oder pro Bericht. Bezahlt werden Nutzer und aktive Produkte. Self-Hosted-Installation, signierte Updates und Support sind Teil der Vereinbarung; jede zusätzliche Leistung wird vorher schriftlich freigegeben.",
             "Was hat beim letzten Softwareanbieter unerwartet Geld gekostet?",
             "Nicht „das kommt darauf an“ sagen. Explizit nennen, was nicht abgerechnet wird."),
            ("„Ich muss die Investition der Geschäftsführung begründen.“",
             "Er braucht Argumente, nicht Begeisterung. Er ist Verbündeter, nicht Gegner.",
             "Ich baue Ihnen die Begründung: eine Seite mit dem Problem, der heutigen Verlustzahl, der Veränderung in 30 Tagen und der Messmethode. Eine Geschäftsführung kauft keine Software, sie kauft eine Zahl, die sinkt. Ich komme auf Wunsch in den Termin mit.",
             "Welche Zahl muss die Geschäftsführung sehen, um Ja zu sagen?",
             "Keine Produktbroschüre nach oben geben. Eine Seite mit Zahlen."),
        ]),
        ("Zeit und Priorität", [
            ("„Wir haben jetzt keine Zeit für eine Einführung.“",
             "Er fürchtet ein langes Projekt mit Ressourcen, die er nicht hat.",
             "Deshalb schlagen wir kein Projekt vor. Wir starten mit den Dokumenten, die schon existieren, in einer Abteilung. Ihr Aufwand liegt bei etwa vier Stunden einer Person in der ersten Woche. Der Rest entsteht aus den echten Fragen der Mitarbeiter im laufenden Betrieb.",
             "Welche Abteilung hat den größten Schmerz? Dort starten wir allein.",
             "Keine „Einführung in fünf Minuten“ versprechen. Das ist unglaubwürdig."),
            ("„Melden Sie sich im nächsten Quartal.“",
             "Keine Priorität — oder er hat nicht verstanden, dass der Verlust jetzt läuft.",
             "Gerne, zu einem festen Datum. Nur eines: Das Problem, von dem Sie erzählt haben, erzeugt auch in diesem Quartal Kosten. Ich lasse Ihnen die Diagnose schriftlich, damit wir nicht bei Null anfangen.",
             "Was ändert sich im nächsten Quartal und macht das Projekt möglich?",
             "Kein „melden Sie sich später“ ohne Datum und Namen akzeptieren."),
            ("„Wir sind mitten in der Hochsaison.“",
             "Echtes Argument. In der Saison verändert niemand Prozesse.",
             "Richtig, in der Saison ändert man keine Prozesse. Aber genau dann sieht man, wo der Prozess reißt. Wir notieren jetzt, was nicht funktioniert, und starten die Einrichtung nach dem Peak — mit dokumentierten echten Problemen.",
             "Was hat in der letzten Saison am meisten wehgetan und wiederholt sich jetzt?",
             "Keinen Start im Saisonpeak erzwingen. Das kostet Akzeptanz."),
            ("„Wir haben ein anderes Projekt mit Priorität.“",
             "Interner Wettbewerb um Aufmerksamkeit, nicht um Budget.",
             "Ich bitte Sie nicht, die Priorität zu ändern. Ich bitte um vier Stunden, um das Problem zu dokumentieren, damit Sie im nächsten Quartal nicht wieder von vorn anfangen. Wenn das Team frei wird, liegt die Diagnose bereits vor.",
             "Wann endet dieses Projekt und wer wird dann frei?",
             "Nicht mit ihrem Projekt konkurrieren. Sich dahinter einordnen."),
            ("„Wie lange, bis wir ein Ergebnis sehen?“",
             "Er will Sicherheit, nicht Geschwindigkeit.",
             "Erste korrekte Antworten aus Ihren Dokumenten sehen Sie in der ersten Woche. Ein messbares Ergebnis — weniger Wiederholungsfragen, sofort gefundene Anweisungen, Schulung mit Nachweis — zeigt der 30-Tage-Pilot, gemessen an einem vor dem Start festgelegten Kriterium.",
             "Was soll in 30 Tagen bereits anders sein?",
             "Keine Termine nennen, die man nicht kontrolliert."),
            ("„Eine Einführung ist bei uns schon einmal gescheitert.“",
             "Berechtigte Angst. Er will Risikoabsicherung, keine Funktionen.",
             "Erzählen Sie mir, was genau gescheitert ist — meist nicht die Technik, sondern ein fehlender Verantwortlicher und ein zu großer Umfang. Deshalb starten wir mit einem Problem, einer Abteilung und einem schriftlichen Erfolgskriterium. Erreichen wir es nicht, hören wir auf.",
             "Was fehlte damals: die Menschen, der Umfang oder der Anbieter?",
             "Das frühere Scheitern nicht kleinreden. Es als Projektstruktur nutzen."),
        ]),
        ("Vertrauen in KI", [
            ("„KI erfindet Dinge.“",
             "Er hat einen allgemeinen Chatbot getestet und eine falsche Antwort erhalten.",
             "Sie haben recht, eine allgemeine KI erfindet. Unsere antwortet ausschließlich aus Ihren Dokumenten und nennt die Quelle: welches Dokument, welcher Abschnitt. Fehlt die Information im Unternehmen, sagt sie das und protokolliert die Lücke als Aufgabe. Keine Antwort ohne Quelle.",
             "Soll ich Ihnen zeigen, wie sie die Antwort verweigert, wenn keine Quelle existiert?",
             "Nicht „unsere KI ist besser“ sagen. Die Antwortverweigerung zeigen."),
            ("„Die KI soll nicht für unsere Leute entscheiden.“",
             "Angst vor Kontroll- und Verantwortungsverlust.",
             "Wir auch nicht. Die KI extrahiert, vergleicht, weist hin und schlägt vor. Entscheidung und Unterschrift bleiben beim Menschen, und jeder Vorschlag hat eine Spur: wer hat wann auf welcher Dokumentenbasis zugestimmt.",
             "Welche Entscheidungen müssen bei Ihnen zwingend beim Menschen bleiben?",
             "Keine Vollautomatisierung verkaufen. Assistenz mit Nachvollziehbarkeit verkaufen."),
            ("„Werden unsere Daten zum Training verwendet?“",
             "Echte Sorge um Vertraulichkeit und geistiges Eigentum.",
             "Nein. In der Self-Hosted-Variante läuft die KI lokal auf Ihrem Server, die Daten verlassen das Unternehmen nicht. Ihre Dokumente werden nicht zum Training öffentlicher Modelle verwendet.",
             "Gibt es bei Ihnen eine schriftliche Regel zu Daten und KI?",
             "Keine juristischen Zusagen improvisieren. Bei technisch Belegbarem bleiben."),
            ("„Die Mitarbeiter werden Angst um ihre Stellen haben.“",
             "Ein Thema der internen Kommunikation, nicht der Technik.",
             "Die Botschaft, die funktioniert: Die KI ersetzt keine Menschen, sie übernimmt die Wiederholungsfragen. Die Führungskraft beantwortet dieselbe Frage nicht mehr 40-mal, und der Neue steht nicht mehr eine Stunde suchend da.",
             "Wer im Unternehmen würde diese Botschaft am glaubwürdigsten übermitteln?",
             "Das Thema nicht umgehen. Selbst zuerst ansprechen."),
            ("„Woher wissen wir, dass die Antwort stimmt?“",
             "Er verlangt Überprüfbarkeit, nicht Vertrauen.",
             "Jede Antwort zeigt Quelle und Dokumentversion. Ist das Dokument falsch, wird es an der Quelle korrigiert und die Antwort ändert sich für das ganze Unternehmen. Sie müssen der KI nicht glauben — Sie prüfen die Quelle in zwei Klicks.",
             "Wer wäre der Eigentümer der wichtigsten Dokumente?",
             "Nicht „sehr präzise“ sagen. Die zitierte Quelle zeigen."),
            ("„Wir haben schon Copilot / ChatGPT.“",
             "Er verwechselt einen allgemeinen Assistenten mit Unternehmenswissen.",
             "Die sind für allgemeine Texte nützlich. Sie kennen Ihre Anweisung nicht, nicht die gültige Version, nicht die Rollenrechte und nicht die Änderung vom letzten Monat. Wir arbeiten ausschließlich mit dem Unternehmenswissen und halten es aktuell. Parallelbetrieb ist möglich.",
             "Welche interne Frage konnte das Tool nicht korrekt beantworten?",
             "Das genutzte Tool nicht angreifen. Das Territorium abgrenzen."),
        ]),
        ("Daten, Sicherheit, Compliance", [
            ("„Unsere Daten gehen nicht in die Cloud.“",
             "Interne Richtlinie oder Kundenanforderung. Meist endgültig.",
             "Dann kommen sie nicht in die Cloud. Die Self-Hosted-Variante läuft auf Ihrem Server mit lokaler KI, die Daten verlassen das Unternehmen nicht. Installation per Assistent, mit Systemprüfung und Sicherungskopien.",
             "Wer betreibt den Server und welche Anforderungen hat die Rechtsabteilung?",
             "Nicht versuchen, ihn zur Cloud zu überreden. Verlorener und unnötiger Kampf."),
            ("„Was passiert mit personenbezogenen Daten? DSGVO?“",
             "Er braucht eine Antwort, die er im Audit wiederholen kann.",
             "Die Daten bleiben bei Ihnen, mit Rechten pro Rolle und Abteilung. Gehälter, Gesundheitsdaten und HR-Notizen sind getrennt. Zugriffe sind protokolliert, und in der Self-Hosted-Variante gibt es keinen Transfer nach außen.",
             "Was müssen Sie in einem Datenaudit konkret nachweisen?",
             "Keine Rechtsberatung geben. Den Mechanismus beschreiben, nicht absolute Konformität."),
            ("„Und wenn der Server ausfällt?“",
             "Betriebskontinuität. Frage eines ernsthaften Entscheiders.",
             "Geplante Sicherungskopien, geprüfte Wiederherstellung und signierte Updates. Ihre Dokumente sind jederzeit in lesbarem Format exportierbar — auch ohne uns.",
             "Wer erstellt heute die Sicherungen Ihrer kritischen Systeme?",
             "Nicht vage über Backup sprechen. Den konkreten Mechanismus nennen."),
            ("„Und wenn wir wieder aussteigen wollen?“",
             "Angst vor Abhängigkeit. Er fragt nach dem Ausgang, nicht nach dem Bleiben.",
             "Dokumente und Daten sind Ihre und exportierbar. Wir halten Sie nicht über den Vertrag, sondern über das Ergebnis. Fällt das Ergebnis weg, muss der Ausstieg einfach sein — und er ist es.",
             "Was hat Sie bei einem früheren Anbieter blockiert?",
             "Ausstiegsbedingungen nicht verschweigen. Selbst zuerst nennen."),
            ("„Das muss die IT / Sicherheit freigeben.“",
             "Normaler Prozess. Die IT kann einen guten Abschluss stoppen.",
             "Richtig, und das ist gut so. Ich schicke der IT direkt die technischen Angaben: wo es läuft, welche Ports, wie Updates erfolgen, wie Rechte verwaltet werden. Ein 30-Minuten-Gespräch jetzt ist besser als eine Blockade im dritten Monat.",
             "Wer in der IT muss Ja sagen und was würde ihn am meisten beunruhigen?",
             "Die IT nicht umgehen. Sie aus eigener Initiative einbeziehen."),
        ]),
        ("„Wir haben schon etwas“", [
            ("„Wir haben bereits schriftliche Arbeitsanweisungen.“",
             "Er hat Dokumente, aber keinen Zugriff, keine Version und keinen Schulungsnachweis.",
             "Sehr gut — dann sind wir schneller. Das Problem ist nicht das Schreiben, sondern Finden, Versionieren und der Nachweis, dass die Leute es verstanden haben. Wir bringen alles zusammen, zeigen was abgelaufen ist und sich widerspricht, und prüfen dann das Verständnis.",
             "Wenn ich jetzt jemanden aus der Nachtschicht frage — wie lange braucht er bis zur gültigen Anweisung?",
             "Nicht andeuten, dass ihre Dokumente schlecht sind. Auf Zugriff und Nachweis lenken."),
            ("„Wir haben ERP / TMS.“",
             "Er vermutet Überlappung. Es gibt keine.",
             "Das ERP führt Transaktionen: Aufträge, Rechnungen, Bestände. Wir führen Wissen, Schulung und Ursachen von Problemen — also genau das, was nie im ERP landet. Wir ersetzen nichts, wir füllen die Lücke zwischen Systemen und Menschen.",
             "Wo sucht ein Mitarbeiter die Anweisung, wenn das ERP nur ein Pflichtfeld zeigt?",
             "Nicht „besser als das ERP“ sagen. Territorium klar abgrenzen."),
            ("„Wir haben SharePoint / Google Drive / Serverordner.“",
             "Er hat eine Dateiablage, kein aktives Wissen.",
             "Ein Ordner bewahrt Dateien, aber er antwortet nicht, weiß nicht was abgelaufen ist und beweist nicht, dass jemand es verstanden hat. Wir setzen darüber: Frage in der Sprache des Mitarbeiters, zitierte Quelle, Version und Test.",
             "Wie lange dauert es heute, bis jemand das richtige Dokument findet — nicht irgendeines?",
             "Nicht verlangen, die Ablage aufzugeben. Sich darüber setzen."),
            ("„Ein Berater schreibt unsere Anweisungen.“",
             "Er hat für Dokumentation bereits gezahlt. Empfindlich bei Doppelarbeit.",
             "Perfekt: Der Berater schreibt den Inhalt, wir machen ihn lebendig — versioniert, als Kurs mit Test, mit Auswertung was nie genutzt wird und was fehlt. Seine Arbeit wird messbar.",
             "Was passiert mit seinen Anweisungen nach der Übergabe?",
             "Nicht mit dem Berater konkurrieren. Ihn zum Verbündeten machen."),
            ("„Wir kommen mit WhatsApp und E-Mail klar.“",
             "Funktioniert im Kleinen. Nicht bei Wachstum oder Audit.",
             "Es funktioniert bis zum ersten ernsten Fall: im Audit können Sie nichts nachweisen, und wenn jemand geht, geht das Wissen mit. Wir behalten die Einfachheit von WhatsApp beim Fragen — aber mit Quelle, Version und Spur.",
             "Wie würden Sie bei einer Prüfung nachweisen, dass nach der gültigen Version geschult wurde?",
             "WhatsApp nicht belächeln. Seine Einfachheit übernehmen."),
            ("„Wir haben eine Qualitätsabteilung, die macht das.“",
             "Es gibt einen Prozess, aber wohl manuell und überlastet.",
             "Dann gewinnt genau sie am meisten. Das automatische Audit zeigt, was vage, doppelt oder widersprüchlich ist, und Schulung samt Nachweis muss vor der Prüfung nicht mehr manuell zusammengetragen werden.",
             "Wie viel Zeit kostet die Auditvorbereitung heute?",
             "Nicht die Ablösung der Rolle vorschlagen, sondern ihre Entlastung."),
        ]),
        ("Menschen und Akzeptanz", [
            ("„Noch eine Anwendung nutzt bei uns keiner.“",
             "Der ernsteste Einwand. Die Akzeptanz entscheidet das Projekt.",
             "Einverstanden, deshalb verlangen wir nicht, eine Ordnerstruktur zu lernen. Der Mitarbeiter fragt in seiner Sprache, wie bei WhatsApp, und erhält die Antwort mit Quelle. Wenn eine Tagesschulung nötig wäre, wäre das Produkt falsch.",
             "Sollen wir mit fünf Leuten aus der skeptischsten Abteilung testen?",
             "Nicht mit Funktionen antworten. Mit Einfachheit und einem kleinen Test."),
            ("„Unsere Leute sind nicht technisch.“",
             "Sorge um Ausschluss, besonders Lager und Außendienst.",
             "Müssen sie nicht sein. Ein Feld für die Frage, die Antwort, die Quelle. Es läuft auch auf dem Telefon, auf Deutsch, Rumänisch oder Englisch, und im Außendienst geht es per Sprache.",
             "Wie viele Mitarbeiter arbeiten ohne Rechner, nur mit dem Telefon?",
             "Nicht annehmen, dass alle am Schreibtisch sitzen."),
            ("„Wer pflegt das intern?“",
             "Angst vor einer neuen Aufgabe für eine bereits ausgelastete Person.",
             "Ein Inhaltsverantwortlicher, wenige Stunden im Monat. Das System sagt selbst, was zu tun ist: welches Dokument abgelaufen ist, welche Frage unbeantwortet blieb, wer den Test nicht bestanden hat. Er sucht keine Arbeit, er bekommt eine Liste.",
             "Wer wäre diese Person bei Ihnen?",
             "Nicht „wartungsfrei“ behaupten. Das ist unglaubwürdig."),
            ("„Wir haben hohe Personalfluktuation.“",
             "Echter und teurer Schmerz. Ein Argument, kein Einwand.",
             "Dann sind Sie genau unser Fall. Das Wissen bleibt im Unternehmen, nicht in Personen: der Neue startet mit einem Kurs aus den echten Anweisungen, macht einen Test, und man sieht klar, ob er es verstanden hat. Die Einarbeitung sinkt von Monaten auf Wochen.",
             "Wie lange braucht heute ein Neuer, bis er wie ein Erfahrener arbeitet?",
             "Fluktuation nicht als Hindernis behandeln. Sie ist das Hauptargument."),
            ("„Bei uns werden mehrere Sprachen gesprochen.“",
             "Internationaler Betrieb. Echte Kommunikationsbarriere.",
             "Oberfläche und Inhalt funktionieren auf Deutsch, Rumänisch und Englisch. Der Mitarbeiter fragt in seiner Sprache und erhält die Antwort aus demselben offiziellen Dokument — eine Quelle der Wahrheit, mehrere Sprachen.",
             "In wie vielen Sprachen muss die Pflichtschulung vorliegen?",
             "Keine perfekte juristische Übersetzung versprechen. Zugang in der eigenen Sprache versprechen."),
        ]),
        ("Entscheidung und interne Politik", [
            ("„Ich muss mit den Kollegen sprechen.“",
             "Er entscheidet nicht allein — oder er vermeidet ein direktes Nein.",
             "Verständlich. Damit das Gespräch ohne mich funktioniert, lasse ich Ihnen eine Seite: das Problem in Ihren Worten, die Zahl, die Veränderung in 30 Tagen. Und ich frage direkt: Wenn es allein an Ihnen läge, wie würden Sie entscheiden?",
             "Wer muss noch Ja sagen und was würde ihn beunruhigen?",
             "Keine 30-Seiten-Präsentation schicken, die man nicht verteidigen kann."),
            ("„Entschieden wird auf Gruppenebene / im Ausland.“",
             "Langer Zyklus. Gefahr, in der Hierarchie zu versanden.",
             "Dann bauen wir einen starken lokalen Fall: eine Abteilung, ein gemessenes Ergebnis, eine Seite Nachweis. Eine Gruppe genehmigt leichter etwas, das bereits funktioniert, als eine Idee.",
             "Was hat die Gruppe zuletzt genehmigt und was hatte diese Akte mehr?",
             "Nicht passiv auf die Gruppe warten. Lokalen Nachweis liefern."),
            ("„Ich bin nicht der Entscheider.“",
             "Er sagt ehrlich, dass man mit der falschen Person spricht — oder er testet.",
             "Danke für die Offenheit. Sie bleiben in diesem Gespräch wichtig: Sie kennen das Problem. Wie unterstütze ich Sie dabei, es weiterzutragen, und wer sollte beim nächsten Termin dabei sein?",
             "Was überzeugt den Entscheider: die Zahl, das Auditrisiko oder die Zeit der Mitarbeiter?",
             "Ihn nicht umgehen. Ihn zum internen Fürsprecher machen."),
            ("„Schicken Sie ein Angebot, wir melden uns.“",
             "Häufig ein höfliches Nein.",
             "Ich schicke es, aber ich will uns beiden ein generisches Angebot ersparen. Ich brauche 15 Minuten, damit es auf Ihr Problem und Ihre Zahlen passt. Sonst entsteht ein Dokument, das falsch verglichen wird.",
             "Nach welchem Kriterium würden Sie das Angebot bewerten?",
             "Kein Angebot ohne bekanntes Entscheidungskriterium schicken."),
            ("„Wir machen eine Ausschreibung mit drei Anbietern.“",
             "Formaler Prozess. Es gewinnt, wer die Kriterien mitprägt.",
             "In Ordnung, wir nehmen teil. Ich schlage vor, in die Kriterien auch das aufzunehmen, was erst im dritten Monat sichtbar wird: ob die Antwort die Quelle zitiert, ob Schulung einen Nachweis erzeugt, ob die Daten im Unternehmen bleiben können. So vergleichen Sie Funktionierendes, nicht Versprechen.",
             "Wer schreibt die Kriterien und wann werden sie geschlossen?",
             "Nicht in eine Ausschreibung gehen, ohne die Kriterien zu beeinflussen."),
        ]),
        ("Zweifel am Bedarf", [
            ("„Dieses Problem haben wir nicht.“",
             "Er erkennt das Symptom in unserer Formulierung nicht.",
             "Möglich, dann brauchen Sie uns nicht. Eines prüfe ich trotzdem: Wenn ich jetzt jemanden aus der Nachtschicht frage, wie bei einer abgelehnten Ware zu verfahren ist — wie lange dauert die korrekte Antwort und aus welchem Dokument?",
             "Wann passierte zuletzt ein Fehler, bei dem Sie sagten: das darf sich nicht wiederholen?",
             "Nicht widersprechen. Eine Frage stellen, die die Realität prüft."),
            ("„Bei uns läuft das so gut.“",
             "Es läuft über Schlüsselpersonen, nicht über ein System. Fragil.",
             "Das glaube ich Ihnen. Die Frage ist nicht, ob es läuft, sondern auf wem es ruht. Wenn morgen die Person fehlt, die den Prozess am besten kennt — was steht still und wie lange?",
             "Welche Person würde Ihnen beim Ausfall die größten Probleme machen?",
             "Den aktuellen Erfolg nicht angreifen. Die Abhängigkeit prüfen."),
            ("„Wir sind zu klein dafür.“",
             "Er hält die Lösung für Konzerne.",
             "Kleine Unternehmen spüren es stärker, weil jede Person einen ganzen Prozess trägt. Wir starten mit einer Abteilung und Kosten in der Größe des Unternehmens. Wir verkaufen kein Konzernprojekt.",
             "Wie viele Personen würden das System realistisch im ersten Monat nutzen?",
             "Den Vorschlag nicht überdimensionieren. Umfang reduzieren."),
            ("„Wir sind zu komplex, das passt bei uns nicht.“",
             "Berufsstolz und Angst vor Standardisierung.",
             "Wir kommen nicht mit einer Vorlage. Genau deshalb starten wir mit einer Diagnose: die Anweisungen sind Ihre, mit Ihren Ausnahmen. Wir konfigurieren um Ihre Arbeitsweise herum, nicht umgekehrt.",
             "Welcher Teil Ihres Prozesses gleicht keinem anderen Unternehmen?",
             "Keinen Standardablauf zeigen. Die Diagnose zeigen."),
            ("„Was macht es konkret, in zwei Sätzen?“",
             "Klarheitstest. Wer stockt, hat verloren.",
             "Wir bringen die Anweisungen des Unternehmens zusammen, und die Mitarbeiter fragen in ihrer Sprache und erhalten die richtige Antwort mit Quelle, statt zu suchen oder Kollegen zu fragen. Danach prüfen wir mit Test und Zertifikat das Verständnis und zeigen, was im Unternehmenswissen fehlt.",
             "Was interessiert Sie mehr: das Finden der Information oder der Schulungsnachweis?",
             "Keine Module aufzählen. Zwei Sätze, in seinen Worten."),
        ]),
    ],
)


# ================================================================ LAYOUT

class Doc:
    def __init__(self, path, footer_text):
        self.c = canvas.Canvas(path, pagesize=A4)
        self.page = 0
        self.y = 0
        self.section = ""
        self.footer_text = footer_text

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
        c.drawString(M, M - 9 * mm, self.footer_text)
        c.drawRightString(W - M, M - 9 * mm, str(self.page))

    def wrap(self, text, fname, size, width):
        lines, cur = [], ""
        for w in text.split():
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

    def space(self, h):
        if self.y - h < M + 8 * mm:
            self.new_page()

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

    def h1(self, text, size=18):
        self.space(size * 2)
        self.c.setFont(BOLD, size)
        self.c.setFillColor(GRAPHITE)
        for ln in self.wrap(text, BOLD, size, W - 2 * M):
            self.c.drawString(M, self.y, ln)
            self.y -= size * 1.25
        self.y -= 6 * mm

    def h2(self, text):
        self.space(24 * mm)
        self.y -= 2 * mm
        self.c.setFillColor(TEAL)
        self.c.rect(M, self.y - 1.4 * mm, 3 * mm, 3 * mm, stroke=0, fill=1)
        self.c.setFont(BOLD, 12)
        self.c.setFillColor(GRAPHITE)
        self.c.drawString(M + 6 * mm, self.y - 1 * mm, text)
        self.y -= 8 * mm

    def label(self, text, color):
        self.space(9 * mm)
        self.c.setFont(BOLD, 8)
        self.c.setFillColor(color)
        self.c.drawString(M + 6 * mm, self.y, text)
        self.y -= 5 * mm

    def divider(self):
        self.space(8 * mm)
        self.y -= 2 * mm
        self.c.setStrokeColor(HAIR)
        self.c.setLineWidth(0.6)
        self.c.line(M, self.y, W - M, self.y)
        self.y -= 5 * mm

    def section_cover(self, kicker, title, blurb):
        self.new_page(title)
        self.y = H / 2 + 34 * mm
        self.c.setFillColor(GREEN)
        self.c.rect(M, self.y + 14 * mm, 26 * mm, 2.4 * mm, stroke=0, fill=1)
        self.c.setFont(BODY, 9)
        self.c.setFillColor(MUTED)
        self.c.drawString(M, self.y + 7 * mm, kicker.upper())
        self.c.setFont(BOLD, 25)
        self.c.setFillColor(GRAPHITE)
        for ln in self.wrap(title, BOLD, 25, W - 2 * M):
            self.c.drawString(M, self.y, ln)
            self.y -= 30
        self.y -= 6 * mm
        if blurb:
            self.para(blurb, size=10.5, color=SLATE, width=(W - 2 * M) * 0.84, leading=16)


def build(L):
    d = Doc(L["out"], L["footer"])
    lab = L["labels"]
    txt_w = W - 2 * M - 6 * mm
    tx = M + 6 * mm

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

    y = H - 90 * mm
    for i, line in enumerate(L["cover_title"]):
        d.c.setFont(BOLD, 26)
        d.c.setFillColor(GREEN if i == len(L["cover_title"]) - 1 else GRAPHITE)
        d.c.drawString(M, y, line)
        y -= 13 * mm
    d.y = y - 8 * mm
    d.section = lab["page_objections"]
    d.para(L["cover_sub"], size=11, fname=BOLD, color=TEAL)
    d.y -= 4 * mm
    d.para(L["intro"], size=10.5, color=SLATE, width=(W - 2 * M) * 0.88, leading=16)
    d.c.setFont(BODY, 9)
    d.c.setFillColor(MUTED)
    d.c.drawString(M, M + 4 * mm, L["cover_note"])

    # ---- method
    d.section_cover("01", L["method_title"], L["method_intro"])
    d.new_page(L["method_title"])
    for i, (name, body) in enumerate(L["method_steps"], 1):
        d.space(30 * mm)
        d.c.setFont(BOLD, 10)
        d.c.setFillColor(GREEN)
        d.c.drawString(M, d.y, f"{i:02d}")
        d.c.setFont(BOLD, 11)
        d.c.setFillColor(GRAPHITE)
        d.c.drawString(M + 10 * mm, d.y, name)
        d.y -= 6 * mm
        d.para(body, size=10, color=SLATE, x=M + 10 * mm, width=W - 2 * M - 10 * mm, leading=14.5)
        d.y -= 5 * mm

    d.divider()
    d.h1(L["rules_title"], size=15)
    for i, r in enumerate(L["rules"], 1):
        d.space(20 * mm)
        d.c.setFont(BOLD, 10)
        d.c.setFillColor(TEAL)
        d.c.drawString(M, d.y, f"{i:02d}")
        d.para(r, size=10, color=SLATE, x=M + 10 * mm, width=W - 2 * M - 10 * mm, leading=14.5)
        d.y -= 4 * mm

    # ---- discovery
    d.section_cover("02", L["discovery_title"], L["discovery_intro"])
    d.new_page(L["discovery_title"])
    for group, qs in L["discovery"]:
        d.h2(group)
        for q in qs:
            bold = q.startswith("▸")
            d.space(14 * mm)
            d.c.setFillColor(GREEN if bold else HAIR)
            d.c.circle(M + 1.6 * mm, d.y + 1.2 * mm, 1.1 * mm, stroke=0, fill=1)
            d.para(q.replace("▸ ", ""), size=10,
                   fname=BOLD if bold else BODY,
                   color=GRAPHITE if bold else SLATE,
                   x=tx, width=txt_w, leading=14)
            d.y -= 2.5 * mm
        d.y -= 3 * mm

    d.divider()
    d.h1(L["listen_title"], size=15)
    for phrase, meaning in L["listen"]:
        d.space(20 * mm)
        d.para(phrase, size=10.5, fname=BOLD, color=GRAPHITE, leading=14.5)
        d.para(meaning, size=9.5, color=SLATE, x=tx, width=txt_w, leading=13.5)
        d.y -= 4 * mm

    # ---- objections
    # ---- call script + preparation + scenarios
    d.section_cover("03", L["script_title"], L["script_intro"])
    d.new_page(L["script_title"])
    for phase, body in L["script"]:
        d.space(34 * mm)
        d.para(phase, size=10.5, fname=BOLD, color=TEAL, leading=14.5)
        d.para(body, size=9.8, color=SLATE, x=tx, width=txt_w, leading=14)
        d.y -= 5 * mm

    d.divider()
    d.h1(L["prep_title"], size=15)
    for p in L["prep"]:
        d.space(18 * mm)
        d.c.setFillColor(GREEN)
        d.c.circle(M + 1.6 * mm, d.y + 1.2 * mm, 1.1 * mm, stroke=0, fill=1)
        d.para(p, size=10, color=SLATE, x=tx, width=txt_w, leading=14)
        d.y -= 3 * mm

    d.divider()
    d.h1(L["scenarios_title"], size=15)
    for name, pain, opener in L["scenarios"]:
        d.space(34 * mm)
        d.h2(name)
        d.para(pain, size=9.5, color=SLATE, x=tx, width=txt_w, leading=13.5)
        d.y -= 2 * mm
        d.label(lab["ask"], TEAL)
        d.para(opener, size=9.8, fname=BOLD, color=GRAPHITE, x=tx, width=txt_w, leading=14)
        d.y -= 4 * mm

    # ---- objections
    d.section_cover("04", L["obj_title"], L["obj_intro"])
    for cat, items in L["categories"]:
        d.new_page(f"{lab['category']}: {cat}")
        d.h1(cat, size=17)
        for says, means, answer, ask, avoid in items:
            d.space(52 * mm)
            d.c.setFillColor(GRAPHITE)
            d.c.rect(M, d.y + 1 * mm, 2 * mm, 2 * mm, stroke=0, fill=1)
            d.para(says, size=11.5, fname=BOLD, color=GRAPHITE, x=tx, width=txt_w, leading=15.5)
            d.y -= 2 * mm
            d.label(lab["means"], AMBER)
            d.para(means, size=9.5, color=SLATE, x=tx, width=txt_w, leading=13.5)
            d.y -= 1.5 * mm
            d.label(lab["answer"], GREEN)
            d.para(answer, size=9.8, color=GRAPHITE, x=tx, width=txt_w, leading=14)
            d.y -= 1.5 * mm
            d.label(lab["ask"], TEAL)
            d.para(ask, size=9.5, fname=BOLD, color=SLATE, x=tx, width=txt_w, leading=13.5)
            d.y -= 1.5 * mm
            d.label(lab["avoid"], RED)
            d.para(avoid, size=9.5, color=SLATE, x=tx, width=txt_w, leading=13.5)
            d.divider()

    # ---- refusals
    d.section_cover("05", L["refusal_title"], L["refusal_intro"])
    d.new_page(L["refusal_title"])
    for says, answer in L["refusals"]:
        d.space(38 * mm)
        d.c.setFillColor(RED)
        d.c.rect(M, d.y + 1 * mm, 2 * mm, 2 * mm, stroke=0, fill=1)
        d.para(says, size=11.5, fname=BOLD, color=GRAPHITE, x=tx, width=txt_w, leading=15.5)
        d.y -= 2 * mm
        d.label(lab["answer"], GREEN)
        d.para(answer, size=9.8, color=SLATE, x=tx, width=txt_w, leading=14)
        d.divider()

    d.h1(L["followup_title"], size=15)
    for when, body in L["followups"]:
        d.space(28 * mm)
        d.para(when, size=10.5, fname=BOLD, color=TEAL, leading=14.5)
        d.para(body, size=9.8, color=SLATE, x=tx, width=txt_w, leading=14)
        d.y -= 5 * mm

    d.divider()
    d.h1(L["close_title"], size=15)
    for cl in L["closes"]:
        d.space(20 * mm)
        d.c.setFillColor(GREEN)
        d.c.circle(M + 1.6 * mm, d.y + 1.2 * mm, 1.1 * mm, stroke=0, fill=1)
        d.para(cl, size=10, color=SLATE, x=tx, width=txt_w, leading=14)
        d.y -= 3.5 * mm

    # ---- contact
    d.new_page("Contact")
    d.h1(L["contact_title"], size=20)
    d.para(L["contact_body"], size=11, color=SLATE, width=(W - 2 * M) * 0.85, leading=16)
    d.y -= 8 * mm
    d.para(L["contact_link"], size=13, fname=BOLD, color=GREEN)
    d.para(L["contact_extra"], size=9.5, color=MUTED)

    d.footer()
    d.c.save()
    print(L["out"], "pages:", d.page)


if __name__ == "__main__":
    build(RO)
    build(DE)
