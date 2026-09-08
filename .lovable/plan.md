# Repoziționare site OPSQAI: de la caracteristici la durere & ROI

Diagnosticul e corect: site-ul vinde mecanismul (AI local, RAG, offline), nu costul evitat. Planul rescrie mesajul public în logica "Înainte → Cost → După", cu cifre externe citate scurt și cu mapare explicită pe ce face produsul azi (Core, Transport, HR).

## Ce se schimbă pentru vizitator

1. **Hero agresiv, orientat pe durere** (`/`): titlu care numește pierderea, nu tehnologia. Sub-titlu cu cele trei costuri: timpul pierdut la căutarea informației, fluctuația/reintegrarea personalului, riscul de conformitate. Două CTA: pilot 30 de zile și "Calculează pierderea ta".
2. **Secțiune "Înainte vs. După OPSQAI"**: două coloane oglindă (haos: PDF-uri pe share drive, SOP vechi, aceeași întrebare de 20 de ori, audit = vânătoare de documente / după: răspuns cu citare din documentul aprobat, onboarding pe pași, dovezi de audit generate).
3. **Calculator de pierdere (ROI)**: nr. angajați, salariu mediu/oră, ore/zi pierdute la căutare, fluctuație anuală. Rezultatul e calculat 100% din inputul utilizatorului, cu default-uri marcate ca ipoteze și sursă. Fără promisiuni de economii — arată doar cât costă situația actuală.
4. **Secțiune "Cine se recunoaște aici"**: trei scenarii — Manager Logistică/Depozit, Operations Director, HR Manager — fiecare cu durerea zilnică și ecranul OPSQAI care o atacă.
5. **Dovada produsului, nu a tehnologiei**: fiecare capabilitate existentă legată de o consecință de business (răspunsuri cu citare → mai puține greșeli scumpe; Academy + onboarding → productivitate mai rapidă; jurnal de audit + SOP versionate → audit fără vânătoare; date pe hardware propriu → fără transfer de date către LLM public).
6. **Bandă de risc de conformitate**: formulare factuală despre amenzi GDPR și date confidențiale trimise în unelte publice, cu sursă. Fără cifre inventate, fără afirmații despre certificări pe care nu le avem.
7. **Pagini verticale** (`/solutions/*`) și `/pricing` primesc același schelet: durere → cost → înainte/după → pilot.
8. **RO / DE / EN**: tot textul nou intră în dicționarele existente, cu ton adaptat (DACH = cifre, cost, conformitate; RO = eficiență și control).

## Cifrele externe folosite (citate scurt pe site)

Doar surse verificabile, afișate ca notă mică sub secțiune:

- Fluctuația în logistică/transport în Germania ~30%/an, cu cost tipic per plecare de zeci de mii de euro [2](https://safe-mind.de/de/fluktuationskosten-rechner/logistik), [1](https://www.bvl.de/blog/fluktuationskosten-bei-berufskraftfahrern-ein-zu-oft-unterschatzter-kostenfaktor/)
- Deficit de personal: ~120.000 șoferi lipsă în Germania [6](https://www.tagesschau.de/wirtschaft/unternehmen/lkw-fahrer-mangel-deutschland-100.html), plus lipsă în dispecerat și depozit [5](https://www.verkehrsrundschau.de/nachrichten/ausbildung-karriere/fachkraeftemangel-in-der-logistik-lager-it-disposition-3725662)
- Cunoștințe fragmentate ca obstacol principal de productivitate (47%) și informație care nu ajută angajatul (42%) [2](https://www.prnewswire.com/news-releases/coveo-ex-relevance-report-reveals-42-of-information-fails-employees-too-much-data-not-enough-relevance-302439738.html)
- Aplicarea GDPR: amenzi în creștere pe an, conform trackerelor publice [2](https://cms.law/en/fra/publication/gdpr-enforcement-tracker-report-2025/numbers-and-figures), [4](https://blogs.dlapiper.com/advocatus/files/2025/01/dla-piper-fines-and-data-breach-survey-2025.pdf)

Timpul pierdut la căutarea informației: cifra exactă rămâne ca input al utilizatorului în calculator, nu ca afirmație a noastră (studiile serioase pe EMEA sunt cu plată [1](https://my.idc.com/getdoc.jsp?containerId=EUR153875225)). Așa nu lăsăm loc de contestare.

## Verdictul de analist: cât rezolvă produsul, realist

- **Timp pierdut la căutare** — atacat direct și puternic: răspuns cu citare din documentul aprobat, cu refuz când nu există sursă. Aici efectul e imediat.
- **Onboarding lent** — atacat solid: Academy cu lecții/quiz/certificate + fluxuri de onboarding HR pe țară. "3 săptămâni → 3 zile" nu se afirmă pe site fără date proprii; se afirmă mecanismul și se măsoară în pilot.
- **Greșeli în depozit/transport** — atacat parțial-spre-bun: proceduri, audituri săptămânale, semafoare de expirare, documente vehicul/șofer. Reduce omisiuni; nu înlocuiește WMS/TMS — se spune explicit.
- **Fluctuație** — atacat indirect: scade dependența de "omul care știe". Fără date proprii nu promitem reducerea fluctuației.
- **Conformitate** — cel mai puternic argument: instalare pe infrastructura clientului, AI local, jurnal de audit, confirmări SOP. Nu revendicăm certificări proprii.

## Detalii tehnice

- Componente noi în `src/components/oix/`: `pain-hero.tsx`, `before-after.tsx`, `cost-calculator.tsx` (state local, fără backend), `role-scenarios.tsx`, `proof-map.tsx`, `source-note.tsx`.
- Text nou în `src/i18n/pages/home.ts`, `solutions.ts`, `pricing.ts` (EN/DE/RO), plus un `src/i18n/pages/evidence.ts` cu lista de surse și etichete.
- `src/routes/index.tsx`, `solutions.$vertical.tsx`, `pricing.tsx` recompuse din componentele noi, păstrând shell-ul OIX și tokenii Aurora Noir existenți.
- `head()` per rută actualizat: title/description orientate pe problemă, cu cuvintele-cheie ale rolului.
- CTA-urile duc în fluxul existent `/pilot` și `/contact`; fără schimbări de backend, licențiere sau logică de produs.
- Verificare: typecheck, build, plus randare reală a `/`, `/solutions/logistics`, `/pricing` în cele trei limbi.
