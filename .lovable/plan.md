# Self-Hosted: finalizare UI (logo, chat bubble, roluri) + upload SOP/FAQ

## Stare actuală verificată
- `app.knowledge.tsx` are deja buton **Upload** (dialog upload + index, upload versiune nouă, empty state cu CTA).
- `app.faq.tsx` are deja buton **Import** (CSV/XLSX/PDF/DOCX) prin `FaqImportDialog`, plus **Export**.
- `src/lib/company-logo.functions.ts` există (upload logo în config local), dar UI-ul lipsește din tab-ul Company.
- `rbac.functions.ts` filtrează deja rolurile de sistem din lista atribuibilă.
- Bootstrap-ul installerului trimite prenume/nume și `company_id` către `admin-seed.mjs`.

## Ce se construiește

### 1. Upload logo companie (UI)
În `app.organization.tsx`, tab **Company**: zonă de upload (preview logo curent, buton „Change logo”, validare tip/dimensiune ≤2MB), apel `uploadCompanyLogo` / `removeCompanyLogo`, invalidare query după succes. Logo-ul afișat în header/sidebar când există.

### 2. Chat bubble vizibil (Self-Hosted)
`chat-glider.tsx`: eliminare comportament „glider” ascuns pe hover; buton fix rotund gold, jos-dreapta, mereu vizibil, cu `aria-label`. Panelul de chat intern rămâne pe polling platform-neutral.

### 3. Consolidare upload SOP/FAQ (polish, nu rescriere)
- KB: dialogul de upload primește hint explicit pentru tipuri acceptate (PDF, DOCX, XLSX, MD, TXT) și mesaje de eroare clare la extragere/indexare eșuată; status per document (`processing` / `ready` / `failed`) cu buton **Retry indexing**.
- FAQ: butonul **Import** devine grup cu **Add FAQ**, cu aceleași texte/iconografie ca în KB, astfel încât fluxul „încarcă SOP → apar FAQ” să fie evident. Fără schimbări de business logic.

### 4. Subscriptions vs Modules
În Self-Hosted, ascunderea intrării **Subscription** din navigație (dublează **Modules**); Modules rămâne singura sursă de entitlements din licența JWT.

### 5. Verificare end-to-end
Checklist rulat pe build fresh: login superadmin creat în installer → upload SOP în KB (indexare ready) → import FAQ din PDF → întrebare în chat cu răspuns grounded din SOP → adăugare user nou cu rol Manager → rulare AI audit → upload logo companie.

## Detalii tehnice
- UI-only pentru punctele 1–4; server functions existente (`uploadCompanyLogo`, `uploadKnowledgeFile`, `parseFaqImport`, `importFaqs`) sunt refolosite ca atare.
- Nicio dependență Cloud nouă; toate apelurile trec prin `useServerFn` + repository per platformă.
- Fără migrații noi.
