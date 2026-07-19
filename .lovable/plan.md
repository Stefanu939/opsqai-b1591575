
# Operational Intelligence Experience — Marketing Site Redesign

Refacere completă a marketing site-ului sub identitatea internă **"Operational Intelligence Experience"** (OIX). Paleta Emerald Prestige, WebGL real (R3F), narativ cinematic centrat pe: **AI + Self-Hosted + Operational Knowledge** — trei lucruri pe care aproape nimeni nu le are împreună.

Motto-ul site-ului, folosit ca semnătură vizuală recurentă:

> **FOR PEOPLE.**
> **NOT WITHOUT THEM.**

Headline hero home:

> **Operational Intelligence.**
> *Powered by Your Knowledge.*

---

## 1. Narativ & poziționare

Trei piloni repetați pe tot site-ul, întotdeauna împreună:
1. **AI** care înțelege business-ul tău
2. **Self-Hosted** — datele nu părăsesc infrastructura clientului
3. **Operational Knowledge** — învață din SOP-urile, KB-ul și procesele tale, nu ale altora

Sub-headline recurent: *"AI that understands your business because it learns from your knowledge — not ours."*

Numele intern al sistemului de design: **Operational Intelligence Experience** (folosit în comentarii cod, docs, tokens prefixate `--oix-*`).

## 2. Identitate vizuală

**Paletă Emerald Prestige** pe dark:
- `#04211a` deep bg · `#064e3b` surface · `#0d7a5f` emerald accent · `#c9a84c` gold · `#f5f0e0` cream

**Tipografie**:
- Space Grotesk (display, tracking tight, uppercase pentru motto)
- Instrument Serif italic (cuvinte-cheie: *knowledge*, *yours*, *people*)
- Inter (body)

**Semnătură vizuală**: grain subtil, corner brackets 1px gold-alpha, hairlines, glow emerald pe hover, uppercase display cu leading strâns pentru statement-uri de tip motto.

## 3. Hero 3D signature — "Particles → Documents → SOPs → Network → Logo"

Piesa centrală a brandului. O singură scenă R3F care spune povestea în ~10s, apoi loop lent:

```text
milioane de puncte (particule)
        ↓ se aliniază
pagini / documente flotante
        ↓ se conectează
SOP-uri (blocuri structurate)
        ↓ se leagă
rețea de noduri (constellation)
        ↓ se comprimă
LOGO-UL OPSQAI (mark 3D final)
```

Tehnic:
- `THREE.Points` cu ~200k particule GPU (BufferGeometry + custom shader)
- 5 keyframe-uri de poziție stocate în atribute; shader lerp între ele pe un `uProgress` uniform
- Scroll-driven pe hero (IntersectionObserver + rAF) SAU auto-play + loop când user-ul stă
- La final: particulele se așează pe silueta logo-ului OPSQAI (SVG → point sampling la build)
- Depth-of-field subtil, bloom pe accentele aurii, fog emerald
- Reduced-motion / mobile low-power → poster PNG statică (generat cu imagegen la ultimul keyframe: logo cu particule)

Componenta: `<ParticleGenesisScene />` — devine identitatea vizuală a OPSQAI.

## 4. Home — film în 4 acte

Nu începem cu features. Începem cu un film:

```text
ACT I    CHAOS         particule dezorganizate + copy "Every company has knowledge. Most companies lose it."
ACT II   KNOWLEDGE     particulele devin documente + copy "OPSQAI captures it."
ACT III  INTELLIGENCE  documentele devin rețea AI + copy "And turns it into intelligence."
ACT IV   ACTION        rețeaua alimentează oameni la muncă + copy "That works for your people."
```

Fiecare act = o secțiune full-height cu micro-scenă 3D derivată din `ParticleGenesisScene` (același sistem de particule, keyframe diferit). Scroll-linked.

După film: **motto band** `FOR PEOPLE. NOT WITHOUT THEM.` — display uriaș, leading 0.85, cream pe emerald deep, hairline gold sub. Apoi CTA final.

## 5. /self-hosted — statement agresiv

Hero:

> **YOUR DATA**
> **STAYS**
> **YOURS.**

Display XXL uppercase, în spate un **rack 3D** (`ServerMonolith`) cu LED-uri aurii pulsante, floating pe o grilă emerald cu fog. Camera orbitează lent.

Secțiuni:
- **Zero cloud dependency** — diagramă 3D flux date (rămân în perimetrul clientului)
- **Windows-native installer** — mock 3D al installer-ului
- **Air-gapped ready** — vizual "no outbound"
- **Customer-owned AI** — modelul rulează pe server-ul clientului

## 6. /modules — constelație interactivă

`<ModuleConstellation>` — 7 noduri 3D orbitând pe orbite emerald, conectate prin linii aurii:
- Knowledge Base · AI Chat · Licensing · Updates · Policies · SOPs · Departments

Hover pe un nod → **toată rețeaua se aprinde**, celelalte noduri emit pulse aurii de-a lungul liniilor, iar un drawer lateral se deschide cu detaliile modulului. Click → route dedicată modulului (opțional în fază ulterioară).

## 7. /product

Ce este OPSQAI, cei 3 piloni în profunzime, bento 3D per capability. Micro-scene derivate din același sistem de particule pentru continuitate vizuală.

## 8. /pricing — Enterprise Proposal

Fără look de "Stripe pricing". În loc de 3 carduri standard:
- **Un singur canvas premium** cu 3 propuneri poziționate ca "engagements": Pilot · Enterprise Self-Hosted · Managed Sovereign Cloud
- Fiecare tier = card mare cu corner brackets gold, glow emerald pe featured, tipografie editorial
- CTA: **"Request Enterprise Proposal"** — nu "Buy now"
- Fără prețuri afișate la lower tiers dacă e cazul; poziționare consultativă

## 9. /company — Manifesto

Hero: `HumanAxisScene` (om + AI orbitând un ax comun). Apoi **Manifesto** pe ecran plin, editorial:

> **We believe…**
>
> AI should never replace operational knowledge.
> AI should preserve it.
> AI should strengthen it.
> AI should make every employee better.
> **Not obsolete.**

Tipografie mare, mult whitespace, hairlines gold între linii. Sub manifesto: principii, echipa (dacă e cazul), timeline.

## 10. Secțiuni globale noi

### Security Wall (pe home + /self-hosted)
Bandă enterprise cu checklist animat (fiecare rând apare cu stagger + gold pulse la enter):

```text
✔ Self-Hosted            ✔ Offline Ready
✔ Windows Native         ✔ PostgreSQL
✔ JWT Licensing          ✔ Zero Cloud Dependency
✔ Customer-Owned AI      ✔ Air-Gapped Capable
```

Component: `<SecurityWall />`. Iconițe SVG monoline gold cu micro-animație pe intersection.

### Deployment Diagram (pe /self-hosted)
Diagramă 3D orizontală:

```text
Employee  →  OPSQAI  →  Knowledge  →  Server  →  Company
```

Noduri 3D conectate, linii de energie aurii curgând între ele. Underlay text discret:

> **Nothing leaves your infrastructure.**

Component: `<DeploymentFlowScene />`.

### Footer premium (Apple-like)
- Aerisit, mult whitespace, tipografie mare cu categorii minimale
- Motto `FOR PEOPLE. NOT WITHOUT THEM.` repetat la baza footer-ului, foarte mare, gold-alpha jos
- 4 coloane discrete + copyright + wordmark

Component: `<FooterOIX />`.

### Nav
Sticky, blur, dark emerald, logo mark refresh, CTA gold "Request Proposal".

## 11. Sistem 3D partajat

`src/components/three/`:
- `ParticleGenesisScene` (home hero, 4 acte)
- `ServerMonolith` (/self-hosted hero)
- `ModuleConstellation` (/modules)
- `DeploymentFlowScene` (/self-hosted)
- `HumanAxisScene` (/company)
- `GridFloor`, `EmberFog`, `GoldBloom` (primitive comune)
- `Scene3D` wrapper: lazy Canvas, `dpr=[1, 1.8]`, `frameloop="demand"`, `IntersectionObserver` pause, `prefers-reduced-motion` → poster PNG

Dependențe noi: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `maath`. Motion (deja în stack) pentru scroll-linked UI.

## 12. Design tokens (`src/styles.css`, sub `@theme`)

Prefix `--oix-*` pentru identitate:
- `--oix-bg-deep`, `--oix-surface`, `--oix-emerald`, `--oix-gold`, `--oix-gold-soft`, `--oix-cream`
- `--oix-gradient-genesis`, `--oix-gradient-gold-shimmer`
- `--oix-shadow-emerald-glow`, `--oix-shadow-gold-glow`
- `--oix-hairline` (1px gold-alpha)
- `--font-display` (Space Grotesk), `--font-serif-accent` (Instrument Serif), `--font-body` (Inter) — fonturile prin `<link>` în `__root.tsx`

## 13. Performanță & a11y

- Lazy-load per pagină pentru fiecare `Canvas`
- Poster PNG fallback generat cu imagegen pentru fiecare scenă (afișat sub `prefers-reduced-motion` și pe mobile low-power)
- Preload doar scena hero a rutei curente
- SEO: `head()` propriu per rută (title, description, og:title, og:description, og:image = poster PNG, twitter:card)
- Contrast AA pe emerald deep
- Scenele `aria-hidden`, conținutul rămâne semantic HTML
- Motto-urile ca `<h1>`/`<h2>` reale, nu doar canvas

## 14. Faze de implementare

1. **F1 — OIX Design System**: tokeni `--oix-*`, fonturi în `__root.tsx`, `SectionShell`, `EditorialHeadline`, `MottoBand`, `GoldButton`, `GhostButton`, `NavShell`, `FooterOIX`, `SecurityWall` static.
2. **F2 — 3D foundation**: install R3F stack, `Scene3D` wrapper cu fallback + IO pause, `GridFloor`, `EmberFog`, `GoldBloom`, sistem de particule reutilizabil (buffer + shader) + generare postere PNG.
3. **F3 — Home**: `ParticleGenesisScene` complet (5 keyframe-uri, inclusiv snap pe logo), film în 4 acte scroll-linked, motto band, SecurityWall, CTA.
4. **F4 — /self-hosted**: `ServerMonolith`, statement `YOUR DATA STAYS YOURS.`, `DeploymentFlowScene`, secțiunile enterprise security.
5. **F5 — /modules + /product**: `ModuleConstellation` interactivă cu network-lights-up on hover, bento 3D pentru /product.
6. **F6 — /pricing + /company + /contact**: Enterprise Proposal layout, `HumanAxisScene` + Manifesto, contact split.
7. **F7 — Polish**: micro-animații Motion, audit Lighthouse & contrast, postere finale, verificare că motto-ul și cei 3 piloni sunt vizibili pe fiecare pagină.

## Constrângeri tehnice

- Rute separate pentru fiecare secțiune (nu hash anchors) — cerință TanStack Start.
- Fonturi via `<link>` în `__root.tsx`, niciodată `@import` remote în CSS (Tailwind v4).
- Scenele 3D importate dinamic în pagini; niciodată static în `__root.tsx` (ar băga three.js în bundle-ul global).
- Fără modificări în build self-hosted / installer / MC / Portal — strict frontend marketing public.
- Fără backend nou.

După aprobare pornesc cu **F1 + F2** în același turn (fundația vizuală + sistemul 3D), apoi construim pagină cu pagină în ordinea de mai sus.
