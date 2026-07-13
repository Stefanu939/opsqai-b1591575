// Server-only: render the Windows-only installation package README as Markdown.

export interface ReadmeInput {
  install_id: string;
  installer_version: string;
  company_name: string;
  generated_at: string;
  installer_url?: string;
}

export function renderReadmeMarkdown(input: ReadmeInput): string {
  const installerUrl = input.installer_url ?? "https://opsqai.de/releases";
  return `# OPSQAI Self-Hosted — Ghid de instalare Windows

| | |
|---|---|
| Install ID | \`${input.install_id}\` |
| Client | ${input.company_name} |
| Versiune | ${input.installer_version} |
| Generat | ${input.generated_at} |

---

## 1. Ce este acest pachet

Această arhivă conține **bundle-ul de activare semnat digital** pentru
licența ta și un pointer către instalatorul nativ Windows OPSQAI.
Instalatorul \`OPSQAI-Setup.exe\` (~330 MB) se descarcă separat de pe CDN
pentru a evita limitele de memorie ale platformei. **Nu este necesar Docker.**

## 2. Descarcă instalatorul

Descarcă \`OPSQAI-Setup.exe\` de la:

\`\`\`
${installerUrl}
\`\`\`

Salvează fișierul în același folder cu \`activation-bundle.json\` din arhiva
aceasta. URL-ul este public și versionat; același link poate fi refolosit
pentru reinstalări.

## 3. Prerechizite

- Windows Server 2019 / 2022 sau Windows 10 / 11 (64-bit).
- Cont de Administrator local pe mașină.
- ~2 GB spațiu liber pe disc pentru instalare + spațiu pentru date.
- Port 443 (HTTPS) disponibil, sau alt port configurat în timpul wizard-ului.

## 4. Instalare pas cu pas

1. Extrage complet arhiva ZIP (Click dreapta → **Extract All…**).
2. Descarcă \`OPSQAI-Setup.exe\` de la URL-ul de mai sus în același folder.
3. Click dreapta pe \`OPSQAI-Setup.exe\` → **Run as administrator**.
4. Urmează wizard-ul: acceptă EULA, alege folderul de instalare
   (implicit \`C:\\Program Files\\OPSQAI\`) și folderul de date
   (implicit \`C:\\ProgramData\\OPSQAI\`).
5. Când wizard-ul îți cere Activation Bundle, lipește conținutul
   fișierului \`activation-bundle.json\` din această arhivă.
6. Finalizează instalarea. Serviciile Windows pornesc automat.

## 5. Ce instalează

Instalatorul înregistrează următoarele servicii Windows (via WinSW):

| Serviciu | Rol |
|---|---|
| \`OpsqaiDatabase\` | PostgreSQL încorporat |
| \`OpsqaiPlatform\` | Aplicația OPSQAI (Node.js) |
| \`OpsqaiWorker\` | Job-uri de fundal |
| \`OpsqaiUpdater\` | Verifică și aplică update-uri semnate |
| \`OpsqaiCaddy\` | Reverse proxy HTTPS local |
| \`OpsqaiHello\` | Health check |

## 6. Primul login (Setup Wizard)

După instalare, deschide \`https://localhost/first-run\` (sau URL-ul afișat
la sfârșitul wizard-ului) și configurează administratorul principal.

## 7. Depanare

**„OPSQAI-Setup.exe: Windows protected your PC"** — click **More info** →
**Run anyway**.

**Un serviciu nu pornește** — deschide \`services.msc\`, găsește serviciul
(prefix \`Opsqai\`), și verifică log-urile în
\`C:\\ProgramData\\OPSQAI\\logs\\\`.

**Instalare unattended / silent** — vezi \`docs/unattended-install.md\`.

## 8. Fișierele din acest pachet

| Fișier | Descriere |
|---|---|
| \`INSTALLER.txt\` | URL de descărcare pentru \`OPSQAI-Setup.exe\` |
| \`activation-bundle.json\` | Bundle de licență semnat Ed25519 (install + module tokens + CRL) |
| \`CHECKSUMS.sha256\` | SHA-256 pentru toate fișierele din arhivă |
| \`README.md\` | Acest ghid |

## 9. Suport
- Ghidul complet al administratorului: \`docs/administrator-guide/02-installation.md\`
- Instalarea este identificată de: \`${input.install_id}\`
`;
}
