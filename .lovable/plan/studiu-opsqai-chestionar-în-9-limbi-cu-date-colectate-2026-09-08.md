# Studiu OPSQAI — chestionar în 9 limbi, cu date colectate

## Ce facem, pe scurt

Nu publicăm un studiu de caz existent. Construim un **chestionar public** prin care întrebăm firme cum lucrează astăzi (unde își țin documentele, cât caută o informație, cum pregătesc un audit, cum fac onboarding). Răspunsurile se strâng într-o bază de date, iar peste câteva săptămâni, când sunt suficiente, din ele iese studiul — „Cum gestionează 100 de firme de transport și logistică informația internă”.

De ce funcționează asta mai bine decât un studiu de caz clasic:
- **Ai ce publica fără client.** Datele vin de la respondenți, nu de la un client OPSQAI.
- **Fiecare respondent e un lead calificat.** Ți-a spus deja unde îl doare.
- **Îți dă un motiv de contact ulterior:** „ți-am promis raportul, iată-l” — nu e vânzare, e livrare.
- **Devine conținut care se citează.** Cifrele de piață pe care le folosim acum pe site sunt ale altora; astea vor fi ale voastre.

## Unde trăiește

- Pagină publică `/study` pe opsqai.de — trebuie să fie indexabilă și partajabilă, altfel nu vine nimeni.
- Linkul se distribuie prin postare LinkedIn, prin email direct și în grupuri de branșă.
- Mai târziu, o a doua pagină `/study/results` cu raportul agregat.

## Cum arată parcursul respondentului

1. **Ecran de intrare** — o promisiune și un cost clar: „7 întrebări, 3 minute. Primești raportul complet gratuit, înaintea publicării.” Plus alegerea limbii: EN, DE, RO, FR, IT, ES, NL, PL, HU. Limba browserului e presetată ca sugestie, se ține minte, se poate schimba oricând.
2. **Întrebările** — câte una pe ecran, cu bară de progres. Doar variante de răspuns, aproape zero scris de mână; se poate răspunde de pe telefon.
3. **Ecran de rezultat instant** — după ultima întrebare arătăm imediat ceva de valoare: unde se plasează firma lui față de ceilalți respondenți de până acum („petreci mai mult timp căutând documente decât 70% din firmele care au răspuns”). Asta e recompensa care merită cele 3 minute.
4. **Colectare, opțional** — email pentru raport, apoi butonul de pilot 30 de zile. Se poate sări complet: răspunsurile anonime se salvează oricum, ele sunt datele studiului.

## Întrebările (draft, se ajustează)

Context, ca să putem segmenta raportul:
1. Domeniu: transport / logistică / producție / construcții / altul
2. Număr de angajați: 1–10 / 11–50 / 51–200 / 200+
3. Țară

Miezul, fiecare cu variante măsurabile:
4. Unde trăiesc procedurile și documentele interne? (foldere partajate / email / hârtie / intranet / nu există un loc anume)
5. Cât durează, în medie, să găsești un document intern de care ai nevoie? (sub 2 min / 2–10 min / 10–30 min / peste 30 min / de obicei întreb un coleg)
6. Cât timp ia pregătirea unui audit sau a unui control? (câteva ore / 1–2 zile / peste o săptămână / nu ținem socoteala)
7. Cât durează până un angajat nou lucrează independent? (sub o săptămână / 2–4 săptămâni / 1–3 luni / peste 3 luni)
8. Folosesc angajații AI public (ChatGPT etc.) cu informații din firmă? (da, oficial / da, neoficial / nu / nu știu)
9. Ce te-a costat cel mai mult în ultimele 12 luni: informație pierdută, un audit, un angajat plecat, o eroare repetată?

Ultimele două sunt cele care dau titluri de studiu. Întrebarea 8 în special.

## Colectarea datelor — reguli

- Fără email, răspunsurile se salvează **anonim**. Ele sunt scopul principal.
- Emailul e strict opțional și doar pentru livrarea raportului; se spune explicit ce faceți cu el.
- Nimic invocat, nimic obligatoriu, nicio întrebare capcană.
- Respondenții care lasă email ajung în CRM ca lead cu sursa „study”, cu limba și segmentul lor.
- GDPR: text scurt de consimțământ lângă câmpul de email, link la politica de confidențialitate, ștergere la cerere.

## Detalii tehnice

- Rute noi: `src/routes/study.tsx` (chestionarul, indexabil, cu `head()` propriu) și, în faza a doua, `src/routes/study.results.tsx`.
- Dicționar propriu `src/i18n/pages/study.ts` cu tipul `StudyCopy` și cele 9 locale, plus `useStudyLocale()` cu persistență în `localStorage` — independent de comutatorul EN/DE/RO al site-ului, ca restul paginilor să nu fie atinse.
- Componente noi sub `src/components/oix/study/`: selector de limbă, card de întrebare, bară de progres, ecranul de benchmark instant, blocul de colectare.
- Migrație nouă: tabel `study_responses` (id, locale, sector, size, country, răspunsuri, created_at, user_agent hash) și `study_contacts` (email, consimțământ, legătură opțională către răspuns). GRANT-uri explicite, RLS: inserare permisă publicului prin server function, citire doar pentru platform admin.
- Server functions: `submitStudyResponse` (validare Zod, o singură trimitere per sesiune, rate-limit pe IP), `submitStudyContact`, `getStudyBenchmark` (agregări, fără date individuale, ascunse până la un minim de răspunsuri).
- Panou în Management Center: număr de răspunsuri, distribuții, export CSV, ca să poți urmări când sunt suficiente pentru raport.
- Fișier text pentru postarea LinkedIn în `/mnt/documents/linkedin/`, EN și DE; publicarea doar dacă îmi ceri.

## Verificare

- Typecheck și build.
- Parcurs complet în toate cele 9 limbi, fără chei lipsă.
- Trimitere fără email → răspuns anonim salvat, niciun contact creat.
- Trimitere cu email → lead în CRM cu limba și segmentul corecte.
- Benchmark-ul instant nu expune răspunsuri individuale și rămâne ascuns sub pragul minim.
- Verificare în browser pe telefon și desktop, temă închisă și deschisă.

## Ce am nevoie de la tine

Confirmarea listei de întrebări (mai adaug, tai sau reformulez) și pragul minim de răspunsuri de la care publicăm raportul — propun 50.
