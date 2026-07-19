Am verificat sursa curentă: `0010_kb_pgvector.sql` nu mai cheamă `public.set_updated_at()`; are funcția locală `public.knowledge_documents_set_updated_at()`. Dacă logul încă arată `set_updated_at()`, installerul rulat este construit din payload vechi sau staging-ul a copiat o versiune veche a migrației.

Plan propus:

1. **Adaug guardrail strict pentru migrațiile Self-Hosted**
   - Extind scanarea din build ca să blocheze nu doar `auth.uid/auth.users`, ci și helper-e Cloud comune: `public.set_updated_at()`, `public.handle_new_user()`, `public.companies`, `public.profiles`, schema-uri Cloud și grants Cloud.
   - Scanarea ignoră comentariile, deci documentația nu mai produce false positive.

2. **Adaug verificare de dependențe SQL între migrații**
   - Un script read-only de build va parcurge migrațiile în ordine și va detecta apeluri la funcții/tabele `public.*` care nu au fost definite anterior în self-host.
   - Astfel prindem exact clasa de bug: migration 0010 cheamă o funcție care nu există în DB self-host.

3. **Adaug fingerprint în installer/payload**
   - La build, calculez SHA-256 pentru fiecare migrație staged.
   - La bootstrap, loghez numele + hash-ul migrației aplicate.
   - Dacă utilizatorul rulează un installer vechi, logul va arăta imediat că payload-ul nu conține fixul nou.

4. **Re-scan complet pentru Cloud remnants în Self-Hosted**
   - Rulez audit pe:
     - `migrations/selfhost/**`
     - `opsqai-windows/**`
     - output-ul staged `payload/app/migrations`
   - Fixez orice referință reală rămasă, nu comentarii.

5. **Întăresc mesajul de eroare din wizard**
   - Pentru erori de migrație, UI va afișa migration file + SQLSTATE + linie + hint scurt.
   - Pentru payload vechi/stale, UI va spune explicit: rebuild/reinstall required, nu Reset & Retry.

Definition of Done:
- Build-ul pică dacă o migrație self-host folosește helper Cloud nedefinit.
- Build-ul pică dacă apare `public.companies`, `public.profiles`, `auth.*`, `storage.*`, `public.set_updated_at()` în SQL executabil self-host.
- Bootstrap log arată hash-ul fiecărei migrații, ca să putem distinge instant între installer nou și vechi.
- `0010_kb_pgvector.sql` aplică fără `set_updated_at()` pe DB curată.