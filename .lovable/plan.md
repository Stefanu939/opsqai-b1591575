# Studiu de caz OPSQAI — pagină ascunsă, 9 limbi, formular opțional

## Ce construim și de ce

Un studiu de caz este singura formă de marketing pe care un cumpărător B2B o citește până la capăt, pentru că nu vinde funcții — arată o firmă reală care avea o problemă, ce a făcut, ce s-a schimbat. Al tău este intern: OPSQAI folosind OPSQAI. Avantaj mare — cifrele sunt ale voastre, nu ai nevoie de acordul niciunui client.

Împărțirea muncii:
- **LinkedIn** = cârligul. O postare scurtă care spune problema și un singur rezultat, plus link.
- **Pagina ascunsă** (`/case-study`) = studiul complet, în 9 limbi, cu formular opțional la final.
- **PDF** = varianta pe care o trimiți prin email sau o dai la telefon.

Pagina nu apare în meniu, nu apare în sitemap și primește `noindex`. Ajunge acolo doar cine are linkul.

## Structura studiului de caz

Ordinea aceasta este standardul care convertește:

1. **Cine suntem și ce facem** — 3 rânduri de context (firmă, mărime, domeniu).
2. **Situația de dinainte** — cum lucrați concret: documente în foldere, întrebări pe WhatsApp, auditul pregătit manual. Fapte, nu adjective.
3. **Costul acelei situații** — cifrele voastre măsurate: minute pierdute la căutarea unui document, ore pe pregătirea unui audit, zile de onboarding.
4. **De ce nu au funcționat alternativele** — de ce nu SharePoint, nu ChatGPT public, nu un WMS.
5. **Ce am implementat** — ce module, în ce ordine, în cât timp.
6. **Rezultatul** — aceleași metrici ca la punctul 3, măsurate după. Tabel înainte/după.
7. **Ce nu s-a rezolvat** — obligatoriu. Un studiu de caz fără limite citește ca reclamă.
8. **Cum reproduci asta** — pașii, pilotul de 30 de zile.

Fiecare cifră poartă lângă ea cum a fost măsurată (perioadă, metodă). Nu se publică nicio cifră pe care nu mi-o dai măsurată — locurile respective rămân marcate până le completezi.

## Alegerea limbii

La prima intrare pe pagină apare un ecran scurt cu 9 opțiuni: EN, DE, RO, FR, IT, ES, NL, PL, HU. Alegerea se ține minte în browser și se poate schimba oricând din capul paginii. Detectăm și limba browserului ca sugestie, dar nu forțăm nimic.

Textul studiului trăiește într-un dicționar propriu al paginii, separat de restul site-ului (site-ul rămâne pe EN/DE/RO). Așa cele 9 limbi nu ating nicio altă pagină.

## Formularul de la final — opțional, în trei trepte

Tot studiul se citește integral fără să dai nimic. La final, trei acțiuni, în ordinea efortului:

1. **Vezi PDF-ul** — descărcare directă, fără email. Sub el: „trimite-mi-l pe email" (doar adresa).
2. **Context scurt** (3 câmpuri, toate opționale): domeniu, mărimea firmei, principala durere.
3. **Cere pilotul de 30 de zile** — butonul dominant, colorat, singurul repetat și la mijlocul paginii.

Ce se trimite ajunge direct în CRM-ul din Management Center ca lead nou, marcat cu sursa „case study" și limba aleasă, deci vezi din ce țară vine interesul. Fără email introdus, nu se salvează nimic.

## Detalii tehnice

- Rută nouă `src/routes/case-study.tsx`, `noindex, nofollow` în `head()`, exclusă din `sitemap` și din navigație/footer.
- Dicționar nou `src/i18n/pages/case-study.ts` cu tipul `CaseStudyCopy` și 9 locale; hook propriu `useCaseStudyLocale()` cu persistență în `localStorage`, independent de comutatorul EN/DE/RO al site-ului.
- Componente noi sub `src/components/oix/case-study/`: selectorul de limbă, tabelul înainte/după, banda de metrici cu notă de metodă, blocul de limite, blocul de conversie.
- Server function `submitCaseStudyLead` (validare Zod, rate-limit simplu pe IP) care scrie în tabelele CRM existente cu `source = 'case_study'` și `locale`; reutilizează calea de intake folosită de formularul de contact.
- Generare PDF per limbă prin generatorul existent folosit la `/resources`, cu buton de descărcare direct pe pagină.
- Postarea LinkedIn: fișier text în `/mnt/documents/linkedin/` cu variantă EN și DE, plus imaginile — publicarea o fac doar dacă îmi ceri explicit.

## Verificare

- Typecheck și build.
- Pagina răspunde 200, comutarea între toate 9 limbile schimbă textul integral, fără chei lipsă.
- Formularul trimis creează lead în CRM; formularul necompletat nu creează nimic.
- Pagina nu apare în sitemap și nu e linkată din meniu sau footer.
- Verificare în browser pe desktop și mobil, temă închisă și deschisă.

## Ce am nevoie de la tine

Cifrele interne măsurate pentru punctele 3 și 6 (înainte/după). Până le primesc, construiesc pagina completă cu acele locuri marcate vizibil ca „de completat" și nu o public.
