# Plan continuare — OPSQAI Enterprise (restul pachetelor)

Direcția vizuală: **Graphite Precision rămâne definitivă** — nu se introduce Aurora Noir. Toată lucrarea de mai jos folosește tokenii existenți din `src/styles.css` / `docs/design/current-design.md`.

## 1. Chat — finisaje (mic)
- Pin-ul conversațiilor trece din `localStorage` în stocarea pe server, per utilizator, ca favoritele să apară pe orice dispozitiv (`src/components/app/chat-sidebar.tsx`).
- Butoanele „sursă / copiere / email” sub răspunsuri există deja — doar verificare statică de consistență.

## 2. Academy — verificare bibliotecă și atribuire
- Trecere prin paginile existente (`app.academy.courses/teacher/kb/settings`) și fluxul de atribuire pe utilizator/rol: cursurile create (inclusiv drafturi) rămân în bibliotecă, se pot atribui și progresul se salvează corect.
- Reparații numai unde se constată defecțiuni; fără refaceri de amploare.

## 3. Regula celor două clickuri — completare
- Se verifică acoperirea căutării globale (Ctrl/Cmd+K) pe HR, Transport și workspațe; acțiunile frecvente se ajung direct din alerte/ rezultate, panouri laterale (slide-over) pentru detalii.
- Se aliniază la componentele Graphite Precision existente; fără redesign nou.

## 4. Email Intelligence (Self-Hosted)
- Conectare inbox de echipă prin Microsoft Graph (citire: listare, citire mesaj, atașamente).
- Clasificare: tip cerere, prioritate, subiect, atașamente — ancorată în Baza de Cunoștințe.
- Drafturi de răspuns propuse în interfață; **angajatul verifică și trimite** — OPSQAI nu trimite emailuri autonom.
- Pagină dedicată în Self-Hosted + setări (caseta, drepturile Graph, per-utilizator), jurnalizare în audit log.
- Necesită la testarea reală un tenant Microsoft al clientului cu administrator — implementarea merge fără el.

## 5. Bot Microsoft Teams
- Evoluția de la notificări la bot: răspunsuri în chat 1:1 și în canale, carduri interactive, ancorate în KB cu citări.
- Înregistrarea aplicației Teams (app package, permissions Graph) se documentează; testarea reală necesită tenantul clientului.

## 6. Nota de risc (transmisă și la final)
- Update-ul Windows, SSO-ul Entra ID și sincronizarea SharePoint sunt scrise și fără erori de cod, dar nesigure comportamental până la un test real pe Windows / tenant Microsoft. Asta nu blochează implementarea restului.

## Ce NU se face
- Aurora Noir (respinsă de user).
- Affirmări de conformitate ISO/GDPR/DORA fără dovezi.
- Trimitere autonomă de emailuri.
