# Activity Center: doar ce ține de Management Center

Am verificat alertele existente: toate cele afișate acum vin din aplicațiile clienților (goluri de cunoștințe, răspunsuri cu încredere mică, audit AI, rapoarte trimestriale) și sunt marcate „General”. De asta pagina arată rapoarte care nu au ce căuta acolo.

## Ce schimbăm

1. **Activity Center afișează doar zonele Management Center**: clienți, licențe, instalări, versiuni, concedii, suport, facturare.
2. **Zonele venite din aplicațiile clienților dispar** din pagină: cunoștințe, academie, plus alertele „General” provenite din audit/knowledge.
3. **Clopoțelul din Management Center** urmează aceeași regulă — arată doar alerte MC. În Self-Hosted și în Portal clopoțelul rămâne neschimbat.
4. **Curățăm istoricul**: ștergem definitiv alertele vechi provenite din aplicațiile clienților.
5. Filtrul de „Arie” din pagină va lista doar zonele rămase, ca să nu poți selecta ceva ce nu mai apare.

## Detalii tehnice

- În `src/lib/activity-center.ts`: adăugăm o listă `MC_CATEGORIES` (customers, licenses, timeoff, releases, health, support, billing) și un helper `isMcActivity(row)` care exclude categoriile non-MC și, pentru `general`, exclude tipurile de eveniment generate în aplicațiile clienților (`new_gap`, `low_confidence`, `ai_sop_generated`, `workspace_audit_ready`, `quarterly_report`).
- `src/routes/_authenticated/management.activity.tsx`: filtrăm rândurile prin `isMcActivity` înainte de tab-uri/statistici; dropdown-ul de arii folosește `MC_CATEGORIES`.
- `src/components/app/notifications-bell.tsx`: același filtru aplicat doar când suntem în Management Center (rutele `/management/*`), inclusiv pentru numărătoarea de necitite și pentru alertele desktop.
- Ștergere date: o singură comandă de curățare pe tabela de notificări pentru tipurile de mai sus (nu e schimbare de structură, deci fără migrare).
