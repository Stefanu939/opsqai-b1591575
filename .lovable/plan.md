# Română peste tot + funcționare fără server dedicat și fără VPN

## 1. Totul în română (instalare + aplicație)

**Programul de instalare Windows**
- Selector de limbă pe primul ecran: Română (implicit) / Deutsch / English.
- Traduse toate cele 9 ecrane: licență, alegerea rolului calculatorului, verificarea sistemului, baza de date, administrator, rezumat, instalare, final. La fel mesajele de eroare și ferestrele de confirmare.
- Ecranele de pornire și de eroare ale aplicației de pe Windows urmează limba aleasă la instalare.

**Aplicația (toate paginile din /app)**
- Meniul, titlurile, butoanele, tabelele, mesajele goale și erorile trec prin același sistem de traducere RO/DE/EN deja folosit pe site.
- Limba aplicației pe Self-Hosted este implicit cea aleasă la instalare. Fiecare utilizator o poate schimba din profil.
- Lucrul se face pe module, în această ordine: meniu + Core (Asistent AI, Documente, FAQ, Utilizatori, Setări), Academy, HR, Transport, apoi restul paginilor de administrare.
- Conținutul introdus de firmă (documente, cursuri) nu se traduce automat.

## 2. Firma nu are server: orice PC poate fi „serverul”

- Textul din instalare se schimbă din „Server al firmei” în **„Primul calculator (principal)”**. Explicația: orice PC Windows obișnuit care rămâne pornit în timpul programului.
- Verificarea sistemului avertizează doar dacă PC-ul e prea slab pentru AI-ul local și propune modelul mic de AI.
- La instalarea pe primul PC se deschide automat accesul în firewall-ul Windows pentru celelalte calculatoare, doar din rețeaua locală. Opțiunea se poate debifa.
- Aplicația de pe PC-ul principal oprește intrarea în somn a calculatorului cât timp rulează și afișează un mesaj dacă e închisă în timp ce alți colegi sunt conectați.

## 3. Două calculatoare, fără VPN, în aceeași clădire sau în locuri diferite

**Aceeași rețea: găsire automată**
- PC-ul principal se anunță singur în rețeaua locală.
- La PC 2, butonul „Caută serverul firmei” arată lista găsită (de exemplu „OPSQAI – Firma X”). Se alege cu un clic, fără adrese de scris. Câmpul manual rămâne ca rezervă.

**Locuri diferite: legătură securizată inclusă**
- Pe PC-ul principal, butonul „Adaugă calculator din altă locație” generează un **cod de asociere** valabil 15 minute, plus un QR.
- Pe PC 2 se alege „Altă locație”, apoi se introduce codul. Între cele două calculatoare se creează automat o legătură criptată directă, de tip WireGuard, inclusă în instalare.
- Datele merg direct între calculatoarele firmei, nu prin serverele OPSQAI. Management Center nu vede conținut.
- Dacă rețelele nu permit conexiunea directă (de exemplu firewall strict la furnizorul de internet), instalarea spune clar ce se poate face: portul de deschis în router sau varianta VPN.

**În ambele cazuri** rămân regulile actuale: licența e activată o singură dată, pe PC-ul principal, iar conturile le creează doar administratorul principal.

## Ordinea livrării
1. Instalare în română + găsire automată în rețea + firewall automat (cazul cel mai des întâlnit).
2. Traducerea aplicației, modul cu modul.
3. Legătura securizată pentru locații diferite (cod de asociere).

## Detalii tehnice
- Instalare: dicționar `i18n.js` RO/DE/EN în renderer-ul wizard-ului și în desktop-shell (splash/error). Limba e salvată în `config.json` și transmisă bootstrap-ului ca limbă implicită a platformei.
- Aplicație: chei în `src/i18n/pages/*` pentru fiecare modul. `ModulePage`/`Panel`/sidebar traduc etichetele prin `useT`. Limba implicită Self-Hosted vine din `platform_config`.
- Găsire în rețea: anunț mDNS/UDP (`_opsqai._tcp`) de la serviciul Platform. Wizard-ul ascultă, apoi confirmă serverul ales prin `/api/public/station-probe`.
- Firewall: `netsh advfirewall` cu regulă pentru 443, profil Private/Domain, scope LocalSubnet. Regula se șterge la dezinstalare.
- Locații diferite: un serviciu nou, `OpsqaiLink`, cu wireguard-go / embeddable-dll-service. Schimbul de chei se face prin codul de asociere (cheie publică + endpoint), cu încercare UDP hole-punching. `station.json` primește adresa din tunel. Fără releu OPSQAI pentru date, conform AD-009.
- Comanda de autorizare TLS (`tls-ask`) acceptă și adresa internă a tunelului.
