# Academy: întrebări doar din SOP + română corectă

## Problema (confirmată în cod)

1. Instructorul are voie să pună „comprehension checks" în propriile cuvinte (`src/routes/api/academy-chat.ts`, secțiunea TEACHING STYLE) și să inventeze „situații realiste de la locul de muncă". Nu există nicio verificare că întrebarea sau exemplul chiar există în lecție, deci apar întrebări care nu sunt în SOP.
2. Lecțiile sunt salvate în limba în care au fost generate, iar traducerea în română se face „din zbor" la fiecare mesaj, de model, fără nicio corectură (`temperature: 0.2`, fără pas de verificare). Chestionarul folosește modelul rapid (`role: "chat-fast"`) și nu are nicio validare de limbă în afară de alfabet (`hasWrongAcademyScript` respinge doar chirilica) — de aici româna stricată și diacriticele lipsă.

## Ce propun să construim

### A. Întrebări strict din lecție (implicit)
- Instructorul primește secțiunile lecției numerotate și trebuie să-și lege fiecare întrebare de o secțiune existentă; întrebările devin doar „reformulări ale unei propoziții din lecție", fără scenarii inventate.
- Exemplele noi sunt interzise: poate folosi doar exemplele din lecție (dacă lecția nu are exemple, spune asta și recapitulează).
- Verificare pe server, înainte ca răspunsul să ajungă la cursant: dacă întrebarea sau exemplul conține termeni/cifre care nu apar în textul lecției, mesajul se regenerează o dată cu o corecție strictă, iar dacă tot nu e curat se înlocuiește cu o recapitulare din lecție.
- Aceeași regulă la chestionar: fiecare întrebare, variantă și răspuns corect trebuie să se sprijine pe text din lecție; întrebările nesusținute sunt eliminate, iar dacă rămân prea puține se regenerează.

### A2. Toate întrebările devin Adevărat/Fals (Da/Nu)
- Chestionarul generează exclusiv întrebări cu două variante: „Adevărat" / „Fals" (în limba aleasă). Nu mai apar variante multiple (A/B/C/D) și nici răspunsuri scrise de mână.
- Fiecare afirmație trebuie să fie o propoziție care poate fi confirmată sau infirmată direct din textul lecției; jumătate dintre afirmații sunt false prin modificarea unui detaliu din lecție, ca testul să aibă sens.
- Notarea devine complet automată și fără interpretare de model (nu mai e nevoie de corectarea răspunsurilor libere), deci scorurile sunt stabile și rapide.
- Întrebările de verificare puse de instructor în chat rămân întrebări deschise scurte, dar dacă preferi și acolo doar Da/Nu, spune-mi și le aliniez.


### B. Română corectă (implicit)
- Chestionarul trece de la modelul rapid la modelul principal, cu instrucțiuni de limbă explicite și cerință de diacritice complete (ă â î ș ț).
- Un pas nou de corectură lingvistică: textul generat (chestionar + mesaj instructor) este verificat automat pentru semne clare de română greșită — diacritice lipsă, cuvinte în altă limbă, cratime greșite („sa" vs „să", „ti-" etc.); dacă apar, se cere o rescriere o singură dată.
- Lecțiile pot fi salvate direct în limba aleasă (traducere o singură dată, la generare), ca instructorul să nu mai traducă la fiecare mesaj — sursa principală de greșeli.
- Glosar de termeni: termenii tehnici păstrați în original primesc o traducere fixă stabilită de companie, nu una improvizată la fiecare mesaj.

### C. Opțiuni suplimentare (spune care le vrei)
1. **Buton „Raportează întrebarea"** — cursantul semnalează o întrebare care nu e în SOP; ajunge la administrator ca „lipsă de cunoștințe".
2. **Mod strict „doar citat"** — instructorul afișează sub fiecare explicație pasajul exact din lecție pe care se bazează.
3. **Corectură umană a traducerii** — administratorul vede lecția tradusă și o poate edita înainte de publicare.
4. **Verificare periodică a calității limbii** — raport care marchează lecțiile cu română slabă, ca să fie regenerate.
5. **Blocarea limbilor** — o companie poate limita Academy la EN/DE/RO, ca să nu apară limbi netestate.

## Detalii tehnice

- `src/routes/api/academy-chat.ts`: prompt restructurat (secțiuni numerotate, interdicție de exemple noi), buffering + validare a răspunsului înainte de streaming, o singură reîncercare, fallback la recapitulare.
- `src/lib/academy.functions.ts` (`generateAcademyQuiz`): `role: "chat"` în loc de `chat-fast`, filtrare a întrebărilor nesusținute de textul lecției, reîncercare, apoi fallback localizat existent.
- `src/lib/academy-language.ts`: extindere cu verificare de calitate pe limbă (diacritice obligatorii, stopwords, detectare de limbă greșită în alfabet latin), reutilizabilă de ambele fluxuri.
- Teste noi în `src/lib/academy-language.test.ts` pentru română fără diacritice, text în altă limbă și întrebare nesusținută de lecție.
- Fără schimbări de schemă pentru A + B; opțiunile 1, 3 și 5 ar necesita câmpuri noi.
