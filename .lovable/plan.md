# Audit complet OPSQAI: securitate, confidențialitate, izolare date, pregătire pentru conformitate

Raport în limba română, bazat exclusiv pe dovezi din codul real, schema bazei de date, configurări, dependențe și fișierele de instalare. Fără modificări de cod în timpul auditului.

## Ce livrăm

1. **Raport principal (PDF, română)** — toate secțiunile cerute (A–L), în stilul vizual al documentelor OPSQAI, cu citări exacte de fișiere și linii ca dovezi.
2. **Anexă tehnică (PDF, română)** — diagrama fluxului de date (Cloud / Self-Hosted / offline / activare licență / update / suport), lista completă a conexiunilor externe, inventarul câmpurilor cu date personale, inventarul testelor existente.
3. **Plan de acțiune prioritizat** — inclus în raport: remedieri critice, controale minime înainte de primul pilot, controale pentru enterprise, controale pentru bănci, certificări opționale; fiecare acțiune marcată ca tehnică, juridică, organizațională sau de certificare.

Regula de bază: fiecare afirmație „este implementat" are cale de fișier și dovadă. Ce nu poate fi verificat se trece explicit la „neverificat", nu la „implementat". Fără afirmații de conformitate GDPR/ISO și fără promisiuni de certificare.

## Cum procedăm

**Etapa 1 — Inventar și fluxul de date.** Căutăm în tot codul orice apel către rețea (fetch/axios/URL-uri externe), orice cheie sau serviciu extern, telemetria, heartbeat-ul, activarea licenței, canalul de update și fișierele de suport. Rezultat: lista completă a conexiunilor externe, separat pentru Cloud și Self-Hosted, plus ce anume conține fiecare transmisie.

**Etapa 2 — Securitatea instalării Self-Hosted.** Autentificare, sesiuni, parole, roluri și permisiuni, RLS și grant-uri în baza de date, endpoint-uri publice, funcții de server, secrete și variabile de mediu, criptare în tranzit și la repaus, jurnale, tratarea erorilor, backup și restaurare, limitare de rată, încărcare de fișiere, procesare documente, expunere în rețea, configurarea Docker / instalator Windows / NSIS.

**Etapa 3 — AI și Ollama.** Verificăm dacă toate modulele AI (chat, AI Audit, Academy, TTS, workspace, dashboard-uri, funcții interne și de client) trec prin stratul central de provider, dacă există vreun fallback spre cloud în modul self-hosted, configurarea modelelor și a embeddings, compatibilitatea vectorială și dacă prompturi, documente sau conversații pot ieși din infrastructura clientului. Fiecare abatere se raportează cu fișier și linie.

**Etapa 4 — Licențiere.** Generare, stocare, activare, verificare de semnătură și de hash, online vs offline, ce date pleacă la activare, copiere pe altă instalare, falsificare, ocolirea validării, expunerea secretelor în frontend, revocare, expirare și reînnoire. Descriem corect proprietățile criptografice (semnătură ≠ hash ≠ criptare).

**Etapa 5 — GDPR, ISO 27001, ISO 42001.** Inventarul câmpurilor cu date personale din schema reală; rolul OPSQAI (operator / împuternicit) pe fiecare model de livrare; ce documentație lipsește; existența funcțiilor de ștergere și export; suficiența jurnalizării. Analiză de lipsuri în tabel: control / implementare actuală / dovadă / ce lipsește / prioritate, cu separare clară între cerințe tehnice și cerințe de proces sau audit extern.

**Etapa 6 — Pregătire pentru bănci și enterprise, plus testare.** Ce ar cere concret o echipă de securitate bancară; ce teste automate există deja (autentificare, autorizare, RLS, API, licență, mod offline, scurgeri de date), care trec și care lipsesc; scanare de vulnerabilități în dependențe și scanarea de securitate a bazei de date, doar în mod citire.

**Etapa 7 — Redactare, verificare vizuală, livrare.** Generăm PDF-urile, verificăm fiecare pagină ca imagine (tabele rupte, text tăiat, pagini goale, diacritice) și corectăm până sunt curate.

## Detalii tehnice

- Analiza se face cu sub-agenți paraleli pe arii (rețea/telemetrie, auth/RLS, AI provider, licențiere, instalator/Docker, teste), fiecare returnând doar constatări cu `cale:linie`.
- Se rulează doar operațiuni fără efecte: căutări în cod, citiri de fișiere, interogări `SELECT`, scanarea dependențelor din lockfile, scanarea de securitate a bazei de date. Fără migrări, fără scriere în baza de date, fără build-uri de producție, fără teste distructive.
- Suita de teste existentă se rulează pentru a raporta rezultate reale (trece/nu trece); nu se modifică teste și nu se adaugă altele în acest audit.
- Dovezile se colectează în fișiere de lucru temporare; PDF-urile finale ajung în Files.
