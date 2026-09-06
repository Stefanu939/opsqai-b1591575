# OPSQAI Transport — repairs, real map, GPS fleet, richer overview

Doar Self-Hosted (plus o corecție în Customer Portal la pasul 3). Nu se schimbă licențierea, drepturile per utilizator, designul Graphite/Aurora sau Management Center.

## 1. Procedures și Transport Overview nu se mai deschid

Cauza confirmată: în instalarea locală, datele calendaristice (data auditului, expirări, data notiței) vin din baza de date ca valori de tip dată, nu ca text, iar ecranul încearcă să le afișeze direct — de aici ecranul "Something went wrong" (React #31). În Cloud nu apare pentru că acolo vin ca text.

Reparație: la citirea din baza locală, toate datele/orele se transformă în text ISO înainte de a ajunge în interfață, iar afișarea se face formatat pe limba aleasă. Se acoperă audit (Procedures), notițe, expirări documente, incidente, cereri, CMR — adică toate secțiunile Transport.

## 2. Hartă reală, cu căutare

- Hartă globală vizibilă întotdeauna (nu doar când există puncte), fără câmpuri de configurare pentru utilizator; centrare pe țara din setări.
- Bară de căutare tip Google Maps: caută adrese/orașe/POI, listă de sugestii, zoom pe rezultat, buton "salvează ca locație" (depou / punct de interes).
- Căutarea folosește Google când conectorul e configurat și trece automat pe OpenStreetMap altfel; rezultatele se memorează local ca să funcționeze și offline.
- Panou de căutare separat pentru flotă: caută o mașină după număr, șofer sau dispozitiv GPS și sare la ultima poziție cunoscută, cu vechimea semnalului.
- Straturi: vehicule, șoferi, transportatori, incidente, zone, plus vedere de densitate; urmărire live a unei mașini selectate (traseu ultimele 24h).

## 3. GPS / telematică (registru + adaptor + poziții manuale)

- Registru de dispozitive per vehicul: furnizor (T-Comm, Webfleet, Wialon, Traccar, altul), ID dispozitiv, cheie/token, interval de interogare, activ/inactiv.
- Adaptor generic care interoghează furnizorul la interval și scrie ultima poziție + istoric poziții; erorile se arată pe card ("ultima sincronizare eșuată, motiv X").
- Poziții manuale: coordonate introduse pe fișă, corectare prin click pe hartă și import CSV — rămân valabile ca rezervă când nu există GPS.
- Fără GPS conectat, vehiculul apare în lista "fără coordonate", ca acum.

## 4. Settings mai specific

Se elimină câmpurile "Map tile URL" și "Address lookup URL". Rămân și se adaugă:
- Țară + limbă pachet, unități, fus orar, început de săptămână.
- Ferestre de alertă separate pe tip de document (ITP/TÜV, asigurare, licență, tahograf, permis, ADR) în loc de o singură listă.
- Reguli audit: ziua săptămânii, responsabil implicit, obligatoriu/opțional.
- Hartă: centrare implicită, zoom implicit, unități distanță, activare urmărire live, interval sincronizare GPS, furnizor de căutare (automat / OpenStreetMap / Google).
- CMR: prefix și numerotare, șablon implicit pe țară.
- Drepturi per utilizator: rămân, cu grupare pe secțiuni și opțiune "toate drepturile".

## 5. Meniul de sus

Bara de taburi din capul paginii Transport se elimină complet; navigarea rămâne în meniul lateral.

## 6. Transport Intelligence — buton de audit

Buton "Rulează auditul de transport" care verifică: documente expirate/apropiate, vehicule fără ITP/TÜV valid, șoferi fără permis/atestat valid, incidente deschise fără acțiune, transportatori fără documente, vehicule fără semnal GPS, cereri neaprobate. Rezultatul apare ca raport cu severități, listă de constatări cu link în fișă, scor și export CSV/PDF; ultimele rulări se păstrează în istoric.

## 7. Transport Overview complet

- KPI-uri cu tendință față de perioada anterioară (flotă, șoferi, transportatori, documente care expiră, incidente, cereri, aprobări, ultimul audit).
- Filtre persistente în adresă: perioadă, depou, transportator, severitate — se aplică pe toate cardurile.
- Carduri de acțiune: expirate azi, critice în 30 zile, incidente critice, aprobări în aşteptare, GPS fără semnal.
- Mini-hartă cu link în Map și export CSV pe orice card.

## 8. Pasul 3 din Customer Portal nu devine verde

Cauza confirmată: aplicația instalată nu trimite versiunea, iar codul care citește instalările cere o coloană inexistentă (`n` în loc de `app_version`) — în baza de date `app_version` e gol pentru ambele instalări. Reparație: citirile revin la `app_version`, serviciul Windows trimite versiunea la fiecare semnal (și configurația lui folosește din nou cheile corecte de heartbeat), iar pasul 3 arată versiunea raportată, ultimul semnal și starea licenței. Dacă versiunea încă lipsește, se afișează motivul concret, nu doar "not yet".

## Detalii tehnice

- `src/lib/transport/db.server.ts`: normalizare dată/ora → ISO la ieșire; tipuri în `src/lib/transport/types.ts`.
- Migrație Self-Hosted nouă (`migrations/selfhost/0030_transport_gps.sql`): `transport_gps_devices`, `transport_positions`, extindere `transport_settings` (alert windows pe tip, hartă, audit, fus orar) și eliminarea folosirii câmpurilor tile/lookup din UI.
- `transport-map.tsx`: hartă mereu montată, geocodare cu comutare Google/OSM, strat live, urmărire vehicul.
- `transport.functions.ts`: funcții pentru dispozitive GPS, sincronizare poziții, geocodare, audit transport, KPI-uri cu tendință și filtre.
- `app.products.transport.$workspace.tsx`: se scoate `tabs`.
- Portal/heartbeat: `install-history.functions.ts`, `selfhost-fleet.functions.ts`, `releases.functions.ts`, `licenses.functions.ts`, `mc-alerts.functions.ts`, `mc-ownership.functions.ts` → `app_version`; `opsqai-windows/services/platform` trimite `app_version` și folosește cheile de heartbeat corecte.
- Verificare: typecheck, build, teste, plus guard-ul de migrații Self-Hosted (fără referințe Cloud).
