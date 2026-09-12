# Ghid de vânzare OPSQAI — problemă / soluție (PDF, română)

Un document PDF de vânzare, în română, care ia **fiecare funcție** din OPSQAI Core,
OPSQAI Transport și OPSQAI HR și arată, pentru fiecare, **minim 2 probleme reale**
din operațiune și **cum le rezolvă OPSQAI**.

Format pentru fiecare funcție (ca în exemplul cerut):

```text
Knowledge Base (KB)
  Problema 1 — Firma are 10 SOP-uri împrăștiate în 20 de locuri.
  Soluția   — KB le ține într-un singur loc, le versionează și verifică dacă sunt la zi.
  Problema 2 — Nimeni nu știe care versiune e valabilă.
  Soluția   — Versionare + stare „la zi / expirat" + revizie obligatorie.
```

## Ce intră în document

**OPSQAI Core** — Knowledge Base, FAQ, Chat AI grounded, Knowledge Gaps, AI Audit,
Academy (cursuri, quiz, certificate), Operations / Incidente & daune, Root Cause
(5 Why / Lean), Acțiuni corective, Analize & costuri, Rapoarte PDF, Calendar,
Concedii & prezență, Notificări, Documente & imagini, Utilizatori / roluri /
departamente, Licențiere & instalare, Backup & restaurare, Actualizări.

**OPSQAI Transport** — Overview flotă, Vehicule, Șoferi, Remorci & cuplaje,
Registre (combustibil, tură, mentenanță), Proceduri / audituri săptămânale,
Incidente transport, Hartă & locații, Expirări & risc, Trenduri, CMR,
Digest e-mail, Rapoarte PDF, Setări.

**OPSQAI HR** — Angajați & fișa 360°, Contracte & șabloane, Documente & semnare,
Onboarding, Offboarding, Echipament, Incidente & avertismente, Politici,
Cereri, Training, Conformitate & retenție, Salarizare, Candidate Screening
(job profiles, criterii, CV, scor, evidence, shortlist), HR Intelligence,
Analitice & alerte, Setări.

Pentru fiecare: 2 (uneori 3) perechi problemă → soluție, scrise în limbaj de
business, fără termeni tehnici, fără promisiuni pe care produsul nu le face
(AI-ul asistă, decizia rămâne la om; fără afirmații absolute de securitate).

## Structura PDF-ului

1. Copertă — OPSQAI, „Ce vindem, ce problemă rezolvăm, cum o rezolvăm"
2. Cum se citește documentul + harta produselor (Core / Transport / HR)
3. Secțiune Core (funcție cu funcție)
4. Secțiune Transport
5. Secțiune HR
6. Anexă: cele 12 obiecții frecvente și răspunsul scurt
7. Contact (opsqai.de)

Design în linia actuală a brandului: pagini deschise, accente pe culoarea
OPSQAI, titluri clare, blocuri „Problemă" / „Soluție" ușor de parcurs în
întâlnire. Font Unicode, deci diacriticele române apar corect.

## Detalii tehnice

- Script nou `scripts/gen_sales_problem_solution_ro.py` (ReportLab, font DejaVu
  pentru diacritice), conținutul într-un dicționar Python — ușor de editat.
- Conținutul se scrie **din funcțiile reale existente** în cod
  (`src/lib/product-architecture.ts`, `src/components/app/{core-ops,transport,hr}`,
  `src/i18n/pages/*`), nu inventat.
- Ieșire: `/mnt/documents/OPSQAI_Probleme_Soluții_RO.pdf`, livrat ca atașament în
  chat. O copie și în `public/` doar dacă vrei să fie descărcabil de pe site.
- QA obligatoriu: fiecare pagină rasterizată și verificată vizual (text tăiat,
  suprapuneri, diacritice, pagini goale) înainte de livrare.

## Ce nu se schimbă

Nicio funcționalitate a aplicației. Documentul este material de marketing/vânzare.
