# OPSQAI Transport — Planificator de traseu (Trip Planner)

Da, se poate. Adăugăm în Transport Map un planificator: alegi punctul de plecare, destinația (cu opriri intermediare), ora de plecare și vehiculul — iar aplicația generează un plan simplu de cursă: traseu pe hartă, distanță, durată, pauzele obligatorii, ora estimată de sosire și o listă de lucruri de verificat (drum, vreme, parcare).

Doar Self-Hosted. Nu se schimbă licențierea, drepturile per utilizator, designul sau Management Center.

## Ce va face

**1. Formular de cursă**
Plecare și destinație (cu căutare de adresă ca acum, plus alegere din locațiile salvate: depou, punct de interes), opriri intermediare, ora de plecare, vehiculul din registru (sau doar tipul: tir/camion, van, autoturism), opțional șoferul și remorca.

**2. Traseu potrivit tipului de vehicul**
Pentru tir/camion se cere traseu de marfă, cu gabarit din fișa vehiculului: masă totală, înălțime, lățime, lungime, axe, ADR dacă e bifat — ca să fie evitate restricțiile. Pentru autoturism/van se cere traseu normal. Se pot vedea și compara variante (rapid / fără taxe / fără autostradă) cu distanță, durată și taxe estimate, iar cea aleasă se salvează pe cursă.

**3. Timp de condus și pauze (regula europeană)**
Din durata de condus se calculează automat: pauză de 45 min după 4h30 de condus (sau 15 + 30 min), limita zilnică de 9h (10h de două ori pe săptămână), repausul zilnic de 11h (9h redus). Rezultatul e o listă în ordine: „condus 4h30 → pauză 45 min la ora X, aproximativ în zona Y → condus … → sosire estimată la ora Z”. Se ține cont și de ce a condus deja șoferul în ziua respectivă, dacă e introdus.

**4. Lucruri de verificat înainte de plecare**
Generate din datele reale, nu inventate:
- Documente: ITP/TÜV, asigurare, licență, tahograf, ADR — expirate sau care expiră în timpul cursei; permis/atestat/medicală ale șoferului.
- Vreme pe traseu la orele estimate (vânt, ploaie, ninsoare, îngheț) — avertizare pentru tir la vânt puternic.
- Parcări / locuri de odihnă în apropierea fiecărei pauze planificate și lângă locul repausului zilnic.
- Drum: taxe, treceri de frontieră, restricții de gabarit semnalate pe traseu, incidente anterioare pe aceeași rută din registrul de incidente.
- Cursă: CMR atașat, remorcă cuplată, combustibil estimat pentru distanță.
Fiecare punct are stare: în ordine / de verificat / blocant.

**5. Salvare, export, urmărire**
Cursa se salvează (nume, status: plan / în desfășurare / încheiată), apare pe fișa vehiculului și a șoferului, se exportă ca PDF A4 în limba selectată (plan de cursă + pauze + listă de verificare) și se poate lega de o cerere, un incident sau un CMR. Traseul planificat se poate afișa pe hartă peste poziția GPS actuală a vehiculului.

**6. Fără internet**
Când nu se poate ajunge la un serviciu extern, planificatorul funcționează în varianta simplă: distanță pe linie dreaptă cu factor de drum, viteză medie configurabilă pe tip de vehicul, pauzele calculate local (calculul de pauze e complet local oricum), iar vremea și parcările apar ca „indisponibil offline”. Se afișează clar ce a fost calculat local și ce a venit din exterior.

## Detalii tehnice

- Migrație nouă `migrations/selfhost/0048_transport_trips.sql`: `transport_trips` (plecare/destinație + coordonate, ora plecării, vehicul, șofer, remorcă, tip vehicul, profil traseu, distanță, durată, taxe, status, nume, autor), `transport_trip_stops` (opriri ordonate), `transport_trip_legs` (segmentele + pauzele calculate), `transport_trip_checks` (elementele din lista de verificare cu severitate și sursă), plus cache `transport_route_cache` și `transport_weather_cache`. Indexuri pe vehicul, șofer și dată. Toate cu company_id, ca restul modulului.
- Câmpuri de gabarit adăugate pe `transport_vehicles` dacă lipsesc (masă, înălțime, lățime, lungime, axe, ADR) — additiv, nullable.
- `src/lib/transport/trip-planner.ts` — calcul pur, testabil: segmentare condus/pauze conform 561/2006, ETA, consum estimat; folosit identic online și offline.
- `src/lib/transport/routing.server.ts` — traseu prin conectorul Google Maps (Routes API `routes/directions/v2:computeRoutes`, `vehicleInfo`/`routeModifiers` pentru camion, `computeAlternativeRoutes`), vreme prin `weather/`, parcări prin Places `searchNearby` (`truck_stop`, `parking`, `rest_stop`). Toate apelurile doar server-side, prin gateway, rezultatele puse în cache local; comutare automată pe varianta offline la eroare sau lipsă conector, cu mesajul concret al furnizorului la 403.
- `src/lib/transport.functions.ts` — funcții autentificate: planTrip, saveTrip, listTrips, getTrip, recheckTrip, deleteTrip, exportTripPdf; scriere autorizată prin drepturile Transport existente și înregistrată în audit log.
- UI: `src/components/app/transport/trip-planner-section.tsx` (formular, variante de traseu, cronologie pauze, listă de verificare pe severități) integrat în `map-section.tsx` ca panou lateral, plus listă de curse; traseul desenat în `transport-map.tsx` (polilinie + marcaje pauze/parcări).
- PDF: `src/lib/transport/trip-pdf.server.ts`, în stilul rapoartelor existente.
- Traduceri EN/DE/RO în dicționarul Transport. Setări noi: viteze medii pe tip de vehicul, consum mediu, pauza extinsă 45 vs 15+30, permite/blochează interogări externe.
- Verificare: typecheck, build, teste noi pentru calculul de pauze și ETA, plus guard-ul de migrații Self-Hosted.
