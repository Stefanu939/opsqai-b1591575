# Meniu de cont (dreapta sus) — Status, Concedii, Profil, Ajutor

Butonul de cont din bara de sus devine un meniu real, identic ca funcționalitate în Management Center, Customer Portal și Self-Hosted.

## Ce vede utilizatorul

Click pe numele/inițialele din bara de sus deschide un meniu cu:

1. **Set status** — alegi Disponibil / Ocupat / Plecat / Nu deranja, plus un mesaj scurt opțional („În ședință până la 15:00") și o expirare („1 oră", „azi", „fără expirare"). Statusul apare ca bulină colorată pe avatar, lângă nume în meniu, în lista de conversații și în chat. Expiră singur și revine la Disponibil.
2. **Holidays** — deschide o fereastră cu perioada de concediu (de la / până la, motiv opțional) și lista cererilor tale cu starea lor (în așteptare / aprobată / respinsă / anulată). Cererea merge la aprobare; SuperAdmin (și platform owner/admin) își aprobă singur cererea, automat. La aprobare, perioada apare automat ca eveniment în calendarul existent, iar persoana e marcată „În concediu" în chat pe durata respectivă. Cei care aprobă văd o secțiune „Cereri de aprobat" în aceeași fereastră.
3. **Profile settings** — duce la o pagină nouă de profil, dedicată, în fiecare produs (nume, poziție, telefon, poză, limbă, temă, status curent, concediile mele). Fără date inventate: doar câmpurile care există deja.
4. **Help** — deschide un panou lateral cu căutare rapidă, scurtături către paginile existente (documentație, descărcări, suport/tichete), pașii de pornire și, pe Cloud, buton către suport. Pe Self-Hosted panoul arată doar resursele locale, fără trimitere către suport cloud.

Meniul mai conține numele, adresa de e-mail, rolul și butonul de deconectare, ca să nu mai fie nevoie de scroll până jos în bara laterală.

## Detalii tehnice

**Bază de date (Cloud, aditiv)**
- `profiles`: `presence_status` (available/busy/away/dnd), `presence_message`, `presence_until`.
- Tabel nou `time_off_requests`: `user_id`, `company_id`, `starts_on`, `ends_on`, `reason`, `status`, `approved_by`, `approved_at`, `calendar_event_id`. GRANT + RLS: fiecare vede/creează cererile proprii; admin/manager/superadmin/platform admin văd și aprobă cererile din compania lor.
- La aprobare, un server function creează evenimentul în `calendar_events` (`kind: 'time_off'`, scope existent) și îl leagă prin `calendar_event_id`; la anulare/respingere, evenimentul se șterge.
- Self-Hosted: migrație nouă `migrations/selfhost/0028_presence_time_off.sql` cu aceleași coloane/tabel, plus metode în repository-urile locale, ca funcțiile să meargă identic offline.

**Cod**
- `src/lib/presence.functions.ts` (get/set status propriu, listă statusuri colegi) și `src/lib/time-off.functions.ts` (creare, listare, aprobare/respingere, anulare) — ambele cu `requireAuth`, aprobarea verificând rolul; auto-aprobare doar pentru superadmin/platform owner/admin.
- Componentă comună `src/components/app/account-menu.tsx` (dropdown + dialog status + dialog concedii + panou Help) folosită în `src/components/mc/mc-shell.tsx`, `src/routes/_authenticated/portal.tsx` și `src/components/app/app-shell.tsx`.
- Pagini noi de profil: `src/routes/_authenticated/app.profile.tsx`, `management.profile.tsx`, `portal.profile.tsx`, refolosind `profile.functions.ts` și `AvatarUploader`.
- Bulina de status se afișează și în chat (`src/components/support/chat/chat-workspace.tsx`), pe baza statusurilor colegilor.
- Fără schimbări de design: se folosesc primitivele Graphite existente (dropdown, dialog, sheet). Licențierea, rolurile și separarea Cloud / Self-Hosted rămân neatinse.

## Verificare
- Typecheck + build.
- Test funcțional: setare status cu expirare, cerere de concediu aprobată de un admin și auto-aprobată de un superadmin, apariția evenimentului în calendar, deschiderea paginii de profil și a panoului de ajutor în toate cele trei produse.
