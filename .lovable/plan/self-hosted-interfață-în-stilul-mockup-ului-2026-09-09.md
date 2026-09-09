# Self-Hosted: interfață în stilul mockup-ului

Da — mockup-ul e o îmbunătățire reală, dar nu ca înlocuire totală. Aduce trei lucruri pe care aplicația actuală nu le face bine: căutarea sus, în bara de titlu (acum e ascunsă în meniul lateral), o salutare clară cu data și un rând de indicatori mari, ușor de citit, plus grupuri de meniu care se pot închide (HR, Transport). Nu preiau paleta din imagine: rămânem pe identitatea actuală (grafit / verde operațional, Outfit + Figtree), altfel se rupe restul produsului.

Regulă fermă: toate cifrele afișate rămân cele reale din instalare. Nimic din imagine nu se copiază ca valoare inventată (256, 42, 1.248, 98%). Unde nu există date, se arată gol sau „—”, nu numere de decor.

## Ce se schimbă

### 1. Bara de sus (nouă)
- Căutare lată, mereu vizibilă, cu scurtătură tastatură.
- În dreapta: comutator temă, limbă (EN/DE/RO), clopoțel notificări, avatar/meniu cont.
- Pe telefon rămâne bara compactă existentă, cu căutarea accesibilă printr-un buton.

### 2. Meniu lateral
- Grupurile de produse (HR, Transport, celelalte) devin pliabile, cu starea reținută.
- Sus rămâne logo + numele firmei + eticheta „Self-Hosted”.
- Jos: firma, locația, utilizatorul, ieșire — mai curat decât acum.
- Căutarea, tema și notificările se mută din lateral în bara de sus.

### 3. Dashboard
- Salut personalizat cu numele real + data curentă în limba aleasă, dreapta.
- Patru indicatori mari sus (articole cunoștințe, angajați activi, întrebări rezolvate, disponibilitate/stare sistem) — doar cu date reale, cu variație afișată doar când există istoric.
- Rânduri: întrebări recente în chat + documente recente; apoi prezență (inel), activitate 7 zile, acțiuni rapide.
- Acțiunile rapide respectă licența și drepturile: butoanele ascunse dacă nu ai acces.
- Se păstrează ce există deja și funcționează: KPI pe module licențiate, Control Center, filtre, calendar, bannere.

### 4. Curățenie
- Se elimină dublările din pagina de dashboard rezultate din suprapunerea blocurilor vechi cu cele noi.
- Fără schimbări de licențiere, drepturi, date sau logică de business.

## Detalii tehnice
- `src/components/app/app-shell.tsx`: se adaugă un top bar propriu pentru scopul `/app/*`, grupuri de nav pliabile (stare în localStorage), se mută `GlobalSearch`, `ThemeToggle`, `NotificationsBell`, `AccountMenu` în bara de sus; se păstrează gating-ul `gate()`/`buildAppNavigation` neschimbat.
- `src/routes/_authenticated/app.index.tsx`: rearanjare în ordinea greeting → 4 × `MetricTile` → chat recent + documente recente → prezență/activitate/quick actions; se refolosesc `Panel`, `MetricTile`, `AreaTrend`, `DonutBreakdown`, `ProgressRing`.
- Sursele de date rămân `getDashboardOverview`, `getDashboardActivity`, `getExecutiveInsights`, `ModuleKpis`, `ControlCenter`; fără server functions noi decât dacă lipsește un câmp deja expus.
- Tokenii de culoare/tipografie din `src/styles.css` nu se modifică.
- Traduceri noi (salut, etichete indicatori, acțiuni rapide) în EN/DE/RO.

## Verificare
- Typecheck + build.
- Testele existente.
- Verificare în browser pe desktop și mobil, temă deschisă și închisă: dashboard, meniu pliabil, căutare, notificări, cont.
- Confirmare că un utilizator fără drept pe un modul nu vede indicatorii/acțiunile respective.
