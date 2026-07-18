## Diagnosis

`companies` chiar e relicvă Cloud. Restul migrărilor self-host (0006, 0007, 0008, 0009) folosesc deja `company_id UUID` fără FK, umplut la nivel de aplicație cu `OPSQAI_INSTALL_ID` — vezi comentariile explicite din 0006 și 0007 ("no companies table is created here", "there is no separate companies table on Self-Hosted"). Doar `0010_kb_pgvector.sql` a fost copiat brut din Cloud și încă are `REFERENCES public.companies(id)` — de-aia crapă.

Nu creăm tabela `companies`. Aliniez 0010 la convenția existentă.

## Modificări

**`migrations/selfhost/0010_kb_pgvector.sql`**

1. Șterge FK-urile către `public.companies`:
   - `knowledge_documents.company_id`: `UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE` → `UUID NOT NULL`
   - `document_chunks.company_id`: idem
2. Păstrează `department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL` — 0007 creează `departments` deja, deci FK-ul e valid.
3. Actualizează headerul cu comentariul standard self-host: "`company_id` este umplut de app layer cu `OPSQAI_INSTALL_ID`, nu există tabelă `companies` pe Self-Hosted."
4. `match_knowledge_chunks(p_company_id, ...)` — semnătura rămâne (o folosește RAG-ul), dar comentariu că `p_company_id` = install id, nu FK.

Fără schimbări în alte migrări. Fără seed. Fără cod app modificat — layer-ul KB deja pasează `company_id` ca UUID opaque.

## Recovery pe mașina clientului

Installer-ul deja are Reset & Retry și mută `pgsql.failed-*` la o parte, deci după rebuild + reinstall, 0010 aplică curat pe DB proaspăt.

## Out of scope

- Refactor complet ca să scoatem coloana `company_id` din KB pe self-host (single-tenant nu are nevoie de ea). E o curățenie separată; acum vrem doar să deblocăm instalarea fără să introducem relicva `companies`.
