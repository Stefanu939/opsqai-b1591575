// Server-only: render the Windows-only installation package README as Markdown.

export interface ReadmeInput {
  install_id: string;
  installer_version: string;
  company_name: string;
  generated_at: string;
  installer_url?: string;
}

export function renderReadmeMarkdown(input: ReadmeInput): string {
  return `# OPSQAI Self-Hosted — Ghid de instalare Windows

| | |
|---|---|
| Install ID | \`${input.install_id}\` |
| Client | ${input.company_name} |
| Versiune | ${input.installer_version} |
| Generat | ${input.generated_at} |

---

## 1. Ce este acest pachet

Această arhivă conține instalatorul nativ Windows OPSQAI împreună cu
bundle-ul de activare semnat digital pentru licența ta. **Nu este necesar
Docker.** Instalatorul configurează serviciile Windows (bază de date,
platformă, worker, updater, reverse proxy) și pornește aplicația automat.

## 2. Prerechizite

- Windows Server 2019 / 2022 sau Windows 10 / 11 (64-bit).
- Cont de Administrator local pe mașină.
- ~2 GB spațiu liber pe disc pentru instalare + spațiu pentru date.
- Port 443 (HTTPS) disponibil, sau alt port configurat în timpul wizard-ului.

## 3. Verificarea integrității (recomandat)

Fișierul \`CHECKSUMS.sha256\` conține hash-urile SHA-256 ale tuturor fișierelor.

**PowerShell:**
\`\`\`
Get-FileHash OPSQAI-Setup.exe -Algorithm SHA256
\`\`\`
Compară valoarea cu linia corespunzătoare din \`CHECKSUMS.sha256\`.

## 4. Instalare pas cu pas

1. Extrage complet arhiva ZIP (Click dreapta → **Extract All…**).
2. Click dreapta pe \`OPSQAI-Setup.exe\` → **Run as administrator**.
3. Urmează wizard-ul: acceptă EULA, alege folderul de instalare
   (implicit \`C:\\Program Files\\OPSQAI\`) și folderul de date
   (implicit \`C:\\ProgramData\\OPSQAI\`).
4. Când wizard-ul îți cere Activation Bundle, lipește conținutul
   fișierului \`activation-bundle.json\` din această arhivă.
5. Finalizează instalarea. Serviciile Windows pornesc automat.

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
**Run anyway**. Semnătura Authenticode va fi acceptată începând cu versiunea
semnată (vezi \`docs/code-signing.md\`).

**Un serviciu nu pornește** — deschide \`services.msc\`, găsește serviciul
(prefix \`Opsqai\`), și verifică log-urile în
\`C:\\ProgramData\\OPSQAI\\logs\\\`.

**Instalare unattended / silent** — vezi \`docs/unattended-install.md\` din
documentația OPSQAI Windows.

## 8. Migrare de la Docker

Dacă rulai anterior OPSQAI cu Docker Compose pe acest host, folosește
utilitarul \`opsqai-migrate\` (instalat automat) pentru a importa datele.
Vezi \`opsqai-windows/tools/docker-migrator/README.md\`.

## 9. Fișierele din acest pachet

| Fișier | Descriere |
|---|---|
| \`OPSQAI-Setup.exe\` | Instalator nativ Windows (NSIS, rulează ca Administrator) |
| \`activation-bundle.json\` | Bundle de licență semnat Ed25519 (install + module tokens + CRL) |
| \`CHECKSUMS.sha256\` | SHA-256 pentru toate fișierele de mai sus |
| \`README.md\` | Acest ghid |

## 10. Suport și referințe
- Ghidul complet al administratorului: \`docs/administrator-guide/02-installation.md\`
- Instalare unattended: \`opsqai-windows/docs/unattended-install.md\`
- Runbook DR: \`docs/engineering/runbooks/dr-verify-v1.0.0.md\`
- Instalarea este identificată de: \`${input.install_id}\`
`;
}
