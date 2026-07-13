
## Ce vom face

Ecranul roșu nu este o eroare a instalatorului — este mesajul corect al `install.exe` care spune că **Docker Desktop nu e instalat** pe Windows-ul tău. Instalatorul face exact ce trebuie: verifică prerechizitele înainte să pornească stack-ul, se oprește cu cod 1, iar wrapper-ul `.cmd` ține fereastra deschisă ca să poți citi.

Nu schimbăm logica de verificare. Reorganizăm doar documentația din ZIP astfel încât:
- documentația să fie un **PDF**, nu `README.md`;
- să aibă structură clară, cu secțiuni separate, ordonate logic;
- să conțină pași exacți pentru Windows / macOS / Linux, inclusiv linkul corect către Docker Desktop (nu docs.docker.com/engine/install, care e pentru Linux).

## Structura noului `README.pdf`

```text
OPSQAI Self-Hosted — Ghid de instalare
Install ID: <install_id>   Client: <company>   Versiune: <version>   Generat: <ts>

1. Ce este acest pachet
   - Scurtă descriere (ce se instalează, ce nu se instalează).

2. Prerechizite (ÎNAINTE să rulezi orice)
   2.1 Windows  → Docker Desktop  (link: docker.com/products/docker-desktop/)
   2.2 macOS    → Docker Desktop  (același link)
   2.3 Linux    → Docker Engine + plugin compose  (docs.docker.com/engine/install)
   Cum verifici că merge: `docker --version`, `docker compose version`.

3. Cum extragi arhiva corect
   - Windows: click dreapta pe ZIP → Extract All…  (NU dublu-click în preview!)
   - macOS/Linux: `unzip opsqai-<version>-<install_id>.zip`

4. Verificarea integrității
   - `sha256sum -c CHECKSUMS.sha256` (macOS/Linux)
   - `certutil -hashfile install.exe SHA256` pe Windows, comparat cu fișierul CHECKSUMS.

5. Instalare pas cu pas
   5.1 Windows          → dublu-click `install-windows.cmd`
   5.2 macOS            → `chmod +x install-macos && ./install-macos`
   5.3 Linux desktop    → `chmod +x install-linux && ./install-linux`
   5.4 Server headless  → `chmod +x install.sh && ./install.sh`

6. Ce face instalatorul (transparent, pas cu pas)
   - verifică docker + compose
   - copiază `.env.template` → `.env` (dacă nu există)
   - `docker compose up -d`
   - așteaptă `/health` OK
   - deschide URL-ul Setup Wizard

7. Setup Wizard
   - deschide URL-ul afișat (implicit http://localhost:3000/first-run)
   - lipește conținutul `activation-bundle.json` când e cerut

8. Restaurare din backup (DR)
   - `install-<os> --restore` (runbook 5.5.4)

9. Depanare (probleme frecvente)
   - "docker is not installed or not on PATH" → instalează Docker Desktop (pct. 2.1)
   - "install.exe is missing from this folder" → nu ai extras ZIP-ul (pct. 3)
   - "App did not report healthy" → `docker compose logs --tail=200 opsqai`

10. Fișierele din pachet (tabel)
    install.exe / install-macos / install-linux / install-windows.cmd /
    install.sh / docker-compose.yml / .env.template / activation-bundle.json /
    entrypoint.sh / CHECKSUMS.sha256 / README.pdf

11. Suport & referințe
    - docs/administrator-guide/02-installation.md
    - docs/engineering/runbooks/dr-verify-v1.0.0.md
```

## Modificări tehnice

1. **Instalez `pdf-lib`** (`bun add pdf-lib`) — funcționează în Cloudflare Worker (pur JS, fără native).
2. **Creez `src/lib/installation-readme.server.ts`** cu o funcție `renderReadmePdf(input): Promise<Uint8Array>` care generează PDF-ul cu structura de mai sus. Layout manual pe pagini A4:
   - font `Helvetica` / `Helvetica-Bold` (built-in în pdf-lib, fără fișiere externe)
   - headings, paragraphs, table simplu (linii + coloane), margini uniforme
   - antet cu titlul + install_id / company / version / generated_at
3. **Actualizez `installation-package.server.ts`**:
   - elimin `renderReadme(...)` (Markdown) și înlocuiesc intrarea `"README.md"` din `files` cu `"README.pdf"` (`Uint8Array` de la `renderReadmePdf`).
   - actualizez tabelul din PDF-ul propriu (pct. 10) pentru a lista `README.pdf`.
4. **Actualizez testele** `src/lib/__tests__/installation-package.test.ts`:
   - testul care verifica `README.md` devine test pentru `README.pdf` — verific că începe cu `%PDF-` și conține `install_id` extras cu `pdf-parse` sau simplu prin căutare byte-wise a install_id-ului scris ca text (pdf-lib scrie text vizibil).
5. **README.md nu mai există în ZIP** — este înlocuit complet de `README.pdf`.
6. **Fără schimbări** în: instalatorul Go, `install-windows.cmd`, `install.sh`, docker-compose, .env.template, entrypoint.sh, mesajele `install.exe`. Instalatorul continuă să detecteze Docker exact ca acum — asta e comportamentul corect pe care îl vezi în screenshot.

## Detalii tehnice

- pdf-lib e SSR-safe și rulează în workerd; nu are dependențe native. Fonturile `Helvetica`/`HelveticaBold` sunt built-in.
- QA vizual după prima generare: rulez local `assembleInstallationPackage` cu date mock, scot `README.pdf` din ZIP, îl convertesc în imagini cu `pdftoppm` și verific fiecare pagină pentru text tăiat, suprapuneri, margini. Fixez layout-ul până e curat.
- Utilizatorul va trebui să regenereze pachetul din UI ca să primească noul PDF.

## Ce trebuie să faci tu între timp (independent de fix)

1. Instalează Docker Desktop pe Windows: https://www.docker.com/products/docker-desktop/
2. Pornește-l (icon verde în tray).
3. Verifică: `docker --version` + `docker compose version`.
4. Re-rulează `install-windows.cmd` din folderul extras.

Fără pasul ăsta, orice PDF am face, tot Docker îți lipsește și instalatorul se va opri corect la aceeași verificare.
