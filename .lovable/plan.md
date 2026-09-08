# Conectare Self-Hosted la baza de date a firmei (PostgreSQL extern)

## Ce am constatat — funcția există deja

Instalatorul Windows suportă deja **două moduri**, alese în wizard la pasul „Database":

1. **Embedded (implicit)** — OPSQAI instalează propriul PostgreSQL 16 (port 55432, doar pe acel calculator).
2. **External** — OPSQAI se conectează la serverul PostgreSQL al firmei (pe alt server din rețea).

Cum funcționează modul extern (deja implementat):
- În wizard alegi „External", introduci host, port, nume bază de date, utilizator, parolă; există buton de **test conexiune** înainte de instalare.
- Bootstrapul rulează automat toate migrațiile OPSQAI pe baza firmei (tabelele se creează singure).
- Serviciul „OpsqaiDatabase" se oprește singur în modul extern — nu se instalează PostgreSQL local.
- Aplicația citește datele exclusiv din serverul firmei prin `DATABASE_URL` construit din `config.json`.

Cerințe pe serverul firmei (deja documentate în ghidul administratorului):
- PostgreSQL 15 sau mai nou
- extensia **pgvector** instalată înainte (altfel instalarea eșuează cu codul `OPSQAI-E1010` cu mesaj clar)
- utilizatorul furnizat trebuie să poată crea tabele/extensii în baza lui

## Ce propun să îmbunătățesc (lipsesc azi)

1. **SSL/TLS pentru conexiunea externă** — opțiune în wizard: `sslmode` (require / verify-full cu certificat CA al firmei). Azi conexiunea către serverul firmei merge fără criptare dacă serverul nu o cere.
2. **Ghid pas-cu-pas în wizard** — text ajutător în EN/DE/RO lângă câmpurile externe + link către checklist-ul „ce pregătește IT-ul firmei" (pgvector, port, firewall, drepturi).
3. **Test de conexiune mai explicit** — mesaje de eroare clare pe cazuri: server inaccesibil, autentificare eșuată, pgvector lipsă, versiune PostgreSQL prea veche.
4. **Afișare în aplicație** — în Settings / Health Doctor: „Baza de date: externă — server firma (host:port)" plus stare conexiune, ca adminul să vadă clar unde stau datele.
5. **Documentație actualizată** — un scenariu complet „Instalare cu baza de date a firmei" în ghidul administratorului (EN/DE/RO).

## Detalii tehnice

- Fișiere: `opsqai-windows/installer/wizard/renderer/wizard.js` + `index.html` (câmpuri SSL + ajutor), `opsqai-windows/services/bootstrap/init.js` (validare/pgvector check cu mesaje dedicate), `opsqai-windows/services/platform/index.js` (`buildDatabaseUrl` cu sslmode), Health Doctor (`src/lib/...`) pentru afișarea sursei DB.
- Fără schimbări în Management Center sau Cloud; totul rămâne doar în Self-Hosted.
