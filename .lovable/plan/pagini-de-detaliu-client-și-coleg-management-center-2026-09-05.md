# Pagini de detaliu: Client și Coleg (Management Center)

## Ce există deja (verificat)

- Pagina de detaliu client există la `/management/companies/$id` cu taburi: Overview, Products, Installations, Licenses, Download, Activity — dar îi lipsesc contractul, tichetele de suport, accesul partajat și acțiunile rapide.
- Cardurile de colegi (`OwnerCards`) din Customers doar filtrează tabelul — nu duc nicăieri.
- Tabelul de clienți nu are link pe numele clientului.

## Variante alese

- **Client:** Taburi complete
- **Coleg:** Panou complet de lucru
- **Navigare:** Click pe nume + carduri, cu buton Înapoi / breadcrumb

## 1. Pagina de detaliu client — extindere `/management/companies/$id`

Se păstrează pagina și taburile existente și se completează:

- **Header nou:** nume client, țară, profil, proprietar (colleg responsabil), KPI-uri compacte: licențe active, instalații online, tichete deschise, zile până la expirarea mentenanței. Breadcrumb: Customers → Nume client.
- **Tab „Contract" (nou):** date contract vizualizare + editare (folosind `upsertCustomerContract` existent), stare cont, contact principal.
- **Tab „Suport" (nou):** tichetele clientului (deschise/în așteptare/rezolvate) cu badge de vechime >24h, click → pagina Support filtrată pe conversație.
- **Tab „Acces partajat" (nou, vizibil doar SuperAdmin/proprietar):** panoul `SharedAccessPanel` existent — colegii care pot vedea clientul pentru acoperire concediu.
- **Tab „Licențe" îmbunătățit:** acțiuni directe pe pagină — Emite licență, Reemite (cu indicator „reemisie necesară" după schimbare de produse), revocare — refolosind dialogurile existente din Licenses.
- **Tab „Manage":** buton „Gestionează cont" care deschide dialogul Manage Customer existent (email, parolă, stare).
- **Navigare:** numele clientului din tabelul Customers devine link către această pagină.
- Toate datele rămân filtrate pe server după proprietar/colaboratori (scope-ul existent `mc_can_see_company`) — un coleg fără acces vede „Company not found".

## 2. Pagina de detaliu coleg — NOUĂ `/management/team/$userId`

Vizibilă doar SuperAdminilor (restul primesc „Forbidden"). Structură „panou complet de lucru":

- **Header:** nume, email, rol, status invitație, buton Înapoi la Team. KPI-uri: nr. clienți, tichete deschise ale clienților lui, instalații silențioase, licențe care expiră în 30 zile.
- **Secțiune „Clienți":** carduri/tabel cu clienții deținuți + clienții partajați (cu badge „partajat"), click pe client → pagina de detaliu client. Reasignare client către alt coleg direct din pagină (dropdown + confirmare).
- **Secțiune „Sănătate flotă":** instalații silențioase și versiuni învechite pentru clienții lui.
- **Secțiune „Concedii":** cererile de concediu ale colegului (din time-off existent), cu status.
- **Date server-side noi:** o funcție `getColleagueOverview(userId)` care agregă clienți, tichete, instalații, licențe, concedii — toate prin admin, verificând că apelantul e SuperAdmin.
- **Navigare:** cardul colegului din Customers (`OwnerCards`) primește o acțiune „Vezi panoul" → pagina coleg; rândul colegului din pagina Team primește link pe nume.

## 3. Ce NU se schimbă

- Culorile/designul Graphite, licențierea, RBAC-ul, separarea Self-Hosted/Cloud, comportamentul existent al cardurilor (filtrarea rămâne — pagina coleg e în plus, nu înlocuiește filtrul).

## Detalii tehnice

- Rută nouă: `src/routes/_authenticated/management.team.$userId.tsx` (createFileRoute `/_authenticated/management/team/$userId`).
- Funcții server noi în `src/lib/mc-ownership.functions.ts`: `getColleagueOverview` (SuperAdmin-only).
- Extindere `src/routes/_authenticated/management.companies.$id.tsx` cu taburile Contract/Suport/Acces partajat și acțiuni licențe; refolosire componente existente (`SharedAccessPanel`, dialog Manage Customer, `upsertCustomerContract`, funcții suport existente).
- `src/routes/_authenticated/management.customers.tsx`: nume client → `Link` către `/management/companies/$id`.
- `src/components/mc/owner-cards.tsx`: buton suplimentar pe cardul colegului pentru deschiderea panoului (păstrând click = filtru).
- Verificare: `bunx tsgo --noEmit`, `bun run build`, test de acces (coleg fără drept nu vede clientul/panoul colegului).  
  
Super admini / Admini , pot aproba unu altuia concediile , pot vedea clientii si muta clientii de la un coleg la altul. 