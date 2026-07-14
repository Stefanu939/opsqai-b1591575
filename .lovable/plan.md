## Verificare

Am rulat testele, typecheck și un scan complet al proiectului. Concluzia: **totul e aliniat cu deck-ul v2_2 și nu am găsit bug-uri reale**.

### Stare curentă

- **Tests:** 78/78 pass (single "failed suite" e un `.cjs` din `opsqai-windows/services/database/__tests__/` pe care vitest nu-l parsează — pre-existent, nu-i introdus de mine).
- **Typecheck (tsgo):** curat, zero erori.
- **Runtime errors:** niciunul.
- **Website ↔ deck ↔ app:** Basic Platform (8 module), Premium Modules, Business Model, TAM/SAM/SOM (€4.8B/€1.1B/€90M), Ask €350K–€750K, echipa Ștefan Bari + CTO/Head of AI planned — toate consistente.
- **Console log** arată un warning de hydration despre atribute `data-tsd-source` în `__root.tsx` — sunt annotări injectate de tooling-ul Lovable/Vite în dev, nu cod al aplicației. Dispar în build de producție. Nu-i bug real.

### Singurele diferențe reziduale găsite

1. `scripts/gen_investor_deck.py` (v1, vechi) încă are `€1.5M` hardcodat. Nu e folosit — versiunea activă e `gen_investor_deck_v2.py`. Dar rămâne o sursă de confuzie dacă îl deschide cineva.

## Ce propun să fac

**Cleanup minimal, fără risc:**

1. **Șterg `scripts/gen_investor_deck.py`** (v1 vechi, obsolete după rewrite-ul v2). Rămâne doar `scripts/gen_investor_deck_v2.py` ca sursă unică.
2. **Regenerez PDF-ul deck-ului** din script-ul v2 curent, ca să fie sigur că fișierul din `/mnt/documents/` reflectă exact ultima versiune (Ștefan Bari, €350K–€750K, Basic Platform cu 8 module).
3. **Un smoke test rapid pe preview** (Playwright headless) pe rutele publice principale — `/`, `/product`, `/pricing`, `/self-hosted`, `/modules`, `/company`, `/security` — ca să confirm vizual că paginile se randează fără erori și copy-ul e cel corect din deck.

Nu ating cod de business logic, nu ating catalogul de module (deja aliniat), nu ating testele. Nu ating design-ul.

## De ce nu mai fac altceva

- Runtime `BASIC_MODULES` + catalog: aliniat cu deck-ul, testat, tests pass.
- Site-ul: aliniat, verificat prin grep.
- Deck-ul: script-ul v2 e corect (Ștefan Bari, ask 350–750K, arhitectura 3-surfaces).
- Hydration warning: artefact de dev-tooling, nu bug de produs.

Dacă vrei să adaug ceva concret (ex: să regenerez și decks localizate DE/EN, să adaug o pagină nouă, să extind un modul), spune-mi și fac plan separat.
