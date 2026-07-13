// Server-only: render the installation package README as Markdown.
//
// Previously used pdf-lib to emit README.pdf, but pdf-lib's ESM build
// imports named helpers from tslib (`import { __extends } from "tslib"`)
// which the Cloudflare Worker SSR bundler wraps with broken CJS interop —
// runtime crash: `Cannot destructure property '__extends' of
// '__toESM(...).default' as it is undefined`. A plain Markdown README is
// just as useful to the installer, avoids the native-ish dep, and works in
// every environment.

export interface ReadmeInput {
  install_id: string;
  installer_version: string;
  company_name: string;
  generated_at: string;
}

export function renderReadmeMarkdown(input: ReadmeInput): string {
  const zipName = `opsqai-${input.installer_version}-${input.install_id}`;
  return `# OPSQAI Self-Hosted — Ghid de instalare

| | |
|---|---|
| Install ID | \`${input.install_id}\` |
| Client | ${input.company_name} |
| Versiune | ${input.installer_version} |
| Generat | ${input.generated_at} |

---

## 1. Ce este acest pachet

Această arhivă conține tot ce ai nevoie pentru a rula OPSQAI pe propriul tău
server: instalatorul nativ pentru Windows / macOS / Linux, configurația
Docker Compose, șablonul de variabile de mediu și bundle-ul de activare
semnat digital. Instalatorul **nu** instalează Docker în locul tău — vezi
capitolul 2.

## 2. Prerechizite (ÎNAINTE de instalare)

OPSQAI rulează în containere Docker. Trebuie să ai Docker instalat și pornit
înainte de a rula instalatorul.

### 2.1 Windows
- Descarcă și instalează Docker Desktop de la https://www.docker.com/products/docker-desktop/
- Pornește Docker Desktop și așteaptă până apare mesajul „Docker Desktop is running" (icon verde în system tray).

### 2.2 macOS
- Descarcă Docker Desktop for Mac (Apple Silicon sau Intel): https://www.docker.com/products/docker-desktop/
- Pornește Docker Desktop și așteaptă până iconul din bara de meniu devine verde.

### 2.3 Linux
- Instalează Docker Engine: https://docs.docker.com/engine/install/
- Instalează pluginul Docker Compose v2: https://docs.docker.com/compose/install/linux/
- Debian/Ubuntu: \`sudo apt-get install docker-ce docker-compose-plugin\`

### 2.4 Verificare rapidă
\`\`\`
docker --version
docker compose version
\`\`\`
Ambele comenzi trebuie să răspundă cu un număr de versiune.

## 3. Cum extragi arhiva corect

### 3.1 Windows
- Click **dreapta** pe fișierul ZIP → **Extract All…** → selectează un folder.
- NU face dublu-click pe fișiere din preview-ul ZIP din Explorer — extrage întâi arhiva.

### 3.2 macOS / Linux
\`\`\`
unzip ${zipName}.zip
cd ${zipName}
\`\`\`

## 4. Verificarea integrității (recomandat)

Fișierul \`CHECKSUMS.sha256\` conține hash-urile SHA-256 ale tuturor fișierelor.

**macOS / Linux:**
\`\`\`
sha256sum -c CHECKSUMS.sha256
\`\`\`
Fiecare linie trebuie să afișeze „OK".

**Windows:**
\`\`\`
certutil -hashfile install.exe SHA256
\`\`\`
Compară hash-ul afișat cu linia corespunzătoare din \`CHECKSUMS.sha256\`.

## 5. Instalare pas cu pas

### 5.1 Windows (recomandat: dublu-click)
- Deschide folderul extras.
- Dublu-click pe \`install-windows.cmd\` (ține fereastra CMD deschisă).
- Alternativ, rulează direct \`install.exe\`.

### 5.2 macOS
\`\`\`
chmod +x install-macos
./install-macos
\`\`\`

### 5.3 Linux desktop
\`\`\`
chmod +x install-linux
./install-linux
\`\`\`

### 5.4 Server headless / SSH
\`\`\`
chmod +x install.sh
./install.sh
\`\`\`

## 6. Ce face instalatorul (transparent)
- Verifică prerechizitele: docker + plugin compose.
- Copiază \`.env.template\` în \`.env\` dacă nu există (idempotent).
- Pornește stack-ul cu: \`docker compose up -d\`
- Așteaptă până când endpoint-ul \`/health\` răspunde OK (până la ~2 minute).
- Afișează (și deschide în browser) URL-ul pentru Setup Wizard.

## 7. Setup Wizard
- Deschide URL-ul afișat de instalator (implicit http://localhost:3000/first-run).
- Lipește conținutul fișierului \`activation-bundle.json\` când wizard-ul îl cere.
- Configurează administratorul principal și primul cont de utilizator.

## 8. Restaurare dintr-un backup (DR)

Pentru a restaura o instalație existentă dintr-un backup (runbook DR 5.5.4),
pasează \`--restore\` instalatorului:
\`\`\`
./install-linux --restore
# sau
install-windows.cmd --restore
\`\`\`
Restore rulează doar peste o instalație existentă (cu \`.env\` prezent) —
nu suprascrie o instalație funcțională.

## 9. Depanare — probleme frecvente

**„docker is not installed or not on PATH"** — Docker Desktop nu este
instalat sau nu rulează. Vezi capitolul 2.

**„install.exe is missing from this folder"** — ai deschis
\`install-windows.cmd\` direct din preview-ul ZIP. Extrage întâi arhiva
complet (capitolul 3.1).

**„App did not report healthy"** — stack-ul a pornit dar aplicația nu
răspunde. Verifică log-urile:
\`\`\`
docker compose logs --tail=200 opsqai
\`\`\`

**Portul 3000 este ocupat** — editează \`.env\` și schimbă \`OPSQAI_PORT\`
înainte de a rula instalatorul din nou.

## 10. Fișierele din acest pachet

| Fișier | Descriere |
|---|---|
| \`install.exe\` | Instalator nativ Windows (double-click) |
| \`install-windows.cmd\` | Wrapper Windows care ține fereastra CMD deschisă |
| \`install-macos\` | Instalator nativ macOS (universal) |
| \`install-linux\` | Instalator nativ Linux |
| \`install.sh\` | Fallback POSIX shell pentru servere headless |
| \`docker-compose.yml\` | Topologia containerelor (opsqai + postgres + minio) |
| \`.env.template\` | Șablon de variabile de mediu; secretele marcate \`__CHANGE_ME__\` |
| \`entrypoint.sh\` | Rulează în container; generează secretele la prima pornire |
| \`activation-bundle.json\` | Bundle de licență semnat Ed25519 (install + module tokens + CRL) |
| \`CHECKSUMS.sha256\` | SHA-256 pentru toate fișierele de mai sus |
| \`README.md\` | Acest ghid |

## 11. Suport și referințe
- Ghidul complet al administratorului: \`docs/administrator-guide/02-installation.md\`
- Runbook DR: \`docs/engineering/runbooks/dr-verify-v1.0.0.md\`
- Instalarea este identificată de: \`${input.install_id}\`
`;
}
