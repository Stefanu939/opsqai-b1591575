#!/usr/bin/env python3
# OPSQAI - Playbook de cold calling si achizitie clienti (RO + DE)
# Genereaza:
#   /mnt/documents/OPSQAI_Cold_Call_Achizitie_RO.pdf
#   /mnt/documents/OPSQAI_Kaltakquise_Playbook_DE.pdf
#
# Complementar cu:
#   OPSQAI_Obiectii_Playbook_RO.pdf / OPSQAI_Einwaende_Playbook_DE.pdf
#   OPSQAI_Probleme_Soluții_RO_v2.pdf

from reportlab.lib.units import mm
from gen_objections_playbook import (  # layout + fonts reused for a consistent family
    Doc, BODY, BOLD, GRAPHITE, SLATE, PAPER, GREEN, TEAL, RED, AMBER, MUTED, HAIR, W, H, M,
)


def chapter(kicker, title, blurb, blocks):
    return dict(kicker=kicker, title=title, blurb=blurb, blocks=blocks)


# ============================================================== ROMANIAN

RO = dict(
    out="/mnt/documents/OPSQAI_Cold_Call_Achizitie_RO.pdf",
    footer="Playbook cold calling & achiziție clienți · Intern · opsqai.de",
    cover_title=["Cold calling și", "achiziție de clienți.", "Ce spunem, ce facem,", "cum închidem."],
    cover_sub="Playbook operațional de achiziție — de la primul apel la contract semnat",
    cover_note="Document intern de vânzare · limba română · opsqai.de",
    intro=(
        "Acest document se folosește zilnic, nu se citește o dată. Este scris ca să funcționeze "
        "atât pentru cineva care sună pentru prima dată în viață, cât și pentru un vânzător cu "
        "experiență care vrea formulări gata făcute. Conține: cum construim lista, ce spunem în "
        "primele 15 secunde, cum trecem de secretariat, ce răspundem la fiecare refuz, cum ducem "
        "discuția spre diagnostic și cum închidem contractul după pilot."
    ),
    ref_title="Cum se leagă cu celelalte documente",
    refs=[
        ("Playbook de obiecții și descoperire (RO)",
         "Se folosește DUPĂ ce apelul a produs o întâlnire. Acolo sunt cele 40+ de obiecții din "
         "discuția lungă, întrebările de descoperire și scriptul de call de 45 de minute. Aici, în "
         "documentul de față, tratăm doar refuzurile scurte de la telefon, unde ai 10 secunde, nu 10 minute."),
        ("Probleme & soluții pe funcții (RO)",
         "Se folosește ca muniție. Când clientul spune o durere concretă, de acolo iei perechea "
         "problemă → soluție pentru funcția exactă. Nu se citește clientului: se traduce în cuvintele lui."),
        ("Modelul Discovery de pe opsqai.de/discovery",
         "Este ce vindem la telefon. Nu vindem software, vindem o etapă de diagnostic: "
         "Problemă → Diagnostic → Proiectarea soluției → Workspace."),
        ("Calculatorul de cost operațional",
         "Cârligul cu care revenim la cei care au refuzat. Nu cere buget, cere 4 cifre și dă un rezultat."),
    ],
    chapters=[
        chapter("01", "Cum funcționează achiziția: numerele, nu norocul",
                "Cold calling-ul nu este talent, este aritmetică repetată corect. Dacă știi rata ta, "
                "știi exact câte apeluri îți trebuie pentru un contract — și nu mai depinzi de zile bune.",
                [
                    ("h2", "Ecuația de bază"),
                    ("p", "Din 100 de apeluri către o listă bine făcută: 30-40 discuții reale cu decidentul, "
                          "8-12 acceptă o discuție de diagnostic, 4-6 ajung la propunere, 1-2 intră în pilot, "
                          "1 devine contract. Cifrele se schimbă de la piață la piață, dar raportul rămâne. "
                          "Nu judeci niciodată o zi. Judeci un bloc de 100 de apeluri."),
                    ("num", [
                        "Listă: 40-60 de companii pe verticală, nu 500 la întâmplare. Lista slabă nu se salvează cu script bun.",
                        "Apeluri: 25-40 pe zi, în două blocuri de 90 de minute. Fără email, fără chat în bloc.",
                        "Obiectivul apelului nu este vânzarea. Este o singură propoziție: obținerea a 30 de minute de diagnostic.",
                        "Fiecare apel se notează în aceeași zi: status, cuvintele lui, data următorului pas.",
                        "Săptămânal: 5 minute de analiză. La ce refuz pierdem cel mai des? Acolo schimbăm formularea, nu peste tot.",
                    ]),
                    ("h2", "Cine sunt oamenii pe care îi sunăm"),
                    ("bullets", [
                        "Transport și logistică: director operațiuni, dispecer-șef, responsabil flotă, manager depozit.",
                        "Producție: director de producție, responsabil calitate, coordonator de tură.",
                        "HR și administrativ: HR manager, responsabil personal, administrator în firme de 80-500 de angajați.",
                        "Companii de servicii cu teren: director operațional, coordonator echipe.",
                        "Regula de mărime: 80-500 de angajați. Sub 80, bugetul e greu. Peste 500, ciclul de decizie e lung.",
                    ]),
                    ("h2", "Ritmul zilnic care produce rezultate"),
                    ("steps", [
                        ("08:30 - 09:00 Pregătire",
                         "20 de companii pe listă pentru ziua respectivă, cu numele decidentului și un motiv concret de sunat "
                         "pe fiecare (a deschis un depozit, are anunțuri de angajare, are flotă în creștere)."),
                        ("09:00 - 10:30 Bloc de apeluri",
                         "Suni fără pauză. Nu deschizi emailul. Refuzurile nu se analizează în bloc, se notează într-un rând."),
                        ("10:30 - 11:00 Follow-up scris",
                         "Trimiți exact ce ai promis la telefon, în aceeași zi, cu subiect care repetă cuvintele lui."),
                        ("14:00 - 15:30 Al doilea bloc",
                         "Alt segment orar prinde alți oameni. Directorii de operațiuni răspund mai des după 16:00."),
                        ("17:00 - 17:15 Închidere de zi",
                         "Actualizezi trackerul, programezi revenirile, scrii într-o linie ce ai învățat."),
                    ]),
                ]),
        chapter("02", "Pregătirea de dinaintea apelului: cinci minute care schimbă tot",
                "Nu se sună cu o listă goală. Cinci minute de pregătire pe companie transformă un apel "
                "de vânzare într-un apel relevant, iar relevanța este singurul motiv pentru care cineva te ascultă.",
                [
                    ("h2", "Ce căutăm în cele cinci minute"),
                    ("num", [
                        "Ce face firma, în două cuvinte, în limbajul lor, nu al nostru.",
                        "Un semnal de creștere sau presiune: angajări multiple, depozit nou, flotă extinsă, certificare, control.",
                        "Numele și rolul persoanei care simte problema, nu al celei care semnează.",
                        "O ipoteză de durere: „la 60 de șoferi și un dispecer, expirările se urmăresc pe hârtie”.",
                        "Un motiv de a suna astăzi. Fără el, apelul sună a listă cumpărată.",
                    ]),
                    ("h2", "Checklist înainte de a forma numărul"),
                    ("bullets", [
                        "Știu numele lui și îl pronunț corect.",
                        "Am o singură ipoteză de problemă, nu trei.",
                        "Am pregătite primele două propoziții și le pot spune fără să citesc.",
                        "Știu care este singurul rezultat acceptabil al apelului: o dată în calendar.",
                        "Am o alternativă dacă spune nu: permisiunea de a trimite calculatorul de cost.",
                        "Nu am nicio prezentare deschisă. Nu vindem funcții la telefon.",
                    ]),
                    ("h2", "Starea potrivită"),
                    ("p", "Vorbește mai încet decât instinctul îți spune și cu 10% mai jos în ton. Vânzătorii "
                          "începători vorbesc repede pentru că le e frică să fie întrerupți; efectul e invers, "
                          "graba declanșează refuzul. Stai în picioare, zâmbește înainte de a vorbi, ține "
                          "primele două propoziții sub șapte secunde fiecare."),
                    ("note", "Regula de aur: obiectivul apelului nu este să convingi. Este să afli dacă merită "
                             "o discuție de 30 de minute. Un „nu” rapid și curat este un rezultat bun."),
                ]),
        chapter("03", "Scriptul de cold call, propoziție cu propoziție",
                "Structura are șase pași și durează sub trei minute. Se învață pe bucăți, nu pe de rost: "
                "cuvintele pot fi ale tale, ordinea nu se schimbă.",
                [
                    ("h2", "Structura în șase pași"),
                    ("steps", [
                        ("1. Identificare directă (7 secunde)",
                         "Spune cine ești, de la ce firmă și că apelul e la rece. Onestitatea dezarmează. "
                         "Nu inventa „vă sun în legătură cu solicitarea dumneavoastră”."),
                        ("2. Cererea de permisiune (7 secunde)",
                         "Ceri 30 de secunde, nu 5 minute. Cine primește permisiunea nu mai e întrerupt."),
                        ("3. Motivul relevant (15 secunde)",
                         "Ipoteza de durere, formulată ca observație despre firme ca a lui, nu ca acuzație despre firma lui."),
                        ("4. Întrebarea de verificare (o întrebare)",
                         "Îi dai controlul. Aici se decide tot apelul. Apoi taci minimum trei secunde."),
                        ("5. Aprofundare scurtă (două întrebări)",
                         "Cât de des se întâmplă, pe cine cade. Nu mai mult. Diagnosticul complet se face în întâlnire."),
                        ("6. Închiderea către întâlnire",
                         "Propui două intervale concrete. Nu întrebi „ar fi interesant?”, ci „marți la 10 sau joi la 15?”."),
                    ]),
                    ("h2", "Scriptul complet, versiunea transport și logistică"),
                    ("script", [
                        "„Bună ziua, domnule Popa, sunt Ștefan de la OPSQAI. Vă sun la rece, nu ne cunoaștem.",
                        "Îmi dați 30 de secunde să vă spun de ce v-am sunat, iar apoi îmi spuneți dacă merită continuat?”",
                        "[pauză — aștepți răspunsul, nu continui peste el]",
                        "„Lucrăm cu firme de transport de mărimea dumneavoastră, unde un singur dispecer ține în cap",
                        "expirările, procedurile și răspunsurile pentru 60-80 de șoferi. De obicei asta arată bine",
                        "până în ziua în care omul respectiv e în concediu sau pleacă.",
                        "La dumneavoastră cum se rezolvă azi: când un șofer nu știe ce să facă la o marfă refuzată,",
                        "pe cine sună?”",
                        "[el răspunde — notezi cuvintele lui exact]",
                        "„Și cât de des se întâmplă asta într-o săptămână normală?”",
                        "„Vă propun 30 de minute în care nu vă arăt un program, ci facem un diagnostic scurt:",
                        "unde se pierd orele și cât costă. La final aveți o pagină cu concluzii, chiar dacă nu",
                        "lucrăm împreună. Marți la 10 sau joi la 15?”",
                    ]),
                    ("h2", "Variantă pentru HR și administrativ"),
                    ("script", [
                        "„Vă sun pentru un singur lucru: la 200 de angajați, contractele, actele adiționale și",
                        "concediile se țin de obicei în trei locuri diferite, iar când vine un control se adună",
                        "manual două zile. La dumneavoastră cine adună dosarul când se cere?”",
                        "[ascultă]",
                        "„Și cât durează, realist, până e complet?”",
                        "„Atunci merită 30 de minute de diagnostic. Nu vă vând un program, vă arăt unde se pierd",
                        "zilele. Miercuri la 11 sau vineri la 9?”",
                    ]),
                    ("h2", "Variantă pentru producție și calitate"),
                    ("script", [
                        "„Firmele de producție cu care lucrăm au proceduri bune scrise, dar oamenii de pe tura de",
                        "noapte nu le găsesc în două minute, așa că întreabă un coleg și greșeala se repetă.",
                        "La dumneavoastră ce face un operator nou când nu știe pasul următor?”",
                        "[ascultă]",
                        "„Ultima abatere de acest tip cât v-a costat, aproximativ?”",
                        "„30 de minute, diagnostic, fără prezentare. Joi la 14 sau luni la 10?”",
                    ]),
                    ("h2", "Ce nu spunem niciodată la telefon"),
                    ("bullets", [
                        "„Suntem lideri de piață”, „soluție inovatoare”, „platformă all-in-one”. Zero efect, semnal de vânzare agresivă.",
                        "Enumerări de module. Nimeni nu cumpără o listă de funcții la telefon.",
                        "Comparații cu SAP, Microsoft sau alt furnizor. Noi nu pornim de la software, pornim de la problema lui.",
                        "Promisiuni de procente pe care nu le putem dovedi la el în firmă.",
                        "„Vă deranjez?” — invită la „da”.",
                    ]),
                ]),
        chapter("04", "Secretariat, mesagerie și revenire",
                "60% dintre apeluri nu ajung la decident din prima. Persoana care răspunde nu este un obstacol, "
                "este o sursă de informație și, uneori, un aliat.",
                [
                    ("h2", "Trecerea de secretariat, cu respect"),
                    ("script", [
                        "„Bună ziua, sunt Ștefan de la OPSQAI. Vă sun la rece și am nevoie de ajutorul",
                        "dumneavoastră: caut persoana care se ocupă de procedurile de operațiuni. Cine ar fi?”",
                        "[dacă întreabă despre ce e vorba]",
                        "„Despre cum se găsesc procedurile interne când cineva are nevoie urgent de un răspuns.",
                        "Nu e ofertă de preț, e o discuție de 30 de minute. Cu cine ar trebui să vorbesc?”",
                        "[dacă cere email]",
                        "„Îl trimit imediat. Ca să nu se piardă între altele, îmi spuneți numele persoanei",
                        "căreia i-l adresez și când o găsesc de obicei la telefon?”",
                    ]),
                    ("bullets", [
                        "Nu te preface că ești așteptat. Se vede și pierzi firma definitiv.",
                        "Cere ajutor explicit: oamenii ajută mai des decât resping o cerere de ajutor.",
                        "Ia mereu două lucruri: numele exact și intervalul orar în care persoana răspunde.",
                        "Mulțumește cu numele ei. La al doilea apel te va recunoaște.",
                    ]),
                    ("h2", "Mesaj vocal care produce un callback"),
                    ("script", [
                        "„Domnule Popa, Ștefan de la OPSQAI, apel la rece. Vă las 20 de secunde:",
                        "lucrăm cu firme de transport unde expirările și procedurile stau într-un singur cap.",
                        "Am o întrebare, nu o ofertă. Reveniți la 07xx xxx xxx sau vă sun joi la 16.",
                        "Repet numărul: 07xx xxx xxx. Mulțumesc.”",
                    ]),
                    ("h2", "Cadența de revenire"),
                    ("num", [
                        "Apel 1 - luni dimineață. Fără mesaj vocal.",
                        "Apel 2 - miercuri după-amiază, alt interval orar. Mesaj vocal scurt.",
                        "Email 1 - joi, trei propoziții, exact ipoteza spusă la telefon.",
                        "Apel 3 - marți următoare. Menționezi emailul într-o propoziție.",
                        "LinkedIn - cerere de conectare cu o singură frază, fără linkuri.",
                        "Apel 4 - la două săptămâni, cu un motiv nou: calculatorul de cost sau un exemplu din verticala lui.",
                        "După 6 atingeri fără răspuns: mergi în lista de reactivare la 90 de zile. Nu insiști la infinit.",
                    ]),
                ]),
        chapter("05", "Cold email și LinkedIn: sprijin, nu înlocuitor",
                "Scrisul nu înlocuiește apelul, îi crește rata. Regula: trei propoziții, o întrebare, "
                "zero atașamente, zero cuvinte de marketing.",
                [
                    ("h2", "Emailul de după apelul nereușit"),
                    ("script", [
                        "Subiect: cine răspunde șoferilor când dispecerul e în concediu",
                        "",
                        "Domnule Popa,",
                        "v-am sunat astăzi, nu ne-am prins.",
                        "La firmele de transport cu 60-80 de șoferi, procedurile și expirările stau de obicei",
                        "într-un singur cap, iar în concediu se oprește tot.",
                        "Cine preia la dumneavoastră în situația asta?",
                        "Ștefan, OPSQAI · opsqai.de",
                    ]),
                    ("h2", "Secvența scrisă, patru atingeri"),
                    ("steps", [
                        ("Atingere 1 - ipoteza",
                         "Trei propoziții și o întrebare. Nimic despre noi, niciun link în afară de semnătură."),
                        ("Atingere 2 - dovada (după 4 zile)",
                         "Un exemplu concret din verticala lui: ce s-a schimbat, în cifre pe care le putem susține."),
                        ("Atingere 3 - instrumentul (după 5 zile)",
                         "Calculatorul de cost operațional. Cere 4 cifre, dă un rezultat, nu cere buget."),
                        ("Atingere 4 - închiderea politicoasă (după 7 zile)",
                         "„Închid subiectul de partea mea. Dacă în lunile următoare devine o prioritate, "
                         "reveniți cu un rând.” Această ultimă atingere aduce, în practică, cele mai multe răspunsuri."),
                    ]),
                    ("h2", "LinkedIn, două propoziții"),
                    ("script", [
                        "„Bună ziua, domnule Popa. Lucrez cu firme de transport la partea de proceduri și",
                        "expirări; v-am sunat săptămâna trecută. O întrebare, nu o ofertă: la dumneavoastră",
                        "cine răspunde șoferilor când dispecerul lipsește?”",
                    ]),
                ]),
        chapter("06", "Ce spunem când ne refuză la telefon",
                "Refuzul de la telefon nu este o obiecție, este un reflex. Se tratează în trei mișcări: "
                "accepți refuzul, pui o singură întrebare, apoi ceri mult mai puțin decât la început.",
                [
                    ("h2", "Regula celor trei mișcări"),
                    ("num", [
                        "Acceptă: „Corect”, „Vă înțeleg”, „E firesc”. Nu contrazice niciodată în prima secundă.",
                        "Întreabă o singură dată: o întrebare scurtă care testează realitatea, nu decizia.",
                        "Cere mai puțin: nu întâlnire, ci permisiunea de a trimite trei propoziții sau de a reveni în trei luni.",
                    ]),
                    ("p", "Se insistă maximum de două ori. La al treilea refuz încheiem elegant și programăm "
                          "reactivarea la 90 de zile. Un client tratat frumos la refuz revine; unul presat nu mai răspunde niciodată."),
                    ("cards", [
                        ("„Nu am timp acum.”",
                         "De obicei este adevărat și nu are legătură cu noi.",
                         "„Vă înțeleg, sun nepregătit peste programul dumneavoastră. Două variante: închid acum și "
                         "revin joi la 16, sau îmi dați 20 de secunde să vă spun de ce v-am sunat și decideți apoi.”",
                         "„Când e ora la care nu vă sună nimeni?”",
                         "Nu continua pitchul peste „nu am timp”. Pierzi și apelul, și revenirea."),
                        ("„Trimiteți-mi un email.”",
                         "Cel mai politicos refuz. În 90% din cazuri emailul nu se citește.",
                         "„Îl trimit sigur. Ca să nu fie un email generic, îmi răspundeți la o singură întrebare: "
                         "la dumneavoastră procedurile stau într-un singur loc sau împrăștiate?”",
                         "„Ce ar trebui să scrie în email ca să merite cinci minute din timpul dumneavoastră?”",
                         "Nu accepta imediat și nu închide. Un email fără informație e un email pierdut."),
                        ("„Nu ne interesează.”",
                         "Nu a înțeles despre ce e vorba; a auzit „software”.",
                         "„Se poate, poate nu e pentru dumneavoastră. Verific un lucru și închid: dacă întreb acum "
                         "un om de pe tura de noapte cum se procedează la o marfă refuzată, în cât timp are răspunsul corect?”",
                         "„Ce v-ar interesa, dacă nu asta?”",
                         "Nu întreba „de ce nu?”. Sună a reproș și închide discuția."),
                        ("„Avem deja un sistem.”",
                         "Are ERP sau WMS, care nu răspunde la întrebări operaționale.",
                         "„Bine, atunci nu vă înlocuim nimic. Sistemele acelea țin marfa și facturile; noi ținem "
                         "procedurile și răspunsurile pentru oameni. Ce face un angajat nou când nu găsește pasul următor în sistemul actual?”",
                         "„Ce nu face sistemul actual și v-ar fi de folos?”",
                         "Nu ataca furnizorul lui. Îl obligi să îl apere."),
                        ("„Nu avem buget.”",
                         "La primul apel înseamnă „nu văd valoarea”, nu lipsa banilor.",
                         "„Firesc, nu v-am cerut buget. Vă propun cifra pierderii, nu cifra prețului: 30 de minute în "
                         "care punem cifre pe timpul pierdut. Dacă suma e mică, vă spun eu că nu merită.”",
                         "„Cine decide bugetele de acest fel și în ce lună se închid?”",
                         "Nu scădea prețul la telefon. Prețul scăzut înainte de valoare distruge afacerea."),
                        ("„Cine sunteți, de unde aveți numărul meu?”",
                         "Semnal de neîncredere. Se rezolvă doar cu transparență imediată.",
                         "„Întrebare corectă. Numărul e public pe site-ul firmei, iar eu vă sun la rece, nu am nicio "
                         "recomandare. Dacă doriți, închid și vă trimit un rând scris cu ce facem și decideți dumneavoastră.”",
                         "„Preferați să continuăm acum sau în scris?”",
                         "Nu ocoli întrebarea și nu inventa o recomandare."),
                        ("„Vorbiți cu colegul meu.”",
                         "Poate fi delegare reală sau evitare politicoasă.",
                         "„Cu plăcere. Ca să nu îl sun nepregătit: din ce ați văzut, e o problemă reală la dumneavoastră "
                         "sau doar formal ține de el?”",
                         "„Îmi dați numele și îi puteți spune că sun mâine?”",
                         "Nu suna colegul fără să afli întâi părerea lui. Pierzi ambii interlocutori."),
                        ("„Am mai încercat ceva similar și n-a funcționat.”",
                         "Cea mai valoroasă informație din apel. Are experiență negativă concretă.",
                         "„Atunci merită să știu exact ce a eșuat, ca să nu vă propun același lucru. Ce s-a rupt: "
                         "oamenii nu l-au folosit, informația nu era actualizată sau implementarea a durat prea mult?”",
                         "„Ce ar trebui să fie diferit ca să încercați încă o dată?”",
                         "Nu minimiza eșecul anterior și nu promite că „la noi e altfel”, fără explicație."),
                        ("„Sunați-mă peste șase luni.”",
                         "De obicei este un „nu” politicos, dar uneori un calendar real.",
                         "„Notez. Ca să nu vă sun degeaba: ce se schimbă în șase luni — buget, un proiect care se termină, o creștere?”",
                         "„Vă pot trimite până atunci calculatorul de cost, ca să aveți cifra pregătită?”",
                         "Nu accepta data fără motiv. „Peste șase luni” fără motiv este „niciodată”."),
                        ("„Nu vorbesc la telefon cu vânzători.”",
                         "Reacție învățată din apeluri agresive.",
                         "„Vă înțeleg perfect și nu vă țin. Un singur rând: nu vând la telefon, cer 30 de minute de "
                         "diagnostic din care rămâneți cu o pagină de concluzii chiar dacă nu lucrăm împreună. Închid acum, decideți când vreți.”",
                         "„Vă trimit acel rând în scris?”",
                         "Nu insista. Aici se câștigă respect, nu întâlnirea."),
                    ]),
                ]),
        chapter("07", "De la discuție la contract semnat",
                "Vânzarea nu se închide la final, se închide din primul apel, prin faptul că fiecare pas are "
                "un pas următor cu dată și cu nume. Un contract este consecința unei serii de mici acorduri.",
                [
                    ("h2", "Cei șapte pași ai închiderii"),
                    ("steps", [
                        ("1. Apel la rece",
                         "Rezultat: o dată în calendar pentru diagnostic. Nimic altceva."),
                        ("2. Diagnostic (30-45 min)",
                         "Rezultat: problema scrisă în cuvintele lui, cu o cifră de cost și o persoană care o simte. "
                         "Întrebările sunt în playbook-ul de obiecții și descoperire."),
                        ("3. Sumarul scris (24 de ore)",
                         "O pagină: ce ai auzit, ce costă, ce propunem, ce nu facem. Trimis rapid, cu numele lui în titlu."),
                        ("4. Proiectarea soluției",
                         "Arătăm exact fluxul care rezolvă cauza, nu platforma. Aici implicăm și persoana care va folosi zilnic."),
                        ("5. Pilot de 30 de zile",
                         "Un singur departament, criteriu de succes scris înainte de start, dată de evaluare fixată în calendar."),
                        ("6. Evaluarea pilotului",
                         "Se compară cu criteriul, nu cu impresia. Dacă nu s-a atins, o spunem noi primii — asta câștigă contractul următor."),
                        ("7. Contract",
                         "Se semnează pe rezultatul pilotului, extinderea se planifică pe departamente, în ordinea durerii."),
                    ]),
                    ("h2", "Semnale că se poate închide"),
                    ("bullets", [
                        "Începe să vorbească la viitor: „când o să avem asta”, „cine ar administra”.",
                        "Aduce singur alte persoane în discuție.",
                        "Întreabă despre implementare, migrare de date, instruire — nu despre preț.",
                        "Îți spune obiecțiile interne ale colegilor: te tratează ca aliat, nu ca furnizor.",
                        "Cere ceva în scris pentru altcineva din firmă.",
                    ]),
                    ("h2", "Formulări de închidere care nu presează"),
                    ("script", [
                        "„Din ce ne-am spus, problema costă aproximativ X pe lună. Vă propun un pilot de 30 de zile",
                        "pe departamentul Y, cu un singur criteriu: Z. Dacă la final Z nu s-a întâmplat, nu continuăm",
                        "și o spun eu primul. Începem pe 1 sau pe 15?”",
                        "",
                        "„Ce ar trebui să vedeți în următoarele 30 de zile ca să spuneți: da, mergem mai departe?”",
                        "",
                        "„Există vreun motiv, în afara prețului, care să vă oprească să începeți luna asta?”",
                        "",
                        "„Cine în afară de dumneavoastră trebuie să spună da și ce anume îl interesează pe el?”",
                    ]),
                    ("h2", "Ce spunem când ne refuză la final"),
                    ("cards", [
                        ("„Mai avem nevoie de timp de gândire.”",
                         "Lipsește un răspuns, o cifră sau acordul altcuiva.",
                         "„Firesc. Ca să vă ajut cu gândirea: ce anume rămâne neclar — cifra, efortul de implementare "
                         "sau acordul unui coleg? Pregătesc exact acel lucru.”",
                         "„Ce dată punem pentru decizie, ca să nu vă sun degeaba?”",
                         "Nu accepta „mai vorbim” fără dată. Este cel mai frecvent mod de a pierde o vânzare aproape câștigată."),
                        ("„Am ales alt furnizor.”",
                         "Decizie luată. Valoarea rămasă este informația.",
                         "„Vă mulțumesc că mi-ați spus direct. Un singur lucru, pentru mine: ce a cântărit decisiv? "
                         "Iar dacă în primele luni ceva nu se ridică la nivelul promis, reveniți fără jenă.”",
                         "„Îmi permiteți să revin într-un an, doar ca să întreb cum a mers?”",
                         "Nu critica furnizorul câștigător. Nu oferi reducere de disperare."),
                        ("„E prea scump.”",
                         "Comparație cu o cifră pe care nu o cunoaștem, deseori cu „a nu face nimic”.",
                         "„Scump față de ce anume? Dacă îl comparăm cu pierderea de X pe lună pe care am calculat-o "
                         "împreună, discutăm altfel. Putem porni și cu un singur departament, la un cost mai mic, "
                         "și extindem după rezultat.”",
                         "„Care ar fi cifra la care ați spune da fără ezitare, și ce scoatem din pachet pentru ea?”",
                         "Nu tăia prețul fără să scoți conținut. O reducere gratuită anulează valoarea declarată."),
                        ("„Conducerea a respins acum.”",
                         "Nu am furnizat argumentele în forma de care avea nevoie intern.",
                         "„Vă înțeleg. Ce argument a lipsit în ședință? Vă pregătesc o pagină cu cifra, riscul de a nu "
                         "face nimic și pilotul cu criteriu, ca să nu apărați dumneavoastră o decizie singur.”",
                         "„Când e următoarea ședință în care se poate reintra?”",
                         "Nu abandona după un „nu” intern. Adesea lipsea o singură cifră."),
                        ("„Nu acum, poate la anul.”",
                         "Prioritate reală mai mare, sau durere insuficient cuantificată.",
                         "„E în ordine. Închid subiectul până în perioada pe care o spuneți. Până atunci vă trimit o dată "
                         "la trei luni, un rând, doar dacă apare ceva relevant pentru problema pe care mi-ați descris-o.”",
                         "„Ce anume ar readuce subiectul mai repede pe masă?”",
                         "Nu insista lunar. Reactivarea corectă este la 90 de zile, cu ceva nou de spus."),
                    ]),
                ]),
        chapter("08", "Reactivarea: banii sunt în lista celor care au spus nu",
                "Un „nu” are termen de valabilitate. Oamenii se schimbă, la fel prioritățile și bugetele. "
                "Lista de refuzuri, tratată disciplinat, produce mai mult decât o listă nouă.",
                [
                    ("h2", "Ritmul de reactivare"),
                    ("num", [
                        "Ziua 0: notezi motivul refuzului în cuvintele lui, exact.",
                        "Ziua 90: un apel scurt, cu un motiv nou. Nu „reveneam cu întrebarea de atunci”.",
                        "Ziua 180: material util, fără cerere: calculatorul de cost sau un exemplu din verticala lui.",
                        "Ziua 365: apel de bilanț: „s-a rezolvat problema de care mi-ați vorbit acum un an?”",
                        "La orice semnal (angajări, depozit nou, schimbare de manager, control): suni în 48 de ore.",
                    ]),
                    ("h2", "Deschiderea de reactivare"),
                    ("script", [
                        "„Domnule Popa, Ștefan de la OPSQAI. Am vorbit în martie și mi-ați spus atunci că",
                        "problema e cine răspunde șoferilor când dispecerul lipsește, dar că nu era momentul.",
                        "Nu vă vând nimic acum, o singură întrebare: s-a schimbat ceva acolo?”",
                    ]),
                    ("h2", "Ce urmărim săptămânal, minimum"),
                    ("bullets", [
                        "Apeluri făcute și discuții reale cu decidentul.",
                        "Întâlniri de diagnostic obținute și ținute.",
                        "Motivul dominant de refuz din săptămâna respectivă.",
                        "Pași următori cu dată — câți sunt în calendar chiar acum.",
                        "Piloturi active și data evaluării fiecăruia.",
                    ]),
                    ("note", "Dacă un vânzător nu poate spune din memorie câte pași următori cu dată are în calendar, "
                             "nu are pipeline, are o listă de speranțe."),
                ]),
        chapter("09", "Pagina de urgență: de citit înainte de fiecare bloc de apeluri",
                "O singură pagină cu tot ce trebuie să ai în cap. Se ține lângă telefon.",
                [
                    ("h2", "Cele opt propoziții de bază"),
                    ("bullets", [
                        "„Vă sun la rece, nu ne cunoaștem.” — onestitate în prima secundă.",
                        "„Îmi dați 30 de secunde și apoi decideți?” — permisiune, nu monolog.",
                        "„La dumneavoastră cum se rezolvă azi?” — întrebarea care deschide totul.",
                        "„Cât de des se întâmplă și pe cine cade?” — trecerea de la poveste la cifră.",
                        "„Nu vă vând un program, vă propun un diagnostic.” — poziționarea noastră.",
                        "„Marți la 10 sau joi la 15?” — închidere cu două opțiuni concrete.",
                        "„Vă înțeleg, e firesc.” — prima reacție la orice refuz.",
                        "„Ce se schimbă până atunci?” — întrebarea care transformă amânarea în informație.",
                    ]),
                    ("h2", "Trei greșeli care costă cel mai mult"),
                    ("num", [
                        "Vorbești peste refuz în loc să îl accepți. Refuzul acceptat se poate redeschide, cel contrazis nu.",
                        "Închei fără pas următor cu dată. Fără dată, nu există vânzare, există o discuție plăcută.",
                        "Prezinți funcții înainte de a auzi durerea. Atunci concurezi pe preț, nu pe problemă.",
                    ]),
                    ("h2", "Unde continui"),
                    ("bullets", [
                        "Discuția lungă și cele 40+ de obiecții: Playbook de obiecții și descoperire (RO).",
                        "Muniția pe funcții: Probleme & soluții pe funcții (RO).",
                        "Poziționarea și modelul de lucru: opsqai.de/discovery.",
                    ]),
                ]),
    ],
)


# ============================================================== GERMAN

DE = dict(
    out="/mnt/documents/OPSQAI_Kaltakquise_Playbook_DE.pdf",
    footer="Playbook Kaltakquise & Kundengewinnung · Intern · opsqai.de",
    cover_title=["Kaltakquise und", "Kundengewinnung.", "Was wir sagen,", "wie wir abschließen."],
    cover_sub="Operatives Playbook — vom ersten Anruf bis zum unterschriebenen Vertrag",
    cover_note="Internes Vertriebsdokument · Deutsch · opsqai.de",
    intro=(
        "Dieses Dokument wird täglich benutzt, nicht einmal gelesen. Es funktioniert für jemanden, der zum "
        "ersten Mal kalt anruft, und für erfahrene Vertriebler, die fertige Formulierungen brauchen. Inhalt: "
        "wie die Liste entsteht, was in den ersten 15 Sekunden gesagt wird, wie man am Sekretariat vorbeikommt, "
        "was wir auf jede Absage antworten, wie das Gespräch zur Diagnose führt und wie nach dem Pilot der "
        "Vertrag abgeschlossen wird."
    ),
    ref_title="Verbindung zu den anderen Dokumenten",
    refs=[
        ("Einwand- und Discovery-Playbook (DE)",
         "Wird NACH dem erfolgreichen Anruf verwendet. Dort stehen die 40+ Einwände des langen Gesprächs, die "
         "Discovery-Fragen und das Skript für den 45-Minuten-Termin. Hier behandeln wir nur die kurzen Absagen "
         "am Telefon, wo man 10 Sekunden hat, nicht 10 Minuten."),
        ("Probleme & Lösungen je Funktion",
         "Dient als Munition. Nennt der Kunde einen konkreten Schmerz, holt man dort das Paar Problem → Lösung "
         "für genau diese Funktion. Es wird nicht vorgelesen, sondern in seine Worte übersetzt."),
        ("Das Discovery-Modell auf opsqai.de/discovery",
         "Das ist, was wir am Telefon verkaufen. Nicht Software, sondern eine Diagnosephase: "
         "Problem → Diagnose → Lösungsentwurf → Workspace."),
        ("Rechner für operative Kosten",
         "Der Haken für die Reaktivierung von Absagen. Fragt kein Budget, fragt vier Zahlen und liefert ein Ergebnis."),
    ],
    chapters=[
        chapter("01", "Wie Akquise funktioniert: Zahlen statt Glück",
                "Kaltakquise ist kein Talent, sondern korrekt wiederholte Arithmetik. Wer seine Quote kennt, "
                "weiß genau, wie viele Anrufe ein Vertrag kostet — und ist nicht mehr von guten Tagen abhängig.",
                [
                    ("h2", "Die Grundrechnung"),
                    ("p", "Aus 100 Anrufen an eine gut gebaute Liste: 30-40 echte Gespräche mit dem Entscheider, "
                          "8-12 sagen Ja zu einem Diagnosetermin, 4-6 erreichen ein Angebot, 1-2 starten einen Pilot, "
                          "1 wird Vertrag. Die Zahlen schwanken je Markt, das Verhältnis bleibt. Man bewertet niemals "
                          "einen Tag, sondern einen Block von 100 Anrufen."),
                    ("num", [
                        "Liste: 40-60 Unternehmen je Branche, nicht 500 zufällige. Eine schwache Liste rettet kein gutes Skript.",
                        "Anrufe: 25-40 pro Tag in zwei Blöcken von 90 Minuten. Kein E-Mail, kein Chat im Block.",
                        "Das Ziel des Anrufs ist nicht der Verkauf, sondern ein Satz: 30 Minuten Diagnose vereinbaren.",
                        "Jeder Anruf wird am selben Tag notiert: Status, seine Worte, Datum des nächsten Schritts.",
                        "Wöchentlich fünf Minuten Auswertung: An welcher Absage verlieren wir am häufigsten? Genau dort ändern wir die Formulierung.",
                    ]),
                    ("h2", "Wen wir anrufen"),
                    ("bullets", [
                        "Transport und Logistik: Betriebsleiter, Dispositionsleiter, Fuhrparkverantwortlicher, Lagerleiter.",
                        "Produktion: Produktionsleiter, Qualitätsverantwortlicher, Schichtkoordinator.",
                        "HR und Verwaltung: HR-Leitung, Personalverantwortliche in Unternehmen mit 80-500 Mitarbeitenden.",
                        "Dienstleister mit Außenteams: Betriebsleitung, Teamkoordination.",
                        "Größenregel: 80-500 Mitarbeitende. Darunter fehlt das Budget, darüber wird der Entscheidungszyklus lang.",
                    ]),
                    ("h2", "Der Tagesrhythmus, der Ergebnisse bringt"),
                    ("steps", [
                        ("08:30 - 09:00 Vorbereitung",
                         "20 Unternehmen für den Tag, mit Namen des Entscheiders und einem konkreten Anlass je Firma "
                         "(neues Lager, viele Stellenanzeigen, wachsender Fuhrpark)."),
                        ("09:00 - 10:30 Anrufblock",
                         "Ohne Pause telefonieren, kein Postfach öffnen. Absagen werden nicht analysiert, nur in einer Zeile notiert."),
                        ("10:30 - 11:00 Schriftliches Nachfassen",
                         "Genau das senden, was am Telefon versprochen wurde, am selben Tag, mit seinen Worten im Betreff."),
                        ("14:00 - 15:30 Zweiter Block",
                         "Ein anderes Zeitfenster erreicht andere Menschen. Betriebsleiter gehen häufiger nach 16:00 Uhr ran."),
                        ("17:00 - 17:15 Tagesabschluss",
                         "Tracker aktualisieren, Rückrufe terminieren, in einer Zeile notieren, was gelernt wurde."),
                    ]),
                ]),
        chapter("02", "Vorbereitung: fünf Minuten, die alles ändern",
                "Man ruft nicht mit leerer Liste an. Fünf Minuten Vorbereitung je Unternehmen machen aus einem "
                "Verkaufsanruf einen relevanten Anruf — und Relevanz ist der einzige Grund, weshalb jemand zuhört.",
                [
                    ("h2", "Was wir in diesen fünf Minuten suchen"),
                    ("num", [
                        "Was die Firma tut, in zwei Worten, in ihrer Sprache, nicht in unserer.",
                        "Ein Signal für Wachstum oder Druck: viele Einstellungen, neues Lager, größerer Fuhrpark, Zertifizierung, Audit.",
                        "Name und Rolle der Person, die das Problem spürt — nicht der Person, die unterschreibt.",
                        "Eine Schmerz-Hypothese: „Bei 60 Fahrern und einem Disponenten laufen Fristen auf Papier.“",
                        "Ein Grund, heute anzurufen. Ohne ihn klingt der Anruf nach gekaufter Liste.",
                    ]),
                    ("h2", "Checkliste vor dem Wählen"),
                    ("bullets", [
                        "Ich kenne seinen Namen und spreche ihn korrekt aus.",
                        "Ich habe eine Hypothese, nicht drei.",
                        "Die ersten zwei Sätze kann ich ohne Ablesen sagen.",
                        "Ich kenne das einzige akzeptable Ergebnis: ein Termin im Kalender.",
                        "Ich habe eine Alternative bei Nein: die Erlaubnis, den Kostenrechner zu senden.",
                        "Keine Präsentation ist geöffnet. Wir verkaufen am Telefon keine Funktionen.",
                    ]),
                    ("h2", "Die richtige Haltung"),
                    ("p", "Sprich langsamer, als der Instinkt sagt, und zehn Prozent tiefer. Anfänger sprechen "
                          "schnell aus Angst, unterbrochen zu werden; die Wirkung ist umgekehrt, Eile löst die Absage "
                          "aus. Stehen, vor dem Sprechen lächeln, die ersten zwei Sätze je unter sieben Sekunden halten."),
                    ("note", "Goldene Regel: Ziel des Anrufs ist nicht Überzeugen, sondern Herausfinden, ob ein "
                             "30-Minuten-Gespräch lohnt. Ein schnelles, klares Nein ist ein gutes Ergebnis."),
                ]),
        chapter("03", "Das Kaltakquise-Skript, Satz für Satz",
                "Die Struktur hat sechs Schritte und dauert unter drei Minuten. Man lernt sie in Teilen, nicht "
                "auswendig: die Worte dürfen deine sein, die Reihenfolge nicht.",
                [
                    ("h2", "Die sechs Schritte"),
                    ("steps", [
                        ("1. Direkte Identifikation (7 Sekunden)",
                         "Wer du bist, welche Firma, und dass es ein Kaltanruf ist. Offenheit entwaffnet. "
                         "Erfinde nie „ich rufe wegen Ihrer Anfrage an“."),
                        ("2. Erlaubnis holen (7 Sekunden)",
                         "Bitte um 30 Sekunden, nicht um 5 Minuten. Wer die Erlaubnis hat, wird nicht unterbrochen."),
                        ("3. Der relevante Anlass (15 Sekunden)",
                         "Die Hypothese, formuliert als Beobachtung über Firmen wie seine, nicht als Vorwurf über seine Firma."),
                        ("4. Die Prüffrage (eine Frage)",
                         "Du gibst ihm die Kontrolle. Hier entscheidet sich der Anruf. Danach mindestens drei Sekunden schweigen."),
                        ("5. Kurzes Nachbohren (zwei Fragen)",
                         "Wie oft passiert es, wen trifft es. Nicht mehr. Die vollständige Diagnose gehört in den Termin."),
                        ("6. Abschluss auf den Termin",
                         "Zwei konkrete Zeitfenster vorschlagen. Nicht „wäre das interessant?“, sondern „Dienstag 10 oder Donnerstag 15 Uhr?“."),
                    ]),
                    ("h2", "Vollständiges Skript, Variante Transport und Logistik"),
                    ("script", [
                        "„Guten Tag, Herr Braun, mein Name ist Stefan von OPSQAI. Ich rufe kalt an, wir kennen uns nicht.",
                        "Geben Sie mir 30 Sekunden für den Grund meines Anrufs, und dann sagen Sie mir, ob es sich lohnt?“",
                        "[Pause — die Antwort abwarten, nicht darüber sprechen]",
                        "„Wir arbeiten mit Transportunternehmen Ihrer Größe, bei denen ein einziger Disponent Fristen,",
                        "Anweisungen und Antworten für 60 bis 80 Fahrer im Kopf hat. Das sieht gut aus — bis zu dem Tag,",
                        "an dem diese Person im Urlaub ist oder kündigt.",
                        "Wie ist das bei Ihnen heute gelöst: Wenn ein Fahrer bei einer abgelehnten Ware nicht weiß,",
                        "wie zu verfahren ist — wen ruft er an?“",
                        "[er antwortet — seine Worte wörtlich notieren]",
                        "„Und wie oft passiert das in einer normalen Woche?“",
                        "„Ich schlage 30 Minuten vor, in denen ich Ihnen keine Software zeige, sondern wir eine kurze",
                        "Diagnose machen: wo Stunden verloren gehen und was das kostet. Am Ende haben Sie eine Seite",
                        "mit Ergebnissen, auch wenn wir nicht zusammenarbeiten. Dienstag 10 oder Donnerstag 15 Uhr?“",
                    ]),
                    ("h2", "Variante HR und Verwaltung"),
                    ("script", [
                        "„Ich rufe wegen einer Sache an: Bei 200 Mitarbeitenden liegen Verträge, Nachträge und",
                        "Urlaube meist an drei verschiedenen Orten, und bei einer Prüfung wird zwei Tage manuell",
                        "zusammengesucht. Wer stellt bei Ihnen die Unterlagen zusammen, wenn sie verlangt werden?“",
                        "[zuhören]",
                        "„Und wie lange dauert das realistisch, bis es vollständig ist?“",
                        "„Dann lohnen 30 Minuten Diagnose. Keine Software-Präsentation, sondern wo die Tage verloren",
                        "gehen. Mittwoch 11 oder Freitag 9 Uhr?“",
                    ]),
                    ("h2", "Variante Produktion und Qualität"),
                    ("script", [
                        "„Die Produktionsbetriebe, mit denen wir arbeiten, haben gute schriftliche Anweisungen, aber",
                        "die Nachtschicht findet sie nicht in zwei Minuten, fragt einen Kollegen, und der Fehler",
                        "wiederholt sich. Was macht bei Ihnen ein neuer Mitarbeiter, der den nächsten Schritt nicht kennt?“",
                        "[zuhören]",
                        "„Was hat die letzte Abweichung dieser Art etwa gekostet?“",
                        "„30 Minuten, Diagnose, ohne Präsentation. Donnerstag 14 oder Montag 10 Uhr?“",
                    ]),
                    ("h2", "Was am Telefon nie gesagt wird"),
                    ("bullets", [
                        "„Marktführer“, „innovative Lösung“, „All-in-one-Plattform“. Keine Wirkung, klares Verkaufssignal.",
                        "Modul-Aufzählungen. Niemand kauft am Telefon eine Funktionsliste.",
                        "Vergleiche mit SAP, Microsoft oder anderen. Wir starten nicht bei Software, sondern bei seinem Problem.",
                        "Prozentversprechen, die wir in seinem Unternehmen nicht belegen können.",
                        "„Störe ich?“ — das ist eine Einladung zum Nein.",
                    ]),
                ]),
        chapter("04", "Sekretariat, Mailbox und Wiedervorlage",
                "60 Prozent der Anrufe erreichen den Entscheider nicht beim ersten Versuch. Wer abnimmt, ist kein "
                "Hindernis, sondern eine Informationsquelle und manchmal ein Verbündeter.",
                [
                    ("h2", "Am Sekretariat vorbei, mit Respekt"),
                    ("script", [
                        "„Guten Tag, Stefan von OPSQAI. Ich rufe kalt an und brauche Ihre Hilfe: Ich suche die Person,",
                        "die für die operativen Arbeitsanweisungen zuständig ist. Wer wäre das?“",
                        "[wenn nach dem Thema gefragt wird]",
                        "„Es geht darum, wie interne Anweisungen gefunden werden, wenn jemand dringend eine Antwort",
                        "braucht. Kein Preisangebot, ein 30-Minuten-Gespräch. Mit wem sollte ich sprechen?“",
                        "[wenn eine E-Mail verlangt wird]",
                        "„Sende ich sofort. Damit sie nicht untergeht: Wie heißt die Person, an die ich sie richte,",
                        "und wann ist sie üblicherweise telefonisch erreichbar?“",
                    ]),
                    ("bullets", [
                        "Tue nie so, als würdest du erwartet. Es fällt auf und kostet die Firma endgültig.",
                        "Bitte ausdrücklich um Hilfe: Menschen helfen häufiger, als sie eine Bitte abweisen.",
                        "Nimm immer zwei Dinge mit: den genauen Namen und das Zeitfenster der Erreichbarkeit.",
                        "Bedanke dich mit Namen. Beim zweiten Anruf wird man dich wiedererkennen.",
                    ]),
                    ("h2", "Mailboxnachricht, die einen Rückruf erzeugt"),
                    ("script", [
                        "„Herr Braun, Stefan von OPSQAI, Kaltanruf. Ich nehme 20 Sekunden:",
                        "Wir arbeiten mit Transportunternehmen, in denen Fristen und Anweisungen in einem Kopf liegen.",
                        "Ich habe eine Frage, kein Angebot. Rückruf unter 015x xxx xxxx, sonst rufe ich Donnerstag 16 Uhr an.",
                        "Ich wiederhole die Nummer: 015x xxx xxxx. Danke.“",
                    ]),
                    ("h2", "Wiedervorlage-Takt"),
                    ("num", [
                        "Anruf 1 - Montagmorgen. Keine Mailboxnachricht.",
                        "Anruf 2 - Mittwochnachmittag, anderes Zeitfenster. Kurze Mailboxnachricht.",
                        "E-Mail 1 - Donnerstag, drei Sätze, genau die am Telefon genannte Hypothese.",
                        "Anruf 3 - Dienstag darauf. Die E-Mail in einem Satz erwähnen.",
                        "LinkedIn - Kontaktanfrage mit einem Satz, ohne Links.",
                        "Anruf 4 - nach zwei Wochen, mit neuem Anlass: Kostenrechner oder Beispiel aus seiner Branche.",
                        "Nach sechs Kontakten ohne Antwort: Reaktivierungsliste nach 90 Tagen. Kein endloses Nachhaken.",
                    ]),
                ]),
        chapter("05", "Kalt-E-Mail und LinkedIn: Unterstützung, kein Ersatz",
                "Schreiben ersetzt den Anruf nicht, es erhöht seine Quote. Regel: drei Sätze, eine Frage, "
                "keine Anhänge, keine Marketingwörter.",
                [
                    ("h2", "Die E-Mail nach dem nicht erreichten Anruf"),
                    ("script", [
                        "Betreff: wer den Fahrern antwortet, wenn der Disponent im Urlaub ist",
                        "",
                        "Herr Braun,",
                        "ich habe Sie heute angerufen, wir haben uns nicht erreicht.",
                        "In Transportunternehmen mit 60-80 Fahrern liegen Anweisungen und Fristen meist in einem",
                        "einzigen Kopf, und im Urlaub steht alles.",
                        "Wer übernimmt das bei Ihnen in dieser Situation?",
                        "Stefan, OPSQAI · opsqai.de",
                    ]),
                    ("h2", "Die schriftliche Sequenz, vier Kontakte"),
                    ("steps", [
                        ("Kontakt 1 - die Hypothese",
                         "Drei Sätze und eine Frage. Nichts über uns, kein Link außer der Signatur."),
                        ("Kontakt 2 - der Beleg (nach 4 Tagen)",
                         "Ein konkretes Beispiel aus seiner Branche: was sich verändert hat, in Zahlen, die wir halten können."),
                        ("Kontakt 3 - das Werkzeug (nach 5 Tagen)",
                         "Der Rechner für operative Kosten. Vier Zahlen rein, ein Ergebnis raus, kein Budget nötig."),
                        ("Kontakt 4 - der höfliche Abschluss (nach 7 Tagen)",
                         "„Ich schließe das Thema von meiner Seite. Wird es in den nächsten Monaten zur Priorität, "
                         "genügt eine Zeile.“ Dieser letzte Kontakt bringt in der Praxis die meisten Antworten."),
                    ]),
                    ("h2", "LinkedIn, zwei Sätze"),
                    ("script", [
                        "„Guten Tag, Herr Braun. Ich arbeite mit Transportunternehmen an Anweisungen und Fristen;",
                        "ich habe letzte Woche angerufen. Eine Frage, kein Angebot: Wer antwortet bei Ihnen den",
                        "Fahrern, wenn der Disponent fehlt?“",
                    ]),
                ]),
        chapter("06", "Was wir sagen, wenn wir am Telefon abgelehnt werden",
                "Die Absage am Telefon ist kein Einwand, sondern ein Reflex. Sie wird in drei Bewegungen behandelt: "
                "Absage annehmen, eine einzige Frage stellen, dann deutlich weniger verlangen als anfangs.",
                [
                    ("h2", "Die Regel der drei Bewegungen"),
                    ("num", [
                        "Annehmen: „Verstehe“, „Völlig richtig“, „Das ist normal“. Niemals in der ersten Sekunde widersprechen.",
                        "Einmal fragen: eine kurze Frage, die die Realität prüft, nicht die Entscheidung.",
                        "Weniger verlangen: keinen Termin, sondern die Erlaubnis für drei Sätze oder einen Anruf in drei Monaten.",
                    ]),
                    ("p", "Höchstens zweimal nachfassen. Bei der dritten Absage beenden wir elegant und setzen die "
                          "Reaktivierung auf 90 Tage. Wer bei der Absage gut behandelt wird, kommt zurück; wer bedrängt wird, nie."),
                    ("cards", [
                        ("„Ich habe jetzt keine Zeit.“",
                         "Meist wahr und ohne Bezug zu uns.",
                         "„Verstehe, ich rufe unangekündigt in Ihren Tag. Zwei Möglichkeiten: Ich lege jetzt auf und "
                         "rufe Donnerstag 16 Uhr an, oder Sie geben mir 20 Sekunden für den Grund und entscheiden danach.“",
                         "„Wann ist die Uhrzeit, zu der Sie niemand anruft?“",
                         "Nicht über „keine Zeit“ hinweg weiterreden. Sonst verlierst du Anruf und Wiedervorlage."),
                        ("„Schicken Sie mir eine E-Mail.“",
                         "Die höflichste Absage. In 90 Prozent der Fälle wird sie nicht gelesen.",
                         "„Mache ich. Damit es keine Standard-Mail wird, beantworten Sie mir eine Frage: Liegen Ihre "
                         "Anweisungen an einem Ort oder verteilt?“",
                         "„Was müsste in der Mail stehen, damit sie fünf Minuten Ihrer Zeit wert ist?“",
                         "Nicht sofort zustimmen und auflegen. Eine Mail ohne Information ist verloren."),
                        ("„Kein Interesse.“",
                         "Er hat nicht verstanden, worum es geht; er hat „Software“ gehört.",
                         "„Möglich, vielleicht ist es nichts für Sie. Ich prüfe eine Sache und lege auf: Wenn ich jetzt "
                         "jemanden aus der Nachtschicht frage, wie bei abgelehnter Ware zu verfahren ist — wie lange bis zur richtigen Antwort?“",
                         "„Was würde Sie interessieren, wenn nicht das?“",
                         "Frage nicht „warum nicht?“. Das klingt nach Vorwurf und beendet das Gespräch."),
                        ("„Wir haben schon ein System.“",
                         "Er hat ERP oder WMS, das operative Fragen nicht beantwortet.",
                         "„Gut, dann ersetzen wir nichts. Diese Systeme führen Ware und Rechnungen; wir führen Anweisungen "
                         "und Antworten für Menschen. Was macht ein neuer Mitarbeiter, der den nächsten Schritt im heutigen System nicht findet?“",
                         "„Was leistet das heutige System nicht, das Ihnen helfen würde?“",
                         "Greife seinen Anbieter nicht an. Sonst verteidigt er ihn."),
                        ("„Wir haben kein Budget.“",
                         "Beim ersten Anruf heißt das „ich sehe keinen Wert“, nicht fehlendes Geld.",
                         "„Normal, ich habe kein Budget verlangt. Ich schlage die Verlustzahl vor, nicht den Preis: "
                         "30 Minuten, in denen wir die verlorene Zeit beziffern. Ist die Summe klein, sage ich Ihnen selbst, dass es sich nicht lohnt.“",
                         "„Wer entscheidet solche Budgets und in welchem Monat werden sie geschlossen?“",
                         "Senke am Telefon nie den Preis. Preis vor Wert zerstört das Geschäft."),
                        ("„Wer sind Sie, woher haben Sie meine Nummer?“",
                         "Misstrauenssignal. Nur durch sofortige Transparenz zu lösen.",
                         "„Berechtigte Frage. Die Nummer steht öffentlich auf Ihrer Website, und ich rufe kalt an, "
                         "ohne jede Empfehlung. Wenn Sie möchten, lege ich auf und schicke Ihnen eine Zeile schriftlich, dann entscheiden Sie.“",
                         "„Möchten Sie jetzt weitersprechen oder schriftlich?“",
                         "Weiche der Frage nicht aus und erfinde keine Empfehlung."),
                        ("„Sprechen Sie mit meinem Kollegen.“",
                         "Kann echte Delegation oder höfliches Ausweichen sein.",
                         "„Gerne. Damit ich ihn nicht unvorbereitet anrufe: Ist das aus Ihrer Sicht ein echtes Problem "
                         "bei Ihnen, oder ist er nur formal zuständig?“",
                         "„Geben Sie mir seinen Namen, und können Sie ihm sagen, dass ich morgen anrufe?“",
                         "Rufe den Kollegen nicht ohne seine Einschätzung an. Sonst verlierst du beide."),
                        ("„Wir haben Ähnliches versucht, es hat nicht funktioniert.“",
                         "Die wertvollste Information im Anruf. Er hat konkrete negative Erfahrung.",
                         "„Dann muss ich genau wissen, was gescheitert ist, um Ihnen nicht dasselbe vorzuschlagen. Was "
                         "brach: Die Leute nutzten es nicht, die Inhalte waren nicht aktuell, oder die Einführung dauerte zu lang?“",
                         "„Was müsste anders sein, damit Sie es noch einmal versuchen?“",
                         "Verkleinere den früheren Fehlschlag nicht und verspreche nicht ohne Begründung, „bei uns ist es anders“."),
                        ("„Rufen Sie in sechs Monaten an.“",
                         "Meist ein höfliches Nein, manchmal ein echter Zeitplan.",
                         "„Notiert. Damit ich nicht umsonst anrufe: Was ändert sich in sechs Monaten — Budget, ein Projekt, das endet, Wachstum?“",
                         "„Darf ich Ihnen bis dahin den Kostenrechner schicken, damit die Zahl vorliegt?“",
                         "Akzeptiere kein Datum ohne Grund. „In sechs Monaten“ ohne Grund heißt „nie“."),
                        ("„Ich spreche mit Vertrieblern nicht am Telefon.“",
                         "Erlerntes Verhalten aus aggressiven Anrufen.",
                         "„Absolut verständlich, ich halte Sie nicht auf. Nur eine Zeile: Ich verkaufe am Telefon nicht, "
                         "ich bitte um 30 Minuten Diagnose, aus denen Sie eine Seite Ergebnisse behalten, auch ohne Zusammenarbeit. Ich lege jetzt auf.“",
                         "„Darf ich Ihnen diese Zeile schriftlich senden?“",
                         "Nicht nachbohren. Hier gewinnt man Respekt, nicht den Termin."),
                    ]),
                ]),
        chapter("07", "Vom Gespräch zum unterschriebenen Vertrag",
                "Der Abschluss beginnt nicht am Ende, sondern beim ersten Anruf: jeder Schritt hat einen nächsten "
                "Schritt mit Datum und Namen. Ein Vertrag ist die Folge vieler kleiner Zustimmungen.",
                [
                    ("h2", "Die sieben Schritte zum Abschluss"),
                    ("steps", [
                        ("1. Kaltanruf",
                         "Ergebnis: ein Diagnosetermin im Kalender. Nichts anderes."),
                        ("2. Diagnose (30-45 Min.)",
                         "Ergebnis: das Problem in seinen Worten, eine Kostenzahl und eine Person, die es spürt. "
                         "Die Fragen stehen im Einwand- und Discovery-Playbook."),
                        ("3. Schriftliche Zusammenfassung (24 Stunden)",
                         "Eine Seite: was gehört wurde, was es kostet, was wir vorschlagen, was wir nicht tun."),
                        ("4. Lösungsentwurf",
                         "Wir zeigen genau den Ablauf, der die Ursache löst, nicht die Plattform. Hier holen wir die tägliche Nutzerin dazu."),
                        ("5. Pilot über 30 Tage",
                         "Eine Abteilung, Erfolgskriterium vor dem Start schriftlich, Auswertungstermin im Kalender."),
                        ("6. Pilot-Auswertung",
                         "Gemessen wird am Kriterium, nicht am Eindruck. Nicht erreicht? Wir sagen es zuerst — das gewinnt den nächsten Vertrag."),
                        ("7. Vertrag",
                         "Unterschrieben auf das Pilotergebnis, Ausweitung nach Abteilungen in der Reihenfolge des Schmerzes."),
                    ]),
                    ("h2", "Kaufsignale"),
                    ("bullets", [
                        "Er spricht in der Zukunft: „wenn wir das haben“, „wer würde das verwalten“.",
                        "Er holt selbst weitere Personen dazu.",
                        "Er fragt nach Einführung, Datenübernahme, Schulung — nicht nach dem Preis.",
                        "Er nennt dir die internen Einwände der Kollegen: er behandelt dich als Verbündeten.",
                        "Er bittet um etwas Schriftliches für jemand anderen im Unternehmen.",
                    ]),
                    ("h2", "Abschlussformulierungen ohne Druck"),
                    ("script", [
                        "„Nach unserem Gespräch kostet das Problem etwa X pro Monat. Ich schlage einen 30-Tage-Pilot",
                        "in Abteilung Y vor, mit einem einzigen Kriterium: Z. Ist Z am Ende nicht erreicht, machen wir",
                        "nicht weiter, und ich sage es zuerst. Starten wir am 1. oder am 15.?“",
                        "",
                        "„Was müssten Sie in den nächsten 30 Tagen sehen, um zu sagen: ja, wir machen weiter?“",
                        "",
                        "„Gibt es außer dem Preis einen Grund, diesen Monat nicht zu starten?“",
                        "",
                        "„Wer muss außer Ihnen zustimmen, und was ist für diese Person wichtig?“",
                    ]),
                    ("h2", "Was wir sagen, wenn am Ende abgelehnt wird"),
                    ("cards", [
                        ("„Wir brauchen noch Bedenkzeit.“",
                         "Es fehlt eine Antwort, eine Zahl oder die Zustimmung eines Dritten.",
                         "„Verständlich. Damit ich helfen kann: Was bleibt unklar — die Zahl, der Einführungsaufwand "
                         "oder die Zustimmung eines Kollegen? Ich bereite genau das auf.“",
                         "„Welches Datum setzen wir für die Entscheidung, damit ich nicht umsonst anrufe?“",
                         "Akzeptiere kein „wir sprechen wieder“ ohne Datum. So verliert man fast gewonnene Abschlüsse."),
                        ("„Wir haben einen anderen Anbieter gewählt.“",
                         "Entscheidung gefallen. Der verbleibende Wert ist Information.",
                         "„Danke für die klare Antwort. Eine Sache für mich: Was war ausschlaggebend? Und wenn in den "
                         "ersten Monaten etwas nicht hält, melden Sie sich ohne Zögern.“",
                         "„Darf ich in einem Jahr anrufen, nur um zu fragen, wie es gelaufen ist?“",
                         "Kritisiere den Gewinner nicht. Biete keinen Verzweiflungsrabatt."),
                        ("„Zu teuer.“",
                         "Vergleich mit einer Zahl, die wir nicht kennen, oft mit „nichts tun“.",
                         "„Teuer verglichen mit was? Gegen den gemeinsam gerechneten Verlust von X pro Monat sieht es "
                         "anders aus. Wir können mit einer Abteilung zu geringeren Kosten starten und nach dem Ergebnis ausweiten.“",
                         "„Bei welcher Zahl würden Sie ohne Zögern zusagen, und was nehmen wir dafür heraus?“",
                         "Kürze den Preis nie ohne Inhalt zu kürzen. Ein Gratisrabatt entwertet die genannte Leistung."),
                        ("„Die Geschäftsführung hat abgelehnt.“",
                         "Wir haben die Argumente nicht in der intern benötigten Form geliefert.",
                         "„Verstehe. Welches Argument fehlte in der Sitzung? Ich bereite eine Seite mit Zahl, Risiko "
                         "des Nichtstuns und Pilot mit Kriterium auf, damit Sie die Entscheidung nicht allein verteidigen.“",
                         "„Wann ist die nächste Sitzung, in der man wieder einbringen kann?“",
                         "Gib nach einem internen Nein nicht auf. Oft fehlte nur eine Zahl."),
                        ("„Nicht jetzt, vielleicht nächstes Jahr.“",
                         "Echte höhere Priorität oder zu wenig bezifferter Schmerz.",
                         "„In Ordnung. Ich schließe das Thema bis zu dem genannten Zeitpunkt. Bis dahin melde ich mich "
                         "einmal pro Quartal mit einer Zeile, und nur wenn es zu dem beschriebenen Problem passt.“",
                         "„Was würde das Thema früher auf den Tisch bringen?“",
                         "Nicht monatlich nachhaken. Richtige Reaktivierung: 90 Tage, mit etwas Neuem."),
                    ]),
                ]),
        chapter("08", "Reaktivierung: das Geld liegt in der Nein-Liste",
                "Ein Nein hat ein Haltbarkeitsdatum. Menschen wechseln, Prioritäten und Budgets auch. Die "
                "disziplinierte Absagenliste bringt mehr als eine neue Liste.",
                [
                    ("h2", "Der Reaktivierungstakt"),
                    ("num", [
                        "Tag 0: den Absagegrund in seinen Worten notieren, wörtlich.",
                        "Tag 90: kurzer Anruf mit neuem Anlass. Nicht „ich komme auf meine Frage zurück“.",
                        "Tag 180: nützliches Material ohne Bitte: Kostenrechner oder Beispiel aus seiner Branche.",
                        "Tag 365: Bilanzanruf: „Ist das Problem von damals gelöst?“",
                        "Bei jedem Signal (Einstellungen, neues Lager, Managementwechsel, Audit): Anruf innerhalb von 48 Stunden.",
                    ]),
                    ("h2", "Die Reaktivierungseröffnung"),
                    ("script", [
                        "„Herr Braun, Stefan von OPSQAI. Wir sprachen im März, und Sie sagten damals, das Problem sei,",
                        "wer den Fahrern antwortet, wenn der Disponent fehlt — der Zeitpunkt passte aber nicht.",
                        "Ich verkaufe jetzt nichts, nur eine Frage: Hat sich daran etwas geändert?“",
                    ]),
                    ("h2", "Was wöchentlich gemessen wird, mindestens"),
                    ("bullets", [
                        "Getätigte Anrufe und echte Gespräche mit Entscheidern.",
                        "Vereinbarte und gehaltene Diagnosetermine.",
                        "Der dominierende Absagegrund dieser Woche.",
                        "Nächste Schritte mit Datum — wie viele stehen jetzt im Kalender.",
                        "Laufende Piloten und das Auswertungsdatum jedes einzelnen.",
                    ]),
                    ("note", "Wer nicht aus dem Kopf sagen kann, wie viele nächsten Schritte mit Datum im Kalender "
                             "stehen, hat keine Pipeline, sondern eine Hoffnungsliste."),
                ]),
        chapter("09", "Die Notfallseite: vor jedem Anrufblock lesen",
                "Eine Seite mit allem, was im Kopf sein muss. Liegt neben dem Telefon.",
                [
                    ("h2", "Die acht Grundsätze"),
                    ("bullets", [
                        "„Ich rufe kalt an, wir kennen uns nicht.“ — Offenheit in der ersten Sekunde.",
                        "„Geben Sie mir 30 Sekunden, dann entscheiden Sie?“ — Erlaubnis statt Monolog.",
                        "„Wie ist das bei Ihnen heute gelöst?“ — die Frage, die alles öffnet.",
                        "„Wie oft passiert es und wen trifft es?“ — vom Erzählen zur Zahl.",
                        "„Ich verkaufe keine Software, ich schlage eine Diagnose vor.“ — unsere Positionierung.",
                        "„Dienstag 10 oder Donnerstag 15 Uhr?“ — Abschluss mit zwei konkreten Optionen.",
                        "„Verstehe, das ist normal.“ — erste Reaktion auf jede Absage.",
                        "„Was ändert sich bis dahin?“ — verwandelt Aufschub in Information.",
                    ]),
                    ("h2", "Die drei teuersten Fehler"),
                    ("num", [
                        "Über die Absage hinwegreden statt sie anzunehmen. Eine angenommene Absage lässt sich wieder öffnen, eine bestrittene nicht.",
                        "Ohne nächsten Schritt mit Datum beenden. Ohne Datum gibt es keinen Verkauf, nur ein angenehmes Gespräch.",
                        "Funktionen zeigen, bevor der Schmerz gehört wurde. Dann konkurriert man über den Preis, nicht über das Problem.",
                    ]),
                    ("h2", "Wo es weitergeht"),
                    ("bullets", [
                        "Das lange Gespräch und die 40+ Einwände: Einwand- und Discovery-Playbook (DE).",
                        "Munition je Funktion: Probleme & Lösungen je Funktion.",
                        "Positionierung und Arbeitsmodell: opsqai.de/discovery.",
                    ]),
                ]),
    ],
)


# ============================================================== RENDER

def section_cover(d, kicker, title, blurb):
    """Local chapter cover with extra space between kicker and title."""
    d.new_page(title)
    d.y = H / 2 + 30 * mm
    d.c.setFillColor(GREEN)
    d.c.rect(M, d.y + 16 * mm, 26 * mm, 2.4 * mm, stroke=0, fill=1)
    d.c.setFont(BODY, 9)
    d.c.setFillColor(MUTED)
    d.c.drawString(M, d.y + 9 * mm, kicker.upper())
    d.c.setFont(BOLD, 24)
    d.c.setFillColor(GRAPHITE)
    for ln in d.wrap(title, BOLD, 24, W - 2 * M):
        d.c.drawString(M, d.y, ln)
        d.y -= 29
    d.y -= 6 * mm
    if blurb:
        d.para(blurb, size=10.5, color=SLATE, width=(W - 2 * M) * 0.86, leading=16)


def render(L):
    d = Doc(L["out"], L["footer"])
    txt_w = W - 2 * M - 6 * mm
    tx = M + 6 * mm

    # cover
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
    d.c.setFillColor(MUTED)
    d.c.drawString(M, H - 33 * mm, "Operational Intelligence Platform")

    y = H - 88 * mm
    for i, line in enumerate(L["cover_title"]):
        d.c.setFont(BOLD, 23)
        d.c.setFillColor(GREEN if i == len(L["cover_title"]) - 1 else GRAPHITE)
        d.c.drawString(M, y, line)
        y -= 12 * mm
    d.y = y - 6 * mm
    d.section = L["cover_sub"]
    d.para(L["cover_sub"], size=11, fname=BOLD, color=TEAL, width=(W - 2 * M) * 0.9)
    d.y -= 4 * mm
    d.para(L["intro"], size=10.5, color=SLATE, width=(W - 2 * M) * 0.9, leading=16)
    d.c.setFont(BODY, 9)
    d.c.setFillColor(MUTED)
    d.c.drawString(M, M + 4 * mm, L["cover_note"])

    # references chapter
    section_cover(d, "00", L["ref_title"],
                    "Documentele de vânzare OPSQAI se folosesc împreună." if L is RO
                    else "Die OPSQAI-Vertriebsdokumente werden gemeinsam benutzt.")
    d.new_page(L["ref_title"])
    for name, body in L["refs"]:
        d.space(26 * mm)
        d.c.setFillColor(TEAL)
        d.c.rect(M, d.y - 1.2 * mm, 3 * mm, 3 * mm, stroke=0, fill=1)
        d.c.setFont(BOLD, 11)
        d.c.setFillColor(GRAPHITE)
        d.c.drawString(tx, d.y, name)
        d.y -= 6.5 * mm
        d.para(body, size=10, color=SLATE, x=tx, width=txt_w, leading=14.5)
        d.y -= 5 * mm

    for ch in L["chapters"]:
        section_cover(d, ch["kicker"], ch["title"], ch["blurb"])
        d.new_page(ch["title"])
        for kind, payload in ch["blocks"]:
            if kind == "h2":
                d.h2(payload)
            elif kind == "p":
                d.para(payload, size=10.2, color=SLATE, leading=15)
                d.y -= 3 * mm
            elif kind == "note":
                d.space(24 * mm)
                top = d.y + 5 * mm
                d.c.setFillColor(AMBER)
                d.c.rect(M, d.y - 1 * mm, 2 * mm, 4 * mm, stroke=0, fill=1)
                d.para(payload, size=10, fname=BOLD, color=SLATE, x=tx, width=txt_w, leading=15)
                d.y -= 4 * mm
                _ = top
            elif kind == "num":
                for i, item in enumerate(payload, 1):
                    d.space(18 * mm)
                    d.c.setFont(BOLD, 9.5)
                    d.c.setFillColor(GREEN)
                    d.c.drawString(M, d.y, f"{i:02d}")
                    d.para(item, size=10, color=SLATE, x=M + 9 * mm, width=W - 2 * M - 9 * mm, leading=14.5)
                    d.y -= 3 * mm
                d.y -= 2 * mm
            elif kind == "bullets":
                for item in payload:
                    d.space(16 * mm)
                    d.c.setFillColor(HAIR)
                    d.c.circle(M + 1.6 * mm, d.y + 1.2 * mm, 1.1 * mm, stroke=0, fill=1)
                    d.para(item, size=10, color=SLATE, x=tx, width=txt_w, leading=14.5)
                    d.y -= 2.5 * mm
                d.y -= 2 * mm
            elif kind == "steps":
                for i, (name, body) in enumerate(payload, 1):
                    d.space(28 * mm)
                    d.c.setFont(BOLD, 9.5)
                    d.c.setFillColor(GREEN)
                    d.c.drawString(M, d.y, f"{i:02d}")
                    d.c.setFont(BOLD, 10.5)
                    d.c.setFillColor(GRAPHITE)
                    d.c.drawString(M + 9 * mm, d.y, name)
                    d.y -= 6 * mm
                    d.para(body, size=10, color=SLATE, x=M + 9 * mm, width=W - 2 * M - 9 * mm, leading=14.5)
                    d.y -= 4.5 * mm
            elif kind == "script":
                d.space(20 * mm + 4.5 * mm * len(payload))
                start = d.y + 4 * mm
                for line in payload:
                    if not line.strip():
                        d.y -= 4 * mm
                        continue
                    d.space(14 * mm)
                    d.c.setFont(BODY, 9.8)
                    d.c.setFillColor(SLATE if not line.startswith("[") else MUTED)
                    for ln in d.wrap(line, BODY, 9.8, txt_w - 3 * mm):
                        d.c.drawString(tx + 2 * mm, d.y, ln)
                        d.y -= 14
                d.c.setStrokeColor(TEAL)
                d.c.setLineWidth(1.4)
                d.c.line(M + 1 * mm, min(start, H - M - 12 * mm), M + 1 * mm, d.y + 8)
                d.y -= 6 * mm
            elif kind == "cards":
                lab = ("CE SPUNE CLIENTUL", "CE ÎNSEAMNĂ", "RĂSPUNSUL NOSTRU", "ÎNTREBAREA DE ÎNTORS", "DE EVITAT") \
                    if L is RO else \
                    ("WAS DER KUNDE SAGT", "WAS ES BEDEUTET", "UNSERE ANTWORT", "RÜCKFRAGE", "ZU VERMEIDEN")
                for says, means, answer, ask, avoid in payload:
                    d.space(60 * mm)
                    d.c.setStrokeColor(HAIR)
                    d.c.setLineWidth(0.6)
                    d.c.line(M, d.y + 6 * mm, W - M, d.y + 6 * mm)
                    d.label(lab[0], RED)
                    d.para(says, size=11, fname=BOLD, color=GRAPHITE, x=tx, width=txt_w, leading=15)
                    d.y -= 2 * mm
                    d.label(lab[1], MUTED)
                    d.para(means, size=9.8, color=SLATE, x=tx, width=txt_w, leading=14)
                    d.y -= 2 * mm
                    d.label(lab[2], GREEN)
                    d.para(answer, size=10, color=SLATE, x=tx, width=txt_w, leading=14.5)
                    d.y -= 2 * mm
                    d.label(lab[3], TEAL)
                    d.para(ask, size=9.8, fname=BOLD, color=SLATE, x=tx, width=txt_w, leading=14)
                    d.y -= 2 * mm
                    d.label(lab[4], AMBER)
                    d.para(avoid, size=9.5, color=MUTED, x=tx, width=txt_w, leading=13.5)
                    d.y -= 8 * mm

    d.footer()
    d.c.showPage()
    d.c.save()
    return d.page


if __name__ == "__main__":
    for L in (RO, DE):
        pages = render(L)
        print(f"{L['out']} -> {pages} pages")
