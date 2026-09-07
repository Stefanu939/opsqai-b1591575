# Self-Hosted: separarea instalarilor si oprirea proprietarilor multipli

## Ce se intampla acum (verificat in cod)

1. La reinstalare pe acelasi calculator, bootstrap-ul **pastreaza intentionat** identificatorul instalarii vechi si baza de date veche (`services/bootstrap/init.js`: "preserving existing installId"; dezinstalarea pastreaza `%ProgramData%\OPSQAI` daca utilizatorul nu alege stergerea). Deci o firma noua porneste in interiorul datelor firmei precedente.
2. Contul creat la instalare primeste automat rolul de proprietar (`services/bootstrap/admin-seed.mjs`). La fiecare instalare noua se adauga inca un proprietar, iar cei vechi rman activi — de aici lista cu trei `platform_owner`.
3. Activarea licentei nu compara licenta noua cu firma deja existenta local (`src/lib/selfhost-license-activation.server.ts` verifica doar semnatura, expirarea si identificatorul instalarii). O licenta emisa altei firme poate fi activata peste datele existente fara niciun avertisment.

Ce vrei tu pastrat: datele **aceleiasi** firme trebuie sa supravietuiasca la o licenta noua/reinnoita. Ce trebuie oprit: o firma **diferita** sa mosteneasca datele si conturile.

## Optiuni (poti alege mai multe)

### A. Legarea datelor la firma din licenta (recomandat, baza pentru orice altceva)
La activare, instalarea compara firma/identificatorul din licenta cu firma inregistrata local:
- aceeasi firma -> activare normala, toate datele rman (comportamentul dorit);
- firma diferita -> activare blocata, cu mesaj clar: "Aceasta licenta aparine altei firme. Porneste o instalare curata."
Se retine local firma proprietara (identificator firma + amprenta licentei) la prima activare si nu se mai poate schimba fara pasul de la B.

### B. Pas obligatoriu de instalare: "Continua" sau "Instalare curata"
Cand instalarea gaseste date existente, wizard-ul cere o decizie explicita:
- **Continua instalarea existenta** (aceeasi firma) — pastreaza tot;
- **Instalare curata pentru o firma noua** — arhiveaza sau sterge baza veche, fisierele si conturile, si genereaza un identificator nou de instalare.
Fara aceasta alegere, instalarea nu porneste. Elimina scenariul actual de moștenire silențioasă.

### C. Un singur proprietar activ pe instalare
La instalare, contul de setup devine proprietar doar daca nu exista deja unul. Daca exista, noul cont primeste rol de administrator si se cere confirmarea proprietarului existent pentru promovare. In plus, in ecranul Users apare o avertizare cand exista mai mult de un proprietar, cu actiune de retrogradare (fara a putea rmane zero proprietari).

### D. Curatare la dezinstalare, cu protectie
Dezinstalarea propune implicit stergerea datelor, cu confirmare scrisa (tastarea numelui firmei) si oferta de a salva mai intai o copie de siguranta. Astazi pastrarea e implicita, ceea ce produce exact problema raportata.

### E. Blocare de siguranta la pornire (plasa de siguranta)
La fiecare pornire, aplicatia verifica potrivirea intre licenta activa si firma inregistrata local. La nepotrivire, intra in mod restrans: nimeni nu vede date, doar ecranul de licenta si de recuperare. Protejeaza si cazul in care cineva copiaza folderul de date pe alt calculator.

### F. Raport de igiena a instalarii
Un ecran administrativ care arata: firma proprietara, identificatorul instalarii, licenta activa, numarul de proprietari, cine a fost adaugat si cand — plus alerta cand ceva nu se potriveste. Ajuta la audit si la suport.

## Recomandarea mea
A + B + C + E ca pachet minim de securitate, D si F imediat dupa. A si C se pot livra primele, fara modificari de installer.

## Detalii tehnice (pentru referinta)
- Firma proprietara + amprenta licentei se salveaza in `platform_config` si in configuratia de pe disc; comparatia se face in `activateSelfHostLicense` si intr-o verificare la pornire.
- `admin-seed.mjs` primeste o verificare "exista deja proprietar?" inainte de a insera `platform_owner`.
- `init.js` primeste modul explicit `--fresh` / `--continue`, expus in wizard; modul curat roteste `installId` si reseteaza volumul de date.
- NSIS: inversarea implicitului la dezinstalare + confirmare scrisa.
- Se adauga o migrare care marcheaza firma proprietara pe instalarile existente, ca sa nu blocheze clientii actuali.
