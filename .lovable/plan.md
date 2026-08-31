# Design Contract (structural) + Active Design State (schimbabil)

Două fișiere, două scopuri diferite:
- **Structural Design Contract** — arhitectura, stabilă; nu se schimbă la cereri de UI/UX.
- **Active Design State** — identitatea vizuală curentă, o singură sursă de adevăr, schimbabilă intenționat de tine.

Zero schimbare vizuală în acest pas: doar codificăm ce există și separăm structura de stil.

## Problema pe care o rezolvă

- Memoria proiectului descrie „Design System v3" (Deep Navy, Space Grotesk + Inter), în timp ce codul rulează Emerald/Gold/Parchment cu Karla ca font body. Două adevăruri contradictorii.
- `mem://index.md` referă `mem://design/palette-typography` și `mem://design/motion-feedback`, fișiere care **nu există**, plus `.lovable/plan.md`, care se rescrie la fiecare plan nou.
- `docs/engineering/03-add-a-module.md` nu menționează contractul de layout, deși `src/components/app/module-page.tsx` îl declară obligatoriu — un modul nou poate fi construit fără `ModulePage` și nimeni nu prinde asta.

## 1. `docs/engineering/09-design-contract.md` — reguli structurale (stabile)

Fără nicio culoare, font sau valoare de stil concretă. Conține doar:

- **Scope-uri de produs și proprietatea rutelor** — Self-Hosted `/app/*`, Management Center `/management/*` (`.mc-shell`), Customer Portal `/portal/*` (`.oq-soft`), site public (`.oix-shell`). Regulă: un scope nu împrumută niciodată wrapper-ul altuia; Self-Hosted nu conține niciodată clase MC/Portal.
- **Arhitectura de layout partajată** — orice suprafață autentificată compune `ModulePage` (header + tabs opționale + slot toolbar + zonă de conținut).
- **Primitivele reutilizabile** — `bento-grid`, `metric-tile`, `panel`, `progress-ring`, `segmented-tabs`, `mini-chart`, `stat-card`, `section-card`, `page-header`, `empty-state`, `skeleton`. Un ecran nou le compune, nu își face variante proprii.
- **Reguli de compunere pe module** — fiecare modul: header, KPI/metric row, panel de conținut, empty state, skeleton, toolbar de acțiuni.
- **Utilizarea tokenilor semantici** — culorile, razele, umbrele, spacing-ul și fonturile vin exclusiv din tokeni semantici definiți în `src/styles.css`. Interzis: `text-white`, `bg-black`, `bg-[#...]`, `text-[#...]`, `shadow-[...]`, `rounded-[...]`, stiluri inline de culoare în componente.
- **Consistency checks** — ce verifică scriptul și cum se declară o excepție.
- Explicit în document: *acest fișier nu definește paleta, fonturile sau stilul grafic*. Acelea trăiesc în Active Design State.

## 2. `docs/design/active-design-state.md` — identitatea vizuală curentă (schimbabilă)

Un singur fișier, cu versiune și dată, care descrie starea activă pe câmpuri fixe:

```text
version, updated
graphic style         (ex. „Linear/enterprise — suprafețe plate, borduri fine, aură ambientală")
color direction       (per scope: Self-Hosted, Portal, MC, site public)
typography            (display / body / mono + greutăți)
border radius language
shadows & elevation
component shape language
spacing & density
motion language
iconography direction
```

Prima versiune se completează prin citirea `src/styles.css` (starea reală de azi: Emerald/Gold/Parchment, Karla body, Space Grotesk display, Noir & Gold scoped pe `.mc-shell`), nu din memorie.

Fiecare câmp trimite la tokenii care îl implementează, ca schimbarea să aibă un singur loc de aplicare.

## 3. Protocolul de schimbare — cele două moduri

Se documentează în ambele fișiere și se salvează ca regulă de memorie.

**Mod A — îmbunătățire UI/UX** („fă dashboardul mai clar", „aranjează cardurile"):
direcția vizuală activă se **păstrează**; se schimbă doar layout, ierarhie, densitate, conținut. Fără paletă nouă, fără fonturi noi, fără stil grafic nou.

**Mod B — schimbare de Design System** („schimbă stilul grafic din Linear în Bubbles", „mută produsul pe o direcție enterprise mai întunecată"):
tratat ca schimbare intenționată, în această ordine:
1. actualizează `docs/design/active-design-state.md` (versiune + câmpurile atinse);
2. actualizează tokenii globali din `src/styles.css` și primitivele reutilizabile;
3. listează suprafețele afectate (rute + componente);
4. migrează limbajul vizual consecvent pe toate suprafețele scope-ului;
5. **nu** schimbă arhitectura structurală decât dacă e strict necesar, și atunci o spune explicit.

## 4. `scripts/verify-design-contract.mjs` — verifică structura, nu stilul

Scriptul nu conține **nicio** culoare de brand și nu impune Emerald/Gold/Parchment sau orice altă paletă. Eșuează doar la:

- rută autentificată nouă care nu compune `ModulePage` (allowlist explicită pentru excepții reale);
- rută `/app/*` care conține `mc-shell` sau `oq-soft` (scurgere între scope-uri) și invers;
- valori vizuale hardcodate în `src/components` și `src/routes`: `text-white`, `bg-black`, `bg-[#`, `text-[#`, `border-[#`, `shadow-[`, `rounded-[`, `font-family` inline;
- tokeni de culoare/rază/umbră definiți în afara `src/styles.css`.

Astfel, o schimbare de paletă sau de stil grafic trece verificarea automat, atâta timp cât se face central prin tokeni.

Prima rulare va raporta încălcările existente; cele reale se corectează, restul intră pe allowlist cu motiv, ca scriptul să pornească verde. Se expune ca `npm run verify:design`, lângă `verify-source-imports` și `verify-bundle`.

## 5. Legături în docs existente

- `docs/engineering/01-conventions.md`: linia despre design tokens trimite la ambele fișiere.
- `docs/engineering/03-add-a-module.md`: pas nou „UI: compune `ModulePage` + primitivele partajate; stilul vine din Active Design State".
- `docs/engineering/08-pre-release-checklist.md`: un rând de verificare a contractului.

## 6. Curățarea memoriei

- `mem://index.md`: Core scurt — „structura = design contract, stilul = Active Design State", plus regula Mod A / Mod B. Se elimină „Design System v3" contradictoriu, referințele la fișierele inexistente și la `.lovable/plan.md`.
- Se adaugă `mem://design/design-contract` — pointer către cele două documente ca surse unice de adevăr, cu protocolul de schimbare.

## Note tehnice

- Nicio schimbare de token, culoare, font sau layout în acest pas: doar documentație, un script de verificare și corecții punctuale pentru încălcările reale găsite.
- Verificare finală: script, typecheck, apoi o trecere în browser peste `/app`, `/management`, `/portal` în light și dark ca să confirmăm că nimic nu s-a mișcat vizual.
