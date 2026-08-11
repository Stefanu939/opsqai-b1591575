# Self-Hosted: verificare „două versiuni de UX/UI” + butoane KB/FAQ

## Ce am verificat (read-only, în cod)

**1. Nu există două versiuni de UX/UI pentru Self-Hosted.**
- Există un singur shell pentru produsul clientului: `src/components/app/app-shell.tsx` (sidebar 240px, `LogoMark` nou, tokeni gold).
- Celelalte shell-uri sunt pentru alte produse, nu pentru Self-Hosted:
  - `src/components/mc/mc-shell.tsx` → Management Center (Cloud)
  - `src/components/oix/nav-shell.tsx`, `oix-layout.tsx` → site-ul de marketing
- Ecranele clientului sunt un singur set în `src/routes/_authenticated/app.*.tsx`. Nu am găsit pagini vechi duplicate (nu mai există `src/pages`, `App.tsx`, alt dashboard paralel).
- Logo-ul nou (`LogoMark` „Sovereign/octagon” din `src/components/brand/logo.tsx`) este singurul folosit în shell-ul aplicației.

Concluzie: nu e nimic de șters — deci da, curățenia a fost deja făcută în pașii anteriori.

**2. Butoanele de Upload și Export există.**
- Knowledge (`app.knowledge.tsx`): buton **Upload** (+ upload versiune nouă per document, CTA în empty state) și buton **Export** (`ExportDialog kind="kb"`).
- FAQ (`app.faq.tsx`): butoane **Add FAQ**, **Import** (CSV/XLSX/PDF/DOCX prin `FaqImportDialog`) și **Export** (`ExportDialog kind="faq"`).

## Singura inconsecvență găsită (mică, de UI)

În sidebar, prima intrare este etichetată **„AI Chat”** dar duce la `/app`, care este ruta de Dashboard și redirectează la `/app/chat` doar când există deja date. La o instalare nouă, apăsând „AI Chat” utilizatorul ajunge pe Dashboard-ul de onboarding — etichetă și destinație nu corespund.

Propunere (doar prezentare/navigație, fără business logic):
- Intrarea „AI Chat” din sidebar să indice direct `/app/chat`.
- Adăugare intrare separată **„Dashboard”** către `/app` (prima poziție), astfel încât onboarding-ul rămâne accesibil intenționat.
- Fără alte modificări; niciun fișier șters.

## Detalii tehnice
- Fișier atins: `src/components/app/app-shell.tsx` (lista `workspace`, plus `bottomTabs` derivat automat).
- Fără migrări, fără schimbări de server functions, fără impact pe Cloud/MC.
