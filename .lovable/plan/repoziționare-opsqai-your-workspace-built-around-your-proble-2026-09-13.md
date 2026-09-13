# Repoziționare OPSQAI: „Your Workspace. Built around your problems." + OPSQAI Discovery

Noua poziționare: nu vindem un produs software, vindem rezolvarea problemei clientului.
Mesajul central devine: „Nu pornim de la software. Pornim de la problema ta."
Produsele (Core, Transport, HR etc.) rămân, dar devin livrabilele unui proces de
Discovery, nu vitrina principală.

## 1. Homepage rescris (`/`)

- Hero nou: „Your Workspace. Built around your problems." + cele 4 fraze ale modelului
  (You tell us the problem → We analyze the root cause → We design the solution →
  We build it into your OPSQAI Workspace), cu traduceri DE/RO.
- Secțiune „Cum funcționează": cei 4 pași vizuali Problem → Diagnosis → Solution
  Design → Workspace.
- Secțiune „Tu nu trebuie să știi ce software îți trebuie" — vizitatorul descrie doar
  durerea („asta mă doare"), OPSQAI propune soluția.
- Secțiune anti-comparație: nu „suntem mai buni decât X", ci „nu concurăm pe liste
  de funcții — pornim de la problema ta". Fără nume de competitori, fără denigrare.
- Calculatorul de pierdere și dovada produsului existente rămân, dar sub noul cadru
  (costul problemei nerezolvate).
- CTA principal: „Începe cu Discovery" → `/discovery`; secundar: pilot 30 zile.

## 2. Pagină nouă `/discovery`

Prezintă etapa OPSQAI Discovery ca ofertă de intrare, cu cele 4 livrabile confirmate:

1. **Raport de diagnostic scris** — problema, cauza rădăcină, soluția propusă;
   livrabil pe care clientul îl poate refuza.
2. **Configurația de workspace propusă** — exact modulele OPSQAI care rezolvă
   problema lui, nimic în plus.
3. **Estimare de valoare/ROI** — construită pe modelul Value Engine existent din
   Management Center, formulată ca estimare, nu promisiune.
4. **Trecere directă în pilot** — Discovery curge în pilotul de 30 de zile, cu
   workspace preconfigurat pe problema identificată.

Include formular de cerere Discovery (reutilizăm fluxul `/contact`/`/pilot` existent)
și secțiune „ce nu este Discovery" (nu e audit plătit lung, nu e consultanță generică).

## 3. Aliniere pagini existente

- `/pilot` și `/contact`: mențiune că pilotul pornește din Discovery; texte minime
  adăugate, fără rescriere.
- `/pricing`: o notă că prețul final se stabilește după Discovery, pe configurația
  reală a workspace-ului.
- `head()` actualizat pe `/` și `/discovery` (title/description/og) pe noua
  poziționare, EN/DE/RO.
- `public/llms.txt` actualizat cu poziționarea problem-first.

## 4. Postări LinkedIn (EN, 3 variante pain-first)

- Post A: „You don't need to know what software you need. You need to know what
  hurts." — introduce modelul Discovery.
- Post B: „We don't start with software. We start with your problem." — procesul în
  4 pași + link opsqai.de/discovery.
- Post C: anti-comparație — „The question isn't SAP vs Microsoft vs ServiceNow.
  It's: what's the problem?" 
- Fiecare cu hook peste fold, link spre site, fără promisiuni neverificabile.
- Publicarea se face doar după aprobarea textului final în chat (flux existent).

## 5. PDF de vânzare actualizat

- Copertă și introducere rescrise pe cadrul Discovery (Problemă → Diagnostic →
  Soluție → Workspace); conținutul problemă→soluție per funcție rămâne ca dovadă.
- Regenerat `OPSQAI_Probleme_Soluții_RO.pdf` cu același script existent, QA vizual
  la fel (rasterizare, diacritice, tăieturi).

## 6. Ce nu se schimbă

- Nicio funcționalitate de produs, licențiere sau backend.
- Produsele/modulele rămân pe site ca dovadă (`/modules`, `/product-overview`) —
  nu le scoatem, le repoziționăm ca livrabile.
- Tonul vizual Aurora Noir existent rămâne.

## Detalii tehnice

- Componente noi în `src/components/oix/`: `problem-hero.tsx`, `discovery-steps.tsx`,
  `pain-to-solution.tsx` (refolosind `SectionShell`, `SourceNote`).
- Texte în `src/i18n/pages/` (home, nou `discovery.ts`, mici adăugiri în pilot/pricing),
  EN/DE/RO.
- Ruta nouă `src/routes/discovery.tsx` cu `head()` propriu.
- Verificare: typecheck, build, randare reală `/` și `/discovery` în cele 3 limbi.
