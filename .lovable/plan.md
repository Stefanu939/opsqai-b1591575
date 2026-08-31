# Un singur adevăr de design (fără standard impus prin cod)

Scop: eliminăm „two truths". Nicio regulă permanentă, niciun script de verificare, nicio paletă blocată. Doar o descriere scurtă a designului care există **acum**, care se rescrie complet când ceri o schimbare vizuală.

## Ce se schimbă

### 1. Un singur fișier: `docs/design/current-design.md`

Scurt (≈1 pagină), descriptiv, nu prescriptiv. Conține doar ce e implementat azi, pe scope:
- Self-Hosted (`/app/*`)
- Management Center (`/management/*`)
- Customer Portal (`/portal/*`)
- Site public

Pentru fiecare: stil grafic, direcție de culoare, tipografie, forme/raze, umbre, densitate, motion — citite direct din `src/styles.css` și din componentele reale, nu din memorie.

Sus, în fișier, o singură notă:
> Acesta descrie designul curent, ca referință de consistență. Nu e un standard permanent. Când se cere o schimbare vizuală, fișierul se rescrie ca să reflecte noua implementare, iar descrierea veche dispare. Istoricul rămâne doar în git.

### 2. Curățare memorie — aici e „two truths"

`mem://index.md` conține azi două direcții contradictorii: pe de o parte „Noir & Gold + Urbanist/Epilogue", pe de alta „Design System v3: Space Grotesk + Inter, Deep Navy/Soft White/Gold", plus reguli de tip standard („Golden Rule", „Motion rule", faze 0→8). Referă și `mem://design/palette-typography` și `mem://design/motion-feedback`, care nu există.

Se elimină toate acestea și rămâne un Core minim:
- separarea Self-hosted / Management Center (regulă de produs, nu de design — se păstrează);
- salut pe prenume real (se păstrează);
- o singură linie de design: „designul curent e descris în `docs/design/current-design.md`; pentru UI/UX obișnuit păstrează-l, la cerere explicită de schimbare vizuală rescrie fișierul după noua implementare."

Fără fișiere de memorie de design separate, fără referințe la fișiere inexistente, fără trimitere la `.lovable/plan.md` ca sursă de design.

### 3. Docs existente

- `docs/engineering/01-conventions.md`: linia despre design tokens rămâne (e o convenție tehnică sănătoasă, nu un standard vizual) + un pointer la `docs/design/current-design.md`.
- Se șterge din docs orice descriere veche de paletă/tipografie care contrazice codul, dacă apare.

## Ce NU facem

- Fără `09-design-contract.md`.
- Fără `scripts/verify-design-contract.mjs` sau vreun check care blochează schimbări vizuale.
- Fără reguli obligatorii de componente/layout.
- Zero modificări de cod, tokeni sau UI — nimic nu se mișcă vizual.

## Note tehnice

Doar 3 acțiuni: creare `docs/design/current-design.md`, rescriere `mem://index.md`, un pointer în `01-conventions.md`. Înainte de scriere citesc `src/styles.css` ca descrierea să corespundă exact stării reale.
