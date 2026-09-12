# Documente HR juridice complete pentru Germania și România

## Obiectiv
Transformăm documentele HR generate în pachete juridice reale, specifice țării, cu date complete despre companie și angajat, aspect profesional, revizie juridică obligatorie și lungime determinată de natura documentului — nu prin umplere artificială.

## 1. Contracte de muncă extinse și specifice țării
- Rescriem separat contractele pe durată nedeterminată și determinată pentru Germania și România.
- Contractele de muncă vor avea, în mod normal, minimum 8–10 pagini A4 prin conținut juridic relevant: părți, funcție și atribuții, locul muncii, timpul de lucru, salariu și componente, concediu, probă, absențe, confidențialitate, protecția datelor, proprietate intelectuală, echipamente, politici interne, modificare, încetare, preaviz, predare și semnături.
- Germania: diferențiem perioada de probă și primele 6 luni de protecția generală la concediere, apoi regulile aplicabile după 6 luni; includem termenele legale și cerința formei scrise.
- România: folosim limitele legale reale pentru perioada de probă în funcție de tipul postului și regulile proprii de încetare/preaviz; nu aplicăm artificial regula germană de 6 luni.
- Contractul va include salariul brut, moneda și periodicitatea, concediul anual, programul, adresele complete și datele de identificare disponibile.

## 2. Date complete și confirmare înainte de generare
- Preluăm automat salariul valabil la data începerii din istoricul salarial al angajatului.
- Adăugăm un pas de verificare înainte de generare pentru salariu, monedă, concediu, probă, program, tip de post, date contractuale și adrese.
- Generarea este blocată dacă lipsesc câmpuri obligatorii; nu mai lăsăm valori juridice importante ca spații libere într-un document gata de aprobare.
- Păstrăm proiectul editabil înainte de trimiterea la revizie.

## 3. Identitatea companiei și PDF profesional
- Adăugăm în setările HR încărcarea logo-ului companiei, cu previzualizare și înlocuire.
- PDF-ul va afișa logo-ul, denumirea legală, adresa firmei, adresa angajatului, referința contractului, țara și data.
- Refacem exportul A4 cu font Unicode complet pentru diacritice românești și germane, antet repetat, subsol, numerotare, referință document, marcaj de proiect și zone corecte de semnătură.
- Contractele lungi vor avea structură și paginare coerente; celelalte documente vor avea numai numărul de pagini justificat de scopul și forma lor legală.

## 4. Revizie juridică obligatorie și controlul versiunilor
- Introducem stări clare: Proiect → Verificare HR → Revizie juridică → Aprobat juridic → Aprobat intern → Semnat.
- Numai utilizatorii cu dreptul dedicat de revizie juridică pot confirma conformitatea; SuperAdmin păstrează controlul administrativ, dar aprobarea juridică rămâne trasabilă.
- Salvăm pentru fiecare șablon țara, versiunea juridică, data verificării, sursele oficiale, juristul/revizorul, observațiile și următoarea dată de reverificare.
- O modificare a textului după aprobarea juridică invalidează aprobarea și creează o versiune nouă.
- Documentele nu vor afirma „garantat legal”; vor arăta statutul și data ultimei revizii juridice.

## 5. Verificarea întregii biblioteci HR
Audităm separat, pentru Germania și România:
- contract de muncă nedeterminat și determinat;
- act adițional;
- fișa postului;
- adeverința de salariat;
- notificarea și acordul de încetare;
- avertismentul scris;
- recomandarea/adeverința de activitate;
- confidențialitatea;
- predarea echipamentelor;
- promovarea.

Pentru fiecare document stabilim clauzele obligatorii, anexele, câmpurile necesare și lungimea firească. Scrisorile și adeverințele pot rămâne la 1–2 pagini; documentele care necesită anexe sau informări suplimentare pot depăși 10 pagini.

## 6. Protecții și verificări
- Validăm valorile minime/maxime dependente de țară, precum concediul, proba și preavizul, fără a înlocui decizia juridică umană.
- Afișăm sursele oficiale și data ultimei actualizări în panoul de administrare, nu ca text inutil în contract.
- Adăugăm teste pentru alegerea țării, completarea salariului, câmpurile obligatorii, invalidarea aprobării, versiunile juridice, diacritice, logo și numărul de pagini.
- Generăm exemple DE și RO pentru fiecare tip, verificăm toate paginile vizual și corectăm tăieri, suprapuneri, pagini goale și semnături despărțite incorect.

## Detalii tehnice
- Extindem setările companiei și datele documentelor cu logo, metadate juridice și versiuni, prin migrare compatibilă cu instalările Self-Hosted existente.
- Înlocuim randarea PDF limitată la caractere occidentale cu fonturi Unicode integrate și suport PNG/JPEG pentru logo.
- Păstrăm documentele existente accesibile; noile reguli se aplică documentelor nou generate și versiunilor regenerate.
- Pachetul generic rămâne marcat explicit ca model nevalidat local și nu poate primi statut de „aprobat juridic” pentru Germania sau România.

## Surse juridice de bază
- Germania: BMAS, Gesetze im Internet — NachwG, BGB §622/§623, BUrlG și actele aplicabile.
- România: Ministerul Muncii, Inspecția Muncii/REGES-ONLINE, Codul muncii și modelul-cadru oficial în vigoare.
- Conținutul final intră în producție numai după revizia juristului desemnat pentru fiecare țară.
