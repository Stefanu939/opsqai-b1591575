# Academy, Knowledge Gaps, Chat cu surse, drepturi pe funcții, HR & Transport conectate

Livrez în 5 loturi, în ordinea de mai jos, fără pauze între ele.

## Lot 1 — Bug-uri blocante

1. **Curs nou în Academy nu se salvează / nu ajunge la ceilalți** — repar salvarea completă (curs → capitole → lecții → publicare → atribuire) și vizibilitatea pentru utilizatorii vizați.
2. **Knowledge Gaps dă eroare** — repar lista și traseul prin care chatul înregistrează întrebările fără răspuns.
3. **Chat cu sursa afișată** — fiecare răspuns arată explicit „Sursă: SOP-02 — Departament Logistică”; fără sursă din departamentul utilizatorului, chatul refuză să răspundă.
4. **Documente HR care nu ajung „la verificare” și rămân „deschise”** — repar tranzițiile de stare: trimis la verificare, aprobat, semnat, finalizat. Un document semnat nu mai apare deschis, iar sarcina legată se închide automat.
5. **UI care „se învârte în cerc”** — pe fiecare ecran HR/Transport pun un pas următor clar și un singur buton evident pentru a continua, plus stări vizibile.

## Lot 2 — Drepturi pe funcții, una câte una

6. **Management Center → Licenses** — activez/anulez fiecare funcție Core separat, pe lângă produse, per client; licența emisă respectă exact selecția.
7. **Self-Hosted → drepturi per persoană** — o matrice unde activez/dezactivez pentru fiecare om toate funcțiile Core plus funcțiile OPSQAI Transport și OPSQAI HR. Ce e dezactivat dispare din meniu și din pagini, iar accesul direct e respins pe server.

## Lot 3 — Datele comunică între workspace-uri

8. **Persoană unică** — angajatul din HR, șoferul din Transport și utilizatorul Core devin aceeași persoană, legată o singură dată. Datele se văd în ambele produse dacă persoana are funcțiile respective active.
9. **Transfer între workspace-uri** — pot muta/atribui o persoană din HR în Transport (și invers), păstrând istoricul; ce nu are drept activ nu se vede.
10. **Șoferul adăugat nu apare în listă** — repar lista de șoferi din planificator, folosind aceeași sursă de persoane.

## Lot 4 — Salarizare corectă pe țară

11. **Salariu brut → net automat** — introduc brutul, aleg țara, iar aplicația arată netul cu detalierea fiecărei contribuții și a impozitului reținut.
12. **Parametri per țară, editabili** — pentru fiecare țară pot completa datele necesare (procente, plafoane, deduceri, persoane în întreținere, clasă de impozitare), cu valori inițiale pentru România și Germania și notă că răspunderea finală rămâne la firmă.
13. Fluturașul PDF arată aceeași detaliere: brut, fiecare reținere, adaosuri, net.

## Lot 5 — HR Intelligence, CV-uri și Transport

14. **Analiza CV independentă de limbă** — un criteriu scris în română este găsit și într-un CV german sau englez; dovezile se afișează în limba CV-ului.
15. **Comparație între mai multe CV-uri** — tabel comparativ pe criterii, plus semafor cu procentul de potrivire pe rolul respectiv.
16. **Fișiere per solicitare** — pot atașa documente la fiecare solicitare HR și la fișa angajatului (încărcare document în fișă).
17. **HR Intelligence mai amplu per angajat** — un profil cu tot ce ține de persoană: documente lipsă, instruiri expirate, sarcini întârziate, absențe, incidente, conformitate, evoluție poziție, plus acțiunile recomandate.
18. **WhatsApp cu link de navigare** — mesajul cu datele cursei include un link Google Maps cu traseul complet (plecare, opriri, destinație) pe care șoferul îl pornește direct.
19. **Transport: harta arată traseul, o singură hartă în pagină, salvare rapidă a planului, CMR atașabil la o tură** după descărcare.

## Lot 6 — Actualizări

20. **Check for updates** — bară de progres reală la descărcare (procent și dimensiune) și o a doua bară la instalare, plus confirmarea că fișierul a fost descărcat și verificat.

## Detalii tehnice

- Persoana unică: tabel de identitate comun în Self-Hosted, cu legături către `hr_employees`, șoferii din Transport și utilizatorii Core; migrare aditivă cu backfill pe email/nume, fără ștergeri.
- Drepturile folosesc `user_area_rights` / `area_permission_map`, extinse cu funcțiile Core, Transport și HR; server-ul rămâne autoritatea, UI-ul doar ascunde.
- Funcțiile Core devin claim-uri separate în JWT-ul licenței, verificate la Self-Hosted.
- Salarizarea: motor de calcul cu pachete pe țară (RO, DE) și parametri editabili în setările HR; valorile intră în `hr_payslips` cu detalierea pe linii.
- Potrivirea CV-urilor: normalizare și sinonime multilingve pentru criterii, scor pe criterii cu dovezi citate din CV; nicio decizie automată de angajare sau respingere.
- Linkul de navigare folosește formatul Google Maps `dir` cu waypoints, generat lângă mesajul WhatsApp existent.
- Migrări aditive noi pentru Self-Hosted (identitate comună, parametri de salarizare, atașamente pe solicitări, legătura CMR–tură).
