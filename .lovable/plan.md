# OPSQAI Value Engine — calculator de valoare operațională în Management Center

Da, aduce valoare: transformă discuția „ce face AI-ul” în „cât pierdeți azi și cât recuperați”, iar rezultatul devine un document pe care Operations Director / CFO îl poate duce mai departe. Se leagă direct de CRM: fiecare calcul aparține unui lead și ajunge în oferta trimisă.

Este exclusiv Cloud / Management Center (echipa OPSQAI). Nu apare în Self-Hosted și nu se schimbă nimic din calculatorul public de pe site.

## Unde stă

Element nou de meniu în secțiunea comercială: **Value Engine**, lângă CRM.
- `/management/value` — listă calcule salvate (client, valoare potențială, ROI, dată, cine a făcut-o) + buton „Calcul nou”.
- `/management/value/$id` — calculatorul propriu-zis, pe trei niveluri.
- Butonul „Value Calculator” apare și în pagina unui lead din CRM, precompletat cu numele firmei.

## Nivelul 1 — Estimare rapidă

Câmpuri: angajați afectați, cost mediu/oră, minute pierdute/zi, zile lucrătoare/an, îmbunătățire estimată %, cost anual OPSQAI.

Rezultate afișate mare: Pierdere anuală actuală · Valoare potențială · Valoare așteptată · ROI · Multiplu de valoare · Payback (luni).

## Nivelul 2 — Valoare operațională pe surse

Tabel cu până la nouă surse de valoare, fiecare cu cost actual și procent de reducere estimat:
căutare de informație, training/retraining, erori, downtime, escaladări, onboarding, abateri de proces, pierdere de know-how la plecări, intervenție managerială.

Fiecare rând arată cost actual → impact OPSQAI → valoare. Jos: total și clasamentul celor mai mari surse de valoare.

## Nivelul 3 — Value Score

Aplică ecuația: (rezultat dorit × probabilitate) / (întârziere × efort).
- Rezultat dorit = valoarea potențială din nivelul 2.
- Probabilitate de atingere (%) — setată de coleg, cu valoare implicită prudentă.
- Timp până la valoare (luni) și efort de implementare (mic / mediu / mare).

Ieșire: Valoare potențială, Valoare așteptată economic, Investiție, Valoare netă, ROI, Multiplu, Îmbunătățire operațională %, plus un Value Score calitativ (Scăzut / Mediu / Ridicat / Foarte ridicat) explicat în text, nu ca promisiune.

## „What if?”

Slider pentru impactul estimat (0–70%) și pentru probabilitate; toate cifrele se recalculează instantaneu, fără salvare. Trei repere afișate simultan (pesimist / de bază / optimist) ca să nu se vândă o singură cifră.

## Raport PDF

Buton „Descarcă raportul de valoare”: PDF A4 cu profilul operațional introdus, tabelul surselor de valoare, indicatorii finali, cele trei scenarii și o propunere de valoare generată din cifrele clientului. Limbi: EN / DE / RO, la alegere la export. Toate formulările sunt „potențial / estimat pe baza datelor furnizate” — fără garanții. Se poate atașa la lead-ul din CRM.

## Reguli

- Nicio cifră nu e inventată: totul derivă din ce introduce colegul; ipotezele apar scrise în raport.
- Acces: orice coleg din Management Center poate crea și vedea propriile calcule și cele ale clienților lui; SuperAdmin vede tot (aceeași regulă ca la CRM).
- Fără impact pe licențiere, Self-Hosted, RBAC-ul existent sau design.

## Detalii tehnice

- Migrație: tabel `crm_value_models` (lead_id nullable, company_name, level, inputs jsonb, drivers jsonb, assumptions, currency, computed snapshot jsonb, owner_user_id, timestamps) + GRANT-uri + RLS pe modelul de scope din CRM (owner sau platform staff), plus `value_report` opțional în audit.
- Calcul pur în `src/lib/value-engine.ts` (fără I/O), refolosit identic în UI și în PDF; teste unitare pentru pierdere anuală, ROI, multiplu, payback, agregarea surselor și Value Score.
- Server functions în `src/lib/value-engine.functions.ts` (`listValueModels`, `getValueModel`, `saveValueModel`, `deleteValueModel`, `exportValueReportPdf`) cu `requireSupabaseAuth` și verificare de scope; PDF prin `generatePdf` din `src/lib/generators/pdf.server.ts`.
- Rute noi `src/routes/_authenticated/management.value.index.tsx` și `management.value.$id.tsx`; componente în `src/components/mc/value/`; intrare nouă în `src/components/mc/mc-shell.tsx` și buton în pagina lead-ului.
- Verificare: `bunx tsgo --noEmit`, teste, build, plus `/management/value` HTTP 200.
