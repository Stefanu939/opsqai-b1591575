# Management Center — configurare reală a funcțiilor Core

## Rezultat

Pagina **Licenses** va configura fiecare companie în trei zone distincte:

1. **Core functions** — AI Chat, Knowledge Base, FAQ, Academy, AI Audit, Knowledge Gaps, SOP Versioning, Internal Requests, Internal Chat, Reports, Support Center, Workspace Health, RBAC, Compliance Center, PDF Export, Multi-Language, Notifications și PWA.
2. **OPSQAI Products** — Transport, HR, Logistics, Operations, Finance și Inventory.
3. **Funcții incluse automat** — Analytics, Executive Dashboard, Brand Center, AI SOP Generator și AI Workspace Audit nu vor avea activare separată. Fiecare va fi legată de funcția Core părinte și va deveni disponibilă automat împreună cu aceasta.

Toate funcțiile Core vor fi active implicit pentru o licență nouă, dar fiecare va putea fi dezactivată individual. Products rămân selecții separate. Funcțiile incluse nu se vând, nu se activează și nu se dezactivează separat.

## UI Management Center

- Înlocuiesc lista lungă actuală cu un configurator în două coloane: lista firmelor în stânga și panoul firmei selectate în dreapta.
- Panoul va avea rezumatul companiei și al instalării, apoi secțiuni clare pe categorii: **AI**, **Knowledge**, **Governance**, **Operations**, **Experience** și **Products**.
- Fiecare funcție va avea nume clar, descriere scurtă, stare vizibilă și switch individual.
- Adaug acțiuni **Enable all Core** și **Reset Core to all active**.
- Modificările nesemnate vor fi marcate clar ca „Pending license reissue”; butonul principal va fi **Save & reissue JWT license**.
- Înainte de emitere se afișează un rezumat cu funcțiile Core activate/dezactivate și Products; rezumatul menționează automat funcțiile incluse care rezultă, fără switch-uri proprii. Formatul livrat rămâne exclusiv JWT semnat.
- Elimin dialogul „Activate module” și orice control separat pentru Add-ons.
- Păstrez designul Graphite Precision și densitatea de lucru potrivită Management Center-ului, cu utilizare bună pe desktop și mobil.

## Configurare și licență

- Adaug o configurare per companie pentru funcțiile Core, cu toate funcțiile active implicit.
- Migrez companiile existente la toate funcțiile Core active, astfel încât nicio instalare existentă să nu piardă acces la actualizare.
- Licența de instalare JWT va include explicit lista `core_capabilities`, alături de profil și Products. Funcțiile incluse vor fi derivate determinist din Core, fără claim sau licență separată care le poate contrazice.
- Reemiterea licenței va lua configurația salvată a companiei, nu valori construite doar în interfață.
- Pentru licențele vechi fără noul câmp, Self-Hosted va interpreta toate funcțiile Core ca active; compatibilitatea rămâne intactă.

## Aplicare reală în Self-Hosted

- Self-Hosted va citi lista Core verificată din JWT, fără să mai reactiveze automat funcțiile dezactivate.
- O funcție Core dezactivată va dispărea din navigație și din căutarea globală.
- Accesul direct la pagină și operațiile de server vor fi respinse, nu doar ascunse vizual.
- Drepturile per persoană rămân un al doilea nivel: utilizatorul trebuie să aibă atât funcția permisă companiei prin licență, cât și dreptul personal necesar. Un drept personal nu poate reactiva o funcție oprită în licența companiei.
- SuperAdmin rămâne nelimitat în interiorul funcțiilor permise companiei, dar nu poate ocoli licența companiei.

## Detalii tehnice

- Schimbarea bazei Cloud va fi aditivă, cu tabel dedicat configurării Core per companie, granturi explicite, RLS și acces limitat la echipa Management Center.
- Catalogul canonic `CORE_CAPABILITIES` rămâne sursa unică pentru etichete, categorii și validare.
- Emiterea, reemiterea, bundle-ul offline, importul și activarea locală vor păstra aceeași selecție Core.
- Elimin clasificarea comercială Add-on din configurarea activă. Cheile vechi rămân doar pentru citirea licențelor existente și sunt mapate automat la funcția Core părinte.

## Verificare

- Licență nouă: toate funcțiile Core sunt active implicit.
- Dezactivez AI Chat și Academy, reemit JWT-ul, îl import în Self-Hosted și verific dispariția din meniu, căutare și blocarea accesului direct/server.
- Reactivez funcțiile și verific restaurarea accesului fără pierdere de date.
- Verific o licență veche fără `core_capabilities`: toate funcțiile Core rămân active.
- Verific separat Products și funcțiile incluse automat: acestea apar numai când funcția Core părinte este disponibilă și nu au niciun control separat.
- Verific desktop și mobil, plus build, teste de licențiere și controale de autorizare.
